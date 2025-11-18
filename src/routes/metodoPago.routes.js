const express = require('express');
const { MetodoPagoController } = require('../controllers/metodoPago.controller');
const { authenticateToken } = require('../middlewares/authJwt');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SetupIntent:
 *       type: object
 *       properties:
 *         client_secret:
 *           type: string
 *           description: Client secret de Stripe para completar el setup en el frontend
 *           example: "seti_1OYxXxXxXxXxXxXx_secret_XxXxXxXxXxXxXx"
 *         setup_intent_id:
 *           type: string
 *           description: ID del SetupIntent en Stripe
 *           example: "seti_1OYxXxXxXxXxXxXx"
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         id_pago:
 *           type: integer
 *           description: ID del método de pago en la base de datos
 *           example: 12
 *         payment_method_id:
 *           type: string
 *           description: ID del PaymentMethod en Stripe
 *           example: "pm_1OYxXxXxXxXxXxXx"
 *         tipo:
 *           type: string
 *           description: Tipo de tarjeta
 *           example: "visa"
 *         ultimos_digitos:
 *           type: string
 *           description: Últimos 4 dígitos de la tarjeta
 *           example: "4242"
 *         marca:
 *           type: string
 *           description: Marca de la tarjeta
 *           example: "visa"
 *         expira:
 *           type: string
 *           description: Fecha de expiración (MM/YYYY)
 *           example: "12/2028"
 *         es_predeterminado:
 *           type: boolean
 *           description: Indica si es el método de pago predeterminado
 *           example: true
 *     AddPaymentMethodRequest:
 *       type: object
 *       required:
 *         - payment_method_id
 *       properties:
 *         payment_method_id:
 *           type: string
 *           description: ID del PaymentMethod obtenido de Stripe.js
 *           example: "pm_1OYxXxXxXxXxXxXx"
 */

/**
 * @swagger
 * /api/payment-methods/setup:
 *   post:
 *     summary: Crear SetupIntent para vincular tarjeta
 *     description: |
 *       Crea un SetupIntent de Stripe que se usa en el frontend para capturar
 *       los datos de la tarjeta de forma segura sin que pasen por tu servidor.
 *       
 *       **Flujo completo:**
 *       1. Backend: Llamar a este endpoint para obtener `client_secret`
 *       2. Frontend: Usar Stripe.js con el `client_secret` para capturar tarjeta
 *       3. Frontend: Obtener `payment_method_id` de Stripe
 *       4. Backend: Llamar a POST /api/payment-methods con el `payment_method_id`
 *       
 *       **Ejemplo en frontend:**
 *       ```javascript
 *       const stripe = await loadStripe('pk_test_xxxxx');
 *       const { error, setupIntent } = await stripe.confirmCardSetup(client_secret, {
 *         payment_method: {
 *           card: cardElement,
 *           billing_details: { name: 'Juan Pérez' }
 *         }
 *       });
 *       ```
 *     tags: [Métodos de Pago]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: SetupIntent creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SetupIntent'
 *       400:
 *         description: Usuario sin cuenta de Stripe configurada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: false
 *               message: "Usuario sin cuenta Stripe. Contacte soporte."
 *       401:
 *         description: Token no provisto o inválido
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/setup', authenticateToken, MetodoPagoController.createSetup);

/**
 * @swagger
 * /api/payment-methods:
 *   post:
 *     summary: Agregar método de pago
 *     description: |
 *       Vincula un método de pago (tarjeta) al usuario después de completar
 *       el SetupIntent en el frontend.
 *       
 *       **Proceso:**
 *       - Verifica que el PaymentMethod existe en Stripe
 *       - Lo vincula al Customer del usuario
 *       - Lo guarda en la base de datos
 *       - Si es la primera tarjeta, la marca como predeterminada
 *       
 *       **Importante:** El `payment_method_id` debe obtenerse del frontend
 *       después de confirmar el SetupIntent con Stripe.js
 *     tags: [Métodos de Pago]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddPaymentMethodRequest'
 *     responses:
 *       201:
 *         description: Tarjeta vinculada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PaymentMethod'
 *       400:
 *         description: Error al vincular la tarjeta
 *       401:
 *         description: Token no provisto o inválido
 *       404:
 *         description: Usuario no encontrado
 *       422:
 *         description: payment_method_id no provisto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: false
 *               message: "payment_method_id es requerido"
 *   get:
 *     summary: Listar métodos de pago del usuario
 *     description: |
 *       Obtiene todas las tarjetas vinculadas al usuario.
 *       
 *       **Fuente de datos:**
 *       - Información principal desde Stripe (fuente de verdad)
 *       - Información adicional desde BD local (predeterminado, etc.)
 *       
 *       **Datos sensibles:**
 *       - NO se exponen números completos de tarjeta
 *       - Solo últimos 4 dígitos y metadata
 *     tags: [Métodos de Pago]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de métodos de pago obtenida
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PaymentMethod'
 *       401:
 *         description: Token no provisto o inválido
 */
router.post('/', authenticateToken, MetodoPagoController.addPaymentMethod);
router.get('/', authenticateToken, MetodoPagoController.listPaymentMethods);

/**
 * @swagger
 * /api/payment-methods/{id}:
 *   delete:
 *     summary: Eliminar método de pago
 *     description: |
 *       Elimina una tarjeta vinculada del usuario.
 *       
 *       **Validaciones:**
 *       - No se puede eliminar si es la única tarjeta activa
 *       - Solo el propietario puede eliminar sus tarjetas
 *       - Se desvincula de Stripe y se marca como inactiva en BD (soft delete)
 *       
 *       **Si era predeterminada:**
 *       - Automáticamente asigna otra tarjeta como predeterminada
 *     tags: [Métodos de Pago]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del método de pago en la base de datos
 *         example: 12
 *     responses:
 *       200:
 *         description: Tarjeta eliminada correctamente
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
 *                         message:
 *                           type: string
 *                           example: "Método de pago eliminado correctamente"
 *       400:
 *         description: No se puede eliminar la única tarjeta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: false
 *               message: "No puedes eliminar tu única tarjeta. Agrega otra primero."
 *       401:
 *         description: Token no provisto o inválido
 *       404:
 *         description: Método de pago no encontrado
 *       422:
 *         description: ID inválido
 */
router.delete('/:id', authenticateToken, MetodoPagoController.removePaymentMethod);

/**
 * @swagger
 * /api/payment-methods/{id}/default:
 *   patch:
 *     summary: Marcar tarjeta como predeterminada
 *     description: |
 *       Establece una tarjeta como el método de pago predeterminado del usuario.
 *       
 *       **Comportamiento:**
 *       - Quita el flag de predeterminada de todas las demás tarjetas
 *       - Marca la tarjeta especificada como predeterminada
 *       - Esta tarjeta se usará automáticamente en sesiones de carga
 *     tags: [Métodos de Pago]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del método de pago en la base de datos
 *         example: 13
 *     responses:
 *       200:
 *         description: Tarjeta predeterminada actualizada
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
 *                         message:
 *                           type: string
 *                           example: "Tarjeta predeterminada actualizada"
 *       401:
 *         description: Token no provisto o inválido
 *       404:
 *         description: Método de pago no encontrado
 *       422:
 *         description: ID inválido
 */
router.patch('/:id/default', authenticateToken, MetodoPagoController.setDefaultPaymentMethod);

module.exports = router;