import jwt from "jsonwebtoken";

function getJwtSecret() {
  return process.env.ADMIN_JWT_SECRET || "portal-admin-secret";
}

export function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const headerToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const altHeaderToken = req.headers["x-admin-token"] || req.headers["x-access-token"];
  const token =
    headerToken ||
    (typeof altHeaderToken === "string" ? altHeaderToken : "") ||
    String(req.query.token || "");
  if (!token) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    jwt.verify(token, getJwtSecret());
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}
