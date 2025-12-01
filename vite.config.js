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
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
