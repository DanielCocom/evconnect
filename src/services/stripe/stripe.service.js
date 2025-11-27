const stripe = require("../../config/stripe");

class StripeService {
  /**
   * Crear un Customer en Stripe
   * @param {Object} data - { email, name, metadata }
   * @returns {Promise<Object>} Customer de Stripe
   */
  static async createCustomer(data) {
    try {
      const customer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: data.metadata || {},
      });
      return customer;
    } catch (error) {
      console.error("Error creando customer en Stripe:", error);
      throw new Error("Error al crear cliente en Stripe");
    }
  }

  /**
   * Crear un SetupIntent para vincular tarjeta sin cobrar
   * @param {string} customerId - ID del customer en Stripe
   * @returns {Promise<Object>} SetupIntent con client_secret
   */
  static async createSetupIntent(customerId) {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session", // Permite cobros futuros sin que el usuario esté presente
      });
      return setupIntent;
    } catch (error) {
      console.error("Error creando SetupIntent:", error);
      throw new Error("Error al preparar vinculación de tarjeta");
    }
  }

  /**
   * Obtener un PaymentMethod de Stripe
   * @param {string} paymentMethodId - ID del payment method (pm_xxxx)
   * @returns {Promise<Object>} PaymentMethod
   */
  static async getPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentMethodId
      );
      return paymentMethod;
    } catch (error) {
      console.error("Error obteniendo PaymentMethod:", error);
      throw new Error("Método de pago no encontrado");
    }
  }

  /**
   * Vincular un PaymentMethod a un Customer
   * @param {string} paymentMethodId
   * @param {string} customerId
   * @returns {Promise<Object>}
   */
  static async attachPaymentMethod(paymentMethodId, customerId) {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(
        paymentMethodId,
        {
          customer: customerId,
        }
      );
      return paymentMethod;
    } catch (error) {
      console.error("Error vinculando PaymentMethod:", error);
      throw new Error("Error al vincular método de pago");
    }
  }

  /**
   * Desvincular un PaymentMethod de un Customer
   * @param {string} paymentMethodId
   * @returns {Promise<Object>}
   */
  static async detachPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
      return paymentMethod;
    } catch (error) {
      console.error("Error desvinculando PaymentMethod:", error);
      throw new Error("Error al desvincular método de pago");
    }
  }

  /**
   * Listar PaymentMethods de un Customer
   * @param {string} customerId
   * @returns {Promise<Array>}
   */
  static async listPaymentMethods(customerId) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });
      return paymentMethods.data;
    } catch (error) {
      console.error("Error listando PaymentMethods:", error);
      throw new Error("Error al obtener métodos de pago");
    }
  }

  /**
   * Crear PaymentIntent (para autorizar y cobrar después)
   * @param {Object} data - { amount, currency, customerId, paymentMethodId, description }
   * @returns {Promise<Object>} PaymentIntent
   */
  static async createPaymentIntent(data) {
    try {
      const {
        amount,
        currency = "mxn",
        customerId,
        paymentMethodId,
        description,
        metadata,
      } = data;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe usa centavos
        currency,
        customer: customerId,
        payment_method: paymentMethodId,
        capture_method: "manual", // CRÍTICO: No cobrar aún, solo autorizar
        confirm: true, // Confirmar inmediatamente
        off_session: true, // Cobro sin presencia del usuario
        description: description || "Sesión de carga EVCONNECT",
        metadata: metadata || {},
      });

      return paymentIntent;
    } catch (error) {
      console.error("Error creando PaymentIntent:", error);
      throw new Error(`Error al autorizar pago: ${error.message}`);
    }
  }

  /**
   * Capturar un PaymentIntent (cobrar el monto autorizado)
   * @param {string} paymentIntentId
   * @param {number} amount - Monto final a cobrar (puede ser menor al autorizado)
   * @returns {Promise<Object>}
   */
  static async capturePaymentIntent(paymentIntentId, amount = null) {
    try {
      const captureData = {};
      if (amount !== null) {
        captureData.amount_to_capture = Math.round(amount * 100);
      }

      const paymentIntent = await stripe.paymentIntents.capture(
        paymentIntentId,
        captureData
      );
      return paymentIntent;
    } catch (error) {
      console.error(
        "[StripeService] Error al capturar:",
        error.code,
        error.message
      );

      // --- 2. Casos donde la autorización ya expiró o no se puede capturar ---
      const expiredErrors = [
        "payment_intent_unexpected_state",
        "authorization_expired",
        "authorization_already_captured",
        "amount_too_large",
      ];

      if (expiredErrors.includes(error.code)) {
        console.warn(
          "[StripeService] La autorización expiró o no es válida. Creando nuevo cargo..."
        );

        // --- 3. Recuperar el PI original para extraer datos ---
        const originalPI = await stripe.paymentIntents.retrieve(
          paymentIntentId
        );

        // --- 4. Crear un nuevo cobro (off_session automático) ---
        const newCharge = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: originalPI.currency,
          customer: originalPI.customer,
          payment_method: originalPI.payment_method,
          confirm: true,
          off_session: true,
          description: `Cobro directo (autorización caducada) para sesión ${
            originalPI.metadata?.session_id || ""
          }`,
          metadata: {
            ...originalPI.metadata,
            type: "CHARGE_AFTER_AUTH_EXPIRED",
          },
        });

        console.log(
          "[StripeService] Nuevo cobro creado exitosamente tras expiración."
        );
        return newCharge;
      }

      // --- 5. Si es otro error, relanzarlo ---
      throw new Error(`Error al capturar o cobrar: ${error.message}`);
    }
  }

  /**
   * Cancelar un PaymentIntent (liberar fondos retenidos)
   * @param {string} paymentIntentId
   * @returns {Promise<Object>}
   */
  static async cancelPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error("Error cancelando PaymentIntent:", error);
      throw new Error("Error al cancelar pago");
    }
  }

  /**
   * Crear un reembolso
   * @param {string} paymentIntentId
   * @param {number} amount - Monto a reembolsar (opcional, por defecto todo)
   * @returns {Promise<Object>}
   */
  static async createRefund(paymentIntentId, amount = null) {
    try {
      const refundData = { payment_intent: paymentIntentId };
      if (amount !== null) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await stripe.refunds.create(refundData);
      return refund;
    } catch (error) {
      console.error("Error creando reembolso:", error);
      throw new Error("Error al procesar reembolso");
    }
  }
}

module.exports = { StripeService };
