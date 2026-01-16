import { Router } from "express";
import { listOrdersAdmin, markOrderPaid, getOrderStatus, getOrderPublic, deleteOrder } from "../controllers/orderController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.get("/admin", requireAdmin, listOrdersAdmin);
router.get("/status", getOrderStatus);
router.get("/public/:id", getOrderPublic);
router.put("/:id/paid", requireAdmin, markOrderPaid);
router.delete("/:id", requireAdmin, deleteOrder);

export default router;
