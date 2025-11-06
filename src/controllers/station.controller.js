const { StationService } = require("../services/station.service");

class StationController {
  /**
   * GET /api/stations
   */
  static async getAllStations(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const stations = await StationService.getAllStations(franquiciaId);
      return res.ok(stations, "Estaciones obtenidas correctamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener estaciones"
      );
    }
  }

  /**
   * POST /api/stations/:id/assign-rate
   */
  static async assignRateToStation(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const { id } = req.params;
      const { tipo_carga, costo_kw_h, costo_tiempo_min } = req.body;

      if (!tipo_carga || costo_kw_h === undefined || costo_tiempo_min === undefined) {
        return res.error(422, "Campos requeridos: tipo_carga, costo_kw_h, costo_tiempo_min");
      }

      const result = await StationService.assignRateToStation(id, req.body, franquiciaId);
      return res.created(result, "Tarifa asignada exitosamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al asignar tarifa"
      );
    }
  }
}

module.exports = { StationController };
