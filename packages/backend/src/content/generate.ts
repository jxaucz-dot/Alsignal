import { z } from "zod";
import { chatJson } from "../providers/llm.ts";
import { promptText } from "../editorial/prompts.ts";
import { addDraftVersion, createReview, getDraft } from "./drafts.ts";

const OUTPUT = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(500),
  body: z.string().min(1).max(30_000),
  coverPrompt: z.string().min(1).max(1_000),
});

const SYSTEM = promptText("draft-article");

export async function generateDraft(id: string, actor: string) {
  const draft = await getDraft(id);
  if (!draft) return null;
  const record = draft as any;
  const version = record.versions[0];
  const material = [
    `素材：\n${record.input_text}`,
    record.requested_direction ? `选题方向：${record.requested_direction}` : "",
    version?.title ? `已有标题：${version.title}` : "",
    version?.summary ? `已有摘要：${version.summary}` : "",
    version?.body ? `已有正文：${version.body}` : "",
  ].filter(Boolean).join("\n\n");
  const result = await chatJson({
    model: "default",
    purpose: "alsignal_draft_generation",
    subject: `draft:${id}`,
    promptVersion: "alsignal-draft-v1",
    system: SYSTEM,
    user: material,
    schema: OUTPUT,
    temperature: 0.3,
    maxTokens: 6000,
  });
  const next = await addDraftVersion(id, {
    title: result.data.title,
    summary: result.data.summary,
    body: result.data.body,
    coverPrompt: result.data.coverPrompt,
    model: result.model,
    promptVersion: "alsignal-draft-v1",
    sourceMaterial: { receiptId: result.receiptId, reused: result.reused, usage: result.usage },
  }, actor);
  if (!next) return null;
  const review = await createReview(id, actor);
  return { draft: next, review, model: result.model, receiptId: result.receiptId, reused: result.reused, usage: result.usage };
}
