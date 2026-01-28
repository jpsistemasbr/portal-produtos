import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";

const uploadsDir = path.join(process.cwd(), "public", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safeName}`;
    cb(null, unique);
  }
});

function fileFilter(_req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("invalid_file_type"));
  }
}

export const upload = multer({ storage, fileFilter });

export async function handleUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "missing_file" });
  }
  try {
    const parsed = path.parse(req.file.filename);
    const webpName = `${parsed.name}.webp`;
    const webpPath = path.join(uploadsDir, webpName);
    try {
      await sharp(req.file.path).webp({ quality: 82 }).toFile(webpPath);
      await fs.promises.unlink(req.file.path).catch(() => {});
      const url = `/uploads/${webpName}`;
      return res.json({ url });
    } catch (err) {
      // Fallback: keep original file if sharp/libvips is unavailable in production.
      const url = `/uploads/${req.file.filename}`;
      return res.json({ url, warning: "webp_unavailable" });
    }
  } catch (err) {
    res.status(500).json({ error: "upload_failed" });
  }
}
