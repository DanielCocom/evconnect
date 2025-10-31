const { UserService } = require("../services/user.service");
const { User } = require("../db/sequelize");

class UserController {
  static async register(req, res, next) {
    try {
      // Validación simple
      const { nombre, email, password } = req.body;
      if (!nombre || !email || !password) {
        return res.status(422).json({
          success: false,
          error: { 
            code: "VALIDATION_ERROR", 
            message: "Campos requeridos: nombre, email, password" 
          }
        });
      }

      if (password.length < 8) {
        return res.status(422).json({
          success: false,
          error: { 
            code: "VALIDATION_ERROR", 
            message: "La contraseña debe tener al menos 8 caracteres" 
          }
        });
      }

      const result = await UserService.createUser(req.body);
      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (err) {
      return next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(422).json({
          success: false,
          error: { 
            code: "VALIDATION_ERROR", 
            message: "Email y contraseña son requeridos" 
          }
        });
      }

      const result = await UserService.authenticateUser(email, password);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      return next(err);
    }
  }

  static async profile(req, res, next) {
    try {
      const userId = req.userId;
      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: { 
            code: "NOT_FOUND", 
            message: "Usuario no encontrado" 
          }
        });
      }

      const userData = user.toJSON();
      delete userData.password_hash;
      
      return res.json({ success: true, data: userData });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = { UserController };
