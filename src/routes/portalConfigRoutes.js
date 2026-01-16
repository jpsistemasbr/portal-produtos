import { Router } from "express";
import { getPortalConfig, getPortalConfigAdmin, updatePortalConfig } from "../controllers/portalConfigController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.get("/", getPortalConfig);
router.get("/admin", requireAdmin, getPortalConfigAdmin);
router.put("/", requireAdmin, updatePortalConfig);

export default router;
