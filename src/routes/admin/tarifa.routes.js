const express = require('express');
const { TarifaController } = require('../../controllers/tarifa.controller');
const { authenticateToken } = require('../../middlewares/authJwt'); // Asumo que tienes un middleware de autenticación

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Tarifa:
 *       type: object
 *       properties:
 *         id_tarifa:
 *           type: integer
 *           description: ID único de la tarifa
 *           example: 1
 *         id_estacion:
 *           type: integer
 *           description: ID de la estación de carga
 *           example: 5
 *         tipo_carga:
 *           type: string
 *           maxLength: 50
 *           description: Tipo de carga (rápida, normal, etc.)
 *           example: "rapida"
 *         costo_kw_h:
 *           type: number
 *           format: decimal
 *           description: Costo por kilovatio hora (opcional si se especifica costo_tiempo_min)
 *           example: 0.25
 *         costo_tiempo_min:
 *           type: number
 *           format: decimal
 *           description: Costo por minuto (opcional si se especifica costo_kw_h)
 *           example: 0.05
 *         fecha_inicio_vigencia:
 *           type: string
 *           format: date
 *           description: Fecha de inicio de vigencia de la tarifa
 *           example: "2024-01-01"
 *         fecha_fin_vigencia:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Fecha de fin de vigencia de la tarifa (opcional)
 *           example: "2024-12-31"
 *       required:
 *         - id_estacion
 *         - tipo_carga
 *         - fecha_inicio_vigencia
 *       example:
 *         id_tarifa: 1
 *         id_estacion: 5
 *         tipo_carga: "rapida"
 *         costo_kw_h: 0.25
 *         costo_tiempo_min: null
 *         fecha_inicio_vigencia: "2024-01-01"
 *         fecha_fin_vigencia: "2024-12-31"
 * 
 *     TarifaInput:
 *       type: object
 *       properties:
 *         id_estacion:
 *           type: integer
 *           description: ID de la estación de carga
 *           example: 5
 *         tipo_carga:
 *           type: string
 *           maxLength: 50
 *           description: Tipo de carga (rápida, normal, etc.)
 *           example: "rapida"
 *         costo_kw_h:
 *           type: number
 *           format: decimal
 *           description: Costo por kilovatio hora (opcional si se especifica costo_tiempo_min)
 *           example: 0.25
 *         costo_tiempo_min:
 *           type: number
 *           format: decimal
 *           description: Costo por minuto (opcional si se especifica costo_kw_h)
 *           example: 0.05
 *         fecha_inicio_vigencia:
 *           type: string
 *           format: date
 *           description: Fecha de inicio de vigencia de la tarifa
 *           example: "2024-01-01"
 *         fecha_fin_vigencia:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Fecha de fin de vigencia de la tarifa (opcional)
 *           example: "2024-12-31"
 *       required:
 *         - id_estacion
 *         - tipo_carga
 *         - fecha_inicio_vigencia
 *       example:
 *         id_estacion: 5
 *         tipo_carga: "rapida"
 *         costo_kw_h: 0.25
 *         fecha_inicio_vigencia: "2024-01-01"
 *         fecha_fin_vigencia: "2024-12-31"
 * 
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * tags:
 *   - name: Tarifas
 *     description: Gestión de tarifas de carga - CRUD completo para administración de precios por estación y tipo de carga
 */

/**
 * Rutas de Gestión de Tarifas (CRUD)
 * Requieren autenticación de Admin o Franquicia
 */
router.use(authenticateToken); // Proteger todas las rutas

/**
 * @swagger
 * /api/admin/tarifas:
 *   post:
 *     summary: Crear una nueva tarifa
 *     description: Crea una nueva tarifa para una estación específica. Se requiere al menos un tipo de costo (por kWh o por tiempo).
 *     tags: [Tarifas]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TarifaInput'
 *           examples:
 *             tarifa_por_kwh:
 *               summary: Tarifa por kWh
 *               value:
 *                 id_estacion: 5
 *                 tipo_carga: "rapida"
 *                 costo_kw_h: 0.25
 *                 fecha_inicio_vigencia: "2024-01-01"
 *                 fecha_fin_vigencia: "2024-12-31"
 *             tarifa_por_tiempo:
 *               summary: Tarifa por tiempo
 *               value:
 *                 id_estacion: 3
 *                 tipo_carga: "normal"
 *                 costo_tiempo_min: 0.05
 *                 fecha_inicio_vigencia: "2024-01-01"
 *             tarifa_mixta:
 *               summary: Tarifa mixta (kWh + tiempo)
 *               value:
 *                 id_estacion: 7
 *                 tipo_carga: "ultrarapida"
 *                 costo_kw_h: 0.35
 *                 costo_tiempo_min: 0.08
 *                 fecha_inicio_vigencia: "2024-01-01"
 *                 fecha_fin_vigencia: "2024-06-30"
 *     responses:
 *       201:
 *         description: Tarifa creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Tarifa creada con éxito."
 *                 data:
 *                   $ref: '#/components/schemas/Tarifa'
 *       422:
 *         description: Error de validación - campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Campos requeridos faltantes: id_estacion, tipo_carga, fecha_inicio_vigencia."
 *       401:
 *         description: Token de autenticación inválido o faltante
 *       500:
 *         description: Error interno del servidor
 * 
 *   get:
 *     summary: Obtener todas las tarifas
 *     description: Recupera una lista de todas las tarifas con filtros opcionales por estación y tipo de carga.
 *     tags: [Tarifas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_estacion
 *         schema:
 *           type: integer
 *         description: Filtrar tarifas por ID de estación
 *         example: 5
 *       - in: query
 *         name: tipo_carga
 *         schema:
 *           type: string
 *         description: Filtrar tarifas por tipo de carga
 *         example: "rapida"
 *     responses:
 *       200:
 *         description: Lista de tarifas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Listado de tarifas."
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Tarifa'
 *             examples:
 *               tarifas_multiples:
 *                 summary: Múltiples tarifas
 *                 value:
 *                   status: "success"
 *                   message: "Listado de tarifas."
 *                   data:
 *                     - id_tarifa: 1
 *                       id_estacion: 5
 *                       tipo_carga: "rapida"
 *                       costo_kw_h: 0.25
 *                       costo_tiempo_min: null
 *                       fecha_inicio_vigencia: "2024-01-01"
 *                       fecha_fin_vigencia: "2024-12-31"
 *                     - id_tarifa: 2
 *                       id_estacion: 5
 *                       tipo_carga: "normal"
 *                       costo_kw_h: 0.15
 *                       costo_tiempo_min: null
 *                       fecha_inicio_vigencia: "2024-01-01"
 *                       fecha_fin_vigencia: null
 *       401:
 *         description: Token de autenticación inválido o faltante
 *       500:
 *         description: Error interno del servidor
 */
router.route('/')
    .post(TarifaController.createTarifa) // Crear una nueva tarifa
    .get(TarifaController.getAllTarifas); // Obtener todas las tarifas (con filtros opcionales)

/**
 * @swagger
 * /api/admin/tarifas/{id}:
 *   get:
 *     summary: Obtener tarifa por ID
 *     description: Recupera los detalles de una tarifa específica mediante su ID único.
 *     tags: [Tarifas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único de la tarifa
 *         example: 1
 *     responses:
 *       200:
 *         description: Detalle de la tarifa obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Detalle de la tarifa."
 *                 data:
 *                   $ref: '#/components/schemas/Tarifa'
 *       404:
 *         description: Tarifa no encontrada
 *       401:
 *         description: Token de autenticación inválido o faltante
 *       500:
 *         description: Error interno del servidor
 * 
 *   put:
 *     summary: Actualizar tarifa
 *     description: Actualiza los datos de una tarifa existente. Se pueden actualizar todos o algunos campos.
 *     tags: [Tarifas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único de la tarifa a actualizar
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_estacion:
 *                 type: integer
 *                 example: 5
 *               tipo_carga:
 *                 type: string
 *                 example: "ultrarapida"
 *               costo_kw_h:
 *                 type: number
 *                 format: decimal
 *                 example: 0.30
 *               costo_tiempo_min:
 *                 type: number
 *                 format: decimal
 *                 example: 0.10
 *               fecha_inicio_vigencia:
 *                 type: string
 *                 format: date
 *                 example: "2024-02-01"
 *               fecha_fin_vigencia:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: "2024-11-30"
 *           examples:
 *             actualizacion_parcial:
 *               summary: Actualización parcial - solo precio
 *               value:
 *                 costo_kw_h: 0.30
 *             actualizacion_completa:
 *               summary: Actualización completa
 *               value:
 *                 id_estacion: 5
 *                 tipo_carga: "ultrarapida"
 *                 costo_kw_h: 0.30
 *                 costo_tiempo_min: 0.10
 *                 fecha_inicio_vigencia: "2024-02-01"
 *                 fecha_fin_vigencia: "2024-11-30"
 *             eliminar_fecha_fin:
 *               summary: Eliminar fecha fin (vigencia indefinida)
 *               value:
 *                 fecha_fin_vigencia: ""
 *     responses:
 *       200:
 *         description: Tarifa actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Tarifa actualizada con éxito."
 *                 data:
 *                   $ref: '#/components/schemas/Tarifa'
 *       404:
 *         description: Tarifa no encontrada
 *       401:
 *         description: Token de autenticación inválido o faltante
 *       500:
 *         description: Error interno del servidor
 * 
 *   delete:
 *     summary: Eliminar tarifa
 *     description: Elimina permanentemente una tarifa del sistema. Esta acción no se puede deshacer.
 *     tags: [Tarifas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único de la tarifa a eliminar
 *         example: 1
 *     responses:
 *       200:
 *         description: Tarifa eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Tarifa eliminada con éxito."
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Tarifa eliminada con éxito."
 *       404:
 *         description: Tarifa no encontrada
 *       401:
 *         description: Token de autenticación inválido o faltante
 *       500:
 *         description: Error interno del servidor
 */
router.route('/:id')
    .get(TarifaController.getTarifaById) // Obtener detalle por ID
    .put(TarifaController.updateTarifa) // Actualizar tarifa
    .delete(TarifaController.deleteTarifa); // Eliminar tarifa

module.exports = router;