const { User } = require("../models");
const { hashPassword, comparePassword } = require("../utils/hash");
const { signToken } = require("../utils/jwt");
const { StripeService } = require("./stripe/stripe.service");

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
    
    // Crear customer en Stripe ANTES de crear el usuario
    let stripeCustomerId = null;
    try {
      const stripeCustomer = await StripeService.createCustomer({
        email,
        name: `${nombre} ${apellido_paterno || ''} ${apellido_materno || ''}`.trim(),
        metadata: {
          source: 'evconnect_app'
        }
      });
      stripeCustomerId = stripeCustomer.id;
    } catch (stripeError) {
      console.error('Error creando customer en Stripe:', stripeError);
      // Puedes decidir si fallas el registro o continúas sin Stripe
      // Por ahora, lo logueamos pero continuamos
    }

    const user = await User.create({
      nombre,
      apellido_paterno,
      apellido_materno,
      email,
      password_hash: password_hashed,
      stripe_customer_id: stripeCustomerId
    });

    const userSafe = user.toJSON();
    delete userSafe.password_hash;
    return userSafe;
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
}

module.exports = { UserService };
