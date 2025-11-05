// src/ws/message.handler.js
const pubsub = require("./pubsub");

// Importamos los Modelos de tu BD (¡la forma correcta de hacerlo!)
// En una arquitectura ideal, esto llamaría a servicios en src/services/
const { LecturaIot, AlertaEvento, SesionCarga, Cargador } = require("../models");

/**
 * Maneja los mensajes que llegan DESDE EL PUBLISHER (cargador)
 * @param {string} cargadorId 
 * @param {Buffer} data 
 */
async function handlePublisherMessage(cargadorId, data) {
  let msg;
  try {
    msg = JSON.parse(data.toString());
  } catch (err) {
    console.error("Invalid JSON from publisher:", err);
    return;
  }

  try {
    // 1. GUARDAR EN BASE DE DATOS
    if (msg.type === "telemetria") {
      await LecturaIot.create({
        id_sesion: msg.sesionId,
        id_cargador: cargadorId,
        timestamp: msg.timestamp || new Date(),
        voltaje_v: msg.voltaje_v,
        corriente_a: msg.corriente_a,
        potencia_w: msg.potencia_w,
        energia_acumulada_wh: msg.energia_acumulada_wh,
        temperatura_c: msg.temperatura_c,
        estado_rele: msg.estado_rele,
      });

      // Actualizar la sesión en tiempo real
      await SesionCarga.update(
        { energia_consumida_kwh: (msg.energia_acumulada_wh / 1000) },
        { where: { id_sesion: msg.sesionId } }
      );

    } else if (msg.type === "alerta") {
      // Obtenemos el id_estacion del cargador
      const cargador = await Cargador.findByPk(cargadorId, { attributes: ['id_estacion'] });
      
      await AlertaEvento.create({
        id_estacion: cargador ? cargador.id_estacion : null,
        id_cargador: cargadorId,
        tipo_evento: msg.codigo_evento,
        descripcion: msg.descripcion,
        nivel_gravedad: msg.nivel_gravedad || 'bajo',
        estado: 'pendiente'
      });
    }

    // 2. REENVIAR A SUSCRIPTORES (Apps y Backoffice)
    pubsub.broadcastToSubscribers(cargadorId, {
      from: "publisher",
      payload: msg,
      timestamp: Date.now(),
    });

  } catch (err) {
    console.error("Error processing publisher message:", err);
  }
}

/**
 * Maneja los mensajes que llegan DESDE EL CLIENTE (app móvil)
 * @param {string} cargadorId 
 * @param {WebSocket} ws 
 * @param {Buffer} data 
 */
async function handleClientMessage(cargadorId, ws, data) {
  let msg;
  try {
    msg = JSON.parse(data.toString());
  } catch (err) {
    console.error("Invalid JSON from client:", err);
    return;
  }

  // El ID del usuario debe venir del token, no del mensaje
  const usuarioId = ws.userId; 

  try {
    let responsePayload = { from: "client", command: msg.command };
    
    // 1. PROCESAR COMANDO (Lógica de Negocio)
    if (msg.command === "iniciar_carga") {
      // ¡AQUÍ IRÍA LA LÓGICA DE SERVICIO!
      // 1. Validar que el usuario puede iniciar
      // 2. Validar que el cargador está 'disponible'
      // 3. Crear la 'sesion_carga' en la BD
      // 4. Hacer retención de pago
      // 5. Enviar comando
      
      // Por ahora, simulamos
      const sesionId = Math.floor(Math.random() * 10000); // Reemplazar con lógica real
      responsePayload.sesionId = sesionId;

    } else if (msg.command === "finalizar_carga") {
      // Lógica para finalizar sesión
      responsePayload.sesionId = msg.sesionId;
    }

    // 2. REENVIAR COMANDO AL CARGADOR
    const sent = pubsub.sendToPublisher(cargadorId, responsePayload);

    // 3. Informar al cliente si el comando falló
    if (!sent) {
      ws.send(JSON.stringify({ type: "error", message: "Cargador no conectado" }));
    }

  } catch (err) {
    console.error("Error processing client command:", err);
    ws.send(JSON.stringify({ type: "error", message: "Error interno procesando comando" }));
  }
}

module.exports = {
  handlePublisherMessage,
  handleClientMessage,
};