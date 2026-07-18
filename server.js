/* ============================================================
   Style Studio — tiny zero-dependency Node server
   - Serves the studio (public/)
   - Saves & loads designs as JSON files on a persistent disk
   On Railway: attach a Volume and it is mounted at
   RAILWAY_VOLUME_MOUNT_PATH (commonly /data). We read that env
   var and fall back to /data, then to ./data for local dev.
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

/* ---- where saved designs live ---- */
function resolveDataDir() {
  const candidates = [
    process.env.RAILWAY_VOLUME_MOUNT_PATH, // Railway sets this to the volume mount
    process.env.DATA_DIR,                  // manual override
    "/data",                               // conventional volume path
    path.join(__dirname, "data"),          // local dev fallback
  ].filter(Boolean);
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      // confirm writable
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch (_) { /* try next */ }
  }
  // last resort: temp
  const tmp = path.join(require("os").tmpdir(), "style-studio-data");
  fs.mkdirSync(tmp, { recursive: true });
  return tmp;
}
const DATA_DIR = resolveDataDir();
const DESIGNS_DIR = path.join(DATA_DIR, "designs");
fs.mkdirSync(DESIGNS_DIR, { recursive: true });
console.log("[style-studio] saving designs to:", DESIGNS_DIR);

/* ---- static file serving ---- */
const PUBLIC_DIR = path.join(__dirname, "public");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
};

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}
function safeId(id) { return String(id).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64); }
function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = "", size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("payload too large")); req.destroy(); return; }
      data += c;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

/* ---- designs API ----
   GET    /api/designs        -> list (metadata only)
   GET    /api/designs/:id    -> full design
   POST   /api/designs        -> create/update {id?, name, state, thumb}
   DELETE /api/designs/:id    -> remove
*/
async function handleApi(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean); // ["api","designs", id?]
  const id = parts[2] ? safeId(parts[2]) : null;

  if (req.method === "GET" && !id) {
    const files = fs.existsSync(DESIGNS_DIR) ? fs.readdirSync(DESIGNS_DIR).filter((f) => f.endsWith(".json")) : [];
    const list = files.map((f) => {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(DESIGNS_DIR, f), "utf-8"));
        return { id: d.id, name: d.name, thumb: d.thumb, updated: d.updated };
      } catch (_) { return null; }
    }).filter(Boolean).sort((a, b) => (b.updated || 0) - (a.updated || 0));
    return sendJSON(res, 200, { designs: list });
  }

  if (req.method === "GET" && id) {
    const f = path.join(DESIGNS_DIR, id + ".json");
    if (!fs.existsSync(f)) return sendJSON(res, 404, { error: "not found" });
    return sendJSON(res, 200, JSON.parse(fs.readFileSync(f, "utf-8")));
  }

  if (req.method === "POST" && !id) {
    let payload;
    try { payload = JSON.parse(await readBody(req)); }
    catch (e) { return sendJSON(res, 400, { error: "bad json" }); }
    const design = {
      id: payload.id ? safeId(payload.id) : "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: String(payload.name || "Untitled").slice(0, 80),
      state: payload.state || {},
      thumb: typeof payload.thumb === "string" ? payload.thumb.slice(0, 400000) : "",
      updated: Date.now(),
    };
    fs.writeFileSync(path.join(DESIGNS_DIR, design.id + ".json"), JSON.stringify(design));
    return sendJSON(res, 200, { id: design.id, name: design.name, thumb: design.thumb, updated: design.updated });
  }

  if (req.method === "DELETE" && id) {
    const f = path.join(DESIGNS_DIR, id + ".json");
    if (fs.existsSync(f)) fs.unlinkSync(f);
    return sendJSON(res, 200, { ok: true });
  }

  return sendJSON(res, 405, { error: "method not allowed" });
}

/* ---- static handler ---- */
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      // SPA-ish fallback to index for unknown non-api routes
      return fs.readFile(path.join(PUBLIC_DIR, "index.html"), (e2, idx) => {
        if (e2) { res.writeHead(404); return res.end("not found"); }
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        res.end(idx);
      });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/healthz") return sendJSON(res, 200, { ok: true, dataDir: DATA_DIR });
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url).catch((e) => sendJSON(res, 500, { error: String(e.message || e) }));
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, () => console.log(`[style-studio] listening on :${PORT}`));
