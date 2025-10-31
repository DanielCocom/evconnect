const { hashPassword, comparePassword } = require("../utils/hash");
const { signToken } = require("../utils/jwt");
const { UserBackOffice } = require("../db/sequelize");

class UserBackOfficeService {
  static async CreateUserBackOffice(data) {
    //MODELO
    const { id_franquicia, nombre, password, email, rol } = data;

    const existing = await UserBackOffice.findOne({ where:{ email} });
    if (existing) {
      const err = new Error("El correo ya está registrado");
      err.code = "USER_EXISTS";
      err.status = 409;
      // dispara el mensaje, en base a una excepcion
      // contenerlo en un try catcj
      throw err;
    }

      const password_hashed = await hashPassword(password);
       const user = await UserBackOffice.create({
      id_franquicia,
      nombre,
      email,
      rol,
      password_hash: password_hashed
    });

      const userSafe = user.toJSON();
      delete userSafe.password_hash;
      return userSafe;
  }

}

module.exports = {UserBackOfficeService}