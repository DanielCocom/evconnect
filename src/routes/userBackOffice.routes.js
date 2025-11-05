const { Router } = require("express");
const { UserBackOfficeController } = require("../controllers/userBackOffice.Controller");
const { authenticateToken } = require("../middlewares/authJwt");

const router = new Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserBackOffice:
 *       type: object
 *       properties:
 *         id_admin:
 *           type: integer
 *           description: ID único del usuario backoffice
 *         id_franquicia:
 *           type: integer
 *           description: ID de la franquicia asociada
 *         nombre:
 *           type: string
 *           description: Nombre del usuario
 *         email:
 *           type: string
 *           format: email
 *           description: Correo electrónico
 *         rol:
 *           type: string
 *           description: Rol del usuario
 *           example: "Administrador"
 *         activo:
 *           type: boolean
 *           description: Estado activo del usuario
 *     UserBackOfficeCreate:
 *       type: object
 *       required:
 *         - id_franquicia
 *         - nombre
 *         - email
 *         - password
 *       properties:
 *         id_franquicia:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: "Juan Pérez"
 *         email:
 *           type: string
 *           format: email
 *           example: "juan@franquicia.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           example: "password123"
 *         rol:
 *           type: string
 *           example: "Administrador"
 *     UserBackOfficeLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "juan@franquicia.com"
 *         password:
 *           type: string
 *           minLength: 8
 *           example: "password123"
 */

/**
 * @swagger
 * /api/admin/create:
 *   post:
 *     summary: Crear nuevo usuario backoffice
 *     tags: [Usuarios BackOffice]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserBackOfficeCreate'
 *     responses:
 *       201:
 *         description: Usuario backoffice creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserBackOffice'
 *       422:
 *         description: Error de validación - campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       409:
 *         description: El correo ya está registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post("/create", UserBackOfficeController.CrearUsuario);

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Iniciar sesión usuario backoffice
 *     tags: [Usuarios BackOffice]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserBackOfficeLogin'
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
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             nombre:
 *                               type: string
 *                             email:
 *                               type: string
 *                             rol:
 *                               type: string
 *                         token:
 *                           type: string
 *                           description: JWT token para autenticación con payload de franquicia
 *       401:
 *         description: Credenciales inválidas o usuario inactivo
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
router.post("/login", UserBackOfficeController.login);

//router.get("/stats/general",authenticateToken,UserBackOfficeController.getGeneralStats);

module.exports = router;