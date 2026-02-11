/**
 * Standalone script to trigger extension reload from another terminal.
 * Connects to the HMR WebSocket server and sends a reload signal.
 *
 * Usage: pnpm reload
 */
import { BUILD_COMPLETE, LOCAL_RELOAD_SOCKET_URL } from "./hmr/lib/consts.js";
import { WebSocket } from "ws";

const ws = new WebSocket(LOCAL_RELOAD_SOCKET_URL);

ws.onopen = () => {
  ws.send(JSON.stringify({ type: BUILD_COMPLETE, id: "chrome-extension-hmr" }));
  console.log("[HMR] Reload signal sent");
  setTimeout(() => process.exit(0), 300);
};

ws.onerror = () => {
  console.error("[HMR] Dev server not running. Start with: pnpm dev");
  process.exit(1);
};
