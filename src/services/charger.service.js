const { Cargador, Estacion, AlertaEvento } = require("../models");

class ChargerService {
  /**
   * GET /api/chargers
   * Lista todos los cargadores de la franquicia
   */
  static async getAllChargers(franquiciaId) {
    try {
      const cargadores = await Cargador.findAll({
        include: [{
          model: Estacion,
          required: true,
          where: { id_franquicia: franquiciaId },
          attributes: ['nombre_estacion', 'direccion']
        }],
        order: [['id_cargador', 'DESC']]
      });

      return cargadores;
    } catch (error) {
      console.error("Error en ChargerService.getAllChargers:", error);
      throw new Error("Error al obtener cargadores");
    }
  }

  /**
   * POST /api/chargers
   * Crea un nuevo cargador
   */
  static async createCharger(data, franquiciaId) {
    try {
      const { id_estacion, tipo_carga, capacidad_kw, estado, firmware_version } = data;

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

      const cargador = await Cargador.create({
        id_estacion,
        tipo_carga,
        capacidad_kw,
        estado: estado || 'disponible',
        firmware_version,
        fecha_instalacion: new Date()
      });

      // Actualizar contador de cargadores en la estación
      await Estacion.increment('total_cargadores', { 
        where: { id_estacion } 
      });

      return cargador;
    } catch (error) {
      console.error("Error en ChargerService.createCharger:", error);
      throw error;
    }
  }

  /**
   * GET /api/chargers/:id
   * Obtiene un cargador específico
   */
  static async getChargerById(id, franquiciaId) {
    try {
      const cargador = await Cargador.findOne({
        where: { id_cargador: id },
        include: [{
          model: Estacion,
          required: true,
          where: { id_franquicia: franquiciaId },
          attributes: ['id_estacion', 'nombre_estacion', 'direccion']
        }]
      });

      if (!cargador) {
        const err = new Error("Cargador no encontrado");
        err.status = 404;
        throw err;
      }

      return cargador;
    } catch (error) {
      console.error("Error en ChargerService.getChargerById:", error);
      throw error;
    }
  }

  /**
   * PUT /api/chargers/:id
   * Actualiza un cargador
   */
  static async updateCharger(id, data, franquiciaId) {
    try {
      const cargador = await Cargador.findOne({
        where: { id_cargador: id },
        include: [{
          model: Estacion,
          required: true,
          where: { id_franquicia: franquiciaId }
        }]
      });

      if (!cargador) {
        const err = new Error("Cargador no encontrado");
        err.status = 404;
        throw err;
      }

      const { tipo_carga, capacidad_kw, estado, firmware_version } = data;

      await cargador.update({
        tipo_carga: tipo_carga || cargador.tipo_carga,
        capacidad_kw: capacidad_kw || cargador.capacidad_kw,
        estado: estado || cargador.estado,
        firmware_version: firmware_version || cargador.firmware_version
      });

      return cargador;
    } catch (error) {
      console.error("Error en ChargerService.updateCharger:", error);
      throw error;
    }
  }

  /**
   * POST /api/chargers/:id/reset
   * Reinicia un cargador (cambia estado y registra evento)
   */
  static async resetCharger(id, franquiciaId) {
    try {
      const cargador = await Cargador.findOne({
        where: { id_cargador: id },
        include: [{
          model: Estacion,
          required: true,
          where: { id_franquicia: franquiciaId }
        }]
      });

      if (!cargador) {
        const err = new Error("Cargador no encontrado");
        err.status = 404;
        throw err;
      }

      // Cambiar estado temporalmente
      await cargador.update({ estado: 'reiniciando' });

      // Registrar evento
      await AlertaEvento.create({
        id_estacion: cargador.id_estacion,
        id_cargador: cargador.id_cargador,
        tipo_evento: 'reset_manual',
        descripcion: 'Reinicio manual del cargador desde backoffice',
        nivel_gravedad: 'bajo',
        estado: 'resuelto',
        fecha_evento: new Date()
      });

      // Simular reset (en producción esto enviaría comando al hardware)
      setTimeout(async () => {
        await cargador.update({ estado: 'disponible' });
      }, 5000);

      return { 
        message: 'Reinicio iniciado',
        cargador 
      };
    } catch (error) {
      console.error("Error en ChargerService.resetCharger:", error);
      throw error;
    }
  }
}

module.exports = { ChargerService };
