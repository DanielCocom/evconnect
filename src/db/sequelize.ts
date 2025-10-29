// src/db/sequelize.ts
import { Sequelize } from "sequelize-typescript";
import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

export const sequelize = new Sequelize(connectionString, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  models: [__dirname + "/../models"], // o listar modelos manualmente
  dialectOptions: {
    // Neon requiere SSL; rejectUnauthorized=false es común para cloud providers
    ssl: { require: true, rejectUnauthorized: false }
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected (Neon)");
  } catch (err) {
    console.error("❌ DB connection error:", err);
    throw err;
  }
};
