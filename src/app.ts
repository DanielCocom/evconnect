import express from "express";
import cors from "cors";
// import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./docs/swagger";
// ... otras rutas

const app = express();
// app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// app.use("/api/auth", authRoutes);
// ... usar routes

// error handler simple
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal error" });
});

export default app;
