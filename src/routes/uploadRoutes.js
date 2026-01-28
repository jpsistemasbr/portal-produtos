import { Router } from "express";
import { handleUpload, upload } from "../controllers/uploadController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

function uploadSingle(req, res, next) {
  const handler = upload.single("image");
  handler(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: "invalid_file" });
    }
    return next();
  });
}

router.post("/", requireAdmin, uploadSingle, handleUpload);

export default router;
