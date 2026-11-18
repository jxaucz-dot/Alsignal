import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { decideReview, createPublishTasks } from "@aihot/backend/content/drafts";
import { param, body } from "./admin.ts";

function authorized(req: FastifyRequest): boolean {
  const expected = process.env.ALSIGNAL_AUTOMATION_TOKEN ?? "";
  const given = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "")?.[1]?.trim() ?? "";
  if (expected.length < 16 || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export function registerInternalDrafts(app: FastifyInstance) {
  app.post("/api/internal/drafts/reviews/:id/decision", async (req, reply) => {
    if (!authorized(req)) return reply.code(401).send({ ok: false, error: "Unauthorized" });
    const b = body<{ decision: "approved" | "changes_requested" | "rejected"; feedback?: string | null }>(req);
    if (!["approved", "changes_requested", "rejected"].includes(b.decision)) return reply.code(400).send({ ok: false, error: "invalid decision" });
    const review = await decideReview(param(req, "id"), b.decision, b.feedback ?? null, "agent-autoloop");
    if (!review) return reply.code(404).send({ ok: false, error: "review not found" });
    const tasks = b.decision === "approved" ? await createPublishTasks(review.draft_id, "agent-autoloop") : null;
    return { ok: true, review, tasks };
  });
}
