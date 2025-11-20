const http = require("http");
const app = require("./app");
const { initWebSocketServer } = require("./ws/wsServer");
const { SessionMonitorService } = require("./services/sessionMonitor.service");
require("dotenv").config();

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

initWebSocketServer(server);

const start = async () => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Iniciar el monitoreo de sesiones activas
    SessionMonitorService.startMonitoring();
    console.log('[SessionMonitor] Sistema de monitoreo en tiempo real iniciado');
  });
};

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  SessionMonitorService.stopMonitoring();
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando servidor...');
  SessionMonitorService.stopMonitoring();
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

start().catch(err => {
  console.error("Failed to start:", err);
  process.exit(1);
});
