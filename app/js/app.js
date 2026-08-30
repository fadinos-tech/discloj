// Discover the Land of Jesus — app & website (single-page, hash routed, live Firestore content)
import { store, startStore, subscribe, mediaUrl, photosOfPlace, placeById, photoById, videoByCode, IS_NATIVE } from "./store.js";
import { LANGS, lang, setLang, savedLang, t, L, fmtRef } from "./i18n.js";
import { loadGospel, passage, splitRefs } from "./bible.js";
import { DEFAULT_PAGES } from "./pages-default.js";
import { APP_VERSION } from "./version.js";

const $app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const I = {
  back: '<svg class="icon" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  chev: '<svg class="icon" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  prev: '<svg class="icon" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  play: '<svg class="icon" viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><path d="M8 5v14l11-7z"/></svg>',
  globe: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></svg>',
  search: '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  grid: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  map: '<svg class="icon" viewBox="0 0 24 24"><path d="M1 6l7-3 8 3 7-3v15l-7 3-8-3-7 3z"/><path d="M8 3v15M16 6v15"/></svg>',
  video: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M10 9l5 3-5 3z"/></svg>',
  bible: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  fs: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 14v6h6M20 10V4h-6M20 4l-7 7M4 20l7-7"/></svg>',
  close: '<svg class="icon" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

// Approximate coordinates of the 19 places (used by the map when a place has no lat/lng yet)
const COORDS = { an: [32.702, 35.298], bk: [31.768, 35.160], cb: [31.705, 35.203], dj: [31.857, 35.444], ec: [32.747, 35.339], ft: [32.687, 35.390], gn: [32.632, 35.349], hk: [32.881, 35.575], kb: [32.881, 35.556], lt: [32.874, 35.549], mo: [31.778, 35.245], nz: [31.772, 35.230], ov: [31.779, 35.230], ue: [31.840, 35.135], vk: [31.778, 35.229], wt: [32.872, 35.545], xa: [31.779, 35.246], yd: [31.771, 35.229], zd: [31.780, 35.240] };

// ---------- routing ----------
function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean).map(decodeURIComponent);
  if (!parts.length || !LANGS.some((l) => l.code === parts[0])) return { view: "home" };
  return { lang: parts[0], view: parts[1] || "journey", a: parts[2], b: parts[3] };
}
const href = (...p) => "#/" + [lang, ...p].map(encodeURIComponent).join("/");
function go(...p) { location.hash = href(...p); }

// ---------- shell pieces ----------
function header(route, opts = {}) {
  const tabs = [["journey", t("journey")], ["map", t("map")], ["videos", t("videos")], ["bible", t("bible")]];
  return `<header class="hdr"><div class="hdr-in">
    ${opts.back ? `<a class="back" href="${opts.back}" aria-label="${esc(t("back"))}">${I.back}</a>` : ""}
    <a class="brand" href="${href("journey")}"><span class="eyebrow">${esc(L(store.settings?.title) || "Discover the Land of Jesus")}</span><span class="name">${esc(opts.title || t("journey"))}</span></a>
    <nav class="top">${tabs.map(([v, n]) => `<a href="${href(v)}" class="${route.view === v || (v === "journey" && route.view === "place") ? "active" : ""}">${esc(n)}</a>`).join("")}</nav>
    <div class="right">
      <a class="pill icon-only" href="${href("search")}" aria-label="${esc(t("search"))}">${I.search}</a>
      <button class="pill" id="langBtn" aria-haspopup="true">${I.globe}<span>${lang.toUpperCase()}</span></button>
    </div>
  </div>
  <div class="lang-menu hidden" id="langMenu">${LANGS.map((l) => `<button data-lang="${l.code}" class="${l.code === lang ? "active" : ""}"><span class="code">${l.code.toUpperCase()}</span>${l.name}</button>`).join("")}</div>
  </header>`;
}
function tabbar(route) {
  const tabs = [["journey", t("journey"), I.grid], ["map", t("map"), I.map], ["videos", t("videos"), I.video], ["bible", t("bible"), I.bible]];
  return `<nav class="tabbar">${tabs.map(([v, n, ic]) => `<a href="${href(v)}" class="${route.view === v || (v === "journey" && route.view === "place") ? "active" : ""}">${ic}<span>${esc(n)}</span></a>`).join("")}</nav>`;
}
function footer() {
  const pages = ["about", "privacy", "disclaimer"].filter((id) => store.pages[id]?.published !== false);
  return `<footer class="site"><div class="in">
    <div>© ${new Date().getFullYear()} ${esc(L(store.settings?.title) || "Discover the Land of Jesus")} · ${esc(t("restored"))} · v${APP_VERSION}</div>
    <nav>${pages.map((id) => `<a href="${href("page", id)}">${esc(L(store.pages[id]?.title) || t(id))}</a>`).join("")}</nav>
  </div></footer>`;
}

// ---------- views ----------
function viewHome() {
  const cover = mediaUrl(store.settings?.homeCover || "home.jpg");
  return `<div class="home">
    <div class="hero"><img src="${cover}" alt="Discover the Land of Jesus"></div>
    <div class="choose">
      <div><div class="eyebrow" style="font-size:13px">${esc(t("chooseLanguage"))}</div><div class="rule"></div></div>
      <div class="lang-list">${LANGS.map((l, i) => `<button class="lang-btn ${l.code === (savedLang() || "en") ? "primary" : ""}" data-go-lang="${l.code}"><span style="display:flex;align-items:center;gap:12px"><span class="code">${l.code.toUpperCase()}</span>${l.name}</span>${I.chev}</button>`).join("")}</div>
      ${IS_NATIVE ? "" : `<a class="play-badge" href="${esc(store.settings?.appUpdate?.androidUrl || "https://play.google.com/store/apps/details?id=com.clicksolutionspro.discloj")}" target="_blank" rel="noopener"><img src="icons/google-play-badge.png" alt="Get it on Google Play"></a>`}
      <div class="foot">${store.photos.length ? `${store.photos.length} ${t("photos")} · ${store.videos.length} ${t("videos").toLowerCase()} · ${t("bibleRefs")}` : "&nbsp;"}</div>
    </div>
  </div>`;
}

function viewJourney(route) {
  const intro = videoByCode("INTRO");
  const introFile = intro?.files?.[lang] || intro?.files?.en;
  return header(route, { title: t("journey") }) + `<main><div class="page">
    ${intro ? `<button class="intro-card" data-play="INTRO" style="width:100%;text-align:left">
      <span class="thumb"><img src="${mediaUrl(intro.poster || store.settings?.cover || "cover.jpg")}" alt=""><span class="play">${I.play.replace('class="icon"', 'class="icon" style="width:28px;height:28px"')}</span></span>
      <span class="meta"><span class="eyebrow">${esc(t("intro"))}</span><b>${esc(t("watchIntro"))}</b><small>${esc(LANGS.find((l) => l.code === lang)?.name)}${introFile ? "" : " · " + esc(t("videoNotAvailable"))}</small></span>
    </button>` : ""}
    <div class="section-title"><span class="eyebrow">${store.places.length} ${esc(t("places"))}</span></div>
    <div class="grid">${store.places.map((p) => {
      const photos = photosOfPlace(p.id); const cover = photoById(p.coverPhoto) || photos[0];
      return `<a class="card" href="${href("place", p.id)}"><img src="${mediaUrl(cover?.thumb || cover?.image)}" alt="" loading="lazy"><span class="num">${p.order}</span><span class="cap"><b>${esc(L(p.title))}</b><small>${photos.length} ${esc(t("photos"))}${p.videoCode && videoByCode(p.videoCode) ? " · " + esc(t("video")) : ""}</small></span></a>`;
    }).join("")}</div>
  </div></main>` + footer() + tabbar(route);
}

function viewPlace(route) {
  const place = placeById(route.a);
  if (!place) return header(route) + `<main><div class="empty">${esc(t("noResults"))}</div></main>` + tabbar(route);
  const photos = photosOfPlace(place.id);
  let idx = Math.max(0, photos.findIndex((p) => p.code === route.b || p.id === route.b));
  const photo = photos[idx];
  const pi = store.places.findIndex((p) => p.id === place.id);
  const prevPlace = store.places[pi - 1], nextPlace = store.places[pi + 1];
  const video = place.videoCode ? videoByCode(place.videoCode) : null;
  const refs = photo ? ["mt", "mk", "lk", "jn"].filter((g) => photo.bible?.[g]).map((g) => `<button class="chip" data-bible="${g}|${esc(photo.bible[g])}" title="${esc(t("readPassage"))}">${esc(t(g))} ${esc(fmtRef(photo.bible[g]))}</button>`).join("") : "";
  const title = L(photo?.title) || L(place.title);
  const side = `<aside class="side"><div class="eyebrow">${esc(t("journey"))}</div>${store.places.map((p) => `<a href="${href("place", p.id)}" class="${p.id === place.id ? "active" : ""}"><span class="n">${p.order}</span>${esc(L(p.title))}<span class="c">${photosOfPlace(p.id).length}</span></a>`).join("")}</aside>`;
  const viewer = photo ? `<div class="viewer" id="viewer">
      <div class="stage" id="stage">
        <img class="bg" src="${mediaUrl(photo.thumb || photo.image)}" alt="" aria-hidden="true">
        <img id="mainImg" src="${mediaUrl(photo.image)}" alt="${esc(title)}">
        <button class="navbtn prev" data-nav="-1" ${idx === 0 ? "disabled" : ""} aria-label="${esc(t("previous"))}">${I.prev}</button>
        <button class="navbtn next" data-nav="1" ${idx >= photos.length - 1 ? "disabled" : ""} aria-label="${esc(t("next"))}">${I.chev}</button>
        <button class="fs" id="fsBtn" aria-label="${esc(t("fullscreen"))}">${I.fs}</button>
        <div class="caption"><span class="eyebrow">${place.order} · ${esc(L(place.title))}</span><h1>${esc(title)}</h1>
          <div class="count"><span>${esc(t("photo"))} ${idx + 1} ${esc(t("of"))} ${photos.length}</span><span class="dots">${photos.slice(0, 12).map((_, i) => `<span class="${i === idx ? "on" : ""}"></span>`).join("")}</span></div></div>
      </div></div>` : `<div class="empty">${esc(t("noResults"))}</div>`;
  const strip = photos.length > 1 ? `<div class="strip" id="strip">${photos.map((p, i) => `<button data-idx="${i}" class="${i === idx ? "on" : ""}" aria-label="${i + 1}"><img src="${mediaUrl(p.thumb || p.image)}" alt="" loading="lazy"></button>`).join("")}</div>` : "";
  const body = `<div class="body">
      <span class="eyebrow desk">${place.order} · ${esc(L(place.title))}</span><h1 class="desk">${esc(title)}</h1>
      ${refs ? `<div class="refs">${I.bible}${refs}</div>` : ""}
      <div class="prose">${esc(L(photo?.text))}</div>
      ${video ? `<button class="video-card" data-play="${esc(video.code)}"><span class="play">${I.play}</span><span class="meta"><b>${esc(t("guideVideo"))} · ${esc(L(video.title))}</b><small>${esc(LANGS.find((l) => l.code === lang)?.name)}${video.files?.[lang] ? "" : " · " + esc(t("videoNotAvailable"))}</small></span>${I.chev.replace('class="icon"', 'class="icon chev"')}</button>` : ""}
    </div>`;
  const pager = `<div class="pager">
      ${prevPlace ? `<a href="${href("place", prevPlace.id)}">${I.prev}<b>${esc(L(prevPlace.title))}</b></a>` : "<span></span>"}
      <span class="code">${esc(photo?.code || "")}</span>
      ${nextPlace ? `<a class="next" href="${href("place", nextPlace.id)}"><b>${esc(L(nextPlace.title))}</b>${I.chev}</a>` : "<span></span>"}
    </div>`;
  return header(route, { title: L(place.title), back: href("journey") }) + `<main><div class="place">${side}<div class="center">${viewer}${strip}</div>${body}${pager}</div></main>` + footer() + tabbar(route);
}

function viewVideos(route) {
  return header(route, { title: t("videos") }) + `<main><div class="page"><div class="list two">${store.videos.map((v, i) => {
    const ok = !!v.files?.[lang]; const pl = (v.places || []).map((id) => L(placeById(id)?.title)).filter(Boolean).join(", ");
    const cover = v.poster || photoById(placeById(v.places?.[0])?.coverPhoto)?.thumb || store.settings?.cover || "cover.jpg";
    return `<button class="row" data-play="${esc(v.code)}"><span class="thumb"><img src="${mediaUrl(cover)}" alt="" loading="lazy"></span><span class="meta"><b>${esc(L(v.title))}</b><small>${esc(pl || (v.code === "INTRO" ? t("intro") : ""))}${ok ? "" : " · " + esc(t("videoNotAvailable"))}</small></span><span class="play" style="color:var(--gold)">${I.play.replace('class="icon"', 'class="icon" style="width:26px;height:26px"')}</span></button>`;
  }).join("")}</div></div></main>` + footer() + tabbar(route);
}

function viewBible(route) {
  const gospels = ["mt", "mk", "lk", "jn"];
  const num = (r) => { const m = /^(\d+)[.:](\d+)/.exec(r); return m ? (+m[1]) * 1000 + (+m[2]) : 0; };
  const sections = gospels.map((g) => {
    const map = new Map();
    for (const p of store.photos) { const r = p.bible?.[g]; if (!r) continue; for (const part of String(r).split(";").map((x) => x.trim()).filter(Boolean)) { if (!map.has(part)) map.set(part, []); map.get(part).push(p); } }
    const items = [...map.entries()].sort((a, b) => num(a[0]) - num(b[0]));
    if (!items.length) return "";
    return `<section class="gospel" id="${g}"><h2>${esc(t(g))}</h2><div class="reflist">${items.map(([r, ps]) => { const p = ps[0]; const pl = placeById(p.place); return `<div class="refrow"><button class="chip" data-bible="${g}|${esc(r)}" title="${esc(t("readPassage"))}">${esc(fmtRef(r))}</button><a href="${href("place", p.place, p.code)}"><span>${esc(L(pl?.title))}</span><small>${ps.length} ${esc(t(ps.length === 1 ? "photo" : "photos"))}</small></a></div>`; }).join("")}</div></section>`;
  }).join("");
  return header(route, { title: t("bible") }) + `<main><div class="page"><div class="eyebrow" style="font-size:12px">${esc(t("bibleRefs"))}</div>${sections || `<div class="empty">${esc(t("noResults"))}</div>`}</div></main>` + footer() + tabbar(route);
}

function viewMap(route) {
  // Vintage "parchment" relief map of the Holy Land — lng 34.55–35.95, lat 31.5–33.15 (all 19 places fall inside)
  const X = (lng) => ((lng - 34.55) / 1.4) * 100, Y = (lat) => ((33.15 - lat) / 1.65) * 130;
  const pt = (la, lo) => `${X(lo).toFixed(1)},${Y(la).toFixed(1)}`;
  const poly = (pts) => pts.map(([la, lo]) => pt(la, lo)).join(" ");
  const coast = [[33.15, 35.12], [33.09, 35.10], [32.92, 35.07], [32.83, 35.02], [32.82, 34.96], [32.70, 34.93], [32.50, 34.89], [32.32, 34.85], [32.07, 34.76], [31.80, 34.63], [31.60, 34.52], [31.50, 34.47]];
  const sea = [[33.15, 34.55], ...coast, [31.50, 34.55]];
  const kinneret = [[32.90, 35.56], [32.88, 35.62], [32.82, 35.65], [32.73, 35.62], [32.70, 35.58], [32.75, 35.53], [32.82, 35.52], [32.88, 35.53]];
  const dead = [[31.76, 35.47], [31.74, 35.56], [31.55, 35.53], [31.50, 35.50], [31.50, 35.42], [31.70, 35.45]];
  const jordan = [[32.70, 35.58], [32.55, 35.56], [32.35, 35.54], [32.10, 35.53], [31.90, 35.52], [31.76, 35.49]];
  const hula = [[33.15, 35.60], [32.92, 35.58]];
  // relief hachures: ordered rows of short strokes on both flanks of the central hill ridge (Galilee → Samaria → Judea)
  let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const ridge = [[33.1, 35.38], [32.95, 35.33], [32.8, 35.27], [32.62, 35.22], [32.45, 35.27], [32.25, 35.24], [32.05, 35.2], [31.85, 35.18], [31.65, 35.14], [31.5, 35.1]];
  let hach = "";
  for (let i = 0; i < ridge.length - 1; i++) {
    const [a, b] = [ridge[i], ridge[i + 1]]; const rows = 9;
    for (let r = 0; r < rows; r++) {
      const f = (r + 0.5) / rows; const la = a[0] + (b[0] - a[0]) * f; const lo = a[1] + (b[1] - a[1]) * f; const cx = X(lo), cy = Y(la);
      for (const side of [-1, 1]) for (let k = 0; k < 7; k++) {
        const dist = 1.2 + k * 1.35 + rnd() * 0.6; const x = cx + side * dist, y = cy + (rnd() - 0.5) * 0.9;
        const len = 0.9 + rnd() * 0.8; const ang = side * 0.55 + (rnd() - 0.5) * 0.35; const op = Math.max(0.05, 0.34 - k * 0.045);
        hach += `<line x1="${(x - Math.cos(ang) * len).toFixed(1)}" y1="${(y - Math.sin(ang) * len).toFixed(1)}" x2="${(x + Math.cos(ang) * len).toFixed(1)}" y2="${(y + Math.sin(ang) * len).toFixed(1)}" stroke-width="${(0.22 + rnd() * 0.2).toFixed(2)}" opacity="${op.toFixed(2)}"/>`;
      }
    }
  }
  // clusters
  const clusters = [];
  for (const p of store.places) {
    const c = (typeof p.lat === "number" && typeof p.lng === "number") ? [p.lat, p.lng] : COORDS[p.id] || COORDS[p.code];
    if (!c) continue;
    let cl = clusters.find((k) => Math.abs(k.lat - c[0]) < 0.035 && Math.abs(k.lng - c[1]) < 0.035);
    if (!cl) { cl = { lat: c[0], lng: c[1], places: [] }; clusters.push(cl); }
    cl.places.push(p);
  }
  // label direction per place (avoids collisions around Nazareth and Jerusalem)
  const DIR = { an: "left", ec: "right-up", ft: "right", gn: "right-down", hk: "up-left", dj: "up", ue: "left", bk: "left", cb: "right-down", mo: "right" };
  const sel = route.a ? clusters.findIndex((k) => k.places.some((p) => p.id === route.a)) : -1;
  // display positions: push overlapping markers slightly apart (Nazareth/Cana/Tabor/Nain, Jerusalem/Bethlehem/Ein Karem)
  for (const k of clusters) { k.x = X(k.lng); k.y = Y(k.lat); }
  for (let it = 0; it < 30; it++) for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
    const a = clusters[i], b = clusters[j]; const minD = (a.places.length > 1 ? 3.2 : 2.6) + (b.places.length > 1 ? 3.2 : 2.6) + 3.2;
    let dx = b.x - a.x, dy = b.y - a.y; let d = Math.hypot(dx, dy); if (d >= minD) continue; if (d < 0.01) { dx = 1; dy = 0; d = 1; }
    const push = (minD - d) / 2; a.x -= (dx / d) * push; a.y -= (dy / d) * push; b.x += (dx / d) * push; b.y += (dy / d) * push;
  }
  const markers = clusters.map((k, i) => {
    const multi = k.places.length > 1; const lead = k.places[0];
    const isJer = k.places.some((p) => ["ov", "vk", "nz", "mo"].includes(p.id));
    const label = isJer && multi ? "Jerusalem" : (k.places.some((p) => p.id === "hk") && multi ? L(placeById("hk")?.title) + " · Tabgha" : L(lead.title));
    const dir = DIR[lead.id] || DIR[k.places.find((p) => DIR[p.id])?.id] || "right";
    const x = k.x, y = k.y; const r = multi ? 3.2 : 2.6; const g = r + 1.4;
    const pos = { right: [x + g, y + 1.1, "start"], left: [x - g, y + 1.1, "end"], "right-up": [x + g * 0.8, y - g * 0.5, "start"], "right-down": [x + g * 0.8, y + g + 0.8, "start"], "up-left": [x - 1, y - g, "end"], up: [x, y - g + 0.6, "middle"], down: [x, y + g + 2, "middle"] }[dir];
    return `<g class="marker ${i === sel ? "on" : ""}" data-cluster="${lead.id}" data-single="${multi ? "" : lead.id}"><circle class="hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + 3.2).toFixed(1)}"/><circle class="halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r + 1.2}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/><text class="num" x="${x.toFixed(1)}" y="${(y + 1).toFixed(1)}" text-anchor="middle">${multi ? k.places.length : lead.order}</text><text class="lab" x="${pos[0].toFixed(1)}" y="${pos[1].toFixed(1)}" text-anchor="${pos[2]}">${esc(label)}</text></g>`;
  }).join("");
  const svg = `<svg class="map-svg" viewBox="0 0 100 130" role="img" aria-label="${esc(t("map"))}">
    <defs>
      <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efe2c3"/><stop offset="0.5" stop-color="#e6d4ad"/><stop offset="1" stop-color="#d9c292"/></linearGradient>
      <linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fb5cc"/><stop offset="1" stop-color="#4f83a8"/></linearGradient>
      <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.28 0"/></filter>
      <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#5a3d28" stop-opacity="0.35"/></radialGradient>
    </defs>
    <rect width="100" height="130" fill="url(#paper)"/>
    <g class="hach" stroke="#6b4a2a" stroke-linecap="round">${hach}</g>
    <polygon class="water" points="${poly(sea)}"/><polygon class="water" points="${poly(kinneret)}"/><polygon class="water" points="${poly(dead)}"/>
    <polyline class="river" points="${poly(jordan)}"/><polyline class="river" points="${poly(hula)}"/>
    <rect width="100" height="130" filter="url(#grain)" opacity="0.9"/>
    <rect width="100" height="130" fill="url(#vignette)"/>
    <text class="sea-label" x="9" y="82" transform="rotate(-72 9 82)">MEDITERRANEAN SEA</text>
    <text class="sea-label small" x="${(X(35.66) + 0.8).toFixed(1)}" y="${Y(32.9).toFixed(1)}" transform="rotate(72 ${(X(35.66) + 0.8).toFixed(1)} ${Y(32.9).toFixed(1)})">Sea of Galilee</text>
    <text class="sea-label small" x="${(X(35.5) + 4.5).toFixed(1)}" y="${Y(31.62).toFixed(1)}" transform="rotate(-80 ${(X(35.5) + 4.5).toFixed(1)} ${Y(31.62).toFixed(1)})">Dead Sea</text>
    <text class="sea-label small" x="${(X(35.53) + 1.4).toFixed(1)}" y="${Y(32.3).toFixed(1)}" transform="rotate(88 ${(X(35.53) + 1.4).toFixed(1)} ${Y(32.3).toFixed(1)})">Jordan</text>
    <g class="compass" transform="translate(88 12)"><circle r="6.5" fill="none" stroke="#6b4a2a" stroke-width="0.35"/><path d="M0,-7 L1.6,0 L0,7 L-1.6,0 Z" fill="#6b4a2a"/><path d="M-7,0 L0,1.6 L7,0 L0,-1.6 Z" fill="#a88556"/><text x="0" y="-8.5" text-anchor="middle">N</text></g>
    <rect x="0.4" y="0.4" width="99.2" height="129.2" fill="none" stroke="#6b4a2a" stroke-width="0.5"/><rect x="1.6" y="1.6" width="96.8" height="126.8" fill="none" stroke="#6b4a2a" stroke-width="0.2"/>
    ${markers}
  </svg>`;
  const ordered = sel >= 0 ? [clusters[sel], ...clusters.filter((_, i) => i !== sel)] : clusters;
  const panel = `<div class="list">${ordered.map((k) => { const on = clusters.indexOf(k) === sel; return k.places.map((p) => { const ph = photoById(p.coverPhoto) || photosOfPlace(p.id)[0]; return `<a class="row ${on ? "on" : ""}" id="mp-${p.id}" href="${href("place", p.id)}"><span class="n">${p.order}</span><span class="thumb"><img src="${mediaUrl(ph?.thumb || ph?.image)}" alt="" loading="lazy"></span><span class="meta"><b>${esc(L(p.title))}</b><small>${photosOfPlace(p.id).length} ${esc(t("photos"))}</small></span>${I.chev.replace('class="icon"', 'class="icon" style="color:var(--gold)"')}</a>`; }).join(""); }).join("")}</div>`;
  return header(route, { title: t("map") }) + `<main><div class="page map-wrap">${svg}${panel}</div></main>` + footer() + tabbar(route);
}

function viewPage(route) {
  const page = store.pages[route.a];
  const def = DEFAULT_PAGES[route.a];
  const title = L(page?.title) || L(def?.title) || t(route.a);
  const body = (page && L(page.body)) || L(def?.body) || "";
  return header(route, { title, back: href("journey") }) + `<main><div class="page article"><h1>${esc(title)}</h1><div class="prose">${body ? esc(body) : esc(t("pageEmpty"))}</div></div></main>` + footer() + tabbar(route);
}

let searchQ = "";
function viewSearch(route) {
  const q = searchQ.trim().toLowerCase();
  let results = "";
  if (q.length >= 2) {
    const hits = store.photos.filter((p) => (L(p.title) + " " + L(p.text) + " " + L(placeById(p.place)?.title)).toLowerCase().includes(q)).slice(0, 60);
    results = hits.length ? `<div class="list">${hits.map((p) => `<a class="row" href="${href("place", p.place, p.code)}"><span class="thumb"><img src="${mediaUrl(p.thumb || p.image)}" alt="" loading="lazy"></span><span class="meta"><b>${esc(L(p.title))}</b><small>${esc(L(placeById(p.place)?.title))} · ${esc(p.code)}</small></span></a>`).join("")}</div>` : `<div class="empty">${esc(t("noResults"))}</div>`;
  }
  return header(route, { title: t("search"), back: href("journey") }) + `<main><div class="page"><label class="search-box">${I.search}<input id="q" type="search" placeholder="${esc(t("searchPlaceholder"))}" value="${esc(searchQ)}" autocomplete="off"></label><div class="results" id="results">${results}</div></div></main>` + tabbar(route);
}

// ---------- video overlay ----------
let overlay = null;
function playVideo(code, vlang = lang) {
  const v = videoByCode(code); if (!v) return;
  closeVideo();
  const file = v.files?.[vlang];
  overlay = document.createElement("div"); overlay.className = "overlay";
  overlay.innerHTML = `<div class="bar"><div style="display:flex;flex-direction:column;gap:2px;min-width:0"><b>${esc(L(v.title))}</b><small>${esc(LANGS.find((l) => l.code === vlang)?.name || "")}</small></div><button class="close" aria-label="close">${I.close}</button></div>
    ${file ? `<video controls autoplay playsinline controlslist="nodownload noremoteplayback" disablepictureinpicture oncontextmenu="return false" src="${mediaUrl(file)}" ${v.poster ? `poster="${mediaUrl(v.poster)}"` : ""}></video>` : `<div class="empty" style="flex:1;color:var(--sand-3)">${esc(t("videoNotAvailable"))}</div>`}
    <div class="langs">${LANGS.filter((l) => v.files?.[l.code]).map((l) => `<button data-vlang="${l.code}" class="${l.code === vlang ? "on" : ""}">${l.name}</button>`).join("")}</div>`;
  overlay.addEventListener("click", (e) => {
    if (e.target.closest(".close")) closeVideo();
    const b = e.target.closest("[data-vlang]"); if (b) playVideo(code, b.dataset.vlang);
  });
  document.body.appendChild(overlay); document.body.style.overflow = "hidden";
}
function closeVideo() { if (overlay) { overlay.remove(); overlay = null; document.body.style.overflow = ""; } }

// ---------- Bible passage reader ----------
let reader = null;
function closeReader() { if (reader) { reader.remove(); reader = null; document.body.style.overflow = ""; } }
async function openPassage(g, refStr) {
  closeReader();
  const refs = splitRefs(refStr);
  reader = document.createElement("div"); reader.className = "reader";
  reader.innerHTML = `<div class="sheet"><div class="bar"><div style="min-width:0"><div class="eyebrow">${esc(t("bible"))}</div><b>${esc(t(g))} ${esc(fmtRef(refStr))}</b></div><button class="close" aria-label="close">${I.close}</button></div><div class="body"><div class="loading">${esc(t("loading"))}</div></div></div>`;
  reader.addEventListener("click", (e) => { if (e.target === reader || e.target.closest(".close")) closeReader(); });
  document.body.appendChild(reader); document.body.style.overflow = "hidden";
  const body = reader.querySelector(".body");
  try {
    const book = await loadGospel(lang, g);
    body.innerHTML = refs.map((r) => { const p = passage(book, r); if (!p) return ""; return `<section class="passage"><h3>${esc(book.book)} ${p.ch}:${p.from}${p.to > p.from ? "-" + p.to : ""}</h3><p>${p.verses.map((v) => `<sup>${v.n}</sup>${esc(v.text)} `).join("")}</p></section>`; }).join("") + `<div class="src">${esc(book.translation || "")}</div>`;
  } catch (e) { console.error(e); body.innerHTML = `<div class="empty">${esc(t("pageEmpty"))}</div>`; }
}

// ---------- app update check (native apps; managed in adminos -> App Version) ----------
const cmpVer = (a, b) => { const A = String(a || "0").split("."), B = String(b || "0").split("."); for (let i = 0; i < 3; i++) { const d = (+A[i] || 0) - (+B[i] || 0); if (d) return d; } return 0; };
let updateShown = false;
function checkAppUpdate() {
  if (!IS_NATIVE || updateShown) return;
  const u = store.settings?.appUpdate; if (!u) return;
  const platform = globalThis.Capacitor?.getPlatform?.() === "ios" ? "ios" : "android";
  const url = platform === "ios" ? u.iosUrl : u.androidUrl; if (!url) return;
  const forced = u.minVersion && cmpVer(APP_VERSION, u.minVersion) < 0;
  const soft = u.latestVersion && cmpVer(APP_VERSION, u.latestVersion) < 0;
  if (!forced && !soft) return;
  if (!forced && localStorage.getItem("discloj.skipVer") === String(u.latestVersion)) return;
  updateShown = true;
  const el = document.createElement("div"); el.className = "update-modal";
  el.innerHTML = `<div class="box">
    <div class="eyebrow">${esc(L(store.settings?.title) || "Discover the Land of Jesus")}</div>
    <h2>${esc(t("updateTitle"))}</h2>
    <p>${esc(forced ? t("updateForced") : t("updateBody"))}</p>
    <p class="vers">v${esc(APP_VERSION)} \u2192 v${esc(u.latestVersion || u.minVersion)}</p>
    <a class="go" href="${esc(url)}" target="_blank" rel="noopener">${esc(t("updateNow"))}</a>
    ${forced ? "" : `<button class="later">${esc(t("updateLater"))}</button>`}
  </div>`;
  el.addEventListener("click", (e) => { if (e.target.closest(".later")) { localStorage.setItem("discloj.skipVer", String(u.latestVersion)); el.remove(); } });
  document.body.appendChild(el);
}

// ---------- render ----------
let lastKey = "";
function render() {
  const route = parseHash();
  if (route.view === "home") {
    if (savedLang() && !sessionStorage.getItem("discloj.seenHome")) { sessionStorage.setItem("discloj.seenHome", "1"); setLang(savedLang()); location.replace(href("journey")); return; }
    sessionStorage.setItem("discloj.seenHome", "1");
    $app.innerHTML = viewHome(); document.title = "Discover the Land of Jesus"; return;
  }
  setLang(route.lang);
  if (!store.ready && !store.places.length) { $app.innerHTML = header(route) + `<div class="loading">${esc(t("loading"))}</div>`; return; }
  const views = { journey: viewJourney, place: viewPlace, videos: viewVideos, bible: viewBible, map: viewMap, page: viewPage, search: viewSearch };
  const fn = views[route.view] || viewJourney;
  const key = location.hash;
  const y = key === lastKey ? window.scrollY : 0;
  $app.innerHTML = fn(route);
  const pl = route.view === "place" ? placeById(route.a) : null;
  document.title = (pl ? L(pl.title) + " · " : "") + (L(store.settings?.title) || "Discover the Land of Jesus");
  if (key !== lastKey && !(route.view === "place" && lastKey.startsWith(href("place", route.a)))) window.scrollTo(0, 0); else window.scrollTo(0, y);
  lastKey = key;
  afterRender(route);
}
function afterRender(route) {
  if (route.view === "place") {
    document.getElementById("strip")?.querySelector(".on")?.scrollIntoView({ block: "nearest", inline: "center" });
    const stage = document.getElementById("stage"); let x0 = null;
    stage?.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    stage?.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) navPhoto(route, dx < 0 ? 1 : -1); }, { passive: true });
    document.getElementById("fsBtn")?.addEventListener("click", () => { const el = document.getElementById("viewer"); (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); });
    // preload neighbours
    const photos = photosOfPlace(route.a); const idx = Math.max(0, photos.findIndex((p) => p.code === route.b));
    [photos[idx + 1], photos[idx - 1]].filter(Boolean).forEach((p) => { const im = new Image(); im.src = mediaUrl(p.image); });
  }
  if (route.view === "search") { const q = document.getElementById("q"); q?.focus(); q?.addEventListener("input", () => { searchQ = q.value; const r = parseHash(); document.getElementById("results").innerHTML = viewSearch(r).match(/<div class="results" id="results">([\s\S]*)<\/div><\/div><\/main>/)?.[1] || ""; }); }
  if (route.view === "map" && route.a) setTimeout(() => document.querySelector(`#mp-${CSS.escape(route.a)}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 200);
}
function navPhoto(route, d) {
  const photos = photosOfPlace(route.a); const idx = Math.max(0, photos.findIndex((p) => p.code === route.b));
  const n = photos[idx + d]; if (n) go("place", route.a, n.code);
}

// ---------- content protection (images & videos) ----------
document.addEventListener("contextmenu", (e) => { if (e.target.closest("img, video, .viewer, .overlay, .card, .strip")) e.preventDefault(); });
document.addEventListener("dragstart", (e) => { if (e.target.closest("img, video")) e.preventDefault(); });

// ---------- global events ----------
document.addEventListener("click", (e) => {
  const lb = e.target.closest("[data-go-lang]"); if (lb) { setLang(lb.dataset.goLang); go("journey"); return; }
  const langBtn = e.target.closest("#langBtn"); const menu = document.getElementById("langMenu");
  if (langBtn && menu) { menu.classList.toggle("hidden"); return; }
  const lm = e.target.closest("#langMenu [data-lang]"); if (lm) { const r = parseHash(); setLang(lm.dataset.lang); location.hash = "#/" + [lang, r.view, r.a, r.b].filter(Boolean).map(encodeURIComponent).join("/"); return; }
  if (menu && !e.target.closest("#langMenu")) menu.classList.add("hidden");
  const pb = e.target.closest("[data-play]"); if (pb) { playVideo(pb.dataset.play); return; }
  const bb = e.target.closest("[data-bible]"); if (bb) { const [g, r] = bb.dataset.bible.split("|"); openPassage(g, r); return; }
  const nb = e.target.closest("[data-nav]"); if (nb && !nb.disabled) { navPhoto(parseHash(), +nb.dataset.nav); return; }
  const sb = e.target.closest("#strip [data-idx]"); if (sb) { const r = parseHash(); const p = photosOfPlace(r.a)[+sb.dataset.idx]; if (p) go("place", r.a, p.code); return; }
  const mk = e.target.closest(".map-svg [data-cluster]"); if (mk) { if (mk.dataset.single) go("place", mk.dataset.single); else go("map", mk.dataset.cluster); return; }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeVideo(); closeReader(); }
  const r = parseHash(); if (r.view !== "place" || overlay || e.target.tagName === "INPUT") return;
  if (e.key === "ArrowRight") navPhoto(r, 1); if (e.key === "ArrowLeft") navPhoto(r, -1);
});
window.addEventListener("hashchange", () => { closeVideo(); closeReader(); render(); });
subscribe(render);
subscribe(checkAppUpdate);

// ---------- boot ----------
if (savedLang()) setLang(savedLang());
startStore();
render();
if ("serviceWorker" in navigator && location.protocol !== "file:" && !(globalThis.Capacitor && globalThis.Capacitor.isNativePlatform && globalThis.Capacitor.isNativePlatform())) navigator.serviceWorker.register("sw.js").catch(() => {});
