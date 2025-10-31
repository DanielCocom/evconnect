const { Router } = require("express");
const  {UserBackOfficeController} =  require("../controllers/userBackOffice.Controller");

const router = new Router()

router.post("/create", UserBackOfficeController.CrearUsuario)
router.post("/login", UserBackOfficeController.CrearUsuario)





module.exports = router;