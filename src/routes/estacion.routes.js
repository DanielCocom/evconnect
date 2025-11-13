const express = require('express');
const { EstacionController } = require('../controllers/estacion.controller');
const { authenticateToken } = require('../middlewares/authJwt');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CargadorEstacion:
 *       type: object
 *       properties:
 *         id_cargador:
 *           type: integer
 *         tipo_carga:
 *           type: string
 *           enum: [rapida, lenta]
 *         capacidad_kw:
 *           type: number
 *           format: decimal
 *         estado:
 *           type: string
 *           enum: [disponible, ocupado, mantenimiento, reservado]
 *         costo_tiempo_min:
 *           type: number
 *           format: decimal
 *           description: Tarifa vigente de cobro por minuto.
 *     EstacionMap:
 *       type: object
 *       properties:
 *         id_estacion:
 *           type: integer
 *         nombre_estacion:
 *           type: string
 *         direccion:
 *           type: string
 *         ubicacion_lat:
 *           type: number
 *           format: decimal
 *         ubicacion_lon:
 *           type: number
 *           format: decimal
 *         disponibilidad_general:
 *           type: string
 *           description: Estado general para mostrar en el mapa (Disponible, Ocupada, Sin Cargadores).
 *         cargadores:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CargadorEstacion'
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *   responses:
 *     UnauthorizedError:
 *       description: Token de acceso requerido o inválido
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *                 example: false
 *               message:
 *                 type: string
 *                 example: "Token de acceso requerido"
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/stations:
 *   get:
 *     summary: Obtener estaciones disponibles y sus cargadores
 *     description: |
 *       Devuelve todas las estaciones activas con la lista de sus cargadores,
 *       su estado y la tarifa vigente por minuto (costo_tiempo_min).
 *       Esta es la vista principal para el mapa de la App Móvil.
 *     tags: [Estaciones]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de estaciones obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Estaciones obtenidas correctamente"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EstacionMap'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', EstacionController.getAvailableStations);

module.exports = router;