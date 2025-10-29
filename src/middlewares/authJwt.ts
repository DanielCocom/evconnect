// src/middlewares/authJwt.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Token no provisto" }
    });
  }

  jwt.verify(token, JWT_SECRET, (err, payload: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Token inválido o expirado" }
      });
    }
    req.userId = Number(payload.sub);
    next();
  });
};
