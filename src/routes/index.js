import { Router } from "express";
import productRoutes from "./productRoutes.js";
import serviceRoutes from "./serviceRoutes.js";
import promotionRoutes from "./promotionRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import eventRoutes from "./eventRoutes.js";
import leadRoutes from "./leadRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import portalConfigRoutes from "./portalConfigRoutes.js";
import ordersRoutes from "./ordersRoutes.js";
import adminAuthRoutes from "./adminAuthRoutes.js";

const router = Router();

router.use("/products", productRoutes);
router.use("/services", serviceRoutes);
router.use("/promotions", promotionRoutes);
router.use("/uploads", uploadRoutes);
router.use("/events", eventRoutes);
router.use("/leads", leadRoutes);
router.use("/payments", paymentRoutes);
router.use("/orders", ordersRoutes);
router.use("/portal-config", portalConfigRoutes);
router.use("/admin", adminAuthRoutes);

export default router;
