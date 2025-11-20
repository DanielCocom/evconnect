const { SesionCarga, Cargador, User } = require('../models');
const { Op } = require('sequelize');
const pubsub = require('../ws/pubsub');
const { StripeService } = require('./stripe/stripe.service');
const { IotService } = require('./ws/iot.service');

/**
 * Servicio para monitorear sesiones de carga activas y enviar actualizaciones en tiempo real.
 * Este servicio se ejecuta cada minuto para todas las sesiones activas.
 */
class SessionMonitorService {
    static intervalId = null;
    static MONITOR_INTERVAL = 60000; // 60 segundos

    /**
     * Inicia el monitoreo de sesiones activas
     */
    static startMonitoring() {
        if (this.intervalId) {
            console.log('[SessionMonitor] Ya está en ejecución');
            return;
        }

        console.log('[SessionMonitor] Iniciando monitoreo de sesiones activas...');
        
        // Ejecutar inmediatamente
        this.checkActiveSessions();
        
        // Luego cada minuto
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
            const tiempoTranscurridoMs = ahora.getTime() - sesion.fecha_inicio.getTime();
            const tiempoTranscurridoMin = Math.floor(tiempoTranscurridoMs / 60000);
            const tiempoRestanteMin = Math.max(0, sesion.duracion_estimada_min - tiempoTranscurridoMin);
            
            // Calcular monto acumulado (por minutos completos)
            const montoAcumulado = (tiempoTranscurridoMin * sesion.monto_por_minuto).toFixed(2);

            // Actualizar tiempo transcurrido en la base de datos
            await sesion.update({
                tiempo_transcurrido_min: tiempoTranscurridoMin
            });

            // Verificar si el tiempo se ha agotado
            if (tiempoRestanteMin === 0 && tiempoTranscurridoMin >= sesion.duracion_estimada_min) {
                console.log(`[SessionMonitor] Sesión ${sesion.id_sesion} ha alcanzado el tiempo límite. Finalizando...`);
                await this.finalizarSesionAutomatica(sesion, tiempoTranscurridoMin, montoAcumulado);
                return;
            }

            // Enviar actualización en tiempo real al usuario móvil vía WebSocket
            const mensaje = {
                type: 'carga_en_progreso',
                id_sesion: sesion.id_sesion,
                id_cargador: sesion.id_cargador,
                tiempo_transcurrido_min: tiempoTranscurridoMin,
                tiempo_restante_min: tiempoRestanteMin,
                duracion_estimada_min: sesion.duracion_estimada_min,
                monto_por_minuto: sesion.monto_por_minuto,
                monto_acumulado: parseFloat(montoAcumulado),
                porcentaje_completado: Math.min(100, Math.round((tiempoTranscurridoMin / sesion.duracion_estimada_min) * 100)),
                timestamp: ahora.toISOString()
            };

            // Enviar a todos los suscriptores del cargador (usuario móvil principalmente)
            pubsub.broadcastToSubscribers(sesion.id_cargador, mensaje);

            console.log(`[SessionMonitor] Actualización enviada - Sesión ${sesion.id_sesion}: ${tiempoTranscurridoMin}/${sesion.duracion_estimada_min} min, $${montoAcumulado} MXN`);

        } catch (error) {
            console.error(`[SessionMonitor] Error procesando sesión ${sesion.id_sesion}:`, error);
        }
    }

    /**
     * Finaliza una sesión automáticamente cuando se agota el tiempo
     * @param {Object} sesion - Sesión de carga
     * @param {number} tiempoTranscurrido - Tiempo transcurrido en minutos
     * @param {string} montoFinal - Monto final a cobrar
     */
    static async finalizarSesionAutomatica(sesion, tiempoTranscurrido, montoFinal) {
        try {
            const montoFinalNum = parseFloat(montoFinal);

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

            // 4. Actualizar la sesión como finalizada
            await sesion.update({
                estado: 'finalizada',
                fecha_fin: new Date(),
                monto_final: montoFinalNum,
                tiempo_transcurrido_min: tiempoTranscurrido
            });

            // 5. Notificar al usuario móvil que la sesión ha finalizado
            const mensajeFinal = {
                type: 'sesion_finalizada',
                razon: 'tiempo_completado',
                id_sesion: sesion.id_sesion,
                id_cargador: sesion.id_cargador,
                tiempo_transcurrido_min: tiempoTranscurrido,
                duracion_estimada_min: sesion.duracion_estimada_min,
                monto_cobrado: montoFinalNum,
                energia_consumida_kwh: sesion.energia_consumida_kwh,
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
