export function requireAuth(req, res, next) {
  if (!req.session.user)
    return res.status(401).json({ error: "Not logged in" });
  next();
}
export function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
}
