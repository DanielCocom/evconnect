const { Sequelize } = require('sequelize');
require('dotenv').config();

// 1. Lee la DATABASE_URL de tu archivo .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está definida en el archivo .env");
}

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  
  // 2. Mantenemos las opciones de SSL que requiere Neon
  dialectOptions: {
    ssl: { 
      require: true, 
      rejectUnauthorized: false 
    }
  },

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// 3. Exporta SÓLO la instancia de sequelize
// (Los modelos se importan y asocian en src/models/index.js)
module.exports = sequelize;