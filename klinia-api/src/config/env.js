import dotenv from "dotenv";

dotenv.config();

const DEFAULT_PORT = 8080;
const DEFAULT_ALLOW_ORIGIN = "http://localhost:5173";
const DEFAULT_MIN_DELAY = 150;
const DEFAULT_MAX_DELAY = 350;

export const env = {
  port: Number(process.env.PORT) || DEFAULT_PORT,
  allowOrigin: process.env.ALLOW_ORIGIN || DEFAULT_ALLOW_ORIGIN,
  minDelayMs: Number(process.env.MIN_DELAY_MS) || DEFAULT_MIN_DELAY,
  maxDelayMs: Number(process.env.MAX_DELAY_MS) || DEFAULT_MAX_DELAY,
};

if (env.minDelayMs > env.maxDelayMs) {
  const swap = env.minDelayMs;
  env.minDelayMs = env.maxDelayMs;
  env.maxDelayMs = swap;
}

export default env;
