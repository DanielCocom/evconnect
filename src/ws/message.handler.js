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

    } else if (msg.type === "estado_cargador") {
      // ¡NUEVO! El IoT reporta cambio de estado del cargador
      const estadoValido = ['disponible', 'ocupado', 'mantenimiento', 'fuera_servicio', 'reservado'];

      if (!estadoValido.includes(msg.estado)) {
        console.error(`Estado inválido recibido del cargador ${cargadorId}:`, msg.estado);
        return;
      }

      // Actualizar el estado en la base de datos para persistencia
      await Cargador.update(
        { estado: msg.estado },
        { where: { id_cargador: cargadorId } }
      );

      console.log(`[IoT] Cargador ${cargadorId} cambió a estado: ${msg.estado}`);

      // Preparar mensaje enriquecido para subscribers
      msg.timestamp = msg.timestamp || new Date().toISOString();
      msg.persisted = true;

    } else if (msg.type === "confirmacion_comando") {
      // El IoT confirma que recibió y ejecutó un comando
      console.log(`[IoT] Confirmación de comando del cargador ${cargadorId}:`, msg);
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

    } else if (msg.command === "detener_energia") {
      // ¡NUEVO! Comando desde la web para cortar el paso de energía
      console.log(`[WEB] Comando detener_energia recibido para cargador ${cargadorId}`);

      // Validar que el usuario tiene permisos (opcional, ya que JWT es opcional ahora)
      // if (ws.authenticated && ws.userRole !== 'admin') {
      //   return ws.send(JSON.stringify({ 
      //     type: "error", 
      //     message: "No autorizado para detener energía" 
      //   }));
      // }

      // Registrar la acción en AlertaEvento para auditoría
      try {
        const cargador = await Cargador.findByPk(cargadorId, { attributes: ['id_estacion', 'estado'] });

        await AlertaEvento.create({
          id_estacion: cargador ? cargador.id_estacion : null,
          id_cargador: cargadorId,
          tipo_evento: 'COMANDO_DETENER_ENERGIA',
          descripcion: `Comando detener energía enviado desde web${ws.userId ? ` por usuario ${ws.userId}` : ''}`,
          nivel_gravedad: 'alto',
          estado: 'pendiente'
        });

        // Actualizar estado del cargador a mantenimiento
        await Cargador.update(
          { estado: 'fuera_servicio' },
          { where: { id_cargador: cargadorId } }
        );

      } catch (err) {
        console.error('Error registrando comando detener_energia:', err);
      }

      responsePayload = {
        type: "comando",
        command: "detener_energia",
        cargadorId: cargadorId,
        timestamp: new Date().toISOString(),
        urgente: true,
        descripcion: "Detener el paso de energía inmediatamente"
      };

      // Notificar a todos los subscribers
      pubsub.broadcastToSubscribers(cargadorId, {
        type: "comando_enviado",
        command: "detener_energia",
        timestamp: Date.now()
      });

    } else if (msg.command === "solicitar_estado") {
      // ¡NUEVO! Solicitar el estado actual del cargador
      responsePayload = {
        type: "solicitud_estado",
        cargadorId: cargadorId,
        timestamp: new Date().toISOString()
      };
    }
    else if (msg.command === 'cambiar_estado') {
      const nuevoEstado = msg.estado;
      const estadosValidos = ['disponible', 'ocupado', 'mantenimiento', 'fuera_servicio', 'reservado'];

      if (!nuevoEstado || !estadosValidos.includes(nuevoEstado)) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Estado inválido. Debe ser: disponible, ocupado, mantenimiento, fuera_servicio o reservado'
        }));
        return;
      }

      // Guardar en BD
      await Cargador.update(
        { estado: nuevoEstado },
        { where: { id_cargador: cargadorId } }
      );

      // Registrar en auditoría
      //REGISTRAR EL CAMBIO MANUAL COMO UN EVENTO
      // await AlertaEvento.create({
      //     id_cargador: cargadorId,
      //     tipo_evento: 'CAMBIO_ESTADO_MANUAL',
      //     descripcion: `Estado cambiado a '${nuevoEstado}' desde web${ws.userId ? ` por usuario ${ws.userId}` : ''}`,
      //     nivel_gravedad: 'medio',
      //     estado: 'pendiente'
      // });

      responsePayload = {
        type: "cambiar_estado",
        cargadorId: cargadorId,
        estado: nuevoEstado,
        timestamp: new Date().toISOString()


      };


      pubsub.broadcastToSubscribers(cargadorId, {
        type: "subscribed",
        cargadorId: cargadorId,
        estado_cargador: nuevoEstado,
        timestamp: new Date().toISOString()
      })
    }

    // 2. REENVIAR COMANDO AL CARGADOR
    const sent = pubsub.sendToPublisher(cargadorId, responsePayload);


    // 3. Informar al cliente si el comando falló
    if (!sent) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Cargador no conectado",
        command: msg.command
      }));
    } else {
      // Confirmar al cliente que el comando fue enviado
      ws.send(JSON.stringify({
        type: "comando_enviado",
        command: msg.command,
        timestamp: Date.now()
      }));
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