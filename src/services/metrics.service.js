const { LecturaIot, AlertaEvento } = require('../models');

const MVP_CONFIG = {
  CHARGER_ID: 1
};

class MetricsService {
  /**
   * Guardar lectura del INA219
   */
  static async saveReading(sessionId, metrics) {
    try {
      const reading = await LecturaIot.create({
        id_sesion: sessionId,
        id_cargador: MVP_CONFIG.CHARGER_ID,
        voltaje: metrics.v,
        corriente: metrics.a,
        potencia: metrics.w,
        timestamp: new Date(metrics.ts * 1000) // Unix timestamp a Date
      });

      return reading;
    } catch (error) {
      console.error('Error guardando lectura IoT:', error);
      // No lanzar error para no interrumpir el flujo
      return null;
    }
  }

  /**
   * Crear alerta de emergencia
   */
  static async createEmergencyAlert(sessionId, reason = 'Botón de emergencia activado') {
    try {
      const alert = await AlertaEvento.create({
        id_cargador: MVP_CONFIG.CHARGER_ID,
        id_estacion: null, // Para MVP no lo usamos
        tipo: 'paro_emergencia',
        severidad: 'critica',
        descripcion: reason,
        fecha: new Date(),
        resuelto: false
      });

      console.log(`🚨 Alerta de emergencia creada: ${alert.id_alerta}`);

      return alert;
    } catch (error) {
      console.error('Error creando alerta:', error);
      return null;
    }
  }

  /**
   * Obtener últimas lecturas de una sesión
   */
  static async getSessionReadings(sessionId, limit = 20) {
    try {
      const readings = await LecturaIot.findAll({
        where: { id_sesion: sessionId },
        order: [['timestamp', 'DESC']],
        limit: limit
      });

      return readings;
    } catch (error) {
      console.error('Error obteniendo lecturas:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de sesión
   */
  static async getSessionStats(sessionId) {
    try {
      const { sequelize } = require('../models');
      
      const [results] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_readings,
          AVG(voltaje) as avg_voltage,
          AVG(corriente) as avg_current,
          AVG(potencia) as avg_power,
          MAX(potencia) as max_power,
          MIN(voltaje) as min_voltage,
          MAX(voltaje) as max_voltage
        FROM lectura_iot
        WHERE id_sesion = :sessionId
      `, {
        replacements: { sessionId }
      });

      return results[0] || null;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }
}

module.exports = { MetricsService };