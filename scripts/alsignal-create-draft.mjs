const [direction, ...materialParts] = process.argv.slice(2);
const inputText = materialParts.join(" ").trim();
if (!inputText) {
  console.error("usage: node --env-file=.env scripts/alsignal-create-draft.mjs <direction> <material>");
  process.exit(2);
}
const base = (process.env.ALSIGNAL_API_URL || "http://127.0.0.1:3012").replace(/\/$/, "");
const token = process.env.ALSIGNAL_AUTOMATION_TOKEN || "";
const response = await fetch(`${base}/api/internal/drafts`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({ requestedDirection: direction || null, inputText, targetChannels: ["wechat"], generate: true }),
});
const responseBody = await response.text();
if (!response.ok) {
  console.error(responseBody.slice(0, 500));
  process.exit(1);
}
console.log(responseBody);
