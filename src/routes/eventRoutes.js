import { Router } from "express";
import {
  createEvent,
  summary,
  listEvents,
  metrics,
  groupedEvents,
  deleteEvents,
  deleteAllEvents
} from "../controllers/eventController.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.post("/", createEvent);
router.get("/summary", summary);
router.get("/", listEvents);
router.get("/metrics", metrics);
router.get("/grouped", groupedEvents);
router.delete("/all", requireAdmin, deleteAllEvents);
router.delete("/", requireAdmin, deleteEvents);

export default router;
