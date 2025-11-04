const { Router } = require("express");
const { FranchiseController } = require("../controllers/franchaise.controller");

const { authenticateToken, authenticateJWT } = require("../middlewares/authJwt"); 


const router = Router();

router.get(
  "/dashboard",
  authenticateToken, 
  authenticateJWT,
  FranchiseController.getDashboardStats
);

module.exports = router;    