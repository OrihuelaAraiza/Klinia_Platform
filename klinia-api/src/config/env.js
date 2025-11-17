import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DEFAULT_PORT = 4000;
const DEFAULT_ALLOW_ORIGIN = "http://localhost:5173";
const DEFAULT_MIN_DELAY = 150;
const DEFAULT_MAX_DELAY = 350;
const DEFAULT_AUTH_MAX_ATTEMPTS = 5;
const DEFAULT_AUTH_WINDOW_MS = 600_000;
const DEFAULT_AUTH_COOLDOWN_MS = 120_000;

export const env = {
  port: Number(process.env.PORT) || DEFAULT_PORT,
  allowOrigin: process.env.ALLOW_ORIGIN || DEFAULT_ALLOW_ORIGIN,
  minDelayMs: Number(process.env.MIN_DELAY_MS) || DEFAULT_MIN_DELAY,
  maxDelayMs: Number(process.env.MAX_DELAY_MS) || DEFAULT_MAX_DELAY,
  AUTH_MAX_ATTEMPTS:
    Number(process.env.AUTH_MAX_ATTEMPTS) || DEFAULT_AUTH_MAX_ATTEMPTS,
  AUTH_WINDOW_MS: Number(process.env.AUTH_WINDOW_MS) || DEFAULT_AUTH_WINDOW_MS,
  AUTH_COOLDOWN_MS:
    Number(process.env.AUTH_COOLDOWN_MS) || DEFAULT_AUTH_COOLDOWN_MS,

  AZURE_DOCINTEL_ENDPOINT: process.env.AZURE_DOCINTEL_ENDPOINT,
  AZURE_DOCINTEL_KEY: process.env.AZURE_DOCINTEL_KEY,
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
  AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME,
  AZURE_FACE_ENDPOINT: process.env.AZURE_FACE_ENDPOINT,
  AZURE_FACE_KEY: process.env.AZURE_FACE_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID,
  JWT_SECRET: process.env.JWT_SECRET,
};

if (env.minDelayMs > env.maxDelayMs) {
  const swap = env.minDelayMs;
  env.minDelayMs = env.maxDelayMs;
  env.maxDelayMs = swap;
}

export default env;
