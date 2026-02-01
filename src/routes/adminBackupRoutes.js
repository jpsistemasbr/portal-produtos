import { Router } from "express";
import multer from "multer";
import os from "os";
import path from "path";
import { requireAdmin } from "../middleware/adminAuth.js";
import { downloadDatabase, restoreDatabase } from "../controllers/backupController.js";

const router = Router();
const upload = multer({
  dest: path.join(os.tmpdir(), "portal-produtos-backup"),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.get("/download", requireAdmin, downloadDatabase);
router.post("/restore", requireAdmin, upload.single("file"), restoreDatabase);

export default router;
