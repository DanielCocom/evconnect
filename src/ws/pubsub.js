// src/ws/pubsub.js
const WebSocket = require("ws");

// Usamos cargadorId como el "tópico"
const publishers = new Map(); // cargadorId -> ws (publisher)
const subscribers = new Map(); // cargadorId -> Set<ws> (subscribers)

/**
 * Registra un publisher (cargador físico)
 * @param {string} cargadorId 
 * @param {WebSocket} ws 
 */
function registerPublisher(cargadorId, ws) {
  const key = String(cargadorId);
  publishers.set(key, ws);
  ws._publisherFor = key;
}

/**
 * Elimina un publisher
 * @param {string} cargadorId 
 */
function removePublisher(cargadorId) {
  publishers.delete(String(cargadorId));
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
 * Envía un comando específico AL PUBLISHER (cargador)
 * @param {string} cargadorId 
 * @param {object} message 
 */
function sendToPublisher(cargadorId, message) {
  const key = String(cargadorId);
  const pubWs = publishers.get(key);
  if (pubWs && pubWs.readyState === WebSocket.OPEN) {
    pubWs.send(JSON.stringify(message));
    return true;
  }
  return false; // Publisher no conectado
}

module.exports = {
  registerPublisher,
  removePublisher,
  addSubscriber,
  removeSubscriber,
  broadcastToSubscribers,
  sendToPublisher,
  publishers, // Lo exportamos para el sync_request
};