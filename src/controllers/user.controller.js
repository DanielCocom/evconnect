const { UserService } = require("../services/user.service");
const { User } = require("../db/sequelize");

class UserController {
  static async register(req, res, next) {
    try {
      // Validación simple
      const { nombre, email, password } = req.body;
      if (!nombre || !email || !password) {
        return res.error(422, "Campos requeridos: nombre, email, password");
      }

      if (password.length < 8) {
        return res.error(422, "La contraseña debe tener al menos 8 caracteres");
      }

      const result = await UserService.createUser(req.body);
      return res.created(result, "Usuario creado correctamente");
    } catch (err) {
      return res.error(err.status || 500, err.message || "Error interno", err.errors || null);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;


       if (password.length < 8) {
        return res.error(422, "La contraseña debe tener al menos 8 caracteres");
      }
      
      const { token, user } = await UserService.authenticateUser(email, password);
      return res.ok({ user, token }, 'Inicio de sesión correcto');
    } catch (err) {

      return res.error(err.status || 500, err.message || 'Error interno', err.errors || null);
    }
  }

  static async profile(req, res, next) {
    try {
      const userId = req.userId;
      const user = await User.findByPk(userId);

      if (!user) {
        return res.error(404, "Usuario no encontrado", { code: "NOT_FOUND" });
      }

      const userData = user.toJSON();
      delete userData.password_hash;

      return res.ok(userData, "Perfil de usuario");
    } catch (err) {
      return res.error(err.status || 500, err.message || "Error interno", err.errors || null);
    }
  }
}

module.exports = { UserController };
