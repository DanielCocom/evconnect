const express = require('express');
const { EstacionController } = require('../controllers/estacion.controller');
const { authenticateToken,  authenticateJWT } = require('../middlewares/authJwt');
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
 *           description: ID único del cargador
 *           example: 1
 *         tipo_carga:
 *           type: string
 *           enum: [rapida, lenta]
 *           description: Tipo de carga que soporta el cargador
 *           example: "rapida"
 *         capacidad_kw:
 *           type: number
 *           format: decimal
 *           description: Capacidad máxima en kilovatios
 *           example: 50.0
 *         estado:
 *           type: string
 *           enum: [disponible, ocupado, mantenimiento, reservado]
 *           description: Estado actual del cargador
 *           example: "disponible"
 *         costo_tiempo_min:
 *           type: number
 *           format: decimal
 *           nullable: true
 *           description: Tarifa vigente de cobro por minuto
 *           example: 0.05
 *     
 *     CargadorFranquicia:
 *       type: object
 *       properties:
 *         id_cargador:
 *           type: integer
 *           description: ID único del cargador
 *           example: 1
 *         tipo_carga:
 *           type: string
 *           enum: [rapida, lenta]
 *           description: Tipo de carga que soporta el cargador
 *           example: "rapida"
 *         capacidad_kw:
 *           type: number
 *           format: decimal
 *           description: Capacidad máxima en kilovatios
 *           example: 50.0
 *         estado:
 *           type: string
 *           enum: [disponible, ocupado, mantenimiento, reservado]
 *           description: Estado actual del cargador
 *           example: "disponible"
 *         numero_serie:
 *           type: string
 *           description: Número de serie del cargador
 *           example: "CHG-001-ABC"
 *         id_estacion:
 *           type: integer
 *           description: ID de la estación a la que pertenece
 *           example: 5
 *     
 *     EstacionMap:
 *       type: object
 *       properties:
 *         id_estacion:
 *           type: integer
 *           description: ID único de la estación
 *           example: 1
 *         nombre_estacion:
 *           type: string
 *           description: Nombre descriptivo de la estación
 *           example: "Estación Centro Comercial"
 *         direccion:
 *           type: string
 *           description: Dirección física de la estación
 *           example: "Av. Principal 123, Ciudad"
 *         ubicacion_lat:
 *           type: number
 *           format: decimal
 *           description: Latitud de la ubicación
 *           example: 21.1619
 *         ubicacion_lon:
 *           type: number
 *           format: decimal
 *           description: Longitud de la ubicación
 *           example: -86.8515
 *         disponibilidad_general:
 *           type: string
 *           description: Estado general para mostrar en el mapa
 *           enum: [Disponible, Ocupada, Sin Cargadores]
 *           example: "Disponible"
 *         cargadores:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CargadorEstacion'
 *     
 *     EstacionFranquicia:
 *       type: object
 *       properties:
 *         id_estacion:
 *           type: integer
 *           description: ID único de la estación
 *           example: 1
 *         id_franquicia:
 *           type: integer
 *           description: ID de la franquicia propietaria
 *           example: 2
 *         nombre_estacion:
 *           type: string
 *           description: Nombre descriptivo de la estación
 *           example: "Estación Centro Comercial"
 *         direccion:
 *           type: string
 *           description: Dirección física de la estación
 *           example: "Av. Principal 123, Ciudad"
 *         ubicacion_lat:
 *           type: number
 *           format: decimal
 *           nullable: true
 *           description: Latitud de la ubicación
 *           example: 21.1619
 *         ubicacion_lon:
 *           type: number
 *           format: decimal
 *           nullable: true
 *           description: Longitud de la ubicación
 *           example: -86.8515
 *         total_cargadores:
 *           type: integer
 *           description: Número total de cargadores en la estación
 *           example: 4
 *         estado_operacion:
 *           type: string
 *           description: Estado operativo de la estación
 *           example: "activa"
 *         cargadores:
 *           type: array
 *           description: Lista de cargadores pertenecientes a esta estación
 *           items:
 *             $ref: '#/components/schemas/CargadorFranquicia'
 *     
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *   
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
 *   
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * tags:
 *   - name: Estaciones
 *     description: Gestión y consulta de estaciones de carga - Información para app móvil y backoffice de franquicias
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
 *                   example: "Lista de estaciones obtenida correctamente"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EstacionMap'
 *             examples:
 *               estaciones_disponibles:
 *                 summary: Estaciones con cargadores disponibles
 *                 value:
 *                   success: true
 *                   message: "Lista de estaciones obtenida correctamente"
 *                   data:
 *                     - id_estacion: 1
 *                       nombre_estacion: "Estación Centro Comercial"
 *                       direccion: "Av. Principal 123, Ciudad"
 *                       ubicacion_lat: 21.1619
 *                       ubicacion_lon: -86.8515
 *                       disponibilidad_general: "Disponible"
 *                       cargadores:
 *                         - id_cargador: 1
 *                           tipo_carga: "rapida"
 *                           capacidad_kw: 50.0
 *                           estado: "disponible"
 *                           costo_tiempo_min: 0.05
 *                         - id_cargador: 2
 *                           tipo_carga: "lenta"
 *                           capacidad_kw: 22.0
 *                           estado: "ocupado"
 *                           costo_tiempo_min: 0.03
 *               sin_estaciones:
 *                 summary: No hay estaciones disponibles
 *                 value:
 *                   success: true
 *                   message: "No se encontraron estaciones activas o con cargadores."
 *                   data: []
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
 *                   example: "Error al obtener estaciones"
 */
router.get('/', authenticateToken,authenticateJWT   ,EstacionController.getAvailableStations);

/**
 * @swagger
 * /api/stations/franchise:
 *   get:
 *     summary: Obtener estaciones de la franquicia del usuario autenticado
 *     description: |
 *       Recupera todas las estaciones pertenecientes a la franquicia del usuario autenticado,
 *       incluyendo sus cargadores asociados. Este endpoint es utilizado por el backoffice
 *       de franquicias para gestionar sus propias estaciones.
 *       
 *       **Funcionalidades:**
 *       - Filtrado automático por franquicia del usuario autenticado
 *       - Incluye todos los cargadores de cada estación (disponibles, ocupados, en mantenimiento)
 *       - Información completa para administración de franquicia
 *       
 *       **Seguridad:**
 *       El token JWT debe contener el `franquiciaId` del usuario autenticado.
 *     tags: [Estaciones]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de estaciones de la franquicia obtenida correctamente
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
 *                   example: "Lista de estaciones de la franquicia obtenida correctamente"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EstacionFranquicia'
 *             examples:
 *               estaciones_franquicia:
 *                 summary: Estaciones de la franquicia con cargadores
 *                 value:
 *                   success: true
 *                   message: "Lista de estaciones de la franquicia obtenida correctamente"
 *                   data:
 *                     - id_estacion: 1
 *                       id_franquicia: 2
 *                       nombre_estacion: "Estación Centro Comercial"
 *                       direccion: "Av. Principal 123, Ciudad"
 *                       ubicacion_lat: 21.1619
 *                       ubicacion_lon: -86.8515
 *                       total_cargadores: 3
 *                       estado_operacion: "activa"
 *                       cargadores:
 *                         - id_cargador: 1
 *                           tipo_carga: "rapida"
 *                           capacidad_kw: 50.0
 *                           estado: "disponible"
 *                           numero_serie: "CHG-001-ABC"
 *                           id_estacion: 1
 *                         - id_cargador: 2
 *                           tipo_carga: "lenta"
 *                           capacidad_kw: 22.0
 *                           estado: "ocupado"
 *                           numero_serie: "CHG-002-DEF"
 *                           id_estacion: 1
 *                         - id_cargador: 3
 *                           tipo_carga: "rapida"
 *                           capacidad_kw: 75.0
 *                           estado: "mantenimiento"
 *                           numero_serie: "CHG-003-GHI"
 *                           id_estacion: 1
 *                     - id_estacion: 5
 *                       id_franquicia: 2
 *                       nombre_estacion: "Estación Plaza Norte"
 *                       direccion: "Centro Comercial Plaza Norte"
 *                       ubicacion_lat: 21.2010
 *                       ubicacion_lon: -86.8720
 *                       total_cargadores: 2
 *                       estado_operacion: "activa"
 *                       cargadores:
 *                         - id_cargador: 8
 *                           tipo_carga: "ultrarapida"
 *                           capacidad_kw: 150.0
 *                           estado: "disponible"
 *                           numero_serie: "CHG-008-XYZ"
 *                           id_estacion: 5
 *               sin_estaciones_franquicia:
 *                 summary: Franquicia sin estaciones
 *                 value:
 *                   success: true
 *                   message: "No se encontraron estaciones para la franquicia."
 *                   data: []
 *       400:
 *         description: Error de validación - franquiciaId requerido
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
 *                   example: "Se requiere franquiciaId"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
 *                   example: "Error al obtener estaciones por franquicia"
 */
router.get('/franchise', authenticateToken,authenticateJWT,  EstacionController.getStationsByFranchise);

module.exports = router;