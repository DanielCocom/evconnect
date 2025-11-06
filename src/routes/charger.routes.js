const { Router } = require("express");
const { ChargerController } = require("../controllers/charger.controller");
const { authenticateToken, authenticateJWT } = require("../middlewares/authJwt");

const router = Router();

/**
 * @swagger
 * /api/chargers:
 *   get:
 *     summary: Listar todos los cargadores
 *     tags: [Cargadores]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de cargadores obtenida
 */
router.get("/", authenticateToken, authenticateJWT, ChargerController.getAllChargers);

/**
 * @swagger
 * /api/chargers:
 *   post:
 *     summary: Crear nuevo cargador
 *     tags: [Cargadores]
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
 *               - capacidad_kw
 *             properties:
 *               id_estacion:
 *                 type: integer
 *                 example: 1
 *               tipo_carga:
 *                 type: string
 *                 example: "rapida"
 *               capacidad_kw:
 *                 type: number
 *                 example: 50
 *               estado:
 *                 type: string
 *                 enum: [disponible, ocupado, mantenimiento, fuera_de_servicio]
 *                 example: "disponible"
 *               firmware_version:
 *                 type: string
 *                 example: "v2.1.0"
 *     responses:
 *       201:
 *         description: Cargador creado exitosamente
 */
router.post("/", authenticateToken, authenticateJWT, ChargerController.createCharger);

/**
 * @swagger
 * /api/chargers/{id}:
 *   get:
 *     summary: Obtener cargador por ID
 *     tags: [Cargadores]
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
 *         description: Cargador obtenido
 */
router.get("/:id", authenticateToken, authenticateJWT, ChargerController.getChargerById);

/**
 * @swagger
 * /api/chargers/{id}:
 *   put:
 *     summary: Actualizar cargador
 *     tags: [Cargadores]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cargador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipo_carga:
 *                 type: string
 *                 example: "ultra_rapida"
 *               capacidad_kw:
 *                 type: number
 *                 example: 150
 *               estado:
 *                 type: string
 *                 enum: [disponible, ocupado, mantenimiento, fuera_de_servicio, reiniciando]
 *                 example: "mantenimiento"
 *               firmware_version:
 *                 type: string
 *                 example: "v2.2.0"
 *     responses:
 *       200:
 *         description: Cargador actualizado
 */
router.put("/:id", authenticateToken, authenticateJWT, ChargerController.updateCharger);

/**
 * @swagger
 * /api/chargers/{id}/reset:
 *   post:
 *     summary: Reiniciar cargador
 *     tags: [Cargadores]
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
 *         description: Cargador reiniciado
 */
router.post("/:id/reset", authenticateToken, authenticateJWT, ChargerController.resetCharger);

module.exports = router;
