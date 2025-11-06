const { SessionService } = require('../services/session.service');
const { MetricsService } = require('../services/metrics.service');
const clientManager = require('./clients');

class MessageHandler {
  /**
   * Procesar mensajes del ESP32
   */
  static async handleESP32Message(data) {
    try {
      const message = JSON.parse(data);
      console.log('📥 ESP32:', message.type);

      switch (message.type) {
        case 'nfc_scan':
          await this.handleNFCScan(message);
          break;

        case 'metrics':
          await this.handleMetrics(message);
          break;

        case 'stop':
          await this.handleStop(message);
          break;

        case 'emergency':
          await this.handleEmergency(message);
          break;

        default:
          console.warn('⚠ Tipo de mensaje desconocido:', message.type);
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje ESP32:', error);
    }
  }

  /**
   * Procesar mensajes del Dashboard
   */
  static async handleDashboardMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('📥 Dashboard:', message.type);

      switch (message.type) {
        case 'stop_remote':
          await this.handleRemoteStop(message);
          break;

        case 'get_status':
          await this.handleGetStatus();
          break;

        default:
          console.warn('⚠ Tipo de mensaje desconocido:', message.type);
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje Dashboard:', error);
    }
  }

  // ===================== HANDLERS ESP32 =====================

  /**
   * Manejo de lectura NFC
   */
  static async handleNFCScan(message) {
    const { nfc_uid } = message;

    try {
      // Crear sesión
      const sessionData = await SessionService.startSessionByNFC(nfc_uid);

      // Enviar comando a ESP32 para activar relé
      clientManager.sendToESP32({
        type: 'start',
        session_id: sessionData.session_id,
        user_name: sessionData.user_name
      });

      // Notificar a Dashboard
      clientManager.sendToDashboard({
        type: 'session_started',
        session_id: sessionData.session_id,
        charger_id: sessionData.charger_id,
        user_name: sessionData.user_name,
        timestamp: new Date().toISOString()
      });

      console.log(`✓ Sesión ${sessionData.session_id} iniciada para ${sessionData.user_name}`);
    } catch (error) {
      console.error('❌ Error en NFC scan:', error.message);

      // Enviar error a ESP32
      clientManager.sendToESP32({
        type: 'error',
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      });

      // Notificar a Dashboard
      clientManager.sendToDashboard({
        type: 'session_error',
        message: error.message,
        nfc_uid: nfc_uid
      });
    }
  }

  /**
   * Manejo de métricas en tiempo real
   */
  static async handleMetrics(message) {
    const { session_id, v, a, w, ts } = message;

    try {
      // Actualizar sesión con nuevas métricas
      const updatedData = await SessionService.updateMetrics(session_id, { v, a, w, ts });

      // Guardar lectura en BD (asíncrono, no bloquear)
      MetricsService.saveReading(session_id, { v, a, w, ts }).catch(err => {
        console.error('Error guardando lectura:', err);
      });

      // Broadcast a Dashboard
      clientManager.sendToDashboard({
        type: 'metrics',
        ...updatedData
      });
    } catch (error) {
      console.error('❌ Error procesando métricas:', error.message);
    }
  }

  /**
   * Manejo de finalización desde ESP32
   */
  static async handleStop(message) {
    const { session_id } = message;

    try {
      const summary = await SessionService.endSession(session_id, 'user_button');

      // Notificar a Dashboard
      clientManager.sendToDashboard({
        type: 'session_ended',
        ...summary
      });

      console.log(`✓ Sesión ${session_id} finalizada desde ESP32`);
    } catch (error) {
      console.error('❌ Error finalizando sesión:', error.message);
    }
  }

  /**
   * Manejo de paro de emergencia
   */
  static async handleEmergency(message) {
    const { session_id } = message;

    try {
      // Cancelar sesión
      await SessionService.cancelSession(session_id);

      // Crear alerta
      await MetricsService.createEmergencyAlert(session_id);

      // Notificar a Dashboard
      clientManager.sendToDashboard({
        type: 'emergency',
        charger_id: 1,
        session_id: session_id,
        timestamp: new Date().toISOString()
      });

      console.log(`🚨 Paro de emergencia - Sesión ${session_id}`);
    } catch (error) {
      console.error('❌ Error en paro de emergencia:', error.message);
    }
  }

  // ===================== HANDLERS DASHBOARD =====================

  /**
   * Detener sesión desde Dashboard
   */
  static async handleRemoteStop(message) {
    const { session_id } = message;

    try {
      // Enviar comando a ESP32
      const sent = clientManager.sendToESP32({
        type: 'stop',
        session_id: session_id
      });

      if (!sent) {
        throw new Error('ESP32 no conectado');
      }

      // Finalizar sesión
      const summary = await SessionService.endSession(session_id, 'dashboard_remote');

      // Notificar a Dashboard
      clientManager.sendToDashboard({
        type: 'session_ended',
        ...summary
      });

      console.log(`✓ Sesión ${session_id} detenida remotamente desde Dashboard`);
    } catch (error) {
      console.error('❌ Error en detención remota:', error.message);

      clientManager.sendToDashboard({
        type: 'error',
        message: error.message
      });
    }
  }

  /**
   * Obtener estado actual del sistema
   */
  static async handleGetStatus() {
    try {
      const chargerStatus = await SessionService.getChargerStatus();

      clientManager.sendToDashboard({
        type: 'status',
        charger: chargerStatus,
        connections: clientManager.getStatus()
      });
    } catch (error) {
      console.error('❌ Error obteniendo estado:', error.message);
    }
  }
}

module.exports = { MessageHandler };