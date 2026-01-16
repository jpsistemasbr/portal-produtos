import { Router } from "express";
import { createLead, deleteAllLeads, deleteLead, listLeads } from "../controllers/leadController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.get("/", listLeads);
router.post("/", createLead);
router.delete("/", requireAdmin, deleteAllLeads);
router.delete("/:id", requireAdmin, deleteLead);

export default router;
