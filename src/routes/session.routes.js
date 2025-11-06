const { Router } = require("express");
const { SessionController } = require("../controllers/session.controller");
const { authenticateToken, authenticateJWT } = require("../middlewares/authJwt");

const router = Router();

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: Listar sesiones de carga (paginado)
 *     tags: [Sesiones]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de sesiones obtenida
 */
router.get("/", authenticateToken, authenticateJWT, SessionController.getAllSessions);

/**
 * @swagger
 * /api/sessions/export:
 *   get:
 *     summary: Exportar sesiones a CSV
 *     tags: [Sesiones]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Archivo CSV generado
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get("/export", authenticateToken, authenticateJWT, SessionController.exportSessions);

module.exports = router;
