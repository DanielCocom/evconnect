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
 *
 *     TarifaResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Tarifa obtenida correctamente"
 *         data:
 *           type: object
 *           properties:
 *             cargador:
 *               type: object
 *               properties:
 *                 id_cargador:
 *                   type: integer
 *                   example: 1
 *                 id_estacion:
 *                   type: integer
 *                   example: 5
 *                 tipo_carga:
 *                   type: string
 *                   enum: [rapida, lenta, ultrarapida]
 *                   example: "rapida"
 *                 estado:
 *                   type: string
 *                   enum: [disponible, ocupado, mantenimiento, fuera_servicio, reservado]
 *                   example: "disponible"
 *                 capacidad_kw:
 *                   type: number
 *                   format: decimal
 *                   example: 50.0
 *             tarifa:
 *               type: object
 *               properties:
 *                 id_tarifa:
 *                   type: integer
 *                   example: 12
 *                 costo_kw_h:
 *                   type: number
 *                   format: decimal
 *                   description: Costo por kilovatio-hora
 *                   example: 4.50
 *                 costo_tiempo_min:
 *                   type: number
 *                   format: decimal
 *                   description: Costo por minuto de carga
 *                   example: 0.75
 *                 fecha_inicio_vigencia:
 *                   type: string
 *                   format: date
 *                   example: "2024-01-01"
 *                 fecha_fin_vigencia:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *                   example: null
 * 
 * tags:
 *   - name: Cargadores
 *     description: Gestión de cargadores y tarifas - Información para app móvil
 */

/**
 * @swagger
 * /api/stations/tariffs:
 *   get:
 *     summary: Obtener tarifa vigente de un cargador
 *     description: |
 *       Devuelve la estructura de costos (costo_kw_h y costo_tiempo_min) vigente para un cargador específico.
 *       Este endpoint es utilizado por la app móvil después de escanear el NFC del cargador,
 *       para mostrar al usuario los costos antes de iniciar la sesión de carga.
 *       
 *       **Flujo de uso:**
 *       1. El usuario escanea el NFC del cargador y obtiene el `id_cargador`
 *       2. La app móvil llama a este endpoint con el `id_cargador` como query parameter
 *       3. El backend resuelve la tarifa vigente basándose en:
 *          - La estación a la que pertenece el cargador (`id_estacion`)
 *          - El tipo de carga del cargador (`tipo_carga`)
 *          - La fecha actual (solo tarifas vigentes)
 *       4. La app muestra los costos al usuario para que configure su límite de carga
 *       
 *       **Lógica de negocio:**
 *       - Se busca la tarifa más reciente que esté vigente en la fecha actual
 *       - Si no hay tarifa vigente, retorna error 404
 *       - La tarifa debe coincidir con el tipo de carga del cargador
 *     tags: [Cargadores]
 *     parameters:
 *       - in: query
 *         name: id_cargador
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único del cargador obtenido del NFC
 *         example: 1
 *     responses:
 *       200:
 *         description: Tarifa obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TarifaResponse'
 *             examples:
 *               tarifa_rapida:
 *                 summary: Tarifa para carga rápida
 *                 value:
 *                   success: true
 *                   message: "Tarifa obtenida correctamente"
 *                   data:
 *                     cargador:
 *                       id_cargador: 1
 *                       id_estacion: 5
 *                       tipo_carga: "rapida"
 *                       estado: "disponible"
 *                       capacidad_kw: 50.0
 *                     tarifa:
 *                       id_tarifa: 12
 *                       costo_kw_h: 4.50
 *                       costo_tiempo_min: 0.75
 *                       fecha_inicio_vigencia: "2024-01-01"
 *                       fecha_fin_vigencia: null
 *               tarifa_lenta:
 *                 summary: Tarifa para carga lenta
 *                 value:
 *                   success: true
 *                   message: "Tarifa obtenida correctamente"
 *                   data:
 *                     cargador:
 *                       id_cargador: 3
 *                       id_estacion: 2
 *                       tipo_carga: "lenta"
 *                       estado: "disponible"
 *                       capacidad_kw: 22.0
 *                     tarifa:
 *                       id_tarifa: 8
 *                       costo_kw_h: 3.20
 *                       costo_tiempo_min: 0.45
 *                       fecha_inicio_vigencia: "2024-01-15"
 *                       fecha_fin_vigencia: "2024-12-31"
 *       400:
 *         description: Parámetro id_cargador no proporcionado
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
 *                   example: "El parámetro id_cargador es requerido"
 *       404:
 *         description: Cargador no encontrado o sin tarifa vigente
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
 *             examples:
 *               cargador_no_encontrado:
 *                 summary: Cargador no existe
 *                 value:
 *                   success: false
 *                   message: "Cargador no encontrado"
 *               sin_tarifa:
 *                 summary: No hay tarifa vigente
 *                 value:
 *                   success: false
 *                   message: "No hay tarifa vigente para el cargador (Estación: 5, Tipo: rapida)"
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
 *                   example: "Error interno del servidor"
 */
router.get('/tariffs', CargadorController.obtenerTarifaPorCargador);

/**
 * @swagger
 * /api/stations/{estacionId}/chargers:
 *   get:
 *     summary: Obtener cargadores de una estación
 *     description: Devuelve todos los cargadores asociados a una estación específica
 *     tags: [Cargadores]
 *     parameters:
 *       - in: path
 *         name: estacionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la estación
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de cargadores obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_cargador:
 *                     type: integer
 *                   id_estacion:
 *                     type: integer
 *                   tipo_carga:
 *                     type: string
 *                   capacidad_kw:
 *                     type: number
 *                   estado:
 *                     type: string
 *       404:
 *         description: Estación no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:estacionId/chargers', CargadorController.obtenerPorEstacion);

module.exports = router;
