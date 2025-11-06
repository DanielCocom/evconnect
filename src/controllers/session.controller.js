const { SessionService } = require("../services/session.service");

class SessionController {
  /**
   * GET /api/sessions
   */
  static async getAllSessions(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await SessionService.getAllSessions(franquiciaId, page, limit);
      return res.ok(result, "Sesiones obtenidas correctamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener sesiones"
      );
    }
  }

  /**
   * GET /api/sessions/export
   */
  static async exportSessions(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const csv = await SessionService.exportSessions(franquiciaId);
      
      // Configurar headers para descarga de archivo
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sesiones_${Date.now()}.csv`);
      
      return res.send(csv);
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al exportar sesiones"
      );
    }
  }
}

module.exports = { SessionController };
