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

  module.exports = function responseHandler() {
  return (req, res, next) => {
    const sendPayload = (status, success, opts = {}, data = null) => {
      const payload = {
        success,
        status,
        message: opts.message || (success ? "OK" : "Error"),
        data: data !== undefined ? data : null,
        errors: opts.errors || null,
        meta: opts.meta || null,
        timestamp: new Date().toISOString()
      };
      return res.status(status).json(payload);
    };

    res.ok = (data, message, meta) => sendPayload(200, true, { message, meta }, data);
    res.created = (data, message, meta) => sendPayload(201, true, { message, meta }, data);
    res.error = (status = 500, message, errors) => sendPayload(status, false, { message, errors }, null);

    next();
  };
};
};

function authenticateJWT(req, res, next) {
  // 1) Obtener token del header Authorization: Bearer <token>
  const auth = req.headers.authorization || (req.cookies && req.cookies.token);
  if (!auth) return res.status(401).json({ message: 'Token no proporcionado' });

  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      // err.name puede ser 'TokenExpiredError', 'JsonWebTokenError', etc.
      return res.status(401).json({ message: 'Token inválido', reason: err.message });
    }
    // adjunta la información del token en req.user para accederla en rutas
    req.user = payload;
    next();
  });
}

module.exports = { authenticateToken, authenticateJWT };
