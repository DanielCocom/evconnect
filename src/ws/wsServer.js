const WebSocket = require("ws");

let wss;

function initWebSocketServer(server) {
  wss = new WebSocket.WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    console.log("⚡ WS client connected");

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log("WS msg:", msg);
        // Manejar mensajes de ESP32: registro, lecturas, pings, heartbeats
      } catch (err) {
        console.error("Invalid ws msg", err);
      }
    });

    ws.on("close", () => {
      console.log("WS client disconnected");
    });

    ws.send(JSON.stringify({ 
      type: "hello", 
      serverTime: Date.now() 
    }));
  });

  console.log("WebSocket server initialized on /ws");
}

module.exports = { initWebSocketServer };
