import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PortalConfig } from "../models/index.js";

const DEFAULT_EMAIL = "admin@catalogo.com";
const DEFAULT_PASSWORD = "142536";

function getJwtSecret() {
  return process.env.ADMIN_JWT_SECRET || "portal-admin-secret";
}

async function ensureAdminConfig() {
  let config = await PortalConfig.findOne();
  if (!config) {
    config = await PortalConfig.create({ adminEmail: DEFAULT_EMAIL });
  }
  if (!config.adminEmail) {
    await config.update({ adminEmail: DEFAULT_EMAIL });
  }
  if (!config.adminPasswordHash) {
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await config.update({ adminPasswordHash: hash });
  }
  return config;
}

export async function loginAdmin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "missing_credentials" });
  }
  const config = await ensureAdminConfig();
  const validEmail = String(email).trim().toLowerCase() === String(config.adminEmail).trim().toLowerCase();
  if (!validEmail) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  const matches = await bcrypt.compare(String(password), config.adminPasswordHash || "");
  if (!matches) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  const token = jwt.sign(
    { role: "admin", email: config.adminEmail },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
  res.json({ token, email: config.adminEmail });
}
