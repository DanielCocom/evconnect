const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");
const userRoutes = require("./routes/user.routes");
const userBackOfficeRouter = require("./routes/userBackOffice.routes");
const responseHandler = require('./middlewares/responseHandler');
const franquiciaRoutes = require('./routes/franquicia.routes');
const metodoPagoRoutes = require('./routes/metodoPago.routes');


const app = express();

app.use(cors());
app.use(express.json());
app.use(responseHandler());

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/user", userRoutes);
app.use("/api/admin/", userBackOfficeRouter);
app.use("/api/franquicia", franquiciaRoutes);
app.use('/api/user/payment-methods', metodoPagoRoutes);



// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ 
    message: err.message || "Internal error" 
  });
});

module.exports = app;
