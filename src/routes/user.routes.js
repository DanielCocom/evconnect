const { Router } = require("express");
const { UserController } = require("../controllers/user.controller");
const { authenticateToken, authenticateJWT } = require("../middlewares/authJwt");

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

/**
 * @swagger
 * /api/user/sessions:
 *   get:
 *     summary: Obtener historial de sesiones de carga del usuario autenticado
 *     description: |
 *       Retorna todas las sesiones de carga realizadas por el usuario autenticado,
 *       incluyendo información del cargador, estación y detalles de la sesión.
 *       
 *       **Información incluida:**
 *       - Datos de la sesión (fechas, estado, energía consumida, monto)
 *       - Información del cargador utilizado
 *       - Datos de la estación donde se realizó la carga
 *       - Datos básicos del usuario
 *       
 *       **Orden:** Las sesiones se ordenan de más reciente a más antigua.
 *     tags: [Usuarios]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de sesiones de carga del usuario
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id_sesion:
 *                             type: integer
 *                             description: ID único de la sesión
 *                           id_cargador:
 *                             type: integer
 *                             description: ID del cargador utilizado
 *                           fecha_inicio:
 *                             type: string
 *                             format: date-time
 *                             description: Fecha y hora de inicio de la sesión
 *                           fecha_fin:
 *                             type: string
 *                             format: date-time
 *                             description: Fecha y hora de fin de la sesión
 *                           estado:
 *                             type: string
 *                             description: Estado de la sesión
 *                             enum: [pendiente, en_progreso, completada, cancelada, fallida]
 *                           energia_consumida_kwh:
 *                             type: number
 *                             format: decimal
 *                             description: Energía consumida en kWh
 *                           monto_final:
 *                             type: number
 *                             format: decimal
 *                             description: Monto total cobrado
 *                           metodo_pago_utilizado:
 *                             type: string
 *                             description: Método de pago usado
 *                           Cargador:
 *                             type: object
 *                             properties:
 *                               id_cargador:
 *                                 type: integer
 *                               tipo_carga:
 *                                 type: string
 *                                 description: Tipo de carga (rápida, normal)
 *                               estado:
 *                                 type: string
 *                                 description: Estado actual del cargador
 *                               Estacion:
 *                                 type: object
 *                                 properties:
 *                                   nombre_estacion:
 *                                     type: string
 *                                     description: Nombre de la estación
 *                                   direccion:
 *                                     type: string
 *                                     description: Dirección de la estación
 *                           User:
 *                             type: object
 *                             properties:
 *                               id_usuario:
 *                                 type: integer
 *                               nombre:
 *                                 type: string
 *                               apellido_materno:
 *                                 type: string
 *                               apellido_paterno:
 *                                 type: string
 *                               email:
 *                                 type: string
 *             example:
 *               success: true
 *               message: "Sesiones de carga del usuario"
 *               data:
 *                 - id_sesion: 123
 *                   id_cargador: 45
 *                   fecha_inicio: "2024-01-15T10:30:00Z"
 *                   fecha_fin: "2024-01-15T12:00:00Z"
 *                   estado: "completada"
 *                   energia_consumida_kwh: 25.5
 *                   monto_final: 150.75
 *                   metodo_pago_utilizado: "tarjeta"
 *                   Cargador:
 *                     id_cargador: 45
 *                     tipo_carga: "rápida"
 *                     estado: "disponible"
 *                     Estacion:
 *                       nombre_estacion: "Estación Centro"
 *                       direccion: "Av. Principal 123"
 *                   User:
 *                     id_usuario: 5
 *                     nombre: "Juan"
 *                     apellido_paterno: "Pérez"
 *                     apellido_materno: "García"
 *                     email: "juan@example.com"
 *       401:
 *         description: Token no provisto o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: false
 *               message: "Token no válido o expirado"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */

router.get("/sessions", authenticateToken, UserController.getUserSessions)

module.exports = router;
