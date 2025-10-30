import env from "../config/env.js";

function randomDelayMs(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function delayMiddleware(req, res, next) {
  const { minDelayMs, maxDelayMs } = env;
  const delay = randomDelayMs(minDelayMs, maxDelayMs);
  setTimeout(next, delay);
}

export default delayMiddleware;
