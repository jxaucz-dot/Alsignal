import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { actorOf } from "@aihot/backend/admin/auth";
import { addDraftVersion, createDraft, createPublishTasks, createReview, decideReview, getDraft, listDrafts } from "@aihot/backend/content/drafts";
import { generateDraft } from "@aihot/backend/content/generate";
import { adminHandler } from "./admin-auth.ts";
import { body, param, q, orNotFound } from "./admin.ts";

const draft = z.object({
  sourceArticleId: z.string().nullable().optional(), sourceUrl: z.string().url().nullable().optional(), inputText: z.string().min(1),
  requestedDirection: z.string().nullable().optional(), targetChannels: z.array(z.enum(["wechat", "x", "feishu"])).optional(),
  title: z.string().optional(), summary: z.string().optional(), body: z.string().optional(), coverPrompt: z.string().nullable().optional(),
  model: z.string().nullable().optional(), promptVersion: z.string().nullable().optional(), sourceMaterial: z.unknown().optional(),
});
const version = draft.omit({ inputText: true, targetChannels: true }).extend({ title: z.string().optional(), summary: z.string().optional(), body: z.string().optional() });

export function registerDrafts(app: FastifyInstance) {
  app.get("/api/admin/drafts", adminHandler(async (req) => listDrafts(q(req).status)));
  app.get("/api/admin/drafts/:id", adminHandler(async (req, reply) => orNotFound(req, reply, await getDraft(param(req, "id")))));
  app.post("/api/admin/drafts", adminHandler(async (req, _reply, admin) => createDraft(draft.parse(body(req)), actorOf(admin))));
  app.post("/api/admin/drafts/:id/versions", adminHandler(async (req, reply, admin) => orNotFound(req, reply, await addDraftVersion(param(req, "id"), version.parse(body(req)), actorOf(admin)))));
  app.post("/api/admin/drafts/:id/generate", adminHandler(async (req, reply, admin) => orNotFound(req, reply, await generateDraft(param(req, "id"), actorOf(admin)))));
  app.post("/api/admin/drafts/:id/reviews", adminHandler(async (req, reply, admin) => orNotFound(req, reply, await createReview(param(req, "id"), actorOf(admin)))));
  app.post("/api/admin/reviews/:id/decision", adminHandler(async (req, reply, admin) => {
    const b = z.object({ decision: z.enum(["approved", "changes_requested", "rejected"]), feedback: z.string().nullable().optional() }).parse(body(req));
    return orNotFound(req, reply, await decideReview(param(req, "id"), b.decision, b.feedback ?? null, actorOf(admin)));
  }));
  app.post("/api/admin/drafts/:id/publish", adminHandler(async (req, reply, admin) => orNotFound(req, reply, await createPublishTasks(param(req, "id"), actorOf(admin)))));
}
