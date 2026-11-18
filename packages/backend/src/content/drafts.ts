import { newUuid } from "../lib/ids.ts";
import { sql } from "../db.ts";

export type DraftInput = {
  sourceArticleId?: string | null;
  sourceUrl?: string | null;
  inputText: string;
  requestedDirection?: string | null;
  targetChannels?: string[];
  title?: string;
  summary?: string;
  body?: string;
  coverPrompt?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  sourceMaterial?: unknown;
};

const channels = new Set(["wechat", "x", "feishu"]);
function checkChannels(values: string[]) {
  if (values.some((value) => !channels.has(value))) throw Object.assign(new Error("unsupported target channel"), { statusCode: 400 });
}

export async function createDraft(input: DraftInput, actor: string) {
  const targetChannels = input.targetChannels ?? ["wechat"];
  checkChannels(targetChannels);
  const id = newUuid();
  const [draft] = await sql.begin(async (tx) => {
    const [created] = await tx`
      INSERT INTO content_drafts (id, source_article_id, source_url, input_text, requested_direction, target_channels, created_by)
      VALUES (${id}, ${input.sourceArticleId ?? null}, ${input.sourceUrl ?? null}, ${input.inputText}, ${input.requestedDirection ?? null}, ${targetChannels}, ${actor})
      RETURNING id, source_article_id, source_url, input_text, requested_direction, target_channels, status, current_version, created_by, created_at, updated_at`;
    await tx`
      INSERT INTO draft_versions (draft_id, version, title, summary, body, cover_prompt, model, prompt_version, source_material, created_by)
      VALUES (${id}, 1, ${input.title ?? ""}, ${input.summary ?? ""}, ${input.body ?? ""}, ${input.coverPrompt ?? null}, ${input.model ?? null}, ${input.promptVersion ?? null}, ${sql.json((input.sourceMaterial ?? {}) as never)}, ${actor})`;
    await tx`UPDATE content_drafts SET current_version = 1, updated_at = now() WHERE id = ${id}`;
    return [created];
  });
  return getDraft(draft.id);
}

export async function listDrafts(status?: string) {
  return sql`
    SELECT d.*, v.title, v.summary, v.body, v.cover_prompt, v.model, v.prompt_version, v.created_at AS version_created_at
    FROM content_drafts d
    LEFT JOIN draft_versions v ON v.draft_id = d.id AND v.version = d.current_version
    WHERE (${status ?? null} IS NULL OR d.status = ${status ?? null})
    ORDER BY d.updated_at DESC LIMIT 100`;
}

export async function getDraft(id: string) {
  const [draft] = await sql`SELECT * FROM content_drafts WHERE id = ${id}`;
  if (!draft) return null;
  const versions = await sql`SELECT * FROM draft_versions WHERE draft_id = ${id} ORDER BY version DESC`;
  const reviews = await sql`SELECT * FROM review_tasks WHERE draft_id = ${id} ORDER BY created_at DESC`;
  const publishes = await sql`SELECT * FROM publish_tasks WHERE draft_id = ${id} ORDER BY created_at DESC`;
  return { ...draft, versions, reviews, publishes };
}

export async function addDraftVersion(id: string, input: Omit<DraftInput, "inputText" | "targetChannels">, actor: string) {
  const result = await sql.begin(async (tx) => {
    const [draft] = await tx`SELECT current_version FROM content_drafts WHERE id = ${id} FOR UPDATE`;
    if (!draft) return null;
    const version = Number(draft.current_version) + 1;
    await tx`
      INSERT INTO draft_versions (draft_id, version, title, summary, body, cover_prompt, model, prompt_version, source_material, created_by)
      VALUES (${id}, ${version}, ${input.title ?? ""}, ${input.summary ?? ""}, ${input.body ?? ""}, ${input.coverPrompt ?? null}, ${input.model ?? null}, ${input.promptVersion ?? null}, ${sql.json((input.sourceMaterial ?? {}) as never)}, ${actor})`;
    await tx`UPDATE content_drafts SET current_version = ${version}, status = 'review', updated_at = now() WHERE id = ${id}`;
    return version;
  });
  if (result === null) return null;
  return getDraft(id);
}

export async function createReview(id: string, actor: string) {
  const [draft] = await sql`SELECT current_version, input_text, requested_direction, target_channels FROM content_drafts WHERE id = ${id}`;
  if (!draft) return null;
  const reviewId = newUuid();
  const [review] = await sql`
    INSERT INTO review_tasks (id, draft_id, version, reviewer) VALUES (${reviewId}, ${id}, ${draft.current_version}, ${actor})
    RETURNING *`;
  await sql`UPDATE content_drafts SET status = 'review', updated_at = now() WHERE id = ${id}`;
  await notifyReviewOpened({ reviewId, draftId: id, version: Number(draft.current_version), inputText: draft.input_text, direction: draft.requested_direction, channels: draft.target_channels });
  return review;
}

async function notifyReviewOpened(input: { reviewId: string; draftId: string; version: number; inputText: string; direction: string | null; channels: string[] }) {
  const base = process.env.AGENT_AUTOLOOP_URL?.replace(/\/$/, "");
  const key = process.env.AGENT_AUTOLOOP_SOURCE_KEY;
  if (!base || !key) return;
  const detail = JSON.stringify({ reviewId: input.reviewId, draftId: input.draftId, version: input.version, direction: input.direction, channels: input.channels, inputText: input.inputText.slice(0, 3500) });
  try {
    const response = await fetch(`${base}/v1/events`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ id: `alsignal-review:${input.reviewId}`, type: "alsignal.draft.review", subject: input.draftId, summary: `Alsignal 草稿 ${input.draftId} 等待审核`, detail }),
    });
    if (!response.ok) console.warn(JSON.stringify({ level: "warn", msg: "alsignal review event rejected", status: response.status }));
  } catch (error) {
    console.warn(JSON.stringify({ level: "warn", msg: "alsignal review event failed", error: String(error) }));
  }
}

export async function decideReview(reviewId: string, decision: "approved" | "changes_requested" | "rejected", feedback: string | null, actor: string) {
  const [review] = await sql`SELECT draft_id FROM review_tasks WHERE id = ${reviewId}`;
  if (!review) return null;
  const nextStatus = decision === "approved" ? "approved" : decision === "changes_requested" ? "review" : "rejected";
  const [updated] = await sql.begin(async (tx) => {
    const [row] = await tx`UPDATE review_tasks SET status = ${decision}, reviewer = ${actor}, decision = ${decision}, feedback = ${feedback}, decided_at = now(), updated_at = now() WHERE id = ${reviewId} RETURNING *`;
    await tx`UPDATE content_drafts SET status = ${nextStatus}, updated_at = now() WHERE id = ${review.draft_id}`;
    return [row];
  });
  return updated;
}

export async function createPublishTasks(id: string, actor: string) {
  const [draft] = await sql`SELECT current_version, status, target_channels FROM content_drafts WHERE id = ${id}`;
  if (!draft) return null;
  if (draft.status !== "approved") throw Object.assign(new Error("draft must be approved before publishing"), { statusCode: 409 });
  const tasks = [];
  for (const channel of draft.target_channels as string[]) {
    checkChannels([channel]);
    const taskId = newUuid();
    const [task] = await sql`
      INSERT INTO publish_tasks (id, draft_id, version, channel) VALUES (${taskId}, ${id}, ${draft.current_version}, ${channel})
      ON CONFLICT DO NOTHING RETURNING *`;
    if (task) tasks.push(task);
  }
  await sql`UPDATE content_drafts SET status = 'publishing', updated_at = now() WHERE id = ${id}`;
  return { actor, tasks };
}
