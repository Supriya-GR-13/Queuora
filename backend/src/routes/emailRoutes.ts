import { Router } from "express";
import {
  scheduleEmail,
  getEmails,
} from "../controllers/emailController";

const router = Router();

router.get("/", getEmails);
router.post("/schedule", scheduleEmail);

export default router;