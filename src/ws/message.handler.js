// src/ws/message.handler.js
const pubsub = require("./pubsub");

// Importamos los Modelos de tu BD (¡la forma correcta de hacerlo!)
// En una arquitectura ideal, esto llamaría a servicios en src/services/
const { LecturaIot, AlertaEvento, SesionCarga, Cargador } = require("../models");

/**
 * Maneja los mensajes que llegan DESDE EL PUBLISHER (IoT de estación)
 * @param {string} estacionId 
 * @param {WebSocket} ws 
 * @param {Buffer} data 
 */
async function handlePublisherMessage(estacionId, ws, data) {
  let msg;
  try {
    msg = JSON.parse(data.toString());
  } catch (err) {
    console.error("Invalid JSON from publisher:", err);
    return;
  }
  
  // El mensaje DEBE incluir el cargadorId para saber a qué cargador pertenece
  const cargadorId = msg.cargadorId || msg.id_cargador;
  if (!cargadorId) {
    console.error("Mensaje del publisher sin cargadorId:", msg);
    return;
  }

  try {
    console.log(`[Publisher] Mensaje de IoT estación ${estacionId} para cargador ${cargadorId}: ${msg.type}`);
    
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

      // Actualizar la sesión en tiempo real con la energía consumida
      if (msg.sesionId) {
        await SesionCarga.update(
          { energia_consumida_kwh: (msg.energia_acumulada_wh / 1000) },
          { where: { id_sesion: msg.sesionId } }
        );
        
        // Agregar información de sesión al mensaje para los suscriptores
        msg.energia_kwh = (msg.energia_acumulada_wh / 1000).toFixed(3);
      }

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
      const cargadorActual = await Cargador.findByPk(cargadorId, {
        attributes: ['id_estacion', 'estado']
      });
      const estadoAnterior = cargadorActual ? cargadorActual.estado : null;

      await Cargador.update(
        { estado: msg.estado },
        { where: { id_cargador: cargadorId } }
      );

      console.log(`[IoT] Cargador ${cargadorId} cambió a estado: ${msg.estado}`);

      // Notificar estado completo de la estación a monitores
      if (cargadorActual && cargadorActual.id_estacion) {
        await pubsub.notifyStationStatus(cargadorActual.id_estacion);
      }

      // Preparar mensaje enriquecido para subscribers
      msg.timestamp = msg.timestamp || new Date().toISOString();
      msg.persisted = true;

    } else if (msg.type === "confirmacion_comando") {
      // El IoT confirma que recibió y ejecutó un comando
      console.log(`[IoT] Confirmación de comando del cargador ${cargadorId}:`, msg);
      
      // Si es confirmación de START, podríamos actualizar la sesión o enviar notificación
      if (msg.comando === 'START' && msg.sesionId) {
        console.log(`[IoT] Carga iniciada confirmada para sesión ${msg.sesionId}`);
        
        // Notificar a los suscriptores que el IoT confirmó el inicio
        pubsub.broadcastToSubscribers(cargadorId, {
          type: 'comando_confirmado',
          comando: 'START',
          sesionId: msg.sesionId,
          estado: 'cargando',
          timestamp: new Date().toISOString()
        });
      } else if (msg.comando === 'STOP' && msg.sesionId) {
        console.log(`[IoT] Detención confirmada para sesión ${msg.sesionId}`);
        
        // Notificar a los suscriptores que el IoT confirmó la detención
        pubsub.broadcastToSubscribers(cargadorId, {
          type: 'comando_confirmado',
          comando: 'STOP',
          sesionId: msg.sesionId,
          estado: 'detenido',
          timestamp: new Date().toISOString()
        });
      }
    } else if (msg.type === "sync_response") {
      // ¡NUEVO! El cargador responde a la solicitud de sincronización con su estado completo
      console.log(`[IoT] Respuesta de sincronización del cargador ${cargadorId}:`, msg);

      // Si el estado reportado es diferente al de la BD, actualizamos la BD
      const cargador = await Cargador.findByPk(cargadorId);
      if (cargador && msg.estado && msg.estado !== cargador.estado) {
        console.log(`[IoT] Actualizando estado del cargador ${cargadorId} de ${cargador.estado} a ${msg.estado}`);
        await Cargador.update(
          { estado: msg.estado },
          { where: { id_cargador: cargadorId } }
        );
      }

      // Enriquecer el mensaje con timestamp si no lo tiene
      msg.timestamp = msg.timestamp || new Date().toISOString();
      msg.sincronizado = true;
    }

    // 2. REENVIAR A SUSCRIPTORES del cargador específico (Apps y Backoffice)
    pubsub.broadcastToSubscribers(cargadorId, {
      from: "publisher",
      estacionId: parseInt(estacionId),
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
      // Validar que el cargador está disponible
      const cargador = await Cargador.findByPk(cargadorId);
      
      if (!cargador) {
        ws.send(JSON.stringify({ 
          type: "error", 
          message: "Cargador no encontrado" 
        }));
        return;
      }

      if (cargador.estado !== 'disponible') {
        ws.send(JSON.stringify({ 
          type: "error", 
          message: `Cargador no disponible. Estado actual: ${cargador.estado}` 
        }));
        return;
      }

      // Crear la sesión de carga en la BD
      const nuevaSesion = await SesionCarga.create({
        id_usuario: usuarioId,
        id_cargador: cargadorId,
        id_estacion: cargador.id_estacion,
        fecha_inicio: new Date(),
        energia_consumida_kwh: 0,
        costo_total: 0,
        estado_sesion: 'en_progreso'
      });

      // Actualizar estado del cargador a 'ocupado'
      await Cargador.update(
        { estado: 'ocupado' },
        { where: { id_cargador: cargadorId } }
      );

      // TODO: Implementar retención de pago con pasarela de pagos

      responsePayload.sesionId = nuevaSesion.id_sesion;
      responsePayload.message = "Sesión de carga iniciada exitosamente";

      console.log(`[APP] Usuario ${usuarioId} inició sesión ${nuevaSesion.id_sesion} en cargador ${cargadorId}`);

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
          { estado: 'fuera_de_servicio' },
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
        type: "estado_cargador",
        command: "detener_energia",
        estado: 'fuera_de_servicio',
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
      // ws.send(JSON.stringify({
      //   type: "comando_enviado",
      //   command: msg.command,
      //   timestamp: Date.now()
      // }));
    }

  } catch (err) {
    console.error("Error processing client command:", err);
    ws.send(JSON.stringify({ type: "error", message: "Error interno procesando comando" }));
  }
}

/**
 * Maneja los mensajes que llegan DESDE EL MONITOR (dashboard de estación)
 * @param {string} estacionId 
 * @param {WebSocket} ws 
 * @param {Buffer} data 
 */
async function handleMonitorMessage(estacionId, ws, data) {
  let msg;
  try {
    msg = JSON.parse(data.toString());
  } catch (err) {
    console.error("Invalid JSON from monitor:", err);
    return;
  }

  try {
    if (msg.command === "solicitar_resumen") {
      // Devolver resumen actualizado de la estación usando la función helper
      await pubsub.notifyStationStatus(estacionId);
    } else if (msg.command === "detener_carga") {
      // ¡NUEVO! Comando desde el monitor para detener una carga
      const cargadorId = msg.cargadorId || msg.id_cargador;
      
      if (!cargadorId) {
        return ws.send(JSON.stringify({
          type: "error",
          message: "cargadorId es requerido para detener carga"
        }));
      }

      console.log(`[Monitor] Comando detener_carga recibido para cargador ${cargadorId}`);

      try {
        const { SesionCargaService } = require('../services/sesionCarga.service');
        const resultado = await SesionCargaService.stopChargeSessionByCharger(parseInt(cargadorId));
        
        // Confirmar al monitor que la detención fue exitosa
        ws.send(JSON.stringify({
          type: "carga_detenida",
          cargadorId: parseInt(cargadorId),
          resultado: resultado,
          timestamp: new Date().toISOString()
        }));

        console.log(`[Monitor] Carga detenida exitosamente en cargador ${cargadorId}`);
      } catch (error) {
        console.error(`[Monitor] Error al detener carga en cargador ${cargadorId}:`, error);
        ws.send(JSON.stringify({
          type: "error",
          message: error.message || "Error al detener la carga",
          cargadorId: parseInt(cargadorId)
        }));
      }
    }
  } catch (err) {
    console.error("Error processing monitor message:", err);
    ws.send(JSON.stringify({ 
      type: "error", 
      message: "Error interno procesando solicitud" 
    }));
  }
}

module.exports = {
  handlePublisherMessage,
  handleClientMessage,
  handleMonitorMessage
};