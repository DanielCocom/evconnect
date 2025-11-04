const { Router } = require("express");
const { FranchiseController } = require("../controllers/franchaise.controller");

const { authenticateToken } = require("../middlewares/authJwt"); // Tu middleware de autenticación

const router = Router();

router.get(
  "/dashboard",
  authenticateToken, // Protegemos la ruta
  FranchiseController.getDashboardStats
);

module.exports = router;    