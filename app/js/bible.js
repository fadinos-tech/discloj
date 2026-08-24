// Gospel texts (public-domain translations) stored as data/bible/{lang}/{mt|mk|lk|jn}.json
import { SITE_ROOT } from "./store.js";
const cache = new Map();
export async function loadGospel(lang, g) {
  const key = lang + "/" + g;
  if (!cache.has(key)) cache.set(key, fetch(`${SITE_ROOT}data/bible/${lang}/${g}.json`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).catch((e) => { cache.delete(key); throw e; }));
  return cache.get(key);
}
// "2.1-11" | "2:1-11" | "19.17" -> {ch, from, to}
export function parseRef(r) {
  const m = /^\s*(\d+)\s*[.:]\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(r || "");
  if (!m) return null;
  const ch = +m[1], from = +m[2], to = m[3] ? +m[3] : from;
  return { ch, from, to: Math.max(from, to) };
}
export const splitRefs = (s) => String(s || "").split(";").map((x) => x.trim()).filter(Boolean);
export function passage(book, ref) {
  const p = parseRef(ref); if (!p) return null;
  const verses = book.chapters[p.ch - 1] || [];
  const out = [];
  for (let v = p.from; v <= p.to && v <= verses.length; v++) out.push({ n: v, text: verses[v - 1] });
  return { ...p, verses: out };
}
