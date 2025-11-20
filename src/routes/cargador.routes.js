const express = require('express');
const router = express.Router();

// Importar el controlador de cargadores
const CargadorController = require('../controllers/cargador.controller');

// Middleware de autenticación
const { authenticateToken, authenticateJWT } = require("../middlewares/authJwt"); 



/**
 * @swagger
 * tags:
 *   name: Cargadores
 *   description: Gestión y consulta de los puntos de carga individuales dentro de las estaciones.
 */

/**
 * @swagger
 * /api/cargadores/estacion/{estacionId}:
 *   get:
 *     summary: Obtener todos los cargadores de una estación específica
 *     description: Retorna la lista completa de cargadores asociados a una estación de carga, incluyendo su estado actual, tipo de conector y capacidad.
 *     tags: [Cargadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estacionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único de la estación de carga
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de cargadores obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cargador'
 *             example:
 *               success: true
 *               data:
 *                 - id_cargador: 1
 *                   id_estacion: 1
 *                   nombre_cargador: "Cargador A1"
 *                   tipo_conector: "CCS"
 *                   estado: "disponible"
 *                   capacidad_kw: 50
 *                   codigo_qr: "QR123456"
 *                   id_iot: "IOT001"
 *                   createdAt: "2024-01-15T10:30:00Z"
 *                   updatedAt: "2024-01-15T10:30:00Z"
 *       404:
 *         description: Estación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Estación no encontrada"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error al obtener cargadores"
 */
router.get(
    '/estacion/:estacionId',
    CargadorController.obtenerPorEstacion
);

/**
 * @swagger
 * /api/cargadores/estacion/{estacionId}/disponibles:
 *   get:
 *     summary: Obtener cargadores disponibles por tipo de carga
 *     description: Retorna una lista filtrada de cargadores que están en estado 'disponible' y coinciden con el tipo de carga solicitado. Útil para mostrar opciones al usuario antes de iniciar una sesión de carga.
 *     tags: [Cargadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estacionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único de la estación de carga
 *         example: 1
 *       - in: query
 *         name: tipoCarga
 *         required: true
 *         schema:
 *           type: string
 *           enum: [rapida,lenta]
 *         description: Tipo de conector/carga deseado
 *         example: "CCS"
 *     responses:
 *       200:
 *         description: Lista de cargadores disponibles obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cargador'
 *                 count:
 *                   type: integer
 *                   description: Cantidad de cargadores disponibles
 *                   example: 3
 *             example:
 *               success: true
 *               count: 2
 *               data:
 *                 - id_cargador: 1
 *                   id_estacion: 1
 *                   nombre_cargador: "Cargador A1"
 *                   tipo_conector: "CCS"
 *                   estado: "disponible"
 *                   capacidad_kw: 50
 *                   codigo_qr: "QR123456"
 *                   id_iot: "IOT001"
 *                 - id_cargador: 3
 *                   id_estacion: 1
 *                   nombre_cargador: "Cargador A3"
 *                   tipo_conector: "CCS"
 *                   estado: "disponible"
 *                   capacidad_kw: 50
 *                   codigo_qr: "QR123458"
 *                   id_iot: "IOT003"
 *       400:
 *         description: Parámetro 'tipoCarga' faltante o inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "El parámetro 'tipoCarga' es requerido"
 *       404:
 *         description: No se encontraron cargadores disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No hay cargadores disponibles de tipo CCS"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error al obtener cargadores disponibles"
 */
router.get(
    '/estacion/:estacionId/disponibles',
    CargadorController.obtenerDisponiblesPorTipo
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Cargador:
 *       type: object
 *       required:
 *         - id_estacion
 *         - nombre_cargador
 *         - tipo_conector
 *         - estado
 *         - capacidad_kw
 *       properties:
 *         id_cargador:
 *           type: integer
 *           description: ID único del cargador (auto-generado)
 *           example: 1
 *         id_estacion:
 *           type: integer
 *           description: ID de la estación a la que pertenece el cargador
 *           example: 1
 *         nombre_cargador:
 *           type: string
 *           description: Nombre identificador del cargador
 *           example: "Cargador A1"
 *         tipo_conector:
 *           type: string
 *           enum: [rapida, lenta]
 *           description: Tipo de conector del cargador
 *           example: "CCS"
 *         estado:
 *           type: string
 *           enum: [disponible, ocupado, mantenimiento, fuera_de_servicio]
 *           description: Estado actual del cargador
 *           example: "disponible"
 *         capacidad_kw:
 *           type: number
 *           format: float
 *           description: Capacidad de carga en kilovatios
 *           example: 50.0
 *         codigo_qr:
 *           type: string
 *           description: Código QR único para identificar el cargador
 *           example: "QR123456"
 *         id_iot:
 *           type: string
 *           description: Identificador del dispositivo IoT asociado
 *           example: "IOT001"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación del registro
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *           example: "2024-01-15T10:30:00Z"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: Ingrese el token JWT obtenido en el login
 */

module.exports = router;