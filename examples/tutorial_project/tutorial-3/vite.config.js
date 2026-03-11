import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      // Exclude jsdom from bundling
      // j-templates has jsdom as a devDependency for testing
      external: ["jsdom"],
    },
  },
});