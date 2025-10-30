import http from "http";
import app from "./app";
import { testConnection } from "./db/sequelize";
import { initWebSocketServer } from "./ws/wsServer";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Inicia WebSocket server en el mismo puerto para compartir HTTP
initWebSocketServer(server);

const start = async () => {
  await testConnection();
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};



start().catch(err => {
  console.error("Failed to start:", err);
  process.exit(1);
});
