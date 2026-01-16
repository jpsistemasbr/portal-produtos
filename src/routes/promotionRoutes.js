import { Router } from "express";
import {
  listPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion
} from "../controllers/promotionController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.get("/", listPromotions);
router.get("/:id", getPromotion);
router.post("/", requireAdmin, createPromotion);
router.put("/:id", requireAdmin, updatePromotion);
router.delete("/:id", requireAdmin, deletePromotion);

export default router;
