const { Cargador, SesionCarga, AlertaEvento, Estacion, sequelize } = require("../models");
const { Op } = require("sequelize");

class DashboardService {
  /**
   * GET /api/dashboard/stats
   * Obtiene métricas clave del dashboard
   */
  static async getStats(franquiciaId) {
    try {
      const hoy = new Date();
      const inicioDelDia = new Date(hoy.setHours(0, 0, 0, 0));
      const finDelDia = new Date(hoy.setHours(23, 59, 59, 999));

      // 1. Estaciones Disponibles/Totales (por cargadores)
      const cargadoresStats = await Cargador.findAll({
        attributes: [
          'estado',
          [sequelize.fn('COUNT', sequelize.col('Cargador.id_cargador')), 'total']
        ],
        include: [{
          model: Estacion,
          attributes: [],
          required: true,
          where: { id_franquicia: franquiciaId }
        }],
        group: ['estado'],
        raw: true
      });

      const totalCargadores = cargadoresStats.reduce((sum, stat) => sum + parseInt(stat.total), 0);
      const disponibles = cargadoresStats.find(s => s.estado === 'disponible')?.total || 0;

      // 2. Ingresos Hoy
      const ingresosHoy = await SesionCarga.sum('monto_final', {
        where: {
          estado: 'finalizada',
          fecha_fin: {
            [Op.between]: [inicioDelDia, finDelDia]
          }
        },
        include: [{
          model: Cargador,
          required: true,
          attributes: [],
          include: [{
            model: Estacion,
            required: true,
            attributes: [],
            where: { id_franquicia: franquiciaId }
          }]
        }]
      }) || 0;

      // 3. Energía Entregada Hoy
      const energiaHoy = await SesionCarga.sum('energia_consumida_kwh', {
        where: {
          estado: 'finalizada',
          fecha_fin: {
            [Op.between]: [inicioDelDia, finDelDia]
          }
        },
        include: [{
          model: Cargador,
          required: true,
          attributes: [],
          include: [{
            model: Estacion,
            required: true,
            attributes: [],
            where: { id_franquicia: franquiciaId }
          }]
        }]
      }) || 0;

      // 4. Fallas Activas
      const fallasActivas = await AlertaEvento.count({
        where: { estado: 'activo' },
        include: [{
          model: Estacion,
          required: true,
          attributes: [],
          where: { id_franquicia: franquiciaId }
        }]
      });

      return {
        estacionesDisponibles: parseInt(disponibles),
        estacionesTotales: totalCargadores,
        ingresosHoy: parseFloat(ingresosHoy).toFixed(2),
        energiaHoy: parseFloat(energiaHoy).toFixed(2),
        fallasActivas
      };
    } catch (error) {
      console.error("Error en DashboardService.getStats:", error);
      throw new Error("Error al obtener estadísticas del dashboard");
    }
  }

  /**
   * GET /api/dashboard/active-alerts
   * Obtiene alertas activas
   */
  static async getActiveAlerts(franquiciaId) {
    try {
      const alertas = await AlertaEvento.findAll({
        where: { estado: 'activo' },
        include: [{
          model: Estacion,
          required: true,
          where: { id_franquicia: franquiciaId },
          attributes: ['nombre_estacion']
        }, {
          model: Cargador,
          required: false,
          attributes: ['id_cargador', 'tipo_carga']
        }],
        order: [['fecha_evento', 'DESC']],
        limit: 10
      });

      return alertas;
    } catch (error) {
      console.error("Error en DashboardService.getActiveAlerts:", error);
      throw new Error("Error al obtener alertas activas");
    }
  }

  /**
   * GET /api/dashboard/energy-chart
   * Obtiene datos de energía para gráfica (últimas 24 horas)
   */
  static async getEnergyChart(franquiciaId) {
    try {
      const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const datos = await SesionCarga.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('fecha_inicio'), '%Y-%m-%d %H:00:00'), 'hora'],
          [sequelize.fn('SUM', sequelize.col('energia_consumida_kwh')), 'energia']
        ],
        where: {
          estado: 'finalizada',
          fecha_inicio: {
            [Op.gte]: hace24h
          }
        },
        include: [{
          model: Cargador,
          required: true,
          attributes: [],
          include: [{
            model: Estacion,
            required: true,
            attributes: [],
            where: { id_franquicia: franquiciaId }
          }]
        }],
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('fecha_inicio'), '%Y-%m-%d %H:00:00')],
        order: [[sequelize.fn('DATE_FORMAT', sequelize.col('fecha_inicio'), '%Y-%m-%d %H:00:00'), 'ASC']],
        raw: true
      });

      return datos.map(d => ({
        hora: d.hora,
        energia: parseFloat(d.energia || 0).toFixed(2)
      }));
    } catch (error) {
      console.error("Error en DashboardService.getEnergyChart:", error);
      throw new Error("Error al obtener datos de energía");
    }
  }
}

module.exports = { DashboardService };
