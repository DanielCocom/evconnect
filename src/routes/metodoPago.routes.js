const express = require('express');
const { MetodoPagoController } = require('../controllers/metodoPago.controller');
const { authenticateToken } = require('../middlewares/auth.jwt');

const router = express.Router();

/**
 * Todas las rutas requieren autenticación
 */

// Crear SetupIntent para vincular tarjeta
router.post('/setup', authenticateToken, MetodoPagoController.createSetup);

// Agregar método de pago
router.post('/', authenticateToken, MetodoPagoController.addPaymentMethod);

// Listar métodos de pago
router.get('/', authenticateToken, MetodoPagoController.listPaymentMethods);

// Eliminar método de pago
router.delete('/:id', authenticateToken, MetodoPagoController.removePaymentMethod);

// Marcar como predeterminado
router.patch('/:id/default', authenticateToken, MetodoPagoController.setDefaultPaymentMethod);

module.exports = router;