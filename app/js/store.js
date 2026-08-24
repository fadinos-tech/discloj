// Live content store: mirrors Firestore collections and notifies views on change.
import { db, collection, doc, onSnapshot, query, orderBy } from "./firebase.js";

// Site root = parent of the js/ folder (works for the app at /discloj/ and for /discloj/adminos/ alike)
export const SITE_ROOT = new URL("../", import.meta.url).href;
const LOCAL_MEDIA = SITE_ROOT + "media/";
// Native app (Capacitor wrapper): the web assets are bundled on the device, media streams from the site
export const IS_NATIVE = !!(globalThis.Capacitor && globalThis.Capacitor.isNativePlatform && globalThis.Capacitor.isNativePlatform());
const PROD_MEDIA = "https://clicksolutionspro.com/discloj/media/";

export const store = {
  ready: false,
  settings: null,
  places: [],
  photos: [],
  videos: [],
  pages: {},
  _listeners: new Set(),
  _pending: 4,
};

export function subscribe(fn) { store._listeners.add(fn); return () => store._listeners.delete(fn); }
function emit() { for (const fn of store._listeners) { try { fn(store); } catch (e) { console.error(e); } } }
function loaded() { if (store._pending > 0) store._pending--; if (store._pending === 0) store.ready = true; emit(); }

const IS_LOCAL = !IS_NATIVE && (location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname));

// Local preview fallback: when Firestore is unreachable/denied on localhost, read dist/data/content.json directly
let localLoaded = false;
async function loadLocal(reason) {
  if (localLoaded || (!IS_LOCAL && !IS_NATIVE)) return; localLoaded = true;
  try {
    const data = await (await fetch(SITE_ROOT + "data/content.json")).json();
    console.warn("Using local content.json (" + reason + ")");
    store.settings = store.settings && Object.keys(store.settings).length ? store.settings : { languages: data.languages, title: { en: "Discover the Land of Jesus" }, cover: "cover.jpg", mediaBaseUrl: IS_NATIVE ? PROD_MEDIA : LOCAL_MEDIA };
    if (!store.places.length) store.places = data.places.map((p) => ({ id: p.code, ...p }));
    if (!store.photos.length) store.photos = data.photos.map((p) => ({ id: p.code, ...p }));
    if (!store.videos.length) store.videos = data.videos.map((v) => ({ id: v.code, ...v }));
    store.ready = true; emit();
  } catch (e) { console.error("local content.json failed", e); }
}

let showAll = false;
const visible = (p) => showAll || p.published !== false;
export function startStore(opts = {}) {
  showAll = !!opts.all;
  if (IS_LOCAL || IS_NATIVE) setTimeout(() => { if (!store.places.length) loadLocal("timeout"); }, 4000);
  onSnapshot(doc(db, "settings", "site"), (s) => { store.settings = s.exists() ? s.data() : {}; loaded(); }, (e) => { console.error("settings", e); store.settings = {}; loaded(); loadLocal(e.code); });
  onSnapshot(query(collection(db, "places"), orderBy("order")), (qs) => { store.places = qs.docs.map((d) => ({ id: d.id, ...d.data() })).filter(visible); loaded(); }, (e) => { console.error("places", e); loaded(); loadLocal(e.code); });
  onSnapshot(query(collection(db, "photos"), orderBy("code")), (qs) => { store.photos = qs.docs.map((d) => ({ id: d.id, ...d.data() })).filter(visible); loaded(); }, (e) => { console.error("photos", e); loaded(); });
  onSnapshot(query(collection(db, "videos"), orderBy("order")), (qs) => { store.videos = qs.docs.map((d) => ({ id: d.id, ...d.data() })).filter(visible); loaded(); }, (e) => { console.error("videos", e); loaded(); });
  onSnapshot(collection(db, "pages"), (qs) => { store.pages = Object.fromEntries(qs.docs.map((d) => [d.id, d.data()])); emit(); }, (e) => console.error("pages", e));
}

// Resolve a media reference: absolute URLs pass through, relative paths use settings.mediaBaseUrl
export function mediaUrl(ref) {
  if (!ref) return "";
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith("data:") || ref.startsWith("blob:")) return ref;
  const base = IS_NATIVE ? (store.settings?.mediaBaseUrl || PROD_MEDIA) : IS_LOCAL ? LOCAL_MEDIA : (store.settings?.mediaBaseUrl || LOCAL_MEDIA);
  return base.replace(/\/?$/, "/") + ref.replace(/^\//, "");
}

export const photosOfPlace = (placeId) => store.photos.filter((p) => p.place === placeId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.code.localeCompare(b.code));
export const placeById = (id) => store.places.find((p) => p.id === id || p.code === id);
export const photoById = (id) => store.photos.find((p) => p.id === id || p.code === id);
export const videoByCode = (code) => store.videos.find((v) => v.code === code || v.id === code);
