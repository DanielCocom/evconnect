const { DashboardService } = require("../services/dashboard.service");

class DashboardController {
  /**
   * GET /api/dashboard/stats
   */
  static async getStats(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const stats = await DashboardService.getStats(franquiciaId);
      return res.ok(stats, "Estadísticas obtenidas correctamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener estadísticas"
      );
    }
  }

  /**
   * GET /api/dashboard/active-alerts
   */
  static async getActiveAlerts(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const alerts = await DashboardService.getActiveAlerts(franquiciaId);
      return res.ok(alerts, "Alertas activas obtenidas");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener alertas"
      );
    }
  }

  /**
   * GET /api/dashboard/energy-chart
   */
  static async getEnergyChart(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const data = await DashboardService.getEnergyChart(franquiciaId);
      return res.ok(data, "Datos de energía obtenidos");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener datos de energía"
      );
    }
  }
}

module.exports = { DashboardController };
