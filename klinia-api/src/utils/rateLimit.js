import { loginBuckets } from "../store/memory.js";
import { env } from "../config/env.js";

export function getBucketKey(email, ip) {
  return `${String(email || "").toLowerCase()}|${ip || "0.0.0.0"}`;
}

export function onLoginFail(email, ip) {
  const key = getBucketKey(email, ip);
  const now = Date.now();
  const bucket = loginBuckets.get(key) || {
    fails: 0,
    firstAt: now,
    lockedUntil: 0,
  };

  const windowMs = Number(env.AUTH_WINDOW_MS);

  if (now - bucket.firstAt > windowMs) {
    bucket.fails = 0;
    bucket.firstAt = now;
    bucket.lockedUntil = 0;
  }

  bucket.fails += 1;

  if (bucket.fails >= Number(env.AUTH_MAX_ATTEMPTS)) {
    bucket.lockedUntil = now + Number(env.AUTH_COOLDOWN_MS);
  }

  loginBuckets.set(key, bucket);
  return bucket;
}

export function onLoginSuccess(email, ip) {
  loginBuckets.delete(getBucketKey(email, ip));
}

export function isLocked(email, ip) {
  const bucket = loginBuckets.get(getBucketKey(email, ip));
  if (!bucket) {
    return { locked: false, ms: 0 };
  }
  const now = Date.now();
  if (bucket.lockedUntil && now < bucket.lockedUntil) {
    return { locked: true, ms: bucket.lockedUntil - now };
  }
  return { locked: false, ms: 0 };
}

export default {
  getBucketKey,
  onLoginFail,
  onLoginSuccess,
  isLocked,
};
