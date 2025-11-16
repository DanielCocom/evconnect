const express = require('express');
const { ReporteController } = require('../../controllers/reporte.controller');
const { authenticateToken, authenticateJWT } = require('../../middlewares/authJwt'); 
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SesionCargaReporte:
 *       type: object
 *       properties:
 *         id_sesion:
 *           type: integer
 *           description: ID único de la sesión de carga
 *           example: 1
 *         id_usuario:
 *           type: integer
 *           description: ID del usuario que realizó la carga
 *           example: 5
 *         id_cargador:
 *           type: integer
 *           description: ID del cargador utilizado
 *           example: 3
 *         id_tarifa:
 *           type: integer
 *           nullable: true
 *           description: ID de la tarifa aplicada
 *           example: 2
 *         metodo_pago_utilizado:
 *           type: integer
 *           nullable: true
 *           description: ID del método de pago utilizado
 *           example: 1
 *         fecha_inicio:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de inicio de la sesión
 *           example: "2024-11-15T10:30:00.000Z"
 *         fecha_fin:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Fecha y hora de fin de la sesión
 *           example: "2024-11-15T12:45:00.000Z"
 *         estado:
 *           type: string
 *           maxLength: 50
 *           description: Estado actual de la sesión de carga
 *           enum: [pendiente, en_progreso, finalizada, cancelada, error]
 *           example: "finalizada"
 *         energia_consumida_kwh:
 *           type: number
 *           format: decimal
 *           description: Energía consumida en kilovatios hora
 *           example: 25.750
 *         monto_estimado:
 *           type: number
 *           format: decimal
 *           nullable: true
 *           description: Monto estimado al inicio de la sesión
 *           example: 15.50
 *         monto_final:
 *           type: number
 *           format: decimal
 *           nullable: true
 *           description: Monto final cobrado
 *           example: 14.25
 *         id_pago_transaccion:
 *           type: string
 *           maxLength: 100
 *           nullable: true
 *           description: ID de la transacción de pago en Stripe
 *           example: "pi_3OGqIC2eZvKYlo2C1234567890"
 *         Cargador:
 *           type: object
 *           properties:
 *             id_cargador:
 *               type: integer
 *               example: 3
 *             numero_serie:
 *               type: string
 *               example: "CHG-001-ABC"
 *             tipo_cargador:
 *               type: string
 *               example: "rapido"
 *             Estacion:
 *               type: object
 *               properties:
 *                 id_estacion:
 *                   type: integer
 *                   example: 1
 *                 nombre:
 *                   type: string
 *                   example: "Estación Centro Comercial"
 *                 ubicacion:
 *                   type: string
 *                   example: "Av. Principal 123, Ciudad"
 *                 id_franquicia:
 *                   type: integer
 *                   example: 2
 *         Usuario:
 *           type: object
 *           properties:
 *             id_usuario:
 *               type: integer
 *               example: 5
 *             nombre:
 *               type: string
 *               example: "Juan"
 *             apellido:
 *               type: string
 *               example: "Pérez"
 *             email:
 *               type: string
 *               format: email
 *               example: "juan.perez@email.com"
 *       example:
 *         id_sesion: 1
 *         id_usuario: 5
 *         id_cargador: 3
 *         id_tarifa: 2
 *         metodo_pago_utilizado: 1
 *         fecha_inicio: "2024-11-15T10:30:00.000Z"
 *         fecha_fin: "2024-11-15T12:45:00.000Z"
 *         estado: "finalizada"
 *         energia_consumida_kwh: 25.750
 *         monto_estimado: 15.50
 *         monto_final: 14.25
 *         id_pago_transaccion: "pi_3OGqIC2eZvKYlo2C1234567890"
 *         Cargador:
 *           id_cargador: 3
 *           numero_serie: "CHG-001-ABC"
 *           tipo_cargador: "rapido"
 *           Estacion:
 *             id_estacion: 1
 *             nombre: "Estación Centro Comercial"
 *             ubicacion: "Av. Principal 123, Ciudad"
 *             id_franquicia: 2
 *         Usuario:
 *           id_usuario: 5
 *           nombre: "Juan"
 *           apellido: "Pérez"
 *           email: "juan.perez@email.com"
 * 
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * tags:
 *   - name: Reportes
 *     description: Generación de reportes y estadísticas para el backoffice de franquicias - Análisis de sesiones de carga y rendimiento
 */

/**
 * Rutas de Reportes para el Backoffice
 * Requieren autenticación y el token debe contener el id_franquicia.
 */
router.use(authenticateToken); 

/**
 * @swagger
 * /api/admin/reports/sessions:
 *   get:
 *     summary: Obtener historial de sesiones de carga
 *     description: |
 *       Recupera el historial completo de sesiones de carga filtrado por la franquicia del usuario autenticado.
 *       
 *       **Funcionalidades:**
 *       - Filtrado automático por franquicia del usuario
 *       - Filtros opcionales por estado, fecha de inicio y fecha fin
 *       - Información completa de usuario, cargador y estación
 *       - Ordenado por fecha de inicio (más recientes primero)
 *       
 *       **Seguridad:**
 *       Solo se devuelven sesiones de estaciones pertenecientes a la franquicia del usuario autenticado.
 *     tags: [Reportes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [pendiente, en_progreso, finalizada, cancelada, error]
 *         description: Filtrar sesiones por estado específico
 *         example: "finalizada"
 *       - in: query
 *         name: fecha_inicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio del rango de consulta (formato YYYY-MM-DD)
 *         example: "2024-11-01"
 *       - in: query
 *         name: fecha_fin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin del rango de consulta (formato YYYY-MM-DD)
 *         example: "2024-11-30"
 *     responses:
 *       200:
 *         description: Historial de sesiones de carga obtenido exitosamente
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
 *                   example: "Listado de sesiones de carga."
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SesionCargaReporte'
 *             examples:
 *               sesiones_multiples:
 *                 summary: Múltiples sesiones con filtros
 *                 value:
 *                   status: "success"
 *                   message: "Listado de sesiones de carga."
 *                   data:
 *                     - id_sesion: 15
 *                       id_usuario: 7
 *                       id_cargador: 2
 *                       id_tarifa: 3
 *                       metodo_pago_utilizado: 1
 *                       fecha_inicio: "2024-11-15T14:20:00.000Z"
 *                       fecha_fin: "2024-11-15T16:05:00.000Z"
 *                       estado: "finalizada"
 *                       energia_consumida_kwh: 32.150
 *                       monto_estimado: 20.00
 *                       monto_final: 18.75
 *                       id_pago_transaccion: "pi_3OGqIC2eZvKYlo2C0987654321"
 *                       Cargador:
 *                         id_cargador: 2
 *                         numero_serie: "CHG-002-DEF"
 *                         tipo_cargador: "ultrarapido"
 *                         Estacion:
 *                           id_estacion: 3
 *                           nombre: "Estación Plaza Norte"
 *                           ubicacion: "Centro Comercial Plaza Norte"
 *                           id_franquicia: 2
 *                       Usuario:
 *                         id_usuario: 7
 *                         nombre: "María"
 *                         apellido: "González"
 *                         email: "maria.gonzalez@email.com"
 *                     - id_sesion: 14
 *                       id_usuario: 5
 *                       id_cargador: 1
 *                       id_tarifa: 2
 *                       metodo_pago_utilizado: 2
 *                       fecha_inicio: "2024-11-14T09:15:00.000Z"
 *                       fecha_fin: "2024-11-14T11:30:00.000Z"
 *                       estado: "finalizada"
 *                       energia_consumida_kwh: 28.500
 *                       monto_estimado: 17.25
 *                       monto_final: 16.80
 *                       id_pago_transaccion: "pi_3OGqIC2eZvKYlo2C1122334455"
 *                       Cargador:
 *                         id_cargador: 1
 *                         numero_serie: "CHG-001-ABC"
 *                         tipo_cargador: "rapido"
 *                         Estacion:
 *                           id_estacion: 1
 *                           nombre: "Estación Centro Comercial"
 *                           ubicacion: "Av. Principal 123, Ciudad"
 *                           id_franquicia: 2
 *                       Usuario:
 *                         id_usuario: 5
 *                         nombre: "Juan"
 *                         apellido: "Pérez"
 *                         email: "juan.perez@email.com"
 *               sin_resultados:
 *                 summary: Sin sesiones encontradas
 *                 value:
 *                   status: "success"
 *                   message: "Listado de sesiones de carga."
 *                   data: []
 *       403:
 *         description: Acceso denegado - Usuario sin franquicia asociada
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
 *                   example: "Acceso denegado. El usuario no está asociado a una franquicia para ver reportes."
 *       401:
 *         description: Token de autenticación inválido o faltante
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
 *                   example: "Token de acceso requerido"
 *       500:
 *         description: Error interno del servidor
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
 *                   example: "Error al obtener las sesiones de carga."
 */
router.get('/sessions',
       authenticateToken, 
  authenticateJWT,
     ReporteController.getChargeSessions)

     router.get('/sessions/:id_sesion', authenticateToken, 
  authenticateJWT,
  ReporteController.getChargeSessionDetail)

module.exports = router;