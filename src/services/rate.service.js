const { Tarifa, Estacion } = require("../models");

class RateService {
  /**
   * GET /api/rates
   * Lista todas las tarifas
   */
  static async getAllRates(franquiciaId) {
    try {
      const tarifas = await Tarifa.findAll({
        include: [{
          model: Estacion,
          required: true,
          where: { id_franquicia: franquiciaId },
          attributes: ['nombre_estacion', 'direccion']
        }],
        order: [['fecha_inicio_vigencia', 'DESC']]
      });

      return tarifas;
    } catch (error) {
      console.error("Error en RateService.getAllRates:", error);
      throw new Error("Error al obtener tarifas");
    }
  }

  /**
   * POST /api/rates
   * Crea una nueva tarifa
   */
  static async createRate(data, franquiciaId) {
    try {
      const { id_estacion, tipo_carga, costo_kw_h, costo_tiempo_min, fecha_inicio_vigencia, fecha_fin_vigencia } = data;

      // Validar que la estación pertenece a la franquicia
      const estacion = await Estacion.findOne({
        where: { 
          id_estacion,
          id_franquicia: franquiciaId 
        }
      });

      if (!estacion) {
        const err = new Error("La estación no existe o no pertenece a tu franquicia");
        err.status = 404;
        throw err;
      }

      const tarifa = await Tarifa.create({
        id_estacion,
        tipo_carga,
        costo_kw_h,
        costo_tiempo_min,
        fecha_inicio_vigencia: fecha_inicio_vigencia || new Date(),
        fecha_fin_vigencia
      });

      return tarifa;
    } catch (error) {
      console.error("Error en RateService.createRate:", error);
      throw error;
    }
  }

  /**
   * GET /api/rates/:id
   * Obtiene una tarifa específica
   */
  static async getRateById(id, franquiciaId) {
    try {
      const tarifa = await Tarifa.findOne({
        where: { id_tarifa: id },
        include: [{
          model: Estacion,
          required: true,
          where: { id_franquicia: franquiciaId },
          attributes: ['id_estacion', 'nombre_estacion']
        }]
      });

      if (!tarifa) {
        const err = new Error("Tarifa no encontrada");
        err.status = 404;
        throw err;
      }

      return tarifa;
    } catch (error) {
      console.error("Error en RateService.getRateById:", error);
      throw error;
    }
  }

  /**
   * PUT /api/rates/:id
   * Actualiza una tarifa
   */
  static async updateRate(id, data, franquiciaId) {
    try {
      const tarifa = await Tarifa.findOne({
        where: { id_tarifa: id },
        include: [{
          model: Estacion,
          required: true,
          where: { id_franquicia: franquiciaId }
        }]
      });

      if (!tarifa) {
        const err = new Error("Tarifa no encontrada");
        err.status = 404;
        throw err;
      }

      const { costo_kw_h, costo_tiempo_min, fecha_fin_vigencia } = data;

      await tarifa.update({
        costo_kw_h: costo_kw_h !== undefined ? costo_kw_h : tarifa.costo_kw_h,
        costo_tiempo_min: costo_tiempo_min !== undefined ? costo_tiempo_min : tarifa.costo_tiempo_min,
        fecha_fin_vigencia: fecha_fin_vigencia !== undefined ? fecha_fin_vigencia : tarifa.fecha_fin_vigencia
      });

      return tarifa;
    } catch (error) {
      console.error("Error en RateService.updateRate:", error);
      throw error;
    }
  }
}

module.exports = { RateService };
