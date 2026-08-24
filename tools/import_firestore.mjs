// Import dist/data/content.json into Firestore.
// Needs a service-account key at secrets/serviceAccount.json
// (Firebase console -> Project settings -> Service accounts -> Generate new private key)
// Usage: node tools/import_firestore.mjs [--force]   (--force overwrites docs already edited in adminos)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyPath = path.join(ROOT, "secrets", "serviceAccount.json");
if (!existsSync(keyPath)) {
  console.error(`Missing ${keyPath}\nFirebase console -> Project settings -> Service accounts -> "Generate new private key" -> save it there.`);
  process.exit(1);
}
const force = process.argv.includes("--force");
const data = JSON.parse(readFileSync(path.join(ROOT, "dist", "data", "content.json"), "utf8"));

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) });
const db = getFirestore();

async function upsert(col, id, doc) {
  const ref = db.collection(col).doc(id);
  const snap = await ref.get();
  if (snap.exists && snap.data().editedInAdmin && !force) return "skipped";
  await ref.set({ ...doc, updatedAt: FieldValue.serverTimestamp(), ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }) }, { merge: true });
  return snap.exists ? "updated" : "created";
}

const stats = {};
const tally = (r) => (stats[r] = (stats[r] || 0) + 1);

// settings/site
tally(await upsert("settings", "site", {
  languages: data.languages,
  defaultLanguage: "en",
  mediaBaseUrl: "https://clicksolutionspro.com/discloj/media/",
  title: { en: "Discover the Land of Jesus", it: "Scopri la Terra di Gesù", es: "Descubre la Tierra de Jesús", fr: "Découvre la Terre de Jésus", de: "Entdecke das Land Jesu" },
  subtitle: { en: "A multimedia journey through the Holy Land", it: "Un viaggio multimediale in Terra Santa", es: "Un viaje multimedia por Tierra Santa", fr: "Un voyage multimédia en Terre Sainte", de: "Eine multimediale Reise durch das Heilige Land" },
  credits: "by Fadi & Sami",
  cover: "cover.jpg",
  back: "back.jpg",
}));

// approximate map coordinates (editable in adminos)
const COORDS = { an: [32.702, 35.298], bk: [31.768, 35.160], cb: [31.705, 35.203], dj: [31.857, 35.444], ec: [32.747, 35.339], ft: [32.687, 35.390], gn: [32.632, 35.349], hk: [32.881, 35.575], kb: [32.881, 35.556], lt: [32.874, 35.549], mo: [31.778, 35.245], nz: [31.772, 35.230], ov: [31.779, 35.230], ue: [31.840, 35.135], vk: [31.778, 35.229], wt: [32.872, 35.545], xa: [31.779, 35.246], yd: [31.771, 35.229], zd: [31.780, 35.240] };
for (const p of data.places) { const c = COORDS[p.code] || []; tally(await upsert("places", p.code, { code: p.code, order: p.order, title: p.title, videoCode: p.videoCode, coverPhoto: p.coverPhoto, photoCount: p.photoCount, published: true, ...(c.length ? { lat: c[0], lng: c[1] } : {}) })); }

for (const ph of data.photos) {
  const { sourceBmp, ...doc } = ph;
  tally(await upsert("photos", ph.code, { ...doc, published: true }));
}

for (const v of data.videos) {
  const { sourceMpg, ...doc } = v;
  tally(await upsert("videos", v.code, { ...doc, published: true }));
}

// Static pages (privacy / disclaimer / about) — placeholders to be edited in adminos
const pages = {
  privacy: { en: "Privacy Policy", it: "Informativa sulla privacy", es: "Política de privacidad", fr: "Politique de confidentialité", de: "Datenschutzerklärung" },
  disclaimer: { en: "Disclaimer", it: "Avvertenze", es: "Aviso legal", fr: "Avertissement", de: "Haftungsausschluss" },
  about: { en: "About", it: "Chi siamo", es: "Acerca de", fr: "À propos", de: "Über uns" },
};
for (const [id, title] of Object.entries(pages)) {
  const body = {};
  for (const l of Object.keys(title)) body[l] = "";
  tally(await upsert("pages", id, { title, body, published: true }));
}

console.log("Import done:", stats);
