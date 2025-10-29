// src/utils/jwt.ts
import jwt, { SignOptions, Secret } from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "12h";

export function signToken(payload: object, subject?: string) {
  return jwt.sign(payload, JWT_SECRET as Secret, {
    subject,
    expiresIn: JWT_EXPIRES
  } as SignOptions);
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET as Secret);
}
