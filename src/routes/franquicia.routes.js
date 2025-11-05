const { Router } = require("express");
const { FranchiseController } = require("../controllers/franchaise.controller");

const { authenticateToken, authenticateJWT } = require("../middlewares/authJwt"); 

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardStats:
 *       type: object
 *       properties:
 *         energiaTotal:
 *           type: number
 *           format: float
 *           description: Total de energía consumida en kWh
 *           example: 1250.75
 *         ingresosTotales:
 *           type: number
 *           format: float
 *           description: Ingresos totales acumulados
 *           example: 45000.50
 *         ingresosDiarios:
 *           type: number
 *           format: float
 *           description: Ingresos del día actual
 *           example: 850.25
 *         sesionesActivas:
 *           type: integer
 *           description: Número de sesiones de carga activas
 *           example: 12
 *         estadoCargadores:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id_cargador:
 *                 type: integer
 *                 description: ID del cargador
 *                 example: 1
 *               estado:
 *                 type: string
 *                 description: Estado actual del cargador
 *                 example: "disponible"
 *               id_estacion:
 *                 type: integer
 *                 description: ID de la estación a la que pertenece
 *                 example: 1
 */

/**
 * @swagger
 * /api/franquicia/dashboard:
 *   get:
 *     summary: Obtener estadísticas del dashboard de franquicia
 *     description: |
 *       Retorna estadísticas completas de la franquicia incluyendo:
 *       - Energía total consumida
 *       - Ingresos totales y diarios
 *       - Sesiones activas
 *       - Estado de todos los cargadores
 *       
 *       Requiere autenticación con token JWT que contenga franquiciaId en el payload.
 *     tags: [Franquicia]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         description: Token no provisto, inválido o usuario no asociado a franquicia
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             examples:
 *               noToken:
 *                 summary: Token no provisto
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "UNAUTHORIZED"
 *                     message: "Token no provisto"
 *               noFranquicia:
 *                 summary: Usuario sin franquicia
 *                 value:
 *                   success: false
 *                   message: "Usuario no está asociado a una franquicia."
 *       403:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get(
  "/dashboard",
  authenticateToken, 
  authenticateJWT,
  FranchiseController.getDashboardStats
);

module.exports = router;    