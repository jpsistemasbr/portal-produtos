import fs from "fs/promises";
import path from "path";
import { sequelize } from "../models/index.js";

const dbPath = path.resolve(process.env.DATABASE_PATH || "./data/app.db");

export async function downloadDatabase(_req, res) {
  try {
    await fs.access(dbPath);
    res.download(dbPath, "portal-produtos.sqlite");
  } catch (error) {
    console.error("[backup] download failed", error);
    res.status(404).json({ error: "database_not_found" });
  }
}

export async function restoreDatabase(req, res) {
  if (!req.file?.path) {
    return res.status(400).json({ error: "missing_file" });
  }

  try {
    await fs.copyFile(req.file.path, dbPath);
    return res.status(200).json({ ok: true, restartRequired: true });
  } catch (error) {
    console.error("[backup] restore failed", error);
    return res.status(500).json({ error: "restore_failed", details: error?.message });
  } finally {
    await fs.unlink(req.file.path).catch(() => null);
  }
}
