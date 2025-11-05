const { User } = require("../models");
const { hashPassword, comparePassword } = require("../utils/hash");
const { signToken } = require("../utils/jwt");
const { StripeService } = require("./stripe.service");

class UserService {
  static async createUser(data) {
    const { nombre, apellido_paterno, apellido_materno, email, password } = data;

    // Verificar si email existe
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      const err = new Error("El correo ya está registrado");
      err.code = "USER_EXISTS";
      err.status = 409;
      throw err;
    }

    const password_hashed = await hashPassword(password);

    // 1. Crear usuario en BD
    const user = await User.create({
      nombre,
      apellido_paterno,
      apellido_materno,
      email,
      password_hash: password_hashed,
      tarjeta_verificada: false // Inicialmente sin tarjeta
    });

    // 2. Crear Customer en Stripe
    try {
      const stripeCustomer = await StripeService.createCustomer({
        email: user.email,
        name: `${user.nombre} ${user.apellido_paterno || ''}`.trim(),
        metadata: {
          user_id: user.id_usuario.toString(),
          source: 'EVCONNECT_APP'
        }
      });

      // 3. Guardar stripe_customer_id en el usuario
      await user.update({ stripe_customer_id: stripeCustomer.id });

      const userSafe = user.toJSON();
      delete userSafe.password_hash;

      return {
        ...userSafe,
        stripe_customer_id: stripeCustomer.id
      };
    } catch (stripeError) {
      // Si falla Stripe, eliminar usuario de BD
      await user.destroy();
      console.error('Error creando customer en Stripe:', stripeError);
      
      const err = new Error('Error al configurar cuenta de pagos');
      err.status = 500;
      throw err;
    }
  }

  static async authenticateUser(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      const err = new Error("Credenciales inválidas");
      err.code = "INVALID_CREDENTIALS";
      err.status = 401;
      throw err;
    }

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      const err = new Error("Credenciales inválidas");
      err.code = "INVALID_CREDENTIALS";
      err.status = 401;
      throw err;
    }

    const token = signToken({}, String(user.id_usuario));
    const userSafe = user.toJSON();
    delete userSafe.password_hash;

    return { token, user: userSafe };
  }

  /**
   * Actualizar NFC del usuario (opcional)
   */
  static async updateNFC(userId, nfcUid) {
    const user = await User.findByPk(userId);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      throw err;
    }

    // Verificar que el NFC no esté en uso
    const existing = await User.findOne({ 
      where: { nfc_uid: nfcUid } 
    });

    if (existing && existing.id_usuario !== userId) {
      const err = new Error('Este NFC ya está vinculado a otra cuenta');
      err.status = 409;
      throw err;
    }

    await user.update({ nfc_uid: nfcUid });

    const userSafe = user.toJSON();
    delete userSafe.password_hash;

    return userSafe;
  }
}

module.exports = { UserService };