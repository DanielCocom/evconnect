const { MetodoPagoService } = require('../services/metodoPago.service');

class MetodoPagoController {
  /**
   * POST /api/user/payment-methods/setup
   * Crear SetupIntent para vincular tarjeta
   */
  static async createSetup(req, res) {
    try {
      const userId = req.userId; // Del middleware JWT
      const result = await MetodoPagoService.createSetupIntent(userId);
      
      return res.ok(result, 'SetupIntent creado. Usa el client_secret en el frontend.');
    } catch (err) {
      return res.error(err.status || 500, err.message, err.errors || null);
    }
  }

  /**
   * POST /api/user/payment-methods
   * Guardar método de pago después del setup exitoso
   * Body: { payment_method_id: "pm_xxxxx" }
   */
  static async addPaymentMethod(req, res) {
    try {
      const userId = req.userId;
      const { payment_method_id } = req.body;

      if (!payment_method_id) {
        return res.error(422, 'payment_method_id es requerido');
      }

      const result = await MetodoPagoService.addPaymentMethod(userId, payment_method_id);
      return res.created(result, 'Tarjeta vinculada correctamente');
    } catch (err) {
      return res.error(err.status || 500, err.message, err.errors || null);
    }
  }

  /**
   * GET /api/user/payment-methods
   * Listar tarjetas del usuario
   */
  static async listPaymentMethods(req, res) {
    try {
      const userId = req.userId;
      const methods = await MetodoPagoService.listPaymentMethods(userId);
      
      return res.ok(methods, 'Métodos de pago obtenidos');
    } catch (err) {
      return res.error(err.status || 500, err.message, err.errors || null);
    }
  }

  /**
   * DELETE /api/user/payment-methods/:id
   * Eliminar tarjeta
   */
  static async removePaymentMethod(req, res) {
    try {
      const userId = req.userId;
      const idPago = parseInt(req.params.id);

      if (isNaN(idPago)) {
        return res.error(422, 'ID de pago inválido');
      }

      const result = await MetodoPagoService.removePaymentMethod(userId, idPago);
      return res.ok(result, 'Tarjeta eliminada correctamente');
    } catch (err) {
      return res.error(err.status || 500, err.message, err.errors || null);
    }
  }

  /**
   * PATCH /api/user/payment-methods/:id/default
   * Marcar tarjeta como predeterminada
   */
  static async setDefaultPaymentMethod(req, res) {
    try {
      const userId = req.userId;
      const idPago = parseInt(req.params.id);

      if (isNaN(idPago)) {
        return res.error(422, 'ID de pago inválido');
      }

      const result = await MetodoPagoService.setDefaultPaymentMethod(userId, idPago);
      return res.ok(result, 'Tarjeta predeterminada actualizada');
    } catch (err) {
      return res.error(err.status || 500, err.message, err.errors || null);
    }
  }
}

module.exports = { MetodoPagoController };