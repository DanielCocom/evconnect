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
      const cargadorId = url.searchParams.get("cargadorId"); // Para client
      const estacionId = url.searchParams.get("estacionId"); // Para publisher y monitor

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
      
      // 1. Validar según el rol
      let cargador;
      let estacion;
      let cargadoresEstacion = [];
      
      if (role === "client") {
        // Validar que el cargador existe
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
        // Validar que la estación existe y obtener sus cargadores
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

      // 2. Autenticación OPCIONAL - Si hay token, validamos y guardamos info
      if (token) {
        try {
          const tokenPayload = verifyToken(token); // Usamos tu JWT util
          ws.userId = tokenPayload.id; // ¡Guardamos el ID del usuario en la conexión!
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
        // Lógica de seguridad: Solo un rol 'admin' o 'tecnico' puede ser publisher?
        // if (ws.userRole !== 'admin') {
        //   return ws.close(4001, "No autorizado para ser publisher");
        // }

        const cargadorIds = cargadoresEstacion.map(c => c.id_cargador);
        pubsub.registerPublisher(estacionId, ws, cargadorIds);
        
        // Enviar el estado actual de todos los cargadores de la estación
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

        // Delegamos el manejo de mensajes del publisher (IoT)
        ws.on("message", (data) => messageHandler.handlePublisherMessage(estacionId, ws, data));
        ws.on("close", () => {
          const chargerIds = ws._stationChargers || [];
          pubsub.removePublisher(estacionId, chargerIds);
        });

      } else if (role === "monitor") {
        // NUEVO: Rol Monitor para dashboard de estación
        const { Estacion, SesionCarga, User } = require("../models");
        
        // Validar que la estación existe
        const estacion = await Estacion.findByPk(estacionId);
        if (!estacion) {
          return ws.close(4005, "Estación no encontrada");
        }

        pubsub.addMonitor(estacionId, ws);

        // Obtener estado inicial de la estación
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

        // Enviar estado inicial al monitor
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

        // Delegamos el manejo de mensajes del monitor
        ws.on("message", (data) => messageHandler.handleMonitorMessage(estacionId, ws, data));
        ws.on("close", () => pubsub.removeMonitor(ws));

      } else {
        // rol 'client' (app móvil o backoffice)
        pubsub.addSubscriber(cargadorId, ws);

        // Verificar si el publisher (IoT) está conectado buscando la estación que tiene este cargador
        let pub = null;
        let publisherConectado = false;
        
        for (const [estId, pubWs] of pubsub.publishers.entries()) {
          if (pubWs._stationChargers && pubWs._stationChargers.includes(parseInt(cargadorId))) {
            pub = pubWs;
            publisherConectado = pubWs.readyState === WebSocket.OPEN;
            break;
          }
        }

        // Enviar confirmación de suscripción con estado actual del cargador desde la BD
        ws.send(JSON.stringify({ 
          type: "subscribed", 
          cargadorId,
          estado_cargador: cargador.estado,
          tipo_carga: cargador.tipo_carga,
          capacidad_kw: cargador.capacidad_kw,
          conectado: publisherConectado ?? false,
          timestamp: new Date().toISOString()
        }));

        // Sincronización inicial: Pedir al IoT el estado del cargador específico
        if (publisherConectado) {
          console.log(`[WS] Enviando sync_request para cargador ${cargadorId}`);
          pub.send(JSON.stringify({ 
            type: "sync_request",
            target_cargador_id: parseInt(cargadorId),
            from: "server",
            timestamp: new Date().toISOString()
          }));
        } else {
          console.log(`[WS] IoT no conectado para cargador ${cargadorId}. Estado desde BD: ${cargador.estado}`);
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