// src/middlewares/validateDto.ts
import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export const validateDto = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.format();
      return res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Error de validación",
          details: issues
        }
      });
    }
    // attach typed body
    req.body = parseResult.data;
    next();
  };
};
