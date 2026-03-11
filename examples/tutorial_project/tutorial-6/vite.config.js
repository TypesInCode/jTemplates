import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      // Externalize jsdom to avoid build errors when nested in j-templates repo
      external: ["jsdom"],
    },
  },
});
