// src/dtos/user.dto.ts
import { z } from "zod";

export const RegisterDto = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  apellido_paterno: z.string().optional(),
  apellido_materno: z.string().optional(),
  email: z.string().email("Email inválido"),
  telefono: z.string().optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
});

export type RegisterInput = z.infer<typeof RegisterDto>;

export const LoginDto = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida")
});

export type LoginInput = z.infer<typeof LoginDto>;
