const { Router } = require("express");
const { AdminUserController } = require("../controllers/adminUser.controller");
const { authenticateToken, authenticateJWT } = require("../middlewares/authJwt");

const router = Router();

/**
 * @swagger
 * /api/admin-users:
 *   get:
 *     summary: Listar usuarios operadores (backoffice)
 *     tags: [Usuarios Backoffice]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios operadores obtenida
 */
router.get("/", authenticateToken, authenticateJWT, AdminUserController.getAllAdminUsers);

/**
 * @swagger
 * /api/admin-users/{id}:
 *   get:
 *     summary: Obtener usuario operador por ID
 *     tags: [Usuarios Backoffice]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario operador obtenido
 */
router.get("/:id", authenticateToken, authenticateJWT, AdminUserController.getAdminUserById);

/**
 * @swagger
 * /api/admin-users/{id}:
 *   put:
 *     summary: Actualizar usuario operador
 *     tags: [Usuarios Backoffice]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario operador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Carlos Administrador"
 *               rol:
 *                 type: string
 *                 example: "super_admin"
 *               activo:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Usuario operador actualizado
 */
router.put("/:id", authenticateToken, authenticateJWT, AdminUserController.updateAdminUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar usuarios clientes (app móvil)
 *     tags: [Usuarios Clientes]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios clientes obtenida
 */
router.get("/clients", authenticateToken, authenticateJWT, AdminUserController.getAllClientUsers);

module.exports = router;
