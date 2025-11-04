// ...existing code...
const WebSocket = require("ws");
const { verifyToken } = require("../utils/jwt");
const { Estacion } = require("../models"); // modelo Estacion

let wss;
const publishers = new Map(); // estacionId -> ws (publisher)
const subscribers = new Map(); // estacionId -> Set<ws>
const HEARTBEAT_INTERVAL = 30000;

function addSubscriber(estacionId, ws) {
  const key = String(estacionId);
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(ws);
  ws._subscribedTo = key;
}

function removeSubscriber(ws) {
  const key = ws._subscribedTo;
  if (!key) return;
  const set = subscribers.get(key);
  if (set) {
    set.delete(ws);
    if (set.size === 0) subscribers.delete(key);
  }
}

function broadcastToSubscribers(estacionId, message) {
  const key = String(estacionId);
  const set = subscribers.get(key);
  if (!set) return;
  const payload = typeof message === "string" ? message : JSON.stringify(message);
  set.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

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
      const role = (url.searchParams.get("role") || "client").toLowerCase(); // 'publisher' | 'client'
      const estacionId = url.searchParams.get("estacionId");

      // Opcional: permitir conexiones sin token para testing, pero recomendamos token
      let payload = null;
      if (token) {
        // try {
        //   payload = verifyToken(token); // [`verifyToken`](src/utils/jwt.js)
        // } catch (err) {
        //   ws.close(4003, "Invalid token");
        //   return;
        // }
      }

      if (role === "publisher") {
        if (!estacionId) {
          ws.close(4004, "publisher requires estacionId");
          return;
        }

        // Validar que la estación existe (opcional)
        try {
          const est = await Estacion.findByPk(estacionId);
          if (!est) {
            ws.close(4005, "Estacion not found");
            return;
          }
        } catch (err) {
          console.error("Error checking Estacion:", err);
        }

        publishers.set(String(estacionId), ws);
        ws._publisherFor = String(estacionId);

        ws.send(JSON.stringify({ type: "connected", role: "publisher", estacionId }));

        ws.on("message", (data) => {
          try {
            const msg = JSON.parse(data.toString());
            // Mensaje del publisher -> reenvía a todos los subscribers de la estación
            broadcastToSubscribers(estacionId, { from: "publisher", payload: msg, timestamp: Date.now() });
          } catch (err) {
            console.error("Invalid publisher message", err);
          }
        });

        ws.on("close", () => {
          publishers.delete(String(estacionId));
        });
      } else {
        // subscriber / client
        if (!estacionId) {
          ws.close(4006, "client requires estacionId query param to subscribe");
          return;
        }

        addSubscriber(estacionId, ws);

        // Enviar último estado si hay publisher conectado (puedes almacenar lastState para mayor robustez)
        const pub = publishers.get(String(estacionId));
        if (pub && pub.readyState === WebSocket.OPEN) {
          pub.send(JSON.stringify({ type: "sync_request", from: "server" }));
        }

        ws.send(JSON.stringify({ type: "subscribed", estacionId }));

        ws.on("message", (data) => {
          // Mensajes desde clientes web (por ejemplo, comandos hacia la estación)
          try {
            const msg = JSON.parse(data.toString());
            // Si existe publisher, reencaminar comando
            const pubWs = publishers.get(String(estacionId));
            if (pubWs && pubWs.readyState === WebSocket.OPEN) {
              pubWs.send(JSON.stringify({ from: "client", payload: msg }));
            } else {
              ws.send(JSON.stringify({ type: "error", message: "Publisher not connected" }));
            }
          } catch (err) {
            console.error("Invalid client message", err);
          }
        });

        ws.on("close", () => {
          removeSubscriber(ws);
        });
      }
    } catch (err) {
      console.error("WS connection setup error:", err);
      ws.close(1011, "Internal error");
    }
  });

  wss.on("close", () => clearInterval(interval));
  console.log("WebSocket server initialized on /ws");
}

// Permitir enviar desde otros módulos: require('./wsServer').broadcastToSubscribers(...)
module.exports = { initWebSocketServer, broadcastToSubscribers };