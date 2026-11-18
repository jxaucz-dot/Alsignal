const [reviewId, decision, ...feedbackParts] = process.argv.slice(2);
if (!reviewId || !["approved", "changes_requested", "rejected"].includes(decision)) {
  console.error("usage: node --env-file=.env scripts/alsignal-review.mjs <review-id> <approved|changes_requested|rejected> [feedback]");
  process.exit(2);
}
const base = (process.env.ALSIGNAL_API_URL || process.env.SITE_URL || "http://localhost:3011").replace(/\/$/, "");
const token = process.env.ALSIGNAL_AUTOMATION_TOKEN || "";
const response = await fetch(`${base}/api/internal/drafts/reviews/${encodeURIComponent(reviewId)}/decision`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({ decision, feedback: feedbackParts.join(" ") || null }),
});
const responseBody = await response.text();
if (!response.ok) {
  console.error(responseBody.slice(0, 500));
  process.exit(1);
}
console.log(responseBody);
