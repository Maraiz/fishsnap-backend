import express from "express";
import { chatWithGroq } from "../controllers/GroqChatController.js";
import { verifyToken } from "../middleware/VerifyToken.js";

const router = express.Router();

router.post("/chat", verifyToken, chatWithGroq);

export default router;
