const { ReporteService } = require("../services/reporte.service");

class ReporteController {
    
    /**
     * GET /api/admin/reports/sessions
     * Obtiene el historial de sesiones de carga, filtrado por las estaciones
     * que pertenecen a la franquicia del usuario autenticado.
     */
    static async getChargeSessions(req, res) {
        try {
          
            const id_franquicia = req.user.franquiciaId 
            
            if (!id_franquicia) {
                // Si el usuario no tiene una franquicia asociada, no puede acceder a reportes de franquicia.
                return res.error(403, 'Acceso denegado. El usuario no está asociado a una franquicia para ver reportes.');
            }

            // Opcional: Obtener filtros de query params
            const { estado, fecha_inicio, fecha_fin } = req.query;
            const filter = { estado, fecha_inicio, fecha_fin };
            
            const sessions = await ReporteService.getChargeSessionsByFranchise(id_franquicia, filter);
            return res.ok(sessions, 'Listado de sesiones de carga.');
        } catch (err) {
            console.error('Error en ReporteController.getChargeSessions:', err);
            return res.error(err.status || 500, err.message || 'Error al obtener las sesiones de carga.');
        }
    }
    /**
     * GET /api/admin/reports/sessions/:id_sesion
     * Obtiene el detalle de una sesión específica, verificando la pertenencia a la franquicia.
     */
    static async getChargeSessionDetail(req, res) {
        try {
            const id_sesion = Number(req.params.id_sesion);
            const id_franquicia = req.user.franquiciaId; // Del token

            if (!id_sesion || isNaN(id_sesion)) {
                return res.error(400, 'ID de sesión inválido.');
            }
            if (!id_franquicia) {
                return res.error(403, 'Acceso denegado. El usuario no está asociado a una franquicia.');
            }

            const sessionDetail = await ReporteService.getChargeSessionDetail(id_sesion, id_franquicia);
            return res.ok(sessionDetail, 'Detalle de la sesión de carga.');
        } catch (err) {
            console.error('Error en ReporteController.getChargeSessionDetail:', err);
            // Reutiliza el código de estado y mensaje del servicio (404 si no se encontró/acceso denegado)
            return res.error(err.status || 500, err.message || 'Error al obtener el detalle de la sesión.');
        }
    }
}

module.exports = { ReporteController };