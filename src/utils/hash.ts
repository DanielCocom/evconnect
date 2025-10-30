// src/utils/hash.ts
import bcrypt from "bcryptjs";

export const hashPassword = async (plain: string) => {
  const salt = await bcrypt.genSalt(10);
  // ¡CORREGIDO!
  const data = await bcrypt.hash(plain, salt); // 'data' ahora es el string del hash
  return data;
};

export const comparePassword = async (plain: string, hash: string) => {
  return await bcrypt.compare(plain, hash);
};
