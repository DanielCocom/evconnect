const { SesionCargaService } = require("../services/sesionCarga.service");

class SesionCargaController {
    /**
     * POST /api/sessions/start
     * Inicia el proceso de carga: valida cargador, calcula costo fijo, autoriza Stripe y crea SesionCarga.
     */
    static async startSession(req, res) {
        try {
            const userId = req.userId;
            const { id_cargador, duration_minutes, tipo_carga } = req.body;

            // 1. Validaciones de entrada
            if (!id_cargador || !duration_minutes || !tipo_carga) {
                return res.error(422, 'Campos requeridos: id_cargador, duration_minutes, tipo_carga');
            }
            if (duration_minutes <= 0) {
                 return res.error(422, 'La duración debe ser mayor a cero minutos');
            }
            if (duration_minutes > 120) { // Límite de 2 horas (configurable)
                 return res.error(422, 'La duración máxima de la sesión es de 120 minutos');
            }

            const result = await SesionCargaService.startChargeSession(
                userId,
                Number(id_cargador),
                tipo_carga,
                Number(duration_minutes)
            );

            return res.created(result, 'Sesión de carga iniciada y pago retenido con éxito');
        } catch (err) {
            console.error('Error en SesionCargaController.startSession:', err);
             return res.error(err.status || 500, err.message || 'Error al iniciar la sesión de carga');
        }
    }

    /**
     * POST /api/sessions/stop/:id
     * Finaliza la carga manualmente: envía comando a IoT y captura el pago fijo.
     */
    static async stopSession(req, res) {
        try {
            const userId = req.userId;
            const sessionId = Number(req.params.id);

            if (isNaN(sessionId)) {
                return res.error(422, 'ID de sesión inválido');
            }

            const result = await SesionCargaService.completeChargeSession(sessionId, userId);
            return res.ok(result, 'Sesión de carga finalizada y cobro completado');
        } catch (err) {
            console.error('Error en SesionCargaController.stopSession:', err);
             return res.error(err.status || 500, err.message || 'Error al finalizar la sesión');
        }
    }

    /**
     * GET /api/sessions/active
     * Obtiene el estado de la sesión activa del usuario (para polling de la App Móvil).
     */
    static async getActiveSession(req, res) {
         try {
            const userId = req.userId;
            const status = await SesionCargaService.getActiveSessionStatus(userId);

            if (!status) {
                return res.ok(null, 'No hay sesiones activas');
            }

            return res.ok(status, 'Estado de sesión activa');
        } catch (err) {
            console.error('Error en SesionCargaController.getActiveSession:', err);
             return res.error(err.status || 500, err.message || 'Error al obtener estado de sesión');
        }
    }
}

module.exports = { SesionCargaController };