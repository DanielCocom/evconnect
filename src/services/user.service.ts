// src/services/user.service.ts
import { User } from "../models/User";
import { hashPassword, comparePassword } from "../utils/hash";
import { signToken } from "../utils/jwt";
// RegisterInput no se está usando aquí, pero podrías usarlo para tipar 'data'
import { RegisterInput } from "../dtos/user.dto"; 
import { log } from "console";

export class UserService {
  // Usamos RegisterInput para tipar mejor los datos de entrada si quieres
  static async createUser(data: RegisterInput) {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) {
      // Es mejor usar una clase de error personalizada si puedes, 
      // pero por ahora esto funciona.
      const err: any = new Error("El correo ya está registrado");
      err.code = "USER_EXISTS";
      err.status = 409;
      throw err;
    }

    // hashPassword ahora tiene el 'await' interno correcto
    const password_hashed = await hashPassword(data.password);
    
    const user = await User.create({
      nombre: data.nombre,
      apellido_paterno: data.apellido_paterno,
      apellido_materno: data.apellido_materno,
      email: data.email,
      password_hash: password_hashed,
      // Si 'telefono' viene en data, añádelo aquí
    });

    const userSafe = user.toJSON();
    delete (userSafe as any).password_hash;
    return userSafe;
  }

  static async authenticateUser(email: string, password: string) {
    // findOne por defecto trae todos los campos, incluido password_hash
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      const err: any = new Error("Credenciales inválidas");
      err.code = "INVALID_CREDENTIALS";
      err.status = 401;
      throw err;
    }


    console.log(user.password_hash)
    // Verificación de seguridad vital
    if (!user.password_hash) {
        console.error(`ERROR CRÍTICO: Usuario ${user.id_usuario} no tiene hash de contraseña.`);
        const err: any = new Error("Error interno de autenticación");
        err.status = 500;
        throw err;
    }

    // Ahora es seguro llamar a comparePassword
    const ok = await comparePassword(password, user.password_hash);
    
    if (!ok) {
      const err: any = new Error("Credenciales inválidas");
      err.code = "INVALID_CREDENTIALS";
      err.status = 401;
      throw err;
    }

    const token = signToken({}, String(user.id_usuario));
    const userSafe = user.toJSON();
    delete (userSafe as any).password_hash;

    return { token, user: userSafe };
  }
}