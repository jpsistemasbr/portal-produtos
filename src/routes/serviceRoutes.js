import { Router } from "express";
import {
  listServices,
  getService,
  createService,
  updateService,
  deleteService
} from "../controllers/serviceController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.get("/", listServices);
router.get("/:id", getService);
router.post("/", requireAdmin, createService);
router.put("/:id", requireAdmin, updateService);
router.delete("/:id", requireAdmin, deleteService);

export default router;
