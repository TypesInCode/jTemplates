import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root,
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
