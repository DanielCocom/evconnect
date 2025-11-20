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
const estacionRoutes = require('./routes/estacion.routes'); // <-- NUEVA IMPORTACIÓN
const sesionCargaRoutes= require('./routes/sesionCarga.routes'); // <-- NUEVA IMPORTACIÓN
const tarifaRoutes = require('./routes/admin/tarifa.routes'); 
const reporteRoutes = require('./routes/admin/reporte.routes'); // <-- NUEVA IMPORTACIÓN 
const cargadoresRouters = require('./routes/cargador.routes')

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
app.use('/api/stations', estacionRoutes); // <-- NUEVO REGISTRO
app.use('/api/sessions', sesionCargaRoutes); // <-- NUEVO REGISTRO
app.use('/api/admin/tarifas', tarifaRoutes); // <-- NUEVO REGISTRO DEDICADO
app.use('/api/admin/reports', reporteRoutes); // <-- NUEVO REGISTRO DEDICADO
app.use('/api/cargadores', cargadoresRouters); // <-- NUEVO REGISTRO DEDICADO





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
