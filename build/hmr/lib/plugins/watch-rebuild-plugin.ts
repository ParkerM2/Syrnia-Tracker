import { BUILD_COMPLETE, LOCAL_RELOAD_SOCKET_URL } from "../consts.js";
import MessageInterpreter from "../interpreter/index.js";
import { WebSocket } from "ws";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PluginConfigType } from "../types.js";
import type { PluginOption } from "vite";

// Injection code lives in dist (pre-compiled JS for browser injection)
const injectionsPath = resolve(import.meta.dirname, "..", "..", "dist", "lib", "injections");

const refreshCode = readFileSync(resolve(injectionsPath, "refresh.js"), "utf-8");
const reloadCode = readFileSync(resolve(injectionsPath, "reload.js"), "utf-8");

export const watchRebuildPlugin = (config: PluginConfigType): PluginOption => {
  const { refresh, reload, id: _id, onStart } = config;
  const hmrCode = (refresh ? refreshCode : "") + (reload ? reloadCode : "");

  let ws: WebSocket | null = null;
  const id = _id ?? Math.random().toString(36);

  const initializeWebSocket = () => {
    const socket = new WebSocket(LOCAL_RELOAD_SOCKET_URL);

    socket.onopen = () => {
      ws = socket;
      console.log(`[HMR] Plugin connected to ${LOCAL_RELOAD_SOCKET_URL}`);
    };

    socket.onclose = () => {
      ws = null;
      setTimeout(initializeWebSocket, 1_000);
    };

    socket.onerror = () => {
      // onclose fires after onerror, which triggers reconnect
    };
  };

  // Connect eagerly so WebSocket is ready before the first closeBundle
  initializeWebSocket();

  return {
    name: "watch-rebuild",
    closeBundle() {
      onStart?.();
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(MessageInterpreter.send({ type: BUILD_COMPLETE, id }));
      }
    },
    generateBundle(_options, bundle) {
      for (const module of Object.values(bundle)) {
        if (module.type === "chunk") {
          module.code = `(function() {let __HMR_ID = "${id}";\n` + hmrCode + "\n" + "})();" + "\n" + module.code;
        }
      }
    },
  };
};
