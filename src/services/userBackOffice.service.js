const { hashPassword, comparePassword } = require("../utils/hash");
const { signToken } = require("../utils/jwt");
const { UserBackOffice } = require("../db/sequelize");

class UserBackOfficeService {
  static async CreateUserBackOffice(data) {
    //MODELO
    const { id_franquicia, nombre, password, email, rol } = data;

    const existing = await UserBackOffice.findOne({ where: { email } });
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

  static async validarUsuario(email, password) {
    const user = await UserBackOffice.findOne({
      where: { email: email }
    });

    if (!user) {
      const err = new Error("El email no esta registrado");
      err.status = 401;
      throw err;
    }

    // 2. Verificar que esté activo
    if (!user.activo) {
       const err = new Error("El usuario no esta activo");
      err.code = "INVALID_CREDENTIALS";
      err.status = 401;
      throw err;
    }

    // 3. Comparar la contraseña
    const isMatch = await comparePassword(password, user.password_hash);

    if (!isMatch) {
      const err = new Error("Credenciales inválidas");
      err.code = "INVALID_CREDENTIALS";
      err.status = 401;
      throw err;
    }

    // 4. Crear el payload para el JWT
    const payload = {
      id: user.id_admin,
      rol: user.rol,
      franquiciaId: user.id_franquicia
    };

    // 5. Generar y devolver el token
    const token = signToken(payload, String(user.id_admin));
    

    return { token, user: { id: user.id_admin, nombre: user.nombre, email: user.email, rol: user.rol } };
  }

  static async GetGeneralStats(){
    
  }

}



module.exports = { UserBackOfficeService }