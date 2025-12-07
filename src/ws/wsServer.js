const WebSocket = require("ws");
const { verifyToken } = require("../utils/jwt");
const { Cargador } = require("../models"); 
const pubsub = require("./pubsub");
const messageHandler = require("./message.handler");

let wss;

// ⏱️ CAMBIO 1: Aumentamos la tolerancia a 60 segundos (60000 ms).
// Esto evita matar la conexión si el ESP32 se bloquea unos segundos procesando datos.
const HEARTBEAT_INTERVAL = 60000; 

function initWebSocketServer(server) {
  // Configuración explícita de clientTracking (aunque es true por defecto)
  wss = new WebSocket.WebSocketServer({ server, path: "/ws", clientTracking: true });

  // Heartbeat (Latido)
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        // 🔍 CAMBIO 2: Log para confirmar si el servidor está matando la conexión
        console.log(`💀 [WS Server] Terminando conexión inactiva (Ping Timeout): Role=${ws.userRole || 'anon'}, ID=${ws.cargadorId || ws.estacionId || '?'}`);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("connection", async (ws, req) => {
    ws.isAlive = true;
    
    // Al recibir PONG, confirmamos que sigue vivo
    ws.on("pong", () => {
        ws.isAlive = true;
        
         console.log("💓 Pong recibido de cliente"); 
    });

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      const role = (url.searchParams.get("role") || "client").toLowerCase();
      const cargadorId = url.searchParams.get("cargadorId"); 
      const estacionId = url.searchParams.get("estacionId"); 

      // Guardamos estos IDs en el objeto ws para usarlos en los logs de desconexión
      ws.cargadorId = cargadorId;
      ws.estacionId = estacionId;

      // Validación según rol
      if (role === "publisher") {
        if (!estacionId) {
          return ws.close(4001, "estacionId es requerido para rol publisher");
        }
      } else if (role === "monitor") {
        if (!estacionId) {
          return ws.close(4001, "estacionId es requerido para rol monitor");
        }
      } else {
        // role === "client"
        if (!cargadorId) {
          return ws.close(4001, "cargadorId es requerido para rol client");
        }
      }
      
      // 1. Validar según el rol (Base de datos)
      let cargador;
      let estacion;
      let cargadoresEstacion = [];
      
      if (role === "client") {
        try {
          cargador = await Cargador.findByPk(cargadorId, { 
            attributes: ['id_cargador', 'estado', 'tipo_carga', 'id_estacion'] 
          });
          if (!cargador) {
            return ws.close(4005, "Cargador not found");
          }
        } catch (err) {
          console.error("Error checking Cargador:", err);
          return ws.close(5000, "DB Error");
        }
      } else if (role === "publisher") {
        try {
          const { Estacion } = require("../models");
          estacion = await Estacion.findByPk(estacionId);
          if (!estacion) {
            return ws.close(4005, "Estación not found");
          }
          
          cargadoresEstacion = await Cargador.findAll({
            where: { id_estacion: estacionId },
            attributes: ['id_cargador', 'estado', 'tipo_carga']
          });
          
          if (cargadoresEstacion.length === 0) {
            return ws.close(4006, "No hay cargadores en esta estación");
          }
        } catch (err) {
          console.error("Error checking Estacion:", err);
          return ws.close(5000, "DB Error");
        }
      }

      // 2. Autenticación OPCIONAL
      if (token) {
        try {
          const tokenPayload = verifyToken(token); 
          ws.userId = tokenPayload.id; 
          ws.userRole = tokenPayload.role;
          ws.authenticated = true;
        } catch (err) {
          console.warn("Token inválido, continuando sin autenticación:", err.message);
          ws.authenticated = false;
        }
      } else {
        ws.authenticated = false;
      }
      
      // 3. Ruteo de Conexión
      if (role === "publisher") {
        const cargadorIds = cargadoresEstacion.map(c => c.id_cargador);
        
        // Guardamos ids en ws para limpieza posterior
        ws._stationChargers = cargadorIds; 

        pubsub.registerPublisher(estacionId, ws, cargadorIds);
        
        const estadoActual = {
          type: "estado_sincronizado",
          role: "publisher",
          estacionId: parseInt(estacionId),
          cargadores: cargadoresEstacion.map(c => ({
            id_cargador: c.id_cargador,
            estado: c.estado,
            tipo_carga: c.tipo_carga
          })),
          timestamp: new Date().toISOString()
        };
        ws.send(JSON.stringify(estadoActual));

        ws.on("message", (data) => messageHandler.handlePublisherMessage(estacionId, ws, data));
        ws.on("close", () => {
          const chargerIds = ws._stationChargers || [];
          pubsub.removePublisher(estacionId, chargerIds);
        });

      } else if (role === "monitor") {
        const { Estacion, SesionCarga } = require("../models");
        
        const estacion = await Estacion.findByPk(estacionId);
        if (!estacion) {
          return ws.close(4005, "Estación no encontrada");
        }

        pubsub.addMonitor(estacionId, ws);

        const cargadores = await Cargador.findAll({
          where: { id_estacion: estacionId },
          attributes: ['id_cargador', 'tipo_carga', 'capacidad_kw', 'estado']
        });

        const sesionesActivas = await SesionCarga.findAll({
          where: { 
            id_cargador: cargadores.map(c => c.id_cargador),
            estado: 'activa'
          },
          attributes: ['id_sesion', 'id_cargador', 'fecha_inicio']
        });

        ws.send(JSON.stringify({
          type: "estado_estacion",
          estacionId: parseInt(estacionId),
          cargadores: cargadores.map(c => {
            const sesionActiva = sesionesActivas.find(s => s.id_cargador === c.id_cargador);
            return {
              id_cargador: c.id_cargador,
              tipo_carga: c.tipo_carga,
              capacidad_kw: parseFloat(c.capacidad_kw || 0),
              estado: c.estado,
              conectado: pubsub.isPublisherConnected(c.id_cargador),
              sesion_activa: sesionActiva ? {
                id_sesion: sesionActiva.id_sesion,
                fecha_inicio: sesionActiva.fecha_inicio
              } : null
            };
          }),
          timestamp: new Date().toISOString()
        }));

        ws.on("message", (data) => messageHandler.handleMonitorMessage(estacionId, ws, data));
        ws.on("close", () => pubsub.removeMonitor(ws));

      } else {
        // Rol 'client'
        pubsub.addSubscriber(cargadorId, ws);

        let pub = null;
        let publisherConectado = false;
        
        for (const [estId, pubWs] of pubsub.publishers.entries()) {
          if (pubWs._stationChargers && pubWs._stationChargers.includes(parseInt(cargadorId))) {
            pub = pubWs;
            publisherConectado = pubWs.readyState === WebSocket.OPEN;
            break;
          }
        }

        ws.send(JSON.stringify({ 
          type: "subscribed", 
          cargadorId,
          estado_cargador: cargador.estado,
          tipo_carga: cargador.tipo_carga,
          capacidad_kw: cargador.capacidad_kw,
          conectado: publisherConectado ?? false,
          timestamp: new Date().toISOString()
        }));

        ws.on("message", (data) => messageHandler.handleClientMessage(cargadorId, ws, data));
        ws.on("close", () => pubsub.removeSubscriber(ws));
      }

    } catch (err) {
      console.error("WS connection setup error:", err);
      ws.close(1011, "Internal error");
    }
  });

  wss.on("close", () => clearInterval(interval));
  console.log("✅ WebSocket server initialized on /ws (Timeout: 60s)");
}

module.exports = { 
  initWebSocketServer, 
  broadcastToSubscribers: pubsub.broadcastToSubscribers 
};