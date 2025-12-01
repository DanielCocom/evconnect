const { SesionCarga, Cargador, User } = require('../models');
const { Op } = require('sequelize');
const pubsub = require('../ws/pubsub');
const { StripeService } = require('./stripe/stripe.service');
const { IotService } = require('./ws/iot.service');

class SessionMonitorService {
    static intervalId = null;
    static MONITOR_INTERVAL = 1000; // 5 segundos

    // ======================================================
    // 🔥 HELPER NATIVO: CONVERTIR UTC ↔ MÉXICO
    // ======================================================
    static toMexico(dateUtc) {
        return new Date(
            new Date(dateUtc).toLocaleString("en-US", {
                timeZone: "America/Mexico_City"
            })
        );
    }
    static nowMexico() {
        return this.toMexico(new Date());
    }
    // ======================================================
    // 🔥 INICIO MONITOR
    // ======================================================
    static startMonitoring() {
        if (this.intervalId) {
            console.log('[SessionMonitor] Ya está en ejecución');
            return;
        }

        console.log(`[SessionMonitor] Iniciando monitoreo cada ${this.MONITOR_INTERVAL / 1000}s...`);

        this.checkActiveSessions();

        this.intervalId = setInterval(() => {
            this.checkActiveSessions();
        }, this.MONITOR_INTERVAL);
    }

    static stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[SessionMonitor] Monitoreo detenido');
        }
    }

    // ======================================================
    // 🔥 BUSCAR SESIONES ACTIVAS
    // ======================================================
    static async checkActiveSessions() {
        try {
            const sesionesActivas = await SesionCarga.findAll({
                where: { estado: 'activa' },
                include: [
                    { model: Cargador, as: 'Cargador' },
                    { model: User, as: 'Usuario', attributes: ['id_usuario', 'nombre', 'email'] }
                ]
            });

            if (sesionesActivas.length === 0) return;

            console.log(`[SessionMonitor] Verificando ${sesionesActivas.length} sesiones activas`);

            for (const sesion of sesionesActivas) {
                await this.processSingleSession(sesion);
            }

        } catch (error) {
            console.error('[SessionMonitor] Error al verificar sesiones activas:', error);
        }
    }

    // ======================================================
    // 🔥 PROCESAR UNA SESIÓN
    // ======================================================
    static async processSingleSession(sesion) {
        try {
            const ahora = this.nowMexico();

            // Convertimos fecha_inicio de la BD (UTC) → México
            const inicioMX = this.toMexico(sesion.fecha_inicio);

            const tiempoTranscurridoMs = Math.max(0, ahora.getTime() - inicioMX.getTime());
            const tiempoTranscurridoSeg = Math.floor(tiempoTranscurridoMs / 1000);

            const montoPorMinutoNum = parseFloat(sesion.monto_por_minuto);
            const montoPorSegundo = montoPorMinutoNum / 60;

            const montoAcumulado = (tiempoTranscurridoSeg * montoPorSegundo).toFixed(2);
            const montoAcumuladoNum = parseFloat(montoAcumulado);

            // Tiempo restante
            const duracionEstimadaSeg = sesion.duracion_estimada_min * 60;
            const tiempoRestanteSeg = Math.max(0, duracionEstimadaSeg - tiempoTranscurridoSeg);

            // Finalizar si ya terminó
            if (tiempoRestanteSeg === 0 && tiempoTranscurridoSeg >= duracionEstimadaSeg) {
                console.log(`[SessionMonitor] Sesión ${sesion.id_sesion} tiempo agotado. Finalizando...`);
                await this.finalizarSesionAutomatica(sesion, tiempoTranscurridoSeg, montoAcumulado);
                return;
            }

            // Enviar actualización
            const mensaje = {
                type: 'carga_en_progreso',
                id_sesion: sesion.id_sesion,
                id_cargador: sesion.id_cargador,
                tiempo_transcurrido_seg: tiempoTranscurridoSeg,
                tiempoRestanteSeg,
                duracion_estimada_min: sesion.duracion_estimada_min,
                monto_por_minuto: montoPorMinutoNum,
                monto_acumulado: montoAcumuladoNum,
                timestamp: ahora.toISOString()
            };

            pubsub.broadcastToSubscribers(sesion.id_cargador, mensaje);

            console.log(`[SessionMonitor] Sesión ${sesion.id_sesion}: ${tiempoTranscurridoSeg} seg, $${montoAcumulado} MXN`);

        } catch (error) {
            console.error(`[SessionMonitor] Error procesando sesión ${sesion.id_sesion}:`, error);
        }
    }

    // ======================================================
    // 🔥 FINALIZACIÓN AUTOMÁTICA
    // ======================================================
    static async finalizarSesionAutomatica(sesion, tiempoTranscurridoSeg, montoFinal) {
        try {
            const montoFinalNum = parseFloat(montoFinal);
            const tiempoTranscurridoMin = Math.ceil(tiempoTranscurridoSeg / 60);

            let captureResult;

            try {
                captureResult = await StripeService.capturePaymentIntent(
                    sesion.id_pago_transaccion,
                    montoFinalNum
                );
            } catch (stripeError) {
                console.error('[SessionMonitor] Error al capturar pago:', stripeError);
            }

            try {
                await IotService.sendCommand(sesion.id_cargador, false, {
                    sesionId: sesion.id_sesion,
                    razon: 'tiempo_completado'
                });
            } catch (err) {
                console.error('[SessionMonitor] Error STOP IoT:', err);
            }

            await Cargador.update(
                { estado: 'disponible' },
                { where: { id_cargador: sesion.id_cargador } }
            );

            await sesion.update({
                estado: 'finalizada',
                fecha_fin: new Date(), // se guarda UTC (correcto)
                monto_final: montoFinalNum,
                tiempo_transcurrido_min: tiempoTranscurridoMin
            });

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

            console.log(`[SessionMonitor] Sesión ${sesion.id_sesion} finalizada automáticamente.`);

        } catch (error) {
            console.error(`[SessionMonitor] Error finalizando sesión ${sesion.id_sesion}:`, error);
            try {
                await sesion.update({
                    estado: 'fallida',
                    fecha_fin: new Date()
                });
            } catch (err) {
                console.error('[SessionMonitor] Error al marcar como fallida:', err);
            }
        }
    }
}

module.exports = { SessionMonitorService };
