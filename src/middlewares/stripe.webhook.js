const stripe = require('../config/stripe');

/**
 * Middleware para verificar webhooks de Stripe
 * IMPORTANTE: Este middleware debe ir ANTES de express.json()
 * para poder acceder al raw body
 */
const verifyStripeWebhook = (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no está configurado');
    return res.status(500).json({ error: 'Webhook no configurado' });
  }

  try {
    // Stripe necesita el raw body para verificar la firma
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
    
    req.stripeEvent = event;
    next();
  } catch (err) {
    console.error('Error verificando webhook de Stripe:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }
};

/**
 * Handler para procesar eventos de webhook de Stripe
 */
const handleStripeWebhook = async (req, res) => {
  const event = req.stripeEvent;

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'payment_method.attached':
        console.log('PaymentMethod attached:', event.data.object.id);
        break;

      case 'payment_method.detached':
        console.log('PaymentMethod detached:', event.data.object.id);
        break;

      case 'customer.created':
        console.log('Customer created:', event.data.object.id);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object);
        break;

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
};

/**
 * Manejar pago exitoso
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  const { SesionCarga } = require('../models');
  
  console.log('PaymentIntent succeeded:', paymentIntent.id);
  
  // Buscar la sesión asociada
  const sesion = await SesionCarga.findOne({
    where: { id_pago_transaccion: paymentIntent.id }
  });

  if (sesion) {
    // Actualizar estado de la sesión
    await sesion.update({
      estado: 'completada',
      monto_final: paymentIntent.amount_received / 100
    });
    console.log(`Sesión ${sesion.id_sesion} actualizada a completada`);
  }
}

/**
 * Manejar fallo de pago
 */
async function handlePaymentIntentFailed(paymentIntent) {
  const { SesionCarga } = require('../models');
  
  console.error('PaymentIntent failed:', paymentIntent.id);
  console.error('Error:', paymentIntent.last_payment_error?.message);

  const sesion = await SesionCarga.findOne({
    where: { id_pago_transaccion: paymentIntent.id }
  });

  if (sesion) {
    await sesion.update({
      estado: 'pago_fallido'
    });
    console.log(`Sesión ${sesion.id_sesion} marcada como pago_fallido`);
  }
}

/**
 * Manejar disputa (chargeback)
 */
async function handleDisputeCreated(dispute) {
  console.error('¡ALERTA! Disputa creada:', dispute.id);
  console.error('Monto:', dispute.amount / 100);
  console.error('Razón:', dispute.reason);
  
  // Aquí puedes notificar a tu equipo, actualizar la sesión, etc.
  const { SesionCarga } = require('../models');
  
  const sesion = await SesionCarga.findOne({
    where: { id_pago_transaccion: dispute.payment_intent }
  });

  if (sesion) {
    await sesion.update({
      estado: 'disputado'
    });
    // TODO: Enviar notificación al equipo
  }
}

module.exports = { verifyStripeWebhook, handleStripeWebhook };
