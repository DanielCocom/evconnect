const { Estacion, Tarifa } = require("../models");

class StationService {
  /**
   * GET /api/stations
   * Lista todas las estaciones de la franquicia
   */
  static async getAllStations(franquiciaId) {
    try {
      const estaciones = await Estacion.findAll({
        where: { id_franquicia: franquiciaId },
        order: [['nombre_estacion', 'ASC']]
      });

      return estaciones;
    } catch (error) {
      console.error("Error en StationService.getAllStations:", error);
      throw new Error("Error al obtener estaciones");
    }
  }

  /**
   * POST /api/stations/:id/assign-rate
   * Asigna una tarifa a una estación
   */
  static async assignRateToStation(idEstacion, rateData, franquiciaId) {
    try {
      // Validar que la estación pertenece a la franquicia
      const estacion = await Estacion.findOne({
        where: { 
          id_estacion: idEstacion,
          id_franquicia: franquiciaId 
        }
      });

      if (!estacion) {
        const err = new Error("La estación no existe o no pertenece a tu franquicia");
        err.status = 404;
        throw err;
      }

      const { tipo_carga, costo_kw_h, costo_tiempo_min, fecha_inicio_vigencia, fecha_fin_vigencia } = rateData;

      // Crear nueva tarifa vinculada a la estación
      const tarifa = await Tarifa.create({
        id_estacion: idEstacion,
        tipo_carga,
        costo_kw_h,
        costo_tiempo_min,
        fecha_inicio_vigencia: fecha_inicio_vigencia || new Date(),
        fecha_fin_vigencia
      });

      return {
        message: "Tarifa asignada exitosamente",
        tarifa
      };
    } catch (error) {
      console.error("Error en StationService.assignRateToStation:", error);
      throw error;
    }
  }
}

module.exports = { StationService };
