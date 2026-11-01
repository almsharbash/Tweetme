// Tweet me - message relay (Phase 1)
// Stateless-by-design store-and-forward node. It only sees ciphertext and recipient IDs.
// Run: node server.js [port]
const http = require("http");

const PORT = Number(process.argv[2]) || 8787;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;   // messages expire after 7 days
const MAX_QUEUE = 500;                     // max queued messages per recipient
const MAX_BODY = 64 * 1024;                // max request size

const inboxes = new Map(); // recipientId -> [{ blob, expires }]

function send(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(obj));
}

function prune() {
  const now = Date.now();
  for (const [id, list] of inboxes) {
    const alive = list.filter(m => m.expires > now);
    if (alive.length) inboxes.set(id, alive); else inboxes.delete(id);
  }
}
setInterval(prune, 60 * 60 * 1000).unref();

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, "http://x");

  if (req.method === "GET" && url.pathname === "/v1/health") {
    return send(res, 200, { ok: true, time: Date.now() });
  }

  if (req.method === "POST" && url.pathname === "/v1/send") {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > MAX_BODY) req.destroy(); else chunks.push(c); });
    req.on("end", () => {
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { return send(res, 400, { error: "bad json" }); }
      const to = body && body.to, blob = body && body.blob;
      if (typeof to !== "string" || !/^[a-z2-7]{16,64}$/.test(to)) return send(res, 400, { error: "bad recipient" });
      if (typeof blob !== "string" || blob.length === 0) return send(res, 400, { error: "bad blob" });
      const list = inboxes.get(to) || [];
      if (list.length >= MAX_QUEUE) return send(res, 429, { error: "inbox full" });
      list.push({ blob, expires: Date.now() + TTL_MS });
      inboxes.set(to, list);
      send(res, 200, { ok: true });
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/v1/inbox") {
    const id = url.searchParams.get("id") || "";
    if (!/^[a-z2-7]{16,64}$/.test(id)) return send(res, 400, { error: "bad id" });
    const now = Date.now();
    const list = (inboxes.get(id) || []).filter(m => m.expires > now);
    inboxes.delete(id); // deliver once
    return send(res, 200, { messages: list.map(m => m.blob) });
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`Tweet me relay listening on :${PORT}`));
