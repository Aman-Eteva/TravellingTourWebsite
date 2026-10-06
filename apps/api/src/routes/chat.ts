import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { db } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { asyncRoute, HttpError } from "../http.js";
import { answerQuestion } from "../services/ai.js";
export const chatRoutes = Router();
chatRoutes.use(
  authenticate,
  rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
chatRoutes.get(
  "/conversations",
  asyncRoute(async (req, res) =>
    res.json(
      await db.chatConversation.findMany({
        where: { userId: req.auth!.id },
        orderBy: { updatedAt: "desc" },
      }),
    ),
  ),
);
chatRoutes.post(
  "/conversations",
  asyncRoute(async (req, res) =>
    res
      .status(201)
      .json(
        await db.chatConversation.create({ data: { userId: req.auth!.id } }),
      ),
  ),
);
// Ownership checks are repeated in each terminal handler; no caller-supplied identity is accepted.
chatRoutes.get(
  "/conversations/:id/messages",
  asyncRoute(async (req, res) => {
    const conversation = await db.chatConversation.findFirst({
      where: { id: req.params.id, userId: req.auth!.id },
    });
    if (!conversation) throw new HttpError(404, "Conversation not found.");
    res.json(
      await db.chatMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
      }),
    );
  }),
);
chatRoutes.delete(
  "/conversations/:id",
  asyncRoute(async (req, res) => {
    const result = await db.chatConversation.deleteMany({
      where: { id: req.params.id, userId: req.auth!.id },
    });
    if (!result.count) throw new HttpError(404, "Conversation not found.");
    res.json({ ok: true });
  }),
);
chatRoutes.post(
  "/conversations/:id/messages",
  asyncRoute(async (req, res) => {
    const { content } = z
      .object({ content: z.string().min(1).max(2000) })
      .parse(req.body);
    const conversation = await db.chatConversation.findFirst({
      where: { id: req.params.id, userId: req.auth!.id },
    });
    if (!conversation) throw new HttpError(404, "Conversation not found.");
    const answer = await answerQuestion(req.auth!.id, content);
    const messages = await db.$transaction([
      db.chatMessage.create({
        data: { conversationId: conversation.id, role: "user", content },
      }),
      db.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: answer.content,
          sources: answer.sources,
        },
      }),
      db.chatConversation.update({
        where: { id: conversation.id },
        data: {
          title:
            conversation.title === "New adventure"
              ? content.slice(0, 60)
              : conversation.title,
          updatedAt: new Date(),
        },
      }),
    ]);
    res.status(201).json(messages.slice(0, 2));
  }),
);
