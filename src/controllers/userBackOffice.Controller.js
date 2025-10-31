const { UserBackOfficeService } = require("../services/userBackOffice.service");


class UserBackOfficeController {
  static async CrearUsuario(req, res, next) {
    try {
      const { id_franquicia, nombre, password, email, rol = null } = req.body;
      if (!id_franquicia || !nombre || !password || !email) {
        return res.status(422).json({
          succes: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Campos requeridos; id_franquicia, nombre, password, email",
          },
        });
      }

      if (password.length < 8) {
        return res.status(422).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "La contraseña debe tener al menos 8 caracteres",
          },
        });
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
}


module.exports = { UserBackOfficeController };