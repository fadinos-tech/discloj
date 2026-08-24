// Assemble the native web bundle for Capacitor in dist/native-www/
// (the app shell + offline Bible + content fallback; media streams from the production site)
import { mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist", "native-www");
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
cpSync(path.join(ROOT, "app"), OUT, { recursive: true, filter: (s) => !s.endsWith(".htaccess") && !s.endsWith("sw.js") });
cpSync(path.join(ROOT, "dist", "data"), path.join(OUT, "data"), { recursive: true });
console.log("built dist/native-www");
