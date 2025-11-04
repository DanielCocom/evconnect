const {
  SesionCarga,
  Estacion,
  Cargador,
  sequelize,
} = require("../models"); // Importamos desde el index de modelos
const { Op } = require("sequelize");

class FranchiseService {

  static async getDashboardStats(franquiciaId) {
    try {
      // Usamos Promise.all para ejecutar todas las consultas en paralelo
      const [
        totales,
        ingresosHoy,
        activas,
        cargadores,
      ] = await Promise.all([
        this._getTotales(franquiciaId),
        this._getIngresosDiarios(franquiciaId),
        this._getSesionesActivas(franquiciaId),
        this._getEstadoCargadores(franquiciaId),
      ]);

      return {
        energiaTotal: parseFloat(totales.energiaTotal || 0),
        ingresosTotales: parseFloat(totales.ingresosTotales || 0),
        ingresosDiarios: parseFloat(ingresosHoy || 0),
        sesionesActivas: activas || 0,
        estadoCargadores: cargadores,
      };
    } catch (error) {
      console.error("Error en FranchiseService.getDashboardStats:", error);
      throw new Error("Error al calcular estadísticas del dashboard");
    }
  }

  // --- Métodos privados de consulta ---

  /**
   * REQ 1 & 2 (Totales): Obtiene Energía e Ingresos totales.
   */
  static async _getTotales(franquiciaId) {
    // Usamos findOne con funciones de agregación para obtener ambos
    // totales en una sola consulta eficiente.
    const result = await SesionCarga.findOne({
      attributes: [
        [
          sequelize.fn("SUM", sequelize.col("energia_consumida_kwh")),
          "energiaTotal",
        ],
        [sequelize.fn("SUM", sequelize.col("monto_final")), "ingresosTotales"],
      ],
      where: { estado: "finalizada" },
      include: [
        {
          model: Cargador,
          attributes: [], // No necesitamos atributos del cargador
          required: true,
          include: [
            {
              model: Estacion,
              attributes: [], // No necesitamos atributos de la estación
              required: true,
              where: { id_franquicia: franquiciaId }, // Filtro clave
            },
          ],
        },
      ],
      raw: true, // Devuelve un objeto JSON plano
    });
    return result;
  }

  /**
   * REQ 2 (Diarios): Obtiene Ingresos del día.
   */
  static async _getIngresosDiarios(franquiciaId) {
    const hoy = new Date();
    const inicioDelDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDelDia = new Date(hoy.setHours(23, 59, 59, 999));

    return SesionCarga.sum("monto_final", {
      where: {
        estado: "finalizada",
        fecha_fin: {
          [Op.between]: [inicioDelDia, finDelDia],
        },
      },
      include: [
        {
          model: Cargador,
          required: true,
          attributes: [],
          include: [
            {
              model: Estacion,
              required: true,
              attributes: [],
              where: { id_franquicia: franquiciaId },
            },
          ],
        },
      ],
    });
  }

  /**
   * REQ 3: Obtiene el número de Sesiones Activas.
   */
  static async _getSesionesActivas(franquiciaId) {
    return SesionCarga.count({
      where: { estado: "en_progreso" },
      include: [
        {
          model: Cargador,
          required: true,
          attributes: [],
          include: [
            {
              model: Estacion,
              required: true,
              attributes: [],
              where: { id_franquicia: franquiciaId },
            },
          ],
        },
      ],
    });
  }

  /**
   * REQ 4: Obtiene el estado de cada cargador de la franquicia.
   */
  static async _getEstadoCargadores(franquiciaId) {
    return Cargador.findAll({
      attributes: ["id_cargador", "estado", "id_estacion"],
      include: [
        {
          model: Estacion,
          required: true,
          attributes: [], // Solo usamos Estacion para filtrar
          where: { id_franquicia: franquiciaId },
        },
      ],
    });
  }
}

module.exports = { FranchiseService };