import { Router } from "express";
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.get("/", listProducts);
router.get("/:id", getProduct);
router.post("/", requireAdmin, createProduct);
router.put("/:id", requireAdmin, updateProduct);
router.delete("/:id", requireAdmin, deleteProduct);

export default router;
