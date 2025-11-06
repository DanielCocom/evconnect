const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");
const userRoutes = require("./routes/user.routes");
const userBackOfficeRouter = require("./routes/userBackOffice.routes");
const responseHandler = require('./middlewares/responseHandler');
const franquiciaRoutes = require('./routes/franquicia.routes');

// Nuevas rutas para backoffice
const dashboardRoutes = require('./routes/dashboard.routes');
const chargerRoutes = require('./routes/charger.routes');
const rateRoutes = require('./routes/rate.routes');
const stationRoutes = require('./routes/station.routes');
const sessionRoutes = require('./routes/session.routes');
const adminUserRoutes = require('./routes/adminUser.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(responseHandler());

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas de usuarios app
app.use("/api/user", userRoutes);

// Rutas de autenticación backoffice
app.use("/api/admin/", userBackOfficeRouter);

// Rutas de dashboard y estadísticas
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/franquicia", franquiciaRoutes);

// Rutas de gestión de recursos
app.use("/api/chargers", chargerRoutes);
app.use("/api/rates", rateRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin-users", adminUserRoutes);



// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ 
    message: err.message || "Internal error" 
  });
});

module.exports = app;
