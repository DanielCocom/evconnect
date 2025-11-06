const { AdminUserService } = require("../services/adminUser.service");

class AdminUserController {
  /**
   * GET /api/admin-users
   */
  static async getAllAdminUsers(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const users = await AdminUserService.getAllAdminUsers(franquiciaId);
      return res.ok(users, "Usuarios operadores obtenidos correctamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener usuarios operadores"
      );
    }
  }

  /**
   * GET /api/admin-users/:id
   */
  static async getAdminUserById(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const { id } = req.params;
      const user = await AdminUserService.getAdminUserById(id, franquiciaId);
      return res.ok(user, "Usuario operador obtenido");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener usuario operador"
      );
    }
  }

  /**
   * PUT /api/admin-users/:id
   */
  static async updateAdminUser(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const { id } = req.params;
      const user = await AdminUserService.updateAdminUser(id, req.body, franquiciaId);
      return res.ok(user, "Usuario operador actualizado exitosamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al actualizar usuario operador"
      );
    }
  }

  /**
   * GET /api/users
   */
  static async getAllClientUsers(req, res) {
    try {
      const franquiciaId = req.user?.franquiciaId;
      if (!franquiciaId) {
        return res.error(401, "Usuario no está asociado a una franquicia.");
      }

      const users = await AdminUserService.getAllClientUsers(franquiciaId);
      return res.ok(users, "Usuarios clientes obtenidos correctamente");
    } catch (error) {
      return res.error(
        error.status || 500,
        error.message || "Error al obtener usuarios clientes"
      );
    }
  }
}

module.exports = { AdminUserController };
