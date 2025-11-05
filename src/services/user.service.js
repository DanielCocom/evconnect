const { User } = require("../models");
const { hashPassword, comparePassword } = require("../utils/hash");
const { signToken } = require("../utils/jwt");

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
    const user = await User.create({
      nombre,
      apellido_paterno,
      apellido_materno,
      email,
      password_hash: password_hashed
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
