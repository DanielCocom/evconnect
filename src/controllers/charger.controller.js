const { ChargerService } = require("../services/charger.service");

class ChargerController {
  /**
   * GET /api/chargers
   */
  static async getAllChargers(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const chargers = await ChargerService.getAllChargers(franquiciaId);
      return res.ok(chargers, "Cargadores obtenidos correctamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener cargadores"
      );
    }
  }

  /**
   * POST /api/chargers
   */
  static async createCharger(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const { id_estacion, tipo_carga, capacidad_kw } = req.body;
      if (!id_estacion || !tipo_carga || !capacidad_kw) {
        return res.error(422, "Campos requeridos: id_estacion, tipo_carga, capacidad_kw");
      }

      const charger = await ChargerService.createCharger(req.body, franquiciaId);
      return res.created(charger, "Cargador creado exitosamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al crear cargador"
      );
    }
  }

  /**
   * GET /api/chargers/:id
   */
  static async getChargerById(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const { id } = req.params;
      const charger = await ChargerService.getChargerById(id, franquiciaId);
      return res.ok(charger, "Cargador obtenido");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener cargador"
      );
    }
  }

  /**
   * PUT /api/chargers/:id
   */
  static async updateCharger(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const { id } = req.params;
      const charger = await ChargerService.updateCharger(id, req.body, franquiciaId);
      return res.ok(charger, "Cargador actualizado exitosamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al actualizar cargador"
      );
    }
  }

  /**
   * POST /api/chargers/:id/reset
   */
  static async resetCharger(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const { id } = req.params;
      const result = await ChargerService.resetCharger(id, franquiciaId);
      return res.ok(result, "Cargador reiniciado exitosamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al reiniciar cargador"
      );
    }
  }
}

module.exports = { ChargerController };
