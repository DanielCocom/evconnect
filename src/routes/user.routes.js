const { Router } = require("express");
const { UserController } = require("../controllers/user.controller");
const { authenticateToken } = require("../middlewares/authJwt");

const router = Router();

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.get("/me", authenticateToken, UserController.profile);

module.exports = router;
