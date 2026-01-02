export function getEffectiveProfessionalId(req) {
  const user = req.user;
  if (!user) return null;

  if (user.role === "ASSISTANT") {
    return user.delegatedById || null;
  }

  return user.id;
}