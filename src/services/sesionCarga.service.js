const { Op } = require('sequelize');
const { SesionCarga, Cargador, Tarifa, User } = require('../models');
const { MetodoPagoService } = require('./metodoPago.service');
const { StripeService } = require('./stripe/stripe.service');
const { IotService } = require('./ws/iot.service');
const pubsub = require('../ws/pubsub');

class SesionCargaService {
    /**
     * Paso 1: Valida la disponibilidad del cargador, calcula el costo fijo y autoriza el pago.
     * @param {number} userId - ID del usuario.
     * @param {number} chargerId - ID del cargador leído por NFC (id_cargador).
     * @param {string} chargeType - Tipo de carga rápida/lenta solicitada (ej: 'rápida').
     * @param {number} durationMinutes - Duración de la carga preseleccionada (ej: 30).
     * @returns {Object} Datos de la sesión pre-creada con el PaymentIntent ID.
     */
    static async startChargeSession(userId, chargerId, chargeType, durationMinutes) {
        // --- 1. Validaciones Preliminares del Usuario ---
        const user = await User.findByPk(userId);
        if (!user) {
            throw { status: 404, message: 'Usuario no encontrado' };
        }
        
        // Verifica si el cargador está conectado al WebSocket
        const isChargerConnected = pubsub.isSubscriberConnected(chargerId);
        if (!isChargerConnected) {
            throw { status: 503, message: `El cargador #${chargerId} no está conectado al sistema. No se puede iniciar la sesión.` };
        }

        

        // Verifica si el usuario tiene una tarjeta predeterminada
        const defaultPaymentMethod = await MetodoPagoService.getDefaultPaymentMethod(userId);
        // defaultPaymentMethod.token_referencia es el ID del PaymentMethod de Stripe (pm_xxxx)

        // Verifica si el usuario ya tiene una sesión activa (solo puede tener una a la vez)
        const activeSession = await SesionCarga.findOne({ where: { id_usuario: userId, estado: { [Op.in]: ['pendiente', 'activa'] } } });
        if (activeSession) {
            throw { status: 409, message: 'Ya tienes una sesión de carga activa o pendiente.' };
        }

        // --- 2. Validación de Cargador y Tarifa ---
        const cargador = await Cargador.findByPk(chargerId);
        if (!cargador) {
            throw { status: 404, message: 'Cargador no encontrado' };
        }
        if (cargador.estado !== 'disponible') {
            throw { status: 409, message: `El cargador #${chargerId} no está disponible. Estado: ${cargador.estado}` };
        }
        // Nota: Asumimos que el tipo de carga del cargador coincide con el solicitado, 
        // o se permite si es del mismo tipo principal (DC = rápida/semi-rápida, AC = lenta)

        // Buscar la tarifa vigente por minuto para ese cargador
        const tarifa = await Tarifa.findOne({
            where: {
                id_estacion: cargador.id_estacion,
                tipo_carga: cargador.tipo_carga,
                costo_tiempo_min: { [Op.not]: null }, // Debe tener un costo fijo por minuto
                fecha_inicio_vigencia: { [Op.lte]: new Date() },
                [Op.or]: [
                    { fecha_fin_vigencia: { [Op.gte]: new Date() } },
                    { fecha_fin_vigencia: null }
                ]
            }
        });

        if (!tarifa) {
            throw { status: 400, message: `No hay una tarifa vigente por minuto para este cargador (${cargador.tipo_carga}).` };
        }
        
        // --- 3. Cálculo del Costo Fijo y Retención de Pago ---
        // El monto total es COSTO_MINUTO * DURACIÓN_MINUTOS
        const costoTotal = tarifa.costo_tiempo_min * durationMinutes;

        if (costoTotal <= 0) {
            throw { status: 400, message: 'El costo calculado debe ser positivo.' };
        }

        // Autorización de Pago (Retención)
        const paymentIntent = await StripeService.createPaymentIntent({
            amount: costoTotal,
            customerId: user.stripe_customer_id,
            paymentMethodId: defaultPaymentMethod.token_referencia,
            description: `Retención por sesión de ${durationMinutes} min en Cargador #${chargerId}`,
            metadata: {
                user_id: userId,
                charger_id: chargerId,
                duration_minutes: durationMinutes,
                type: 'AUTHORIZATION'
            }
        });
        
        if (paymentIntent.status !== 'requires_capture') {
             // Si Stripe no pudo autorizar, lanza un error de pago (ej. fondos insuficientes, tarjeta rechazada)
            throw { status: 402, message: 'El pago no pudo ser autorizado. Verifique sus fondos o tarjeta.' };
        }

        // --- 4. Crear la Sesión de Carga en estado 'activa' ---
        // Marcamos el cargador como 'ocupado' inmediatamente
        await cargador.update({ estado: 'ocupado' });

        const sesion = await SesionCarga.create({
            id_usuario: userId,
            id_cargador: chargerId,
            id_tarifa: tarifa.id_tarifa,
            metodo_pago_utilizado: defaultPaymentMethod.id_pago,
            estado: 'activa', // Cambiamos a 'activa' si la retención fue exitosa
            monto_estimado: costoTotal, // Monto fijo retenido
            id_pago_transaccion: paymentIntent.id, // ID del PaymentIntent de Stripe
            duracion_estimada_min: durationMinutes,
            tiempo_transcurrido_min: 0,
            monto_por_minuto: tarifa.costo_tiempo_min
        });
        
        // --- 5. ENVIAR COMANDO A IOT ---
        try {
            await IotService.sendCommand(cargador.id_cargador, 'START', { 
                duration: durationMinutes,
                sesionId: sesion.id_sesion,
                userId: userId
            });
            console.log(`[SesionCarga] Comando START enviado al cargador ${chargerId}`);
        } catch (iotError) {
            // Si el IoT no responde, debemos revertir la transacción y liberar el cargador
            console.error('[SesionCarga] Error al enviar comando START al IoT:', iotError);
            await cargador.update({ estado: 'disponible' });
            await sesion.update({ estado: 'fallida', fecha_fin: new Date() });
            await StripeService.cancelPaymentIntent(paymentIntent.id); // Cancelar la retención
            throw { status: 503, message: 'Cargador no responde. Sesión cancelada.', errors: iotError };
        }

        // --- 6. Notificar al usuario móvil vía WebSocket ---
        const mensajeInicio = {
            type: 'sesion_iniciada',
            id_sesion: sesion.id_sesion,
            id_cargador: cargador.id_cargador,
            duracion_estimada_min: durationMinutes,
            monto_retenido: costoTotal,
            monto_por_minuto: tarifa.costo_tiempo_min,
            fecha_inicio: sesion.fecha_inicio,
            timestamp: new Date().toISOString()
        };

        pubsub.broadcastToSubscribers(cargador.id_cargador, mensajeInicio);

        // Devolvemos la información esencial para el frontend
        return {
            id_sesion: sesion.id_sesion,
            id_cargador: cargador.id_cargador,
            monto_retenido: costoTotal,
            monto_por_minuto: tarifa.costo_tiempo_min,
            duracion_estimada_min: durationMinutes,
            fecha_inicio: sesion.fecha_inicio,
            mensaje: 'Sesión iniciada. Conecta tu vehículo al cargador.'
        };
    }

    /**
     * Paso Final: Finaliza la sesión de carga manualmente (usuario detiene antes del tiempo límite).
     * Cobra SOLO por el tiempo transcurrido, no por el tiempo estimado completo.
     * @param {number} sessionId - ID de la sesión de carga.
     * @param {number} userId - ID del usuario.
     * @returns {Object} Resumen de la sesión finalizada.
     */
    static async completeChargeSession(sessionId, userId) {
        const sesion = await SesionCarga.findOne({
            where: { id_sesion: sessionId, id_usuario: userId, estado: 'activa' },
            include: [{ model: Cargador, as: 'Cargador' }]
        });

        if (!sesion) {
            throw { status: 404, message: 'Sesión activa no encontrada para este usuario.' };
        }

        // --- 1. Calcular el tiempo transcurrido y el monto proporcional ---
        const ahora = new Date();
        const tiempoTranscurridoMs = ahora.getTime() - sesion.fecha_inicio.getTime();
        const tiempoTranscurridoMin = Math.ceil(tiempoTranscurridoMs / 60000); // Redondear hacia arriba
        
        // Cobrar SOLO por los minutos transcurridos
        const montoFinal = (tiempoTranscurridoMin * sesion.monto_por_minuto).toFixed(2);
        const montoFinalNum = parseFloat(montoFinal);

        const paymentIntentId = sesion.id_pago_transaccion;

        // --- 2. ENVIAR COMANDO STOP A IOT ---
        try {
            await IotService.sendCommand(sesion.id_cargador, 'STOP', {
                sesionId: sesion.id_sesion,
                razon: 'detencion_manual'
            });
            console.log(`[SesionCarga] Comando STOP enviado al cargador ${sesion.id_cargador}`);
        } catch (iotError) {
            // Loguear el error, pero el cobro debe continuar
            console.error('[SesionCarga] Error al enviar comando STOP a IoT:', iotError);
        }

        // --- 3. Capturar Pago (Cobro Proporcional) ---
        let capture;
        try {
            capture = await StripeService.capturePaymentIntent(paymentIntentId, montoFinalNum);
            console.log(`[SesionCarga] Pago capturado: $${montoFinalNum} MXN (${tiempoTranscurridoMin} minutos)`);
        } catch (stripeError) {
            console.error('[SesionCarga] Error al capturar pago:', stripeError);
            // Marcar sesión como fallida si no se pudo cobrar
            await sesion.update({
                estado: 'fallida',
                fecha_fin: ahora,
                tiempo_transcurrido_min: tiempoTranscurridoMin
            });
            throw { status: 500, message: 'Error al procesar el pago', details: stripeError.message };
        }

        // --- 4. Actualizar DB y liberar Cargador ---
        await sesion.Cargador.update({ estado: 'disponible' });
        
        await sesion.update({
            estado: 'finalizada',
            fecha_fin: ahora,
            monto_final: montoFinalNum,
            tiempo_transcurrido_min: tiempoTranscurridoMin
        });

        // --- 5. Notificar al usuario vía WebSocket ---
        const mensajeFinal = {
            type: 'sesion_finalizada',
            razon: 'detencion_manual',
            id_sesion: sesion.id_sesion,
            id_cargador: sesion.id_cargador,
            tiempo_transcurrido_min: tiempoTranscurridoMin,
            duracion_estimada_min: sesion.duracion_estimada_min,
            monto_cobrado: montoFinalNum,
            monto_retenido: sesion.monto_estimado,
            ahorro: (sesion.monto_estimado - montoFinalNum).toFixed(2),
            energia_consumida_kwh: sesion.energia_consumida_kwh,
            fecha_inicio: sesion.fecha_inicio,
            fecha_fin: ahora,
            stripe_status: capture.status,
            timestamp: ahora.toISOString()
        };

        pubsub.broadcastToSubscribers(sesion.id_cargador, mensajeFinal);

        return {
            id_sesion: sesion.id_sesion,
            id_cargador: sesion.id_cargador,
            tiempo_transcurrido_min: tiempoTranscurridoMin,
            duracion_estimada_min: sesion.duracion_estimada_min,
            monto_cobrado: montoFinalNum,
            monto_retenido: sesion.monto_estimado,
            ahorro: (sesion.monto_estimado - montoFinalNum).toFixed(2),
            stripe_status: capture.status,
            mensaje: `Cobro completado por ${tiempoTranscurridoMin} minutos: $${montoFinalNum} MXN`
        };
    }
    
    /**
     * Obtener el estado actual de la sesión activa de un usuario (para polling de la App Móvil).
     * @param {number} userId - ID del usuario.
     * @returns {Object} Detalles de la sesión activa.
     */
    static async getActiveSessionStatus(userId) {
        const sesion = await SesionCarga.findOne({
            where: { id_usuario: userId, estado: { [Op.in]: ['activa', 'pendiente'] } },
            include: [{ model: Cargador, as: 'Cargador' }] // Incluir cargador para detalles
        });

        if (!sesion) {
            return null;
        }

        // Simulación: La App necesita saber el tiempo transcurrido
        const tiempoTranscurrido = (new Date().getTime() - sesion.fecha_inicio.getTime()) / 60000; // Minutos

        return {
            id_sesion: sesion.id_sesion,
            id_cargador: sesion.id_cargador,
            estado: sesion.estado,
            fecha_inicio: sesion.fecha_inicio,
            monto_retenido: sesion.monto_estimado,
            // Asumimos que la energía y el tiempo límite se envían al inicio y se actualizan con webhooks de IoT
            tiempo_transcurrido_min: tiempoTranscurrido.toFixed(2), 
            cargador_info: {
                tipo_carga: sesion.Cargador.tipo_carga,
                capacidad_kw: sesion.Cargador.capacidad_kw,
            }
        };
    }

    /**
     * Obtener información de tarifa para un cargador específico.
     * Este método es llamado cuando el usuario escanea el NFC del cargador.
     * @param {number} chargerId - ID del cargador.
     * @returns {Object} Información del cargador y su tarifa vigente.
     */
    static async getChargerRateInfo(chargerId) {
        // Buscar el cargador
        const cargador = await Cargador.findByPk(chargerId);
        
        if (!cargador) {
            throw { status: 404, message: 'Cargador no encontrado' };
        }

        if (cargador.estado !== 'disponible') {
            throw { 
                status: 409, 
                message: `El cargador #${chargerId} no está disponible actualmente.`,
                estado_actual: cargador.estado
            };
        }

        // Buscar la tarifa vigente para este cargador
        const tarifa = await Tarifa.findOne({
            where: {
                id_estacion: cargador.id_estacion,
                tipo_carga: cargador.tipo_carga,
                costo_tiempo_min: { [Op.not]: null },
                fecha_inicio_vigencia: { [Op.lte]: new Date() },
                [Op.or]: [
                    { fecha_fin_vigencia: { [Op.gte]: new Date() } },
                    { fecha_fin_vigencia: null }
                ]
            }
        });

        if (!tarifa) {
            throw { 
                status: 400, 
                message: `No hay una tarifa vigente para este cargador (${cargador.tipo_carga}).`
            };
        }

        return {
            id_cargador: cargador.id_cargador,
            tipo_carga: cargador.tipo_carga,
            capacidad_kw: cargador.capacidad_kw,
            estado: cargador.estado,
            id_tarifa: tarifa.id_tarifa,
            costo_por_minuto: tarifa.costo_tiempo_min,
            mensaje: `Cargador disponible. Tarifa: $${tarifa.costo_tiempo_min} MXN por minuto.`
        };
    }
}

module.exports = { SesionCargaService };