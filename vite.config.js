import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tanstack/react-router": path.resolve(__dirname, "./src/lib/react-router-compat.jsx"),
      "@tanstack/react-start": path.resolve(__dirname, "./src/lib/tanstack-start-shim.js"),
    },
  },
  server: {
    port: 5173,
  },
});
