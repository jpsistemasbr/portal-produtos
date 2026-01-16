import { Router } from "express";
import { handleUpload, upload } from "../controllers/uploadController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.post("/", requireAdmin, upload.single("image"), handleUpload);

export default router;
