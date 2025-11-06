const { Router } = require("express");
const { DashboardController } = require("../controllers/dashboard.controller");
const { authenticateToken, authenticateJWT } = require("../middlewares/authJwt");

const router = Router();

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Obtener estadísticas del dashboard
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas
 */
router.get("/stats", authenticateToken, authenticateJWT, DashboardController.getStats);

/**
 * @swagger
 * /api/dashboard/active-alerts:
 *   get:
 *     summary: Obtener alertas activas
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Alertas activas obtenidas
 */
router.get("/active-alerts", authenticateToken, authenticateJWT, DashboardController.getActiveAlerts);

/**
 * @swagger
 * /api/dashboard/energy-chart:
 *   get:
 *     summary: Obtener datos de energía para gráfica
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Datos de energía obtenidos
 */
router.get("/energy-chart", authenticateToken, authenticateJWT, DashboardController.getEnergyChart);

module.exports = router;
