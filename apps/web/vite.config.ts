import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    fileURLToPath(new URL("../../", import.meta.url)),
    "",
  );
  return {
    plugins: [react(), tailwind()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            forms: ["react-hook-form", "zod", "@hookform/resolvers"],
            data: ["@tanstack/react-query", "axios"],
          },
        },
      },
    },
    server: {
      port:
        Number(new URL(env.CLIENT_URL || "http://localhost:5173").port) || 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target:
            env.API_PROXY_TARGET || `http://127.0.0.1:${env.PORT || 4000}`,
          changeOrigin: true,
        },
      },
    },
  };
});
