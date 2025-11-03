const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "12h";

function signToken(payload, subject) {
  return jwt.sign(payload, JWT_SECRET, {
    subject,
    expiresIn: JWT_EXPIRES
  });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };
