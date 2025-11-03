const { Sequelize } = require("sequelize");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const sequelize = new Sequelize(connectionString, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialectOptions: {
    ssl: { 
      require: true, 
      rejectUnauthorized: false 
    }
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Importar modelos
const User = require("../models/User")(sequelize);
const UserBackOffice = require("../models/UserBackOffice")(sequelize);


const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected (Neon)");
  } catch (err) {
    console.error("❌ DB connection error:", err);
    throw err;
  }
};

module.exports = { sequelize, User,UserBackOffice, testConnection };
