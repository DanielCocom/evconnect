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
 *       Inicia el flujo de carga con las siguientes características:
 *       
 *       **Proceso completo:**
 *       1. Valida disponibilidad del cargador y tarifa vigente
 *       2. Calcula el costo estimado basado en la duración solicitada
 *       3. Autoriza el pago en Stripe (retención del monto estimado)
 *       4. Crea la sesión en estado 'activa'
 *       5. Envía comando START al IoT para iniciar el flujo de energía
 *       6. Notifica al usuario móvil vía WebSocket
 *       
 *       **Monitoreo en tiempo real:**
 *       - Cada minuto se envían actualizaciones vía WebSocket con:
 *         - Tiempo transcurrido y tiempo restante
 *         - Monto acumulado en tiempo real
 *         - Porcentaje de progreso
 *       
 *       **Finalización automática:**
 *       - Cuando el tiempo se agota, se captura el pago y se detiene el cargador
 *       - Se notifica al usuario con el resumen final
 *       
 *       **WebSocket:** El usuario debe estar conectado al WebSocket del cargador
 *       para recibir actualizaciones en tiempo real.
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
 *                       type: object
 *                       properties:
 *                         id_sesion:
 *                           type: integer
 *                         id_cargador:
 *                           type: integer
 *                         monto_retenido:
 *                           type: number
 *                           description: Monto total retenido en Stripe
 *                         monto_por_minuto:
 *                           type: number
 *                           description: Tarifa aplicada por minuto
 *                         duracion_estimada_min:
 *                           type: integer
 *                           description: Duración solicitada en minutos
 *                         fecha_inicio:
 *                           type: string
 *                           format: date-time
 *                         mensaje:
 *                           type: string
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
 *       503:
 *         description: Cargador no responde (IoT no disponible)
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
 * /api/sessions/tarifa/{id_cargador}:
 *   get:
 *     summary: Obtener tarifa vigente de un cargador
 *     description: |
 *       Este endpoint es llamado cuando el usuario móvil escanea el código NFC del cargador.
 *       Retorna la información del cargador y su tarifa vigente por minuto.
 *       
 *       **Validaciones:**
 *       - Cargador existe en el sistema
 *       - Cargador está en estado 'disponible'
 *       - Existe una tarifa vigente para ese cargador
 *     tags: [Sesiones de Carga]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_cargador
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cargador escaneado
 *     responses:
 *       200:
 *         description: Información del cargador y tarifa vigente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_cargador:
 *                       type: integer
 *                     tipo_carga:
 *                       type: string
 *                     capacidad_kw:
 *                       type: number
 *                     estado:
 *                       type: string
 *                     id_tarifa:
 *                       type: integer
 *                     costo_por_minuto:
 *                       type: number
 *                     mensaje:
 *                       type: string
 *       404:
 *         description: Cargador no encontrado
 *       409:
 *         description: Cargador no disponible
 *       400:
 *         description: No hay tarifa vigente para este cargador
 */
router.get('/tarifa/:id_cargador', authenticateToken, SesionCargaController.getChargerRate);

/**
 * @swagger
 * /api/sessions/stop/{id}:
 *   post:
 *     summary: Finalizar Sesión de Carga manualmente (Detención anticipada)
 *     description: |
 *       El usuario detiene la carga antes de que termine el tiempo solicitado.
 *       
 *       **Proceso:**
 *       1. Calcula el tiempo transcurrido en minutos
 *       2. Calcula el monto proporcional (tiempo_transcurrido * tarifa_por_minuto)
 *       3. Captura SOLO el monto proporcional en Stripe
 *       4. Envía comando STOP al IoT para detener el flujo de energía
 *       5. Actualiza el cargador a estado 'disponible'
 *       6. Notifica al usuario vía WebSocket con el resumen
 *       
 *       **Cobro proporcional:**
 *       - Solo se cobra por los minutos realmente utilizados
 *       - El monto no utilizado NO se captura (se libera automáticamente)
 *       
 *       **Ejemplo:**
 *       - Usuario solicitó 30 minutos ($150 MXN retenidos)
 *       - Detiene después de 20 minutos
 *       - Solo se cobran $100 MXN (ahorro de $50 MXN)
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
 *         description: Sesión finalizada y cobro proporcional completado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_sesion:
 *                       type: integer
 *                     id_cargador:
 *                       type: integer
 *                     tiempo_transcurrido_min:
 *                       type: integer
 *                       description: Minutos reales utilizados
 *                     duracion_estimada_min:
 *                       type: integer
 *                       description: Minutos originalmente solicitados
 *                     monto_cobrado:
 *                       type: number
 *                       description: Monto real cobrado
 *                     monto_retenido:
 *                       type: number
 *                       description: Monto originalmente retenido
 *                     ahorro:
 *                       type: number
 *                       description: Diferencia entre monto retenido y cobrado
 *                     stripe_status:
 *                       type: string
 *                       description: Estado del pago en Stripe
 *                     mensaje:
 *                       type: string
 *       404:
 *         description: Sesión activa no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Error al procesar el pago
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/stop/:id', authenticateToken, SesionCargaController.stopSession);

/**
 * @swagger
 * /api/sessions/stop-by-charger/{id_cargador}:
 *   post:
 *     summary: Cambiar Cargador a Fuera de Servicio desde Monitor
 *     description: |
 *       Este endpoint permite al monitor de la estación cambiar el estado de un cargador
 *       a "fuera_servicio". No requiere autenticación de usuario ya que es utilizado
 *       por el sistema de monitoreo interno.
 *       
 *       **Casos de uso:**
 *       - Personal de la estación necesita poner un cargador en mantenimiento
 *       - Sistema de monitoreo detecta una anomalía en el cargador
 *       - Emergencia que requiere desactivación inmediata del cargador
 *       - Mantenimiento preventivo programado
 *       
 *       **Proceso completo:**
 *       1. Busca el cargador por ID
 *       2. Cambia el estado del cargador a "fuera_servicio"
 *       3. Envía comando de cambio de estado al dispositivo IoT (Publisher)
 *       4. Notifica a los usuarios móviles conectados (Subscribers) vía WebSocket
 *       5. Notifica el cambio de estado a todos los monitores de la estación
 *       
 *       **Notificaciones WebSocket:**
 *       - **Publisher (IoT):** Recibe comando 'cambio_estado' con el nuevo estado
 *       - **Subscribers (Usuarios):** Reciben mensaje tipo 'cambio_estado_cargador'
 *       - **Monitores:** Reciben actualización completa del estado de la estación
 *       
 *       **Importante:**
 *       - Este endpoint NO finaliza sesiones activas ni procesa pagos
 *       - Solo cambia el estado del cargador y notifica a los clientes
 *       - Las sesiones activas deben finalizarse con otro endpoint
 *     tags: [Sesiones de Carga]
 *     parameters:
 *       - in: path
 *         name: id_cargador
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cargador a cambiar de estado
 *         example: 45
 *     responses:
 *       200:
 *         description: Estado del cargador cambiado exitosamente
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
 *                   example: "Sesión de carga finalizada desde monitor y cobro completado"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_cargador:
 *                       type: integer
 *                       description: ID del cargador modificado
 *                       example: 45
 *                     estado_anterior:
 *                       type: string
 *                       description: Estado previo del cargador
 *                       example: "disponible"
 *                     estado_nuevo:
 *                       type: string
 *                       description: Nuevo estado del cargador
 *                       example: "fuera_servicio"
 *                     mensaje:
 *                       type: string
 *                       description: Mensaje descriptivo del resultado
 *                       example: "Cargador #45 cambiado a fuera de servicio y clientes notificados."
 *       404:
 *         description: Cargador no encontrado
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
 *                   example: "Cargador #45 no encontrado."
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *       422:
 *         description: ID de cargador inválido
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
 *                   example: "ID de cargador inválido"
 *       500:
 *         description: Error al comunicarse con IoT o WebSocket
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
 *                   example: "Error al cambiar el estado del cargador"
 */
router.post('/stop-by-charger/:id_cargador', SesionCargaController.stopSessionByCharger);

module.exports = router;