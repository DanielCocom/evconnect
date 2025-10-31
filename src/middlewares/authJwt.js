const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { 
        code: "UNAUTHORIZED", 
        message: "Token no provisto" 
      }
    });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: { 
          code: "INVALID_TOKEN", 
          message: "Token inválido o expirado" 
        }
      });
    }
    req.userId = Number(payload.sub);
    next();
  });
};

module.exports = { authenticateToken };
