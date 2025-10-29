import { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";

let wss: WebSocketServer;

export function initWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req) => {
    console.log("⚡ WS client connected");

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        // manejar mensajes de ESP32: registro, lecturas, pings, heartbeats...
        // e.g. { type: "register", deviceId: "charger_3", firmware: "v1" }
        console.log("WS msg:", msg);
      } catch (err) {
        console.error("Invalid ws msg", err);
      }
    });

    ws.on("close", () => {
      console.log("WS client disconnected");
    });

    ws.send(JSON.stringify({ type: "hello", serverTime: Date.now() }));
  });

  console.log("WebSocket server initialized on /ws");
}
