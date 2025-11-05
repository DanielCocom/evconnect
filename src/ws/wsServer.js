// src/ws/index.js
const WebSocket = require("ws");
const { verifyToken } = require("../utils/jwt");
const { Cargador } = require("../models"); // Usamos Cargador, no Estacion
const pubsub = require("./pubsub");
const messageHandler = require("./message.handler");

let wss;
const HEARTBEAT_INTERVAL = 30000;

function initWebSocketServer(server) {
  wss = new WebSocket.WebSocketServer({ server, path: "/ws" });

  // Heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("connection", async (ws, req) => {
    ws.isAlive = true;
    ws.on("pong", () => (ws.isAlive = true));

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      const role = (url.searchParams.get("role") || "client").toLowerCase();
      // ¡CAMBIO CLAVE: Usamos cargadorId!
      const cargadorId = url.searchParams.get("cargadorId"); 

      if (!cargadorId) {
        return ws.close(4001, "cargadorId es requerido");
      }
      
      // 1. Validar que el Cargador exista
      try {
        const cargador = await Cargador.findByPk(cargadorId, { attributes: ['id_cargador'] });
        if (!cargador) {
          return ws.close(4005, "Cargador not found");
        }
      } catch (err) {
        console.error("Error checking Cargador:", err);
        return ws.close(5000, "DB Error");
      }

      // 2. Autenticación (¡Descomentada y obligatoria!)
      if (!token) {
        return ws.close(4003, "Token requerido");
      }
      
      let tokenPayload;
      try {
        tokenPayload = verifyToken(token); // Usamos tu JWT util
        ws.userId = tokenPayload.id; // ¡Guardamos el ID del usuario en la conexión!
        ws.userRole = tokenPayload.role;
      } catch (err) {
        return ws.close(4003, "Token invalido");
      }
      
      // 3. Ruteo de Conexión
      if (role === "publisher") {
        // Lógica de seguridad: Solo un rol 'admin' o 'tecnico' puede ser publisher?
        // if (ws.userRole !== 'admin') {
        //   return ws.close(4001, "No autorizado para ser publisher");
        // }

        pubsub.registerPublisher(cargadorId, ws);
        ws.send(JSON.stringify({ type: "connected", role: "publisher", cargadorId }));

        // Delegamos el manejo de mensajes
        ws.on("message", (data) => messageHandler.handlePublisherMessage(cargadorId, data));
        ws.on("close", () => pubsub.removePublisher(cargadorId));

      } else {
        // rol 'client' (app móvil o backoffice)
        pubsub.addSubscriber(cargadorId, ws);
        ws.send(JSON.stringify({ type: "subscribed", cargadorId }));

        // Sincronización inicial: Pedir al cargador su estado actual
        const pub = pubsub.publishers.get(String(cargadorId));
        if (pub && pub.readyState === WebSocket.OPEN) {
          pub.send(JSON.stringify({ type: "sync_request", from: "server" }));
        }

        // Delegamos el manejo de mensajes
        ws.on("message", (data) => messageHandler.handleClientMessage(cargadorId, ws, data));
        ws.on("close", () => pubsub.removeSubscriber(ws));
      }

    } catch (err) {
      console.error("WS connection setup error:", err);
      ws.close(1011, "Internal error");
    }
  });

  wss.on("close", () => clearInterval(interval));
  console.log("WebSocket server initialized on /ws");
}

module.exports = { 
  initWebSocketServer, 
  // Exportamos broadcast para usarlo desde otros servicios (ej. un servicio de alertas)
  broadcastToSubscribers: pubsub.broadcastToSubscribers 
};