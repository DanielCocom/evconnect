const WebSocket = require("ws");
const { verifyToken } = require("../utils/jwt");
const { Cargador } = require("../models"); 
const pubsub = require("./pubsub");
const messageHandler = require("./message.handler");

let wss;

// ⏱️ Configuración de tiempos
// El servidor revisará conexiones muertas cada 60s.
// Como el ESP32 envía heartbeat cada 20s, esto da margen de sobra.
const HEARTBEAT_INTERVAL = 60000; 

function initWebSocketServer(server) {
  wss = new WebSocket.WebSocketServer({ server, path: "/ws", clientTracking: true });

  // --- Heartbeat Automático del Servidor ---
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log(`💀 [WS Server] Terminando conexión inactiva (Ping Timeout): Role=${ws.userRole || 'anon'}, ID=${ws.cargadorId || ws.estacionId || '?'}`);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping(); // Ping nativo (backup por si el cliente soporta ping/pong estándar)
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("connection", async (ws, req) => {
    ws.isAlive = true;
    
    // Si el cliente responde al ping nativo (backup)
    ws.on("pong", () => {
        ws.isAlive = true;
    });

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      const role = (url.searchParams.get("role") || "client").toLowerCase();
      const cargadorId = url.searchParams.get("cargadorId"); 
      const estacionId = url.searchParams.get("estacionId"); 

      // Guardamos metadatos en el socket para logs y lógica
      ws.cargadorId = cargadorId;
      ws.estacionId = estacionId;
      ws.role = role;

      // --- VALIDACIONES DE PARÁMETROS ---
      if (role === "publisher" && !estacionId) return ws.close(4001, "Falta estacionId");
      if (role === "monitor" && !estacionId) return ws.close(4001, "Falta estacionId");
      if (role === "client" && !cargadorId) return ws.close(4001, "Falta cargadorId");

      // ------------------------------------------------------
      // 🔌 ROL: PUBLISHER (ESP32 - IoT)
      // ------------------------------------------------------
      if (role === "publisher") {
        // Validación de base de datos
        try {
          const { Estacion } = require("../models");
          const estacion = await Estacion.findByPk(estacionId);
          if (!estacion) return ws.close(4005, "Estación not found");
          
          const cargadoresEstacion = await Cargador.findAll({
            where: { id_estacion: estacionId },
            attributes: ['id_cargador', 'estado', 'tipo_carga']
          });
          
          if (cargadoresEstacion.length === 0) return ws.close(4006, "Sin cargadores");

          const cargadorIds = cargadoresEstacion.map(c => c.id_cargador);
          ws._stationChargers = cargadorIds; 

          // Registro en PubSub
          await pubsub.registerPublisher(estacionId, ws, cargadorIds);
          
          // Enviar estado inicial
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

          // 🔥 CAMBIO CRÍTICO 1: Interceptamos el mensaje para detectar el Heartbeat JSON 🔥
          ws.on("message", (data) => {
            try {
              const messageString = data.toString();
              
              // 1. Detectar si es el Heartbeat del ESP32
              if (messageString.includes("heartbeat")) {
                 // Intentamos parsear para estar seguros
                 const parsed = JSON.parse(messageString);
                 if (parsed.tipo === "heartbeat" || parsed.type === "heartbeat") {
                     ws.isAlive = true; // ✅ MANTENEMOS LA CONEXIÓN VIVA
                     // console.log(`💓 Heartbeat JSON recibido de Estación ${estacionId}`);
                     return; // Detenemos aquí, no lo enviamos al messageHandler
                 }
              }
              
              // 2. Si no es heartbeat, es un mensaje de negocio normal
              messageHandler.handlePublisherMessage(estacionId, ws, data);

            } catch (err) {
              console.error(`Error procesando mensaje Publisher ${estacionId}:`, err);
            }
          });

          // 🔥 CAMBIO CRÍTICO 2: Pasamos 'ws' para evitar borrar sesiones nuevas (Race Condition) 🔥
          ws.on("close", async () => {
            const chargerIds = ws._stationChargers || [];
            await pubsub.removePublisher(estacionId, ws, chargerIds);
          });

        } catch (err) {
          console.error("Error DB Publisher:", err);
          return ws.close(5000, "DB Error");
        }

      } 
      // ------------------------------------------------------
      // 🖥️ ROL: MONITOR (Dashboard)
      // ------------------------------------------------------
      else if (role === "monitor") {
        const { Estacion, SesionCarga } = require("../models");
        
        const estacion = await Estacion.findByPk(estacionId);
        if (!estacion) return ws.close(4005, "Estación no encontrada");

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

      } 
      // ------------------------------------------------------
      // 📱 ROL: CLIENT (App Móvil)
      // ------------------------------------------------------
      else {
        // role === "client"
        let cargador;
        try {
          cargador = await Cargador.findByPk(cargadorId, { 
            attributes: ['id_cargador', 'estado', 'tipo_carga', 'id_estacion', 'capacidad_kw'] 
          });
          if (!cargador) return ws.close(4005, "Cargador not found");
        } catch (err) {
          console.error("Error checking Cargador:", err);
          return ws.close(5000, "DB Error");
        }

        // Auth opcional
        if (token) {
          try {
            const tokenPayload = verifyToken(token); 
            ws.userId = tokenPayload.id; 
            ws.userRole = tokenPayload.role;
            ws.authenticated = true;
          } catch (err) {
            ws.authenticated = false;
          }
        } else {
          ws.authenticated = false;
        }

        pubsub.addSubscriber(cargadorId, ws);

        const publisherConectado = pubsub.isPublisherConnected(cargadorId);

        ws.send(JSON.stringify({ 
          type: "subscribed", 
          cargadorId,
          estado_cargador: cargador.estado,
          tipo_carga: cargador.tipo_carga,
          capacidad_kw: cargador.capacidad_kw,
          conectado: publisherConectado,
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
  console.log("✅ WebSocket server initialized on /ws (Soporte JSON Heartbeat Activo)");
}

module.exports = { 
  initWebSocketServer, 
  broadcastToSubscribers: pubsub.broadcastToSubscribers 
};