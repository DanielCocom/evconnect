const { UserBackOffice, User } = require("../models");

class AdminUserService {
  /**
   * GET /api/admin-users
   * Lista usuarios operadores (backoffice)
   */
  static async getAllAdminUsers(franquiciaId) {
    try {
      const usuarios = await UserBackOffice.findAll({
        where: { id_franquicia: franquiciaId },
        attributes: { exclude: ['password_hash'] },
        order: [['nombre', 'ASC']]
      });

      return usuarios;
    } catch (error) {
      console.error("Error en AdminUserService.getAllAdminUsers:", error);
      throw new Error("Error al obtener usuarios operadores");
    }
  }

  /**
   * GET /api/admin-users/:id
   * Obtiene un usuario operador específico
   */
  static async getAdminUserById(id, franquiciaId) {
    try {
      const usuario = await UserBackOffice.findOne({
        where: { 
          id_admin: id,
          id_franquicia: franquiciaId 
        },
        attributes: { exclude: ['password_hash'] }
      });

      if (!usuario) {
        const err = new Error("Usuario operador no encontrado");
        err.status = 404;
        throw err;
      }

      return usuario;
    } catch (error) {
      console.error("Error en AdminUserService.getAdminUserById:", error);
      throw error;
    }
  }

  /**
   * PUT /api/admin-users/:id
   * Actualiza un usuario operador
   */
  static async updateAdminUser(id, data, franquiciaId) {
    try {
      const usuario = await UserBackOffice.findOne({
        where: { 
          id_admin: id,
          id_franquicia: franquiciaId 
        }
      });

      if (!usuario) {
        const err = new Error("Usuario operador no encontrado");
        err.status = 404;
        throw err;
      }

      const { nombre, rol, activo } = data;

      await usuario.update({
        nombre: nombre || usuario.nombre,
        rol: rol || usuario.rol,
        activo: activo !== undefined ? activo : usuario.activo
      });

      // Retornar sin password_hash
      const usuarioSafe = usuario.toJSON();
      delete usuarioSafe.password_hash;

      return usuarioSafe;
    } catch (error) {
      console.error("Error en AdminUserService.updateAdminUser:", error);
      throw error;
    }
  }

  /**
   * GET /api/users
   * Lista usuarios clientes (app móvil)
   * Filtra por los que han usado estaciones de la franquicia
   */
  static async getAllClientUsers(franquiciaId) {
    try {
      const usuarios = await User.findAll({
        attributes: { exclude: ['password_hash'] },
        order: [['fecha_registro', 'DESC']]
      });

      return usuarios;
    } catch (error) {
      console.error("Error en AdminUserService.getAllClientUsers:", error);
      throw new Error("Error al obtener usuarios clientes");
    }
  }
}

module.exports = { AdminUserService };
