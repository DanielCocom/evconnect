const { UserBackOfficeService } = require("../services/userBackOffice.service");


class UserBackOfficeController {
  static async CrearUsuario(req, res, next) {
    try {
      const { id_franquicia, nombre, password, email, rol = null } = req.body;
      if (!id_franquicia || !nombre || !password || !email) {
        if (!id_franquicia || !nombre || !password || !email) {
          return res.error(422, "Campos requeridos; id_franquicia, nombre, password, email");
        }

      }

      if (password.length < 8) {
        ;
      }
      const result = await UserBackOfficeService.CreateUserBackOffice(req.body)
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
      if (password.length < 8) {
        return res.error(422, "La contraseña debe tener al menos 8 caracteres");
      }

      const { token, user } = await UserBackOfficeService.validarUsuario(email, password);
      return res.ok({ user, token }, 'Inicio de sesión correcto');
    }
    catch (err) {
      return res.error(err.status || 500, err.message || 'Error interno', err.errors || null);

    }

  }
}


module.exports = { UserBackOfficeController };