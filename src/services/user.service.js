const { User } = require("../models");
const { hashPassword, comparePassword } = require("../utils/hash");
const { signToken } = require("../utils/jwt");
const { StripeService } = require("./stripe/stripe.service");
const { generateNfcUid } = require("../utils/nfc"); // Nueva importación

class UserService {
 static async createUser(data) {
   const { nombre, apellido_paterno, apellido_materno, email, password } = data;

 // 1. Verificar si email existe
 const existing = await User.findOne({ where: { email } });
 if (existing) {
 const err = new Error("El correo ya está registrado");
 err.code = "USER_EXISTS";
 err.status = 409;
 throw err;
 }

 const password_hashed = await hashPassword(password);
 // 2. Generar NFC UID (Tarjeta Virtual)
const nfc_uid = await generateNfcUid(); // Genera un UID único para el usuario
 
    // 3. Crear customer en Stripe ANTES de crear el usuario
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
      // Es un proyecto escolar: si Stripe falla, continuamos pero el usuario no podrá pagar.
    }

    // 4. Crear usuario en la DB con todos los datos
    const user = await User.create({
      nombre,
      apellido_paterno,
      apellido_materno,
      email,
      password_hash: password_hashed,
      stripe_customer_id: stripeCustomerId,
      nfc_uid: nfc_uid // Guardamos el UID generado
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