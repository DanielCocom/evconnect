/**
 * Gestión simple de conexiones WebSocket
 * Para MVP: 1 ESP32 + 1 Dashboard
 */

class ClientManager {
  constructor() {
    this.clients = new Map();
  }

  /**
   * Registrar ESP32
   */
  registerESP32(ws) {
    this.clients.set('esp32', ws);
    console.log('✓ ESP32 conectado');
  }

  /**
   * Registrar Dashboard
   */
  registerDashboard(ws) {
    this.clients.set('dashboard', ws);
    console.log('✓ Dashboard conectado');
  }

  /**
   * Obtener cliente ESP32
   */
  getESP32() {
    return this.clients.get('esp32');
  }

  /**
   * Obtener Dashboard
   */
  getDashboard() {
    return this.clients.get('dashboard');
  }

  /**
   * Verificar si ESP32 está conectado
   */
  isESP32Connected() {
    const esp32 = this.clients.get('esp32');
    return esp32 && esp32.readyState === 1; // OPEN
  }

  /**
   * Verificar si Dashboard está conectado
   */
  isDashboardConnected() {
    const dashboard = this.clients.get('dashboard');
    return dashboard && dashboard.readyState === 1;
  }

  /**
   * Enviar mensaje al ESP32
   */
  sendToESP32(data) {
    const esp32 = this.getESP32();
    if (esp32 && esp32.readyState === 1) {
      esp32.send(JSON.stringify(data));
      return true;
    }
    console.warn('⚠ ESP32 no conectado, no se puede enviar mensaje');
    return false;
  }

  /**
   * Enviar mensaje al Dashboard
   */
  sendToDashboard(data) {
    const dashboard = this.getDashboard();
    if (dashboard && dashboard.readyState === 1) {
      dashboard.send(JSON.stringify(data));
      return true;
    }
    console.warn('⚠ Dashboard no conectado, no se puede enviar mensaje');
    return false;
  }

  /**
   * Desconectar cliente
   */
  disconnect(clientType) {
    if (this.clients.has(clientType)) {
      const ws = this.clients.get(clientType);
      if (ws.readyState === 1) {
        ws.close();
      }
      this.clients.delete(clientType);
      console.log(`✓ ${clientType} desconectado`);
    }
  }

  /**
   * Obtener estado de conexiones
   */
  getStatus() {
    return {
      esp32_connected: this.isESP32Connected(),
      dashboard_connected: this.isDashboardConnected(),
      total_clients: this.clients.size
    };
  }
}

module.exports = new ClientManager();