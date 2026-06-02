import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const APP_VERSION =
  process.env.VITE_APP_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "dev";
const APP_COMMIT_MESSAGE =
  process.env.VITE_APP_COMMIT_MESSAGE ||
  process.env.VERCEL_GIT_COMMIT_MESSAGE ||
  "";
const VERCEL_ENV = process.env.VITE_VERCEL_ENV || process.env.VERCEL_ENV || "";

process.env.VITE_APP_VERSION = APP_VERSION;
process.env.VITE_APP_COMMIT_MESSAGE = APP_COMMIT_MESSAGE;
process.env.VITE_VERCEL_ENV = VERCEL_ENV;

// Klinia_Platform es exclusivamente el frontend de ROMI Clínica (salud mental).
// El frontend de tanatología vive en /Users/salieri/Documents/romi/Romi_Tanato_Front.
const PROXY_TARGET = process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:4000";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: PROXY_TARGET,
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/api-dipomex': {
        target: 'https://api.tau.com.mx/dipomex/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-dipomex/, ''),
      },
    },
  },
});
