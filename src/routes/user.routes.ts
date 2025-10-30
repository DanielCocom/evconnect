// src/routes/user.routes.ts
import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { validateDto } from "../middlewares/validateDto";
import { RegisterDto, LoginDto } from "../dtos/user.dto";
import { authenticateToken } from "../middlewares/authJwt";

const router = Router();

router.post("/register", validateDto(RegisterDto), UserController.register);
router.post("/login", validateDto(LoginDto), UserController.login);

// Protected example route
router.get("/me", authenticateToken, UserController.profile);

export default router;
