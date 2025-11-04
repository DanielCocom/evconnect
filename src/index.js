const http = require("http");
const app = require("./app");
const { initWebSocketServer } = require("./ws/wsServer");
require("dotenv").config();

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

initWebSocketServer(server);

const start = async () => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};


start().catch(err => {
  console.error("Failed to start:", err);
  process.exit(1);
});
