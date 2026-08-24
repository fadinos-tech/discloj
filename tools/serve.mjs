// Tiny static server for local testing of dist/site: http://localhost:8080/  and  http://localhost:8080/adminos/   (run tools/build.mjs first)
import http from "node:http"; import { createReadStream, statSync, existsSync } from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "site");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8" };
const port = +(process.argv[2] || 8080);
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
  const size = statSync(f).size; const type = TYPES[path.extname(f).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;
  if (range) { const [s, e] = range.replace("bytes=", "").split("-"); const start = +s, end = e ? +e : size - 1; res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1 }); return createReadStream(f, { start, end }).pipe(res); }
  res.writeHead(200, { "Content-Type": type, "Content-Length": size, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" }); createReadStream(f).pipe(res);
}).listen(port, () => console.log(`serving ${ROOT} at http://localhost:${port}/  |  http://localhost:${port}/adminos/`));
