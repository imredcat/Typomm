import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";
import { createRequire } from "node:module";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;
const require = createRequire(import.meta.url);

const resolvePM = (pkg: string) => {
  const cjs = require.resolve(pkg);
  return path.join(path.dirname(cjs), "index.js");
};

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@tiptap/pm/model", replacement: resolvePM("prosemirror-model") },
      { find: "@tiptap/pm/state", replacement: resolvePM("prosemirror-state") },
      { find: "@tiptap/pm/view", replacement: resolvePM("prosemirror-view") },
      { find: "@tiptap/pm/transform", replacement: resolvePM("prosemirror-transform") },
    ],
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
