const { RateService } = require("../services/rate.service");

class RateController {
  /**
   * GET /api/rates
   */
  static async getAllRates(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const rates = await RateService.getAllRates(franquiciaId);
      return res.ok(rates, "Tarifas obtenidas correctamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener tarifas"
      );
    }
  }

  /**
   * POST /api/rates
   */
  static async createRate(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const { id_estacion, tipo_carga, costo_kw_h, costo_tiempo_min } = req.body;
      if (!id_estacion || !tipo_carga || costo_kw_h === undefined || costo_tiempo_min === undefined) {
        return res.error(422, "Campos requeridos: id_estacion, tipo_carga, costo_kw_h, costo_tiempo_min");
      }

      const rate = await RateService.createRate(req.body, franquiciaId);
      return res.created(rate, "Tarifa creada exitosamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al crear tarifa"
      );
    }
  }

  /**
   * GET /api/rates/:id
   */
  static async getRateById(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const { id } = req.params;
      const rate = await RateService.getRateById(id, franquiciaId);
      return res.ok(rate, "Tarifa obtenida");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener tarifa"
      );
    }
  }

  /**
   * PUT /api/rates/:id
   */
  static async updateRate(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const { id } = req.params;
      const rate = await RateService.updateRate(id, req.body, franquiciaId);
      return res.ok(rate, "Tarifa actualizada exitosamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al actualizar tarifa"
      );
    }
  }
}

module.exports = { RateController };
