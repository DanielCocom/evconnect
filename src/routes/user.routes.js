const { Router } = require("express");
const { UserController } = require("../controllers/user.controller");
const { authenticateToken } = require("../middlewares/authJwt");

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id_usuario:
 *           type: integer
 *           description: ID único del usuario
 *         nombre:
 *           type: string
 *           description: Nombre del usuario
 *         apellido_paterno:
 *           type: string
 *           description: Apellido paterno
 *         apellido_materno:
 *           type: string
 *           description: Apellido materno
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico
 *         saldo_virtual:
 *           type: number
 *           format: decimal
 *           description: Saldo virtual del usuario
 *         stripe_customer_id:
 *           type: string
 *           description: ID del Customer en Stripe (generado automáticamente al registrarse)
 *           example: "cus_P8xYz123ABC"
 *         tarjeta_verificada:
 *           type: boolean
 *           description: Indica si el usuario ha vinculado al menos una tarjeta
 *           example: false
 *         fecha_registro:
 *           type: string
 *           format: date-time
 *           description: Fecha de registro
 *     UserRegister:
 *       type: object
 *       required:
 *         - nombre
 *         - email
 *         - password
 *       properties:
 *         nombre:
 *           type: string
 *           example: "Juan"
 *         apellido_paterno:
 *           type: string
 *           example: "Pérez"
 *         apellido_materno:
 *           type: string
 *           example: "García"
 *         email:
 *           type: string
 *           format: email
 *           example: "juan@example.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           example: "password123"
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "juan@example.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           example: "password123"
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         status:
 *           type: integer
 *         message:
 *           type: string
 *         data:
 *           type: object
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     description: |
 *       Crea un nuevo usuario en la plataforma y automáticamente genera
 *       un Customer en Stripe para gestión de pagos futura.
 *       
 *       **Proceso automático:**
 *       - Se validan los datos del usuario
 *       - Se crea el usuario en la base de datos
 *       - Se crea un Customer en Stripe con los mismos datos
 *       - Se guarda el `stripe_customer_id` en el usuario
 *       
 *       **Validaciones:**
 *       - Email único (no duplicado)
 *       - Password mínimo 8 caracteres
 *       - Campos requeridos: nombre, email, password
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente con Customer de Stripe
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *             example:
 *               success: true
 *               message: "Usuario creado correctamente"
 *               data:
 *                 id_usuario: 5
 *                 nombre: "Juan"
 *                 apellido_paterno: "Pérez"
 *                 email: "juan@example.com"
 *                 stripe_customer_id: "cus_P8xYz123ABC"
 *                 tarjeta_verificada: false
 *                 saldo_virtual: 0
 *       422:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: false
 *               message: "La contraseña debe tener al menos 8 caracteres"
 *       409:
 *         description: El correo ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: false
 *               message: "El correo ya está registrado"
 */
router.post("/register", UserController.register);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         token:
 *                           type: string
 *                           description: JWT token para autenticación
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       422:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post("/login", UserController.login);

/**
 * @swagger
 * /api/user/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Token no provisto o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get("/me", authenticateToken, UserController.profile);

module.exports = router;
