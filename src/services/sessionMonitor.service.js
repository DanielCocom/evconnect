const { SesionCarga, Cargador, User } = require('../models');
const { Op } = require('sequelize');
const pubsub = require('../ws/pubsub');
const { StripeService } = require('./stripe/stripe.service');
const { IotService } = require('./ws/iot.service');

/**
 * Servicio para monitorear sesiones de carga activas y enviar actualizaciones en tiempo real.
 * NOTA: Este monitor está ajustado para tareas de TIMEOUT y sincronización de datos de baja frecuencia.
 * El monitoreo real (kWh, V, A) debería venir del IoT vía WebSocket.
 */
class SessionMonitorService {
    static intervalId = null;
    // CORRECCIÓN 1: Reducir la frecuencia de monitoreo de 60s a 10s para una mejor percepción de "tiempo real"
    static MONITOR_INTERVAL = 1000; // 1 segundo 

    /**
     * Inicia el monitoreo de sesiones activas
     */
    static startMonitoring() {
        if (this.intervalId) {
            console.log('[SessionMonitor] Ya está en ejecución');
            return;
        }

        console.log(`[SessionMonitor] Iniciando monitoreo de sesiones activas cada ${this.MONITOR_INTERVAL / 1000} segundos...`);

        // Ejecutar inmediatamente
        this.checkActiveSessions();

        // Luego cada 10 segundos
        this.intervalId = setInterval(() => {
            this.checkActiveSessions();
        }, this.MONITOR_INTERVAL);
    }

    /**
     * Detiene el monitoreo
     */
    static stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[SessionMonitor] Monitoreo detenido');
        }
    }

    /**
     * Verifica todas las sesiones activas y envía actualizaciones
     */
    static async checkActiveSessions() {
        try {
            const sesionesActivas = await SesionCarga.findAll({
                where: {
                    estado: 'activa'
                },
                include: [
                    { model: Cargador, as: 'Cargador' },
                    { model: User, as: 'Usuario', attributes: ['id_usuario', 'nombre', 'email'] }
                ]
            });

            if (sesionesActivas.length === 0) {
                return;
            }

            console.log(`[SessionMonitor] Verificando ${sesionesActivas.length} sesiones activas`);

            for (const sesion of sesionesActivas) {
                await this.processSingleSession(sesion);
            }
        } catch (error) {
            console.error('[SessionMonitor] Error al verificar sesiones activas:', error);
        }
    }

    /**
     * Procesa una sesión individual
     * @param {Object} sesion - Sesión de carga
     */
    static async processSingleSession(sesion) {
        try {
        const ahora = new Date();
        
        // CORRECCIÓN CRÍTICA: Convertir la fecha de inicio a milisegundos UTC
        // .getTime() devuelve el timestamp en milisegundos, que es el valor UTC puro.
        const inicioSesionTimeMs = new Date(sesion.fecha_inicio).getTime();

        // Ahora la resta es entre dos valores UTC (milisegundos) consistentes
        const tiempoTranscurridoMs = Math.max(0, ahora.getTime() - inicioSesionTimeMs);
        const tiempoTranscurridoSeg = Math.floor(tiempoTranscurridoMs / 1000);

            const montoPorMinutoNum = parseFloat(sesion.monto_por_minuto);
            const montoPorSegundo = montoPorMinutoNum / 60;

            // Calcular monto acumulado por SEGUNDOS (para fines de monitoreo)
            const montoAcumulado = (tiempoTranscurridoSeg * montoPorSegundo).toFixed(2);
            const montoAcumuladoNum = parseFloat(montoAcumulado);

            // Verificar si el tiempo se ha agotado (usando la duración original en minutos)
            const duracionEstimadaSeg = sesion.duracion_estimada_min * 60;
            const tiempoRestanteSeg = Math.max(0, duracionEstimadaSeg - tiempoTranscurridoSeg);

            // Verificación de Timeout (Tarea crítica)
            if (tiempoRestanteSeg === 0 && tiempoTranscurridoSeg >= duracionEstimadaSeg) {
                console.log(`[SessionMonitor] Sesión ${sesion.id_sesion} ha alcanzado el tiempo límite. Finalizando...`);
                // Enviar segundos y monto calculado para la finalización automática
                await this.finalizarSesionAutomatica(sesion, tiempoTranscurridoSeg, montoAcumulado);
                return;
            }

            // Enviar actualización en tiempo real al usuario móvil vía WebSocket
            const mensaje = {
                type: 'carga_en_progreso',
                id_sesion: sesion.id_sesion,
                id_cargador: sesion.id_cargador,
                // CORRECCIÓN: Se envía tiempo en SEGUNDOS y como NÚMERO
                tiempo_transcurrido_seg: tiempoTranscurridoSeg,
                tiempo_restante_seg: tiempoRestanteSeg,
                duracion_estimada_min: sesion.duracion_estimada_min,
                // CORRECCIÓN: Se envía como NÚMERO
                monto_por_minuto: montoPorMinutoNum,
                monto_acumulado: montoAcumuladoNum,
                // CORRECCIÓN: Se elimina 'porcentaje_completado'
                timestamp: ahora.toISOString()
            };

            // Enviar a todos los suscriptores del cargador (usuario móvil principalmente)
            pubsub.broadcastToSubscribers(sesion.id_cargador, mensaje);

            console.log(`[SessionMonitor] Actualización enviada - Sesión ${sesion.id_sesion}: ${tiempoTranscurridoSeg} seg, $${montoAcumulado} MXN`);

        } catch (error) {
            console.error(`[SessionMonitor] Error procesando sesión ${sesion.id_sesion}:`, error);
        }
    }

    /**
     * Finaliza una sesión automáticamente cuando se agota el tiempo
     * @param {Object} sesion - Sesión de carga
     * @param {number} tiempoTranscurridoSeg - Tiempo transcurrido en SEGUNDOS
     * @param {string} montoFinal - Monto final a cobrar (string from toFixed)
     */
    static async finalizarSesionAutomatica(sesion, tiempoTranscurridoSeg, montoFinal) {
        try {
            const montoFinalNum = parseFloat(montoFinal);
            const tiempoTranscurridoMin = Math.ceil(tiempoTranscurridoSeg / 60); // Para guardar en DB

            // 1. Capturar el pago en Stripe
            let captureResult;
            try {
                captureResult = await StripeService.capturePaymentIntent(
                    sesion.id_pago_transaccion,
                    montoFinalNum
                );
                console.log(`[SessionMonitor] Pago capturado exitosamente: $${montoFinalNum} MXN`);
            } catch (stripeError) {
                console.error('[SessionMonitor] Error al capturar pago:', stripeError);
                // Continuar con la finalización pero registrar el error
            }

            // 2. Enviar comando STOP al IoT
            try {
                await IotService.sendCommand(sesion.id_cargador, 'STOP', {
                    sesionId: sesion.id_sesion,
                    razon: 'tiempo_completado'
                });
                console.log(`[SessionMonitor] Comando STOP enviado al cargador ${sesion.id_cargador}`);
            } catch (iotError) {
                console.error('[SessionMonitor] Error al enviar comando STOP al IoT:', iotError);
            }

            // 3. Actualizar estado del cargador a disponible
            await Cargador.update(
                { estado: 'disponible' },
                { where: { id_cargador: sesion.id_cargador } }
            );

            // 4. Actualizar la sesión como finalizada (tiempo en minutos para la DB)
            await sesion.update({
                estado: 'finalizada',
                fecha_fin: new Date(),
                monto_final: montoFinalNum,
                tiempo_transcurrido_min: tiempoTranscurridoMin
            });

            // 5. Notificar al usuario móvil que la sesión ha finalizado
            const mensajeFinal = {
                type: 'sesion_finalizada',
                razon: 'tiempo_completado',
                id_sesion: sesion.id_sesion,
                id_cargador: sesion.id_cargador,
                tiempo_transcurrido_min: tiempoTranscurridoMin,
                duracion_estimada_min: sesion.duracion_estimada_min,
                monto_cobrado: montoFinalNum,
                energia_consumida_kwh: sesion.energia_consumida_kwh ? parseFloat(sesion.energia_consumida_kwh) : 0,
                fecha_inicio: sesion.fecha_inicio,
                fecha_fin: new Date(),
                stripe_status: captureResult ? captureResult.status : 'error',
                timestamp: new Date().toISOString()
            };

            pubsub.broadcastToSubscribers(sesion.id_cargador, mensajeFinal);

            console.log(`[SessionMonitor] Sesión ${sesion.id_sesion} finalizada automáticamente - Usuario: ${sesion.id_usuario}, Monto: $${montoFinalNum} MXN`);

        } catch (error) {
            console.error(`[SessionMonitor] Error al finalizar sesión automáticamente ${sesion.id_sesion}:`, error);

            // Intentar marcar la sesión como fallida si hubo un error crítico
            try {
                await sesion.update({
                    estado: 'fallida',
                    fecha_fin: new Date()
                });
            } catch (updateError) {
                console.error('[SessionMonitor] Error al actualizar sesión como fallida:', updateError);
            }
        }
    }
}

module.exports = { SessionMonitorService };