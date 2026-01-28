import fs from "fs";
import path from "path";

const uploadsDir = path.join(process.cwd(), "public", "uploads");

export function removeUploadFile(url) {
  if (!url || typeof url !== "string") return;
  let target = url;
  if (target.startsWith("http://") || target.startsWith("https://")) {
    try {
      const parsed = new URL(target);
      target = parsed.pathname || "";
    } catch {
      return;
    }
  }
  if (!target.startsWith("/uploads/")) return;
  const safePath = path
    .normalize(target)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/^[/\\]+/, "");
  const filePath = path.join(process.cwd(), "public", safePath);
  if (!filePath.startsWith(uploadsDir)) return;
  fs.promises.unlink(filePath).catch(() => {});
}
