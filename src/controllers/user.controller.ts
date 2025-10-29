// src/controllers/user.controller.ts
import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";

export class UserController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UserService.createUser(req.body);
      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (err: any) {
      return next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await UserService.authenticateUser(email, password);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err: any) {
      return next(err);
    }
  }

  static async profile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId;
      // ejemplo: buscar usuario y devolver profile
      const user = await (await import("../models/User")).User.findByPk(userId);
      if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Usuario no encontrado" }});
      const u = user.toJSON(); delete (u as any).password_hash;
      return res.json({ success: true, data: u });
    } catch (err) {
      next(err);
    }
  }
}
