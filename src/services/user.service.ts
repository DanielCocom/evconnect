// src/services/user.service.ts
import { string } from "zod";
import { User } from "../models/User";
import { hashPassword, comparePassword } from "../utils/hash";
import { signToken } from "../utils/jwt";

export class UserService {
  static async createUser(data: {
    nombre: string;
    apellido_paterno?: string;
    apellido_materno?: string;
    email: string;
    telefono?: string;
    password: string;
  }) {
    // Verificar si email existe
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) {
      const err: any = new Error("El correo ya está registrado");
      err.code = "USER_EXISTS";
      err.status = 409;
      throw err;
    }

    const password_hashed = await hashPassword(data.password);
    const user = await User.create({
      nombre: data.nombre,
      apellido_paterno: data.apellido_paterno,
      apellido_materno: data.apellido_materno,
      email: data.email,
      telefono: data.telefono,
      password_hash: password_hashed 
    });

    // opcional: no devolver password hash
    const userSafe = user.toJSON();
    delete (userSafe as any).password_hash;
    return userSafe;
  }

  static async authenticateUser(email: string, password: string) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      const err: any = new Error("Credenciales inválidas");
      err.code = "INVALID_CREDENTIALS";
      err.status = 401;
      throw err;
    }

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
