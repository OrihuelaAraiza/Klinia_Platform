export function makeFakeJwt(payload = {}) {
  const data = {
    ...payload,
    iat: Date.now(),
  };
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export default {
  makeFakeJwt,
};
