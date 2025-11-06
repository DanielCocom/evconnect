const { Router } = require("express");
const { StationController } = require("../controllers/station.controller");
const { authenticateToken, authenticateJWT } = require("../middlewares/authJwt");

const router = Router();

/**
 * @swagger
 * /api/stations:
 *   get:
 *     summary: Listar todas las estaciones
 *     tags: [Estaciones]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de estaciones obtenida
 */
router.get("/", authenticateToken, authenticateJWT, StationController.getAllStations);

/**
 * @swagger
 * /api/stations/{id}/assign-rate:
 *   post:
 *     summary: Asignar tarifa a estación
 *     tags: [Estaciones]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la estación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipo_carga
 *               - costo_kw_h
 *               - costo_tiempo_min
 *             properties:
 *               tipo_carga:
 *                 type: string
 *                 example: "rapida"
 *               costo_kw_h:
 *                 type: number
 *                 example: 0.45
 *               costo_tiempo_min:
 *                 type: number
 *                 example: 0.10
 *               fecha_inicio_vigencia:
 *                 type: string
 *                 format: date
 *                 example: "2024-11-01"
 *               fecha_fin_vigencia:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-31"
 *     responses:
 *       201:
 *         description: Tarifa asignada exitosamente
 */
router.post("/:id/assign-rate", authenticateToken, authenticateJWT, StationController.assignRateToStation);

module.exports = router;
