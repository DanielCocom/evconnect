const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY no está definida en las variables de entorno');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia', // Usa la última versión estable
  maxNetworkRetries: 2,
  timeout: 10000, // 10 segundos
});

module.exports = stripe;
