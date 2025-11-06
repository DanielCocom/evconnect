const { SesionCarga, User, MetodoPago, Cargador, Tarifa } = require('../models');
const { StripeService } = require('./stripe/stripe.service');
const { MetodoPagoService } = require('./metodoPago.service');

class SesionCargaService {
  /**
   * Iniciar sesión de carga
   * 1. Obtener método de pago predeterminado
   * 2. Crear PaymentIntent con monto estimado (autorización)
   * 3. Crear registro de sesión
   */
  static async iniciarSesion(userId, cargadorId, tarifaId) {
    // Validar usuario
    const user = await User.findByPk(userId);
    if (!user || !user.stripe_customer_id) {
      const err = new Error('Usuario no configurado para pagos');
      err.status = 400;
      throw err;
    }

    // Validar cargador
    const cargador = await Cargador.findByPk(cargadorId);
    if (!cargador || cargador.estado !== 'disponible') {
      const err = new Error('Cargador no disponible');
      err.status = 400;
      throw err;
    }

    // Obtener tarifa
    const tarifa = await Tarifa.findByPk(tarifaId);
    if (!tarifa) {
      const err = new Error('Tarifa no encontrada');
      err.status = 404;
      throw err;
    }

    // Obtener método de pago predeterminado
    const metodoPago = await MetodoPagoService.getDefaultPaymentMethod(userId);

    // Calcular monto estimado (ejemplo: 100 kWh máximo * tarifa)
    const maxKwh = 100;
    const montoEstimado = maxKwh * parseFloat(tarifa.precio_kwh);

    // Crear PaymentIntent (autorizar, NO cobrar)
    const paymentIntent = await StripeService.createPaymentIntent({
      amount: montoEstimado,
      currency: 'mxn',
      customerId: user.stripe_customer_id,
      paymentMethodId: metodoPago.token_referencia,
      description: `Sesión de carga - Cargador ${cargador.id_cargador}`,
      metadata: {
        user_id: userId,
        cargador_id: cargadorId,
        tarifa_id: tarifaId
      }
    });

    // Crear sesión de carga
    const sesion = await SesionCarga.create({
      id_usuario: userId,
      id_cargador: cargadorId,
      id_tarifa: tarifaId,
      metodo_pago_utilizado: metodoPago.id_pago,
      estado: 'en_progreso',
      monto_estimado: montoEstimado,
      id_pago_transaccion: paymentIntent.id
    });

    // Actualizar estado del cargador
    await cargador.update({ estado: 'en_uso' });

    return {
      id_sesion: sesion.id_sesion,
      estado: sesion.estado,
      monto_estimado: sesion.monto_estimado,
      payment_intent_id: paymentIntent.id,
      payment_status: paymentIntent.status
    };
  }

  /**
   * Finalizar sesión de carga
   * 1. Calcular consumo real
   * 2. Capturar el monto correspondiente
   * 3. Actualizar sesión
   */
  static async finalizarSesion(sesionId, energiaConsumidaKwh) {
    const sesion = await SesionCarga.findByPk(sesionId, {
      include: [
        { model: Tarifa, as: 'tarifa' },
        { model: Cargador, as: 'cargador' }
      ]
    });

    if (!sesion) {
      const err = new Error('Sesión no encontrada');
      err.status = 404;
      throw err;
    }

    if (sesion.estado !== 'en_progreso') {
      const err = new Error('La sesión no está en progreso');
      err.status = 400;
      throw err;
    }

    // Calcular monto final
    const tarifa = await Tarifa.findByPk(sesion.id_tarifa);
    const montoFinal = energiaConsumidaKwh * parseFloat(tarifa.precio_kwh);

    // Verificar que no exceda el monto autorizado
    if (montoFinal > parseFloat(sesion.monto_estimado)) {
      console.warn(`Monto final (${montoFinal}) excede el estimado (${sesion.monto_estimado})`);
      // Podrías cobrar el monto estimado y crear otra autorización para la diferencia
    }

    // Capturar el pago en Stripe
    let paymentIntent;
    try {
      paymentIntent = await StripeService.capturePaymentIntent(
        sesion.id_pago_transaccion,
        montoFinal
      );
    } catch (error) {
      // Si falla la captura, marcar sesión como error
      await sesion.update({
        estado: 'error_pago',
        energia_consumida_kwh: energiaConsumidaKwh,
        fecha_fin: new Date()
      });
      throw error;
    }

    // Actualizar sesión
    await sesion.update({
      estado: 'completada',
      energia_consumida_kwh: energiaConsumidaKwh,
      monto_final: montoFinal,
      fecha_fin: new Date()
    });

    // Liberar cargador
    const cargador = await Cargador.findByPk(sesion.id_cargador);
    if (cargador) {
      await cargador.update({ estado: 'disponible' });
    }

    return {
      id_sesion: sesion.id_sesion,
      estado: sesion.estado,
      energia_consumida_kwh: energiaConsumidaKwh,
      monto_final: montoFinal,
      payment_status: paymentIntent.status
    };
  }

  /**
   * Cancelar sesión de carga
   * Libera la autorización del pago
   */
  static async cancelarSesion(sesionId, razon = 'Cancelada por usuario') {
    const sesion = await SesionCarga.findByPk(sesionId);

    if (!sesion) {
      const err = new Error('Sesión no encontrada');
      err.status = 404;
      throw err;
    }

    if (sesion.estado !== 'en_progreso') {
      const err = new Error('Solo se pueden cancelar sesiones en progreso');
      err.status = 400;
      throw err;
    }

    // Cancelar PaymentIntent en Stripe (liberar fondos)
    try {
      await StripeService.cancelPaymentIntent(sesion.id_pago_transaccion);
    } catch (error) {
      console.error('Error cancelando PaymentIntent:', error);
      // Continuar de todos modos para marcar la sesión como cancelada
    }

    // Actualizar sesión
    await sesion.update({
      estado: 'cancelada',
      fecha_fin: new Date()
    });

    // Liberar cargador
    const cargador = await Cargador.findByPk(sesion.id_cargador);
    if (cargador) {
      await cargador.update({ estado: 'disponible' });
    }

    return {
      id_sesion: sesion.id_sesion,
      estado: sesion.estado,
      razon
    };
  }

  /**
   * Reembolsar sesión de carga
   * Útil para errores o problemas con el servicio
   */
  static async reembolsarSesion(sesionId, monto = null) {
    const sesion = await SesionCarga.findByPk(sesionId);

    if (!sesion) {
      const err = new Error('Sesión no encontrada');
      err.status = 404;
      throw err;
    }

    if (sesion.estado !== 'completada') {
      const err = new Error('Solo se pueden reembolsar sesiones completadas');
      err.status = 400;
      throw err;
    }

    // Crear reembolso en Stripe
    const refund = await StripeService.createRefund(
      sesion.id_pago_transaccion,
      monto // Si es null, reembolsa todo
    );

    // Actualizar sesión
    await sesion.update({
      estado: 'reembolsada'
    });

    return {
      id_sesion: sesion.id_sesion,
      estado: sesion.estado,
      monto_reembolsado: refund.amount / 100,
      refund_id: refund.id
    };
  }

  /**
   * Obtener historial de sesiones de un usuario
   */
  static async obtenerHistorial(userId, limit = 10, offset = 0) {
    const sesiones = await SesionCarga.findAndCountAll({
      where: { id_usuario: userId },
      limit,
      offset,
      order: [['fecha_inicio', 'DESC']],
      include: [
        { model: Cargador, as: 'cargador' },
        { model: Tarifa, as: 'tarifa' }
      ]
    });

    return {
      total: sesiones.count,
      sesiones: sesiones.rows
    };
  }
}

module.exports = { SesionCargaService };
