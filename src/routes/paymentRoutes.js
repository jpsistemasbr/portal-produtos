import { Router } from "express";
import {
  createPix,
  createCardPreference,
  createCardCharge,
  handleWebhook,
  checkPaymentStatus
} from "../controllers/paymentController.js";

const router = Router();

router.post("/pix", createPix);
router.post("/card-preference", createCardPreference);
router.post("/card-charge", createCardCharge);
router.post("/check-status", checkPaymentStatus);
router.post("/mercadopago", handleWebhook);

export default router;
