import { PortalConfig } from "../models/index.js";

export async function ensurePortalConfig() {
  const exists = await PortalConfig.findOne();
  if (exists) return;
  await PortalConfig.create({});
}
