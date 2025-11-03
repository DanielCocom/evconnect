const { Router } = require("express");
const { UserBackOfficeController } = require("../controllers/userBackOffice.Controller");
const { authenticateToken } = require("../middlewares/authJwt");


const router = new Router()

router.post("/create", UserBackOfficeController.CrearUsuario)
router.post("/login", UserBackOfficeController.login)
//router.get("/stats/general",authenticateToken,UserBackOfficeController.getGeneralStats);




module.exports = router;