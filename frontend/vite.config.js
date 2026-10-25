import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En développement, les appels /api sont redirigés vers le backend Django.
// `npm run build` génère l'application dans backend/frontend_dist (servie par Django en production).
export default defineConfig({
  plugins: [react()],
  build: { outDir: "../backend/frontend_dist", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
