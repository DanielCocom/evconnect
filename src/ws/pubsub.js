// src/ws/pubsub.js
const WebSocket = require("ws");

// Publishers ahora se identifican por estacionId (un IoT por estación)
const publishers = new Map(); // estacionId -> ws (publisher IoT)
const subscribers = new Map(); // cargadorId -> Set<ws> (subscribers)
const monitors = new Map(); // estacionId -> Set<ws> (monitors)

/**
 * Registra un publisher (IoT de estación)
 * @param {string} estacionId 
 * @param {WebSocket} ws 
 * @param {Array} cargadorIds - IDs de todos los cargadores de la estación
 */
async function registerPublisher(estacionId, ws, cargadorIds = []) {
  const key = String(estacionId);
  publishers.set(key, ws);
  ws._publisherForStation = key;
  ws._stationChargers = cargadorIds;

  console.log(`[Publisher] IoT conectado para estación ${estacionId} con ${cargadorIds.length} cargadores`);

  // Notificar a los clientes de cada cargador que el IoT está conectado
  cargadorIds.forEach(cargadorId => {
    broadcastToSubscribers(cargadorId, {
      type: 'estado_cargador',
      cargadorId: cargadorId,
      conectado: true,
      timestamp: new Date().toISOString()
    });
  });

  await notifyStationStatus(estacionId)
}

/**
 * Verifica si un publisher (IoT) está conectado para un cargador específico
 * @param {string} cargadorId 
 * @returns {boolean}
 */
function isPublisherConnected(cargadorId) {
  // Buscar en todos los publishers si alguno tiene este cargador
  for (const [estacionId, ws] of publishers.entries()) {
    if (ws._stationChargers && ws._stationChargers.includes(parseInt(cargadorId))) {
      return ws.readyState === WebSocket.OPEN;
    }
  }
  return false;
}

/**
 * Elimina un publisher (IoT de estación)
 * @param {string} estacionId 
 * @param {Array} cargadorIds - IDs de cargadores de la estación
 */
async function removePublisher(estacionId, cargadorIds = []) {
  publishers.delete(String(estacionId));

  console.log(`[Publisher] IoT desconectado de estación ${estacionId}`);

  // Notificar a todos los clientes de los cargadores que el IoT se desconectó
  cargadorIds.forEach(cargadorId => {
    broadcastToSubscribers(cargadorId, {
      type: 'estado_cargador',
      cargadorId: cargadorId,
      conectado: false,
      timestamp: new Date().toISOString()
    });
  });

  await notifyStationStatus(estacionId)
}



/**
 * Añade un suscriptor (app móvil, backoffice)
 * @param {string} cargadorId 
 * @param {WebSocket} ws 
 */
function addSubscriber(cargadorId, ws) {
  const key = String(cargadorId);
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key).add(ws);
  ws._subscribedTo = key; // Guardamos a qué está suscrito
}

/**
 * Elimina un suscriptor de su tópico
 * @param {WebSocket} ws 
 */
function removeSubscriber(ws) {
  const key = ws._subscribedTo;
  if (!key) return;
  const set = subscribers.get(key);
  if (set) {
    set.delete(ws);
    if (set.size === 0) {
      subscribers.delete(key);
    }
  }
}

/**
 * Envía un mensaje a TODOS los suscriptores de un cargador
 * @param {string} cargadorId 
 * @param {object} message 
 */
function broadcastToSubscribers(cargadorId, message) {
  const key = String(cargadorId);
  const set = subscribers.get(key);
  if (!set) return;

  const payload = JSON.stringify(message);
  set.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/**
 * Envía un comando específico AL PUBLISHER (IoT) para un cargador
 * @param {string} cargadorId 
 * @param {object} message 
 */
function sendToPublisher(cargadorId, message) {
  // Buscar el publisher (IoT) que maneja este cargador
  for (const [estacionId, ws] of publishers.entries()) {
    if (ws._stationChargers && ws._stationChargers.includes(parseInt(cargadorId))) {
      if (ws.readyState === WebSocket.OPEN) {
        // Agregar el cargadorId al mensaje para que el IoT sepa a cuál enviar
        const messageWithTarget = {
          ...message,
          target_cargador_id: parseInt(cargadorId)
        };
        ws.send(JSON.stringify(messageWithTarget));
        console.log(`[Publisher] Comando enviado a IoT de estación ${estacionId} para cargador ${cargadorId}`);
        return true;
      }
    }
  }
  return false; // Publisher no conectado
}

/**
 * Añade un monitor (dashboard de estación)
 * @param {string} estacionId 
 * @param {WebSocket} ws 
 */
function addMonitor(estacionId, ws) {
  const key = String(estacionId);
  if (!monitors.has(key)) {
    monitors.set(key, new Set());
  }
  monitors.get(key).add(ws);
  ws._monitoringStation = key;
  console.log(`[Monitor] Cliente conectado para monitorear estación ${estacionId}`);
}

/**
 * Elimina un monitor
 * @param {WebSocket} ws 
 */
function removeMonitor(ws) {
  const key = ws._monitoringStation;
  if (!key) return;
  const set = monitors.get(key);
  if (set) {
    set.delete(ws);
    if (set.size === 0) {
      monitors.delete(key);
    }
  }
  console.log(`[Monitor] Cliente desconectado de estación ${key}`);
}

/**
 * Envía un mensaje a TODOS los monitores de una estación
 * @param {string} estacionId 
 * @param {object} message 
 */
function broadcastToMonitors(estacionId, message) {
  const key = String(estacionId);
  const set = monitors.get(key);
  if (!set || set.size === 0) return;

  const payload = JSON.stringify(message);
  let enviados = 0;
  set.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      enviados++;
    }
  });
  
  if (enviados > 0) {
    console.log(`[Monitor] Broadcast a ${enviados} monitor(es) de estación ${estacionId}: ${message.type}`);
  }
}

/**
 * Envía el estado completo actualizado de una estación a sus monitores
 * @param {number} estacionId 
 */
async function notifyStationStatus(estacionId) {
  const key = String(estacionId);
  const set = monitors.get(key);
  if (!set || set.size === 0) return; // No hay monitores conectados

  try {
    const { Cargador, SesionCarga } = require('../models');

    // Obtener todos los cargadores de la estación
    const cargadores = await Cargador.findAll({
      where: { id_estacion: estacionId },
      attributes: ['id_cargador', 'tipo_carga', 'capacidad_kw', 'estado']
    });

    // Obtener sesiones activas
    const sesionesActivas = await SesionCarga.findAll({
      where: {
        id_cargador: cargadores.map(c => c.id_cargador),
        estado: 'activa'
      },
      attributes: ['id_sesion', 'id_cargador', 'fecha_inicio']
    });

    // Construir el mensaje con estado de cargadores y sesiones
    const mensaje = {
      type: 'estado_estacion',
      estacionId: parseInt(estacionId),
      cargadores: cargadores.map(c => {
        const sesionActiva = sesionesActivas.find(s => s.id_cargador === c.id_cargador);
        return {
          id_cargador: c.id_cargador,
          tipo_carga: c.tipo_carga,
          capacidad_kw: parseFloat(c.capacidad_kw || 0),
          estado: c.estado,
          conectado: isPublisherConnected(c.id_cargador),
          sesion_activa: sesionActiva ? {
            id_sesion: sesionActiva.id_sesion,
            fecha_inicio: sesionActiva.fecha_inicio
          } : null
        };
      }),
      timestamp: new Date().toISOString()
    };

    broadcastToMonitors(estacionId, mensaje);
  } catch (error) {
    console.error(`[Monitor] Error al notificar estado de estación ${estacionId}:`, error);
  }
}

module.exports = {
  registerPublisher,
  removePublisher,
  addSubscriber,
  removeSubscriber,
  broadcastToSubscribers,
  sendToPublisher,
  publishers, // Lo exportamos para el sync_request
  isPublisherConnected,
  addMonitor,
  removeMonitor,
  broadcastToMonitors,
  notifyStationStatus,
  monitors
};