// src/utils/hash.ts
import bcrypt from "bcryptjs";

export const hashPassword = async (plain: string) => {
  const salt = await bcrypt.genSalt(10);
    const data = bcrypt.hash(plain, salt);
  return data;
};

export const comparePassword = async (plain: string, hash: string) => {
  return bcrypt.compare(plain, hash);
};
