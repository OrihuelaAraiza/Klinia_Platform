export function makeFakeJwt({ email, role }) {
  const payload = {
    sub: email,
    email,
    role,
    iat: Date.now(),
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export default {
  makeFakeJwt,
};
