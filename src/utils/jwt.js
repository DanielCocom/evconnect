const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "12h";

const signToken = (payload, subject) => {
  // subject se añade como el "sub" del JWT (usaste String(user.id_admin) al crearlo)
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
    subject,
  });
};

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}


module.exports = { signToken, verifyToken };
