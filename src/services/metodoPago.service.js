const { MetodoPago, User } = require('../models');
const { StripeService } = require('./stripe/stripe.service')

class MetodoPagoService {
  /**
   * Crear SetupIntent para vincular tarjeta
   * El usuario debe usar el client_secret en el frontend con Stripe Elements
   */
  static async createSetupIntent(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      throw err;
    }

    // Verificar si el usuario tiene customer_id de Stripe
    if (!user.stripe_customer_id) {
      const err = new Error('Usuario sin cuenta Stripe. Contacte soporte.');
      err.status = 400;
      throw err;
    }

    // Crear SetupIntent
    const setupIntent = await StripeService.createSetupIntent(user.stripe_customer_id);

    return {
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id
    };
  }

  /**
   * Guardar método de pago después de completar el setup
   * @param {number} userId 
   * @param {string} paymentMethodId - ID del PaymentMethod de Stripe (pm_xxxx)
   */
  static async addPaymentMethod(userId, paymentMethodId) {
    const user = await User.findByPk(userId);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      throw err;
    }

    // Verificar que el PaymentMethod existe en Stripe
    const paymentMethod = await StripeService.getPaymentMethod(paymentMethodId);

    // Vincular el PaymentMethod al Customer
    await StripeService.attachPaymentMethod(paymentMethodId, user.stripe_customer_id);

    // Verificar si es la primera tarjeta (será predeterminada)
    const existingMethods = await MetodoPago.findAll({
      where: { id_usuario: userId, activo: true }
    });

    const esPrimera = existingMethods.length === 0;

    // Guardar en la BD
    const metodoPago = await MetodoPago.create({
      id_usuario: userId,
      tipo: paymentMethod.card.brand, // visa, mastercard, etc.
      token_referencia: paymentMethodId,
      activo: true,
      es_predeterminado: esPrimera
    });

    // Si es la primera tarjeta, marcar usuario como verificado
    if (esPrimera) {
      await user.update({ tarjeta_verificada: true });
    }

    return {
      id_pago: metodoPago.id_pago,
      tipo: metodoPago.tipo,
      ultimos_digitos: paymentMethod.card.last4,
      marca: paymentMethod.card.brand,
      expira: `${paymentMethod.card.exp_month}/${paymentMethod.card.exp_year}`,
      es_predeterminado: metodoPago.es_predeterminado
    };
  }

  /**
   * Listar métodos de pago del usuario
   */
  static async listPaymentMethods(userId) {
    const user = await User.findByPk(userId);
    if (!user || !user.stripe_customer_id) {
      return [];
    }

    // Obtener de Stripe (fuente de verdad)
    const stripeMethods = await StripeService.listPaymentMethods(user.stripe_customer_id);

    // Obtener de BD local (para info adicional como predeterminado)
    const localMethods = await MetodoPago.findAll({
      where: { id_usuario: userId, activo: true }
    });

    // Combinar información
    const methods = stripeMethods.map(sm => {
      const local = localMethods.find(lm => lm.token_referencia === sm.id);
      return {
        id_pago: local?.id_pago,
        payment_method_id: sm.id,
        tipo: sm.card.brand,
        ultimos_digitos: sm.card.last4,
        expira: `${sm.card.exp_month}/${sm.card.exp_year}`,
        es_predeterminado: local?.es_predeterminado || false
      };
    });

    return methods;
  }

  /**
   * Eliminar método de pago
   * No permite eliminar si es el único activo
   */
  static async removePaymentMethod(userId, idPago) {
    const metodoPago = await MetodoPago.findOne({
      where: { id_pago: idPago, id_usuario: userId, activo: true }
    });

    if (!metodoPago) {
      const err = new Error('Método de pago no encontrado');
      err.status = 404;
      throw err;
    }

    // Verificar que no sea el único
    const activeMethods = await MetodoPago.count({
      where: { id_usuario: userId, activo: true }
    });

    if (activeMethods <= 1) {
      const err = new Error('No puedes eliminar tu única tarjeta. Agrega otra primero.');
      err.status = 400;
      throw err;
    }

    // Desvincular de Stripe
    await StripeService.detachPaymentMethod(metodoPago.token_referencia);

    // Marcar como inactivo en BD (soft delete)
    await metodoPago.update({ activo: false });

    // Si era predeterminado, asignar otro
    if (metodoPago.es_predeterminado) {
      const newDefault = await MetodoPago.findOne({
        where: { id_usuario: userId, activo: true }
      });
      if (newDefault) {
        await newDefault.update({ es_predeterminado: true });
      }
    }

    return { message: 'Método de pago eliminado correctamente' };
  }

  /**
   * Marcar tarjeta como predeterminada
   */
  static async setDefaultPaymentMethod(userId, idPago) {
    const metodoPago = await MetodoPago.findOne({
      where: { id_pago: idPago, id_usuario: userId, activo: true }
    });

    if (!metodoPago) {
      const err = new Error('Método de pago no encontrado');
      err.status = 404;
      throw err;
    }

    // Quitar predeterminado de todos
    await MetodoPago.update(
      { es_predeterminado: false },
      { where: { id_usuario: userId, activo: true } }
    );

    // Marcar el nuevo como predeterminado
    await metodoPago.update({ es_predeterminado: true });

    return { message: 'Tarjeta predeterminada actualizada' };
  }

  /**
   * Obtener método de pago predeterminado del usuario
   */
  static async getDefaultPaymentMethod(userId) {
    const metodoPago = await MetodoPago.findOne({
      where: { 
        id_usuario: userId, 
        activo: true,
        es_predeterminado: true 
      }
    });

    if (!metodoPago) {
      const err = new Error('No tienes un método de pago configurado');
      err.status = 400;
      throw err;
    }

    return metodoPago;
  }
}

module.exports = { MetodoPagoService };