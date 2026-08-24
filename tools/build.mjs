// Assemble the deployable site in dist/site/  (upload its CONTENTS to clicksolutionspro.com/discloj/ via FTP)
//   dist/site/            <- app/*  (index.html, js, css, icons, manifest, sw.js)
//   dist/site/adminos/    <- adminos/*
//   dist/site/data/       <- dist/data/content.json (local preview fallback + adminos import)
//   dist/site/media/      <- dist/media/* (photos, thumbs, videos, cover)   [--no-media to skip]
import { cpSync, mkdirSync, existsSync, statSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist", "site");
const noMedia = process.argv.includes("--no-media");
const newer = (src, dst) => !existsSync(dst) || statSync(src).mtimeMs > statSync(dst).mtimeMs;
function copyTree(src, dst) {
  if (!existsSync(src)) return 0; let n = 0;
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { mkdirSync(d, { recursive: true }); n += copyTree(s, d); }
    else if (newer(s, d)) { mkdirSync(path.dirname(d), { recursive: true }); copyFileSync(s, d); n++; }
  }
  return n;
}
mkdirSync(OUT, { recursive: true });
for (const d of ["js", "css", "icons"]) rmSync(path.join(OUT, d), { recursive: true, force: true });
let n = copyTree(path.join(ROOT, "app"), OUT);
rmSync(path.join(OUT, "adminos"), { recursive: true, force: true });
n += copyTree(path.join(ROOT, "adminos"), path.join(OUT, "adminos"));
n += copyTree(path.join(ROOT, "dist", "data"), path.join(OUT, "data"));
if (!noMedia) n += copyTree(path.join(ROOT, "dist", "media"), path.join(OUT, "media"));
console.log(`built dist/site (${n} files copied${noMedia ? ", media skipped" : ""})`);
