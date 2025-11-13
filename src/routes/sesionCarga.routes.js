const express = require('express');
const { SesionCargaController } = require('../controllers/sesionCarga.controller');
const { authenticateToken } = require('../middlewares/authJwt');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SesionStartRequest:
 *       type: object
 *       required:
 *         - id_cargador
 *         - duration_minutes
 *         - tipo_carga
 *       properties:
 *         id_cargador:
 *           type: integer
 *           description: ID del cargador leído por NFC del móvil.
 *           example: 45
 *         duration_minutes:
 *           type: integer
 *           description: Duración de la carga preseleccionada por el usuario (cobro fijo).
 *           example: 30
 *         tipo_carga:
 *           type: string
 *           description: Tipo de cargador solicitado (rápida, lenta).
 *           example: "rápida"
 *     SesionStartResponse:
 *       type: object
 *       properties:
 *         id_sesion:
 *           type: integer
 *         id_cargador:
 *           type: integer
 *         monto_retenido:
 *           type: number
 *           format: decimal
 *           description: Monto fijo retenido en Stripe (costo_minuto * duración).
 *         duracion_limite:
 *           type: integer
 *         fecha_inicio:
 *           type: string
 *           format: date-time
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/sessions/start:
 *   post:
 *     summary: Iniciar Sesión de Carga
 *     description: |
 *       Inicia el flujo de carga: valida la disponibilidad, calcula el costo fijo
 *       basado en la duración preseleccionada, realiza la retención de pago en Stripe
 *       y marca el cargador como 'ocupado'.
 *       
 *       **CRÍTICO:** Este endpoint se llama después de que el usuario toca el NFC
 *       del cargador con su móvil (para obtener `id_cargador`).
 *     tags: [Sesiones de Carga]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SesionStartRequest'
 *     responses:
 *       201:
 *         description: Sesión iniciada y pago retenido con éxito
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SesionStartResponse'
 *       400:
 *         description: Error de negocio (Cargador no disponible, sin tarifa, duración inválida)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       402:
 *         description: Pago no autorizado (Fondos insuficientes o tarjeta rechazada)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/start', authenticateToken, SesionCargaController.startSession);

/**
 * @swagger
 * /api/sessions/active:
 *   get:
 *     summary: Obtener estado de la sesión activa
 *     description: |
 *       Utilizado por la App Móvil para el polling periódico (cada 5-10 segundos)
 *       para obtener el estado actual, el tiempo transcurrido y la información del cargador.
 *     tags: [Sesiones de Carga]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Retorna la información de la sesión activa o null si no hay ninguna.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Token de acceso requerido o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/active', authenticateToken, SesionCargaController.getActiveSession);

/**
 * @swagger
 * /api/sessions/stop/{id}:
 *   post:
 *     summary: Finalizar Sesión de Carga manualmente
 *     description: |
 *       El usuario fuerza la detención de la carga. El Backend finaliza la sesión en la DB,
 *       envía el comando STOP a IoT y captura el monto fijo previamente retenido en Stripe.
 *     tags: [Sesiones de Carga]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la Sesión de Carga a finalizar.
 *     responses:
 *       200:
 *         description: Sesión finalizada y cobro fijo completado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Sesión activa no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Token de acceso requerido o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/stop/:id', authenticateToken, SesionCargaController.stopSession);

module.exports = router;