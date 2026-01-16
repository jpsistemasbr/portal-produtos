import fs from "fs";
import path from "path";

const uploadsDir = path.join(process.cwd(), "public", "uploads");

export function removeUploadFile(url) {
  if (!url || typeof url !== "string") return;
  if (!url.startsWith("/uploads/")) return;
  const safePath = path
    .normalize(url)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");
  const filePath = path.join(process.cwd(), "public", safePath);
  if (!filePath.startsWith(uploadsDir)) return;
  fs.promises.unlink(filePath).catch(() => {});
}
