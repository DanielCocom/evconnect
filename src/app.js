const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");
const userRoutes = require("./routes/user.routes");
const userBackOfficeRouter = require("./routes/userBackOffice.routes");
const responseHandler = require('./middlewares/responseHandler');
const franquiciaRoutes = require('./routes/franquicia.routes');
const metodoPagoRoutes = require('./routes/metodoPago.routes');
const { handleStripeWebhook, verifyStripeWebhook } = require('./middlewares/stripe.webhook');

const app = express();

// IMPORTANTE: Webhook de Stripe ANTES de express.json()
// Stripe necesita el raw body para verificar la firma
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  verifyStripeWebhook,
  handleStripeWebhook
);

app.use(cors());
app.use(express.json());
app.use(responseHandler());

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/user", userRoutes);
app.use("/api/admin/", userBackOfficeRouter);
app.use("/api/franquicia", franquiciaRoutes);
app.use('/api/payment-methods', metodoPagoRoutes); // Cambio de ruta para evitar conflictos

// Error handler mejorado
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  
  // Si ya se usó el responseHandler
  if (res.error) {
    return res.error(
      err.status || 500, 
      err.message || 'Error interno del servidor',
      err.errors || null
    );
  }
  
  // Fallback si no hay responseHandler
  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || "Internal error",
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;
