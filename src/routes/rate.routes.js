const { Router } = require("express");
const { RateController } = require("../controllers/rate.controller");
const { authenticateToken, authenticateJWT } = require("../middlewares/authJwt");

const router = Router();

/**
 * @swagger
 * /api/rates:
 *   get:
 *     summary: Listar todas las tarifas
 *     tags: [Tarifas]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tarifas obtenida
 */
router.get("/", authenticateToken, authenticateJWT, RateController.getAllRates);

/**
 * @swagger
 * /api/rates:
 *   post:
 *     summary: Crear nueva tarifa
 *     tags: [Tarifas]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_estacion
 *               - tipo_carga
 *               - costo_kw_h
 *               - costo_tiempo_min
 *             properties:
 *               id_estacion:
 *                 type: integer
 *                 example: 1
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
 *         description: Tarifa creada exitosamente
 */
router.post("/", authenticateToken, authenticateJWT, RateController.createRate);

/**
 * @swagger
 * /api/rates/{id}:
 *   get:
 *     summary: Obtener tarifa por ID
 *     tags: [Tarifas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tarifa obtenida
 */
router.get("/:id", authenticateToken, authenticateJWT, RateController.getRateById);

/**
 * @swagger
 * /api/rates/{id}:
 *   put:
 *     summary: Actualizar tarifa
 *     tags: [Tarifas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la tarifa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               costo_kw_h:
 *                 type: number
 *                 example: 0.50
 *               costo_tiempo_min:
 *                 type: number
 *                 example: 0.12
 *               fecha_fin_vigencia:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *     responses:
 *       200:
 *         description: Tarifa actualizada
 */
router.put("/:id", authenticateToken, authenticateJWT, RateController.updateRate);

module.exports = router;
