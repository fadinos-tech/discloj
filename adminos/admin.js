// Adminos — content management for "Discover the Land of Jesus"
// Edits go straight to Firestore; the app/website listen live and update immediately.
import { app, db, doc, setDoc, deleteDoc, getDocs, collection, serverTimestamp, writeBatch } from "../js/firebase.js";
import { store, startStore, subscribe, mediaUrl, photosOfPlace, placeById, photoById, videoByCode, SITE_ROOT } from "../js/store.js";
import { LANGS } from "../js/i18n.js";
import { APP_VERSION } from "../js/version.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const ADMIN_UID = "Yvb0sMKuR0NqFcbSK25NpGPkgST2";
const auth = getAuth(app);
const $root = document.getElementById("admin");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const GOSPELS = [["mt", "Matthew"], ["mk", "Mark"], ["lk", "Luke"], ["jn", "John"]];
const L = (o, l = "en") => (o && typeof o === "object" ? (o[l] || o.en || Object.values(o).find(Boolean) || "") : (o || ""));
let user = null, dirty = false, activeLang = "en";

// ---------- helpers ----------
function toast(msg, err = false) { document.querySelector(".toast")?.remove(); const t = document.createElement("div"); t.className = "toast" + (err ? " err" : ""); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), err ? 6000 : 2500); }
const route = () => { const p = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent); return { view: p[0] || "places", a: p[1], b: p[2] }; };
const go = (...p) => { location.hash = "#/" + p.map(encodeURIComponent).join("/"); };
function langTabs(id) { return `<div class="tabs" data-tabs="${id}">${LANGS.map((l) => `<button type="button" data-tab="${l.code}" class="${l.code === activeLang ? "on" : ""}">${l.name}</button>`).join("")}</div>`; }
function langPanes(fn) { return LANGS.map((l) => `<div data-pane="${l.code}" class="${l.code === activeLang ? "" : "hidden"}">${fn(l.code)}</div>`).join(""); }
const input = (name, value, label, type = "text", extra = "") => `<div class="field"><label>${esc(label)}</label><input type="${type}" name="${esc(name)}" value="${esc(value ?? "")}" ${extra}></div>`;
const textarea = (name, value, label, rows = 8) => `<div class="field"><label>${esc(label)}</label><textarea name="${esc(name)}" rows="${rows}">${esc(value ?? "")}</textarea></div>`;
const check = (name, value, label) => `<label class="check"><input type="checkbox" name="${esc(name)}" ${value ? "checked" : ""}>${esc(label)}</label>`;
// collect form values into a nested object: name="title.en" -> {title:{en:...}}
function collect(form) {
  const out = {};
  for (const el of form.querySelectorAll("[name]")) {
    let v = el.type === "checkbox" ? el.checked : el.type === "number" ? (el.value === "" ? null : +el.value) : el.value;
    if (typeof v === "string") v = v.trim();
    const path = el.name.split("."); let o = out;
    for (let i = 0; i < path.length - 1; i++) o = o[path[i]] ??= {};
    o[path.at(-1)] = v;
  }
  return out;
}
async function save(col, id, data, msg = "Saved") {
  try { await setDoc(doc(db, col, id), { ...data, editedInAdmin: true, updatedAt: serverTimestamp() }, { merge: true }); dirty = false; toast(msg); return true; }
  catch (e) { console.error(e); toast("Save failed: " + (e.code || e.message), true); return false; }
}

// ---------- media upload (Firebase Storage; falls back to FTP instructions) ----------
async function resizeImage(file, max, quality) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, "image/jpeg", quality));
}
async function uploadBlob(path, blob, onProgress) {
  const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js");
  const storage = getStorage(app);
  const task = uploadBytesResumable(ref(storage, path), blob, { contentType: blob.type, cacheControl: "public,max-age=31536000" });
  await new Promise((res, rej) => task.on("state_changed", (s) => onProgress?.(s.bytesTransferred / s.totalBytes), rej, res));
  return getDownloadURL(task.snapshot.ref);
}
function uploadError(e) {
  console.error(e);
  const code = e?.code || "";
  if (code.includes("unauthorized") || code.includes("permission") || code.includes("bucket") || code.includes("unknown") || code.includes("retry-limit")) {
    toast("Upload failed (" + (code || e.message) + "). Firebase Storage is probably not enabled (Blaze plan + storage.rules). Upload the file via FTP into /discloj/media/ and type its path instead.", true);
  } else toast("Upload failed: " + (code || e.message), true);
}

// ---------- shell ----------
function shell(inner, r) {
  const nav = [["places", "Places & Photos"], ["videos", "Videos"], ["pages", "Pages"], ["settings", "Settings"], ["appversion", "App Version"], ["tools", "Import / Export"]];
  const cur = { place: "places", photo: "places", newphoto: "places", video: "videos", newvideo: "videos", page: "pages" }[r.view] || r.view;
  return `<header class="a-hdr"><span class="logo">JESUS<small>· ADMINOS v${APP_VERSION}</small></span>
    <nav>${nav.map(([v, n]) => `<a href="#/${v}" class="${cur === v ? "active" : ""}">${n}</a>`).join("")}</nav>
    <a class="open-app" href="${SITE_ROOT}" target="_blank">Open app ↗</a>
    <span class="user">${esc(user?.email || "")} · <a href="#" id="signOut">sign out</a></span></header>
  <div class="a-layout">
    <aside class="a-side">
      <div class="eyebrow"><span>Places (${store.places.length})</span><button type="button" id="addPlace">+ Add</button></div>
      ${store.places.map((p) => `<a class="item ${r.a === p.id && (r.view === "place") ? "active" : ""} ${p.published === false ? "off" : ""}" href="#/place/${p.id}"><span class="n">${p.order}</span>${esc(L(p.title))}<span class="c">${photosOfPlace(p.id).length}</span></a>`).join("")}
    </aside>
    <main class="a-main">${inner}</main>
  </div>`;
}

// ---------- views ----------
function viewPlaces() {
  return `<div class="a-title"><h1>Places</h1><div class="actions"><button class="btn" id="addPlace2">+ Add place</button></div></div>
  <div class="panel"><table class="table"><thead><tr><th>#</th><th>Code</th><th>Title (EN)</th><th>Photos</th><th>Video</th><th>Status</th></tr></thead><tbody>
  ${store.places.map((p) => `<tr><td>${p.order}</td><td>${esc(p.code)}</td><td><a href="#/place/${p.id}">${esc(L(p.title))}</a></td><td>${photosOfPlace(p.id).length}</td><td>${esc(p.videoCode || "—")}</td><td><span class="status ${p.published === false ? "off" : ""}">${p.published === false ? "hidden" : "published"}</span></td></tr>`).join("")}
  </tbody></table></div>`;
}

function viewPlace(r) {
  const p = placeById(r.a); if (!p) return `<div class="empty">Place not found</div>`;
  const photos = photosOfPlace(p.id);
  return `<div class="a-title"><div><div class="eyebrow">Place · ${esc(p.code)}</div><h1>${esc(L(p.title))}</h1></div>
    <div class="actions"><a class="btn" href="#/newphoto/${p.id}">+ Add photo</a><button class="btn danger" id="delPlace" ${photos.length ? "disabled title='Delete or move its photos first'" : ""}>Delete place</button><button class="btn primary" id="savePlace">Save</button></div></div>
  <form id="f" class="cols" onsubmit="return false">
    <div class="panel"><h3>Settings</h3>
      <div class="row2">${input("order", p.order, "Order", "number")}${`<div class="field"><label>Guide video</label><select name="videoCode"><option value="">— none —</option>${store.videos.map((v) => `<option value="${esc(v.code)}" ${v.code === p.videoCode ? "selected" : ""}>${esc(v.code)} · ${esc(L(v.title))}</option>`).join("")}</select></div>`}</div>
      <div class="field"><label>Cover photo</label><select name="coverPhoto">${photos.map((ph) => `<option value="${esc(ph.code)}" ${ph.code === p.coverPhoto ? "selected" : ""}>${esc(ph.code)} · ${esc(L(ph.title))}</option>`).join("")}</select></div>
      <div class="row2">${input("lat", p.lat ?? "", "Latitude (map)", "number", 'step="0.0001"')}${input("lng", p.lng ?? "", "Longitude (map)", "number", 'step="0.0001"')}</div>
      ${check("published", p.published !== false, "Published (visible in app & website)")}
      <div class="hint">Photos: ${photos.length} · Reorder with the ↑↓ arrows below.</div>
    </div>
    <div class="panel"><h3>Title in each language</h3><div class="lang-grid">${LANGS.map((l) => input("title." + l.code, p.title?.[l.code], l.name)).join("")}</div></div>
  </form>
  <div class="panel"><h3>Photos (${photos.length})</h3>
    <div class="photo-list">${photos.map((ph, i) => `<a href="#/photo/${ph.code}"><span class="th"><img src="${mediaUrl(ph.thumb || ph.image)}" alt="" loading="lazy"><span class="code">${esc(ph.code)}</span>${ph.published === false ? '<span class="off">hidden</span>' : ""}</span><b>${esc(L(ph.title))}</b><span class="ord">#${ph.order} <button type="button" data-move="${ph.code}|-1" ${i === 0 ? "disabled" : ""}>↑</button><button type="button" data-move="${ph.code}|1" ${i === photos.length - 1 ? "disabled" : ""}>↓</button></span></a>`).join("")}</div>
  </div>`;
}

function photoForm(ph, isNew, placeId) {
  const place = placeById(ph.place || placeId);
  return `<form id="f" class="cols" onsubmit="return false">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="panel"><h3>Image</h3>
        <div class="preview" id="imgPreview">${ph.image ? `<img src="${mediaUrl(ph.image)}" alt="">` : '<span class="hint">no image yet</span>'}</div>
        ${input("image", ph.image, "Image path or URL (e.g. photos/AN31.jpg)")}
        ${input("thumb", ph.thumb, "Thumbnail path or URL (optional)")}
        <div class="upload-zone"><span>Upload a new image (it is resized to 1600px + a thumbnail and stored in Firebase Storage)</span><input type="file" id="imgFile" accept="image/*" class="hidden"><button type="button" class="btn small" id="imgPick">Choose image…</button><div class="progress hidden" id="imgProg"><i></i></div></div>
        <div class="hint">Or upload the JPG via FTP to <code>/discloj/media/photos/</code> and type <code>photos/NAME.jpg</code> above.</div>
      </div>
      <div class="panel"><h3>Settings</h3>
        <div class="row2">${input("code", ph.code, "Code", "text", isNew ? "" : "readonly")}${input("order", ph.order, "Order in place", "number")}</div>
        <div class="field"><label>Place</label><select name="place">${store.places.map((p) => `<option value="${p.id}" ${p.id === (ph.place || placeId) ? "selected" : ""}>${p.order} · ${esc(L(p.title))}</option>`).join("")}</select></div>
        <div class="field"><label>Photo-specific video (optional, overrides the place video)</label><select name="videoCode"><option value="">— use place video —</option>${store.videos.map((v) => `<option value="${esc(v.code)}" ${v.code === ph.videoCode ? "selected" : ""}>${esc(v.code)} · ${esc(L(v.title))}</option>`).join("")}</select></div>
        ${check("published", ph.published !== false, "Published")}
      </div>
      <div class="panel"><h3>Bible references</h3><div class="hint">Format: chapter.verse-verse, several separated by ; (e.g. <code>1.26-38</code> or <code>4.1-11;20.29-34</code>)</div>
        <div class="row2">${GOSPELS.map(([g, n]) => input("bible." + g, ph.bible?.[g] ?? "", n)).join("")}</div>
      </div>
    </div>
    <div class="panel"><h3>Text in each language</h3>${langTabs("txt")}
      ${langPanes((l) => input("title." + l, ph.title?.[l], "Title (" + l.toUpperCase() + ")") + textarea("text." + l, ph.text?.[l], "Description (" + l.toUpperCase() + ")", 14))}
    </div>
  </form>`;
}
function viewPhoto(r) {
  const ph = photoById(r.a); if (!ph) return `<div class="empty">Photo not found</div>`;
  const place = placeById(ph.place);
  return `<div class="a-title"><div><div class="eyebrow"><a href="#/place/${ph.place}">${esc(L(place?.title))}</a> · photo ${esc(ph.code)}</div><h1>${esc(L(ph.title))}</h1></div>
    <div class="actions"><a class="btn" href="${SITE_ROOT}#/en/place/${ph.place}/${ph.code}" target="_blank">View in app ↗</a><button class="btn danger" id="delPhoto">Delete</button><button class="btn primary" id="savePhoto">Save &amp; publish</button></div></div>` + photoForm(ph, false);
}
function viewNewPhoto(r) {
  const place = placeById(r.a); if (!place) return `<div class="empty">Place not found</div>`;
  const photos = photosOfPlace(place.id);
  const maxN = photos.reduce((m, p) => Math.max(m, +(p.code.replace(/^\D+/, "")) || 0, p.order || 0), 0);
  const code = place.code.toUpperCase() + String(maxN + 1).padStart(2, "0");
  const ph = { code, place: place.id, order: maxN + 1, image: `photos/${code}.jpg`, thumb: `photos/thumbs/${code}.jpg`, bible: {}, title: {}, text: {}, published: true };
  return `<div class="a-title"><div><div class="eyebrow"><a href="#/place/${place.id}">${esc(L(place.title))}</a></div><h1>New photo</h1></div>
    <div class="actions"><button class="btn primary" id="savePhoto" data-new="1">Create &amp; publish</button></div></div>` + photoForm(ph, true, place.id);
}

function viewVideos() {
  return `<div class="a-title"><h1>Guide videos</h1><div class="actions"><a class="btn" href="#/newvideo">+ Add video</a></div></div>
  <div class="panel"><table class="table"><thead><tr><th>#</th><th>Code</th><th>Title (EN)</th><th>Places</th><th>Languages</th><th>Status</th></tr></thead><tbody>
  ${store.videos.map((v) => `<tr><td>${v.order}</td><td>${esc(v.code)}</td><td><a href="#/video/${v.code}">${esc(L(v.title))}</a></td><td>${(v.places || []).map((id) => esc(L(placeById(id)?.title))).join(", ")}</td><td>${LANGS.map((l) => `<span class="status ${v.files?.[l.code] ? "" : "off"}" style="margin-right:4px">${l.code.toUpperCase()}</span>`).join("")}</td><td><span class="status ${v.published === false ? "off" : ""}">${v.published === false ? "hidden" : "published"}</span></td></tr>`).join("")}
  </tbody></table></div>`;
}
function videoForm(v, isNew) {
  return `<form id="f" class="cols" onsubmit="return false">
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="panel"><h3>Settings</h3>
        <div class="row2">${input("code", v.code, "Code", "text", isNew ? "" : "readonly")}${input("order", v.order, "Order", "number")}</div>
        ${input("poster", v.poster, "Poster image path/URL (optional)")}
        ${check("published", v.published !== false, "Published")}
      </div>
      <div class="panel"><h3>Shown on places</h3><div class="hint">Tick the places whose pages should offer this video.</div>
        <div class="row2">${store.places.map((p) => check("places." + p.id, (v.places || []).includes(p.id), p.order + " · " + L(p.title))).join("")}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      <div class="panel"><h3>Title in each language</h3><div class="lang-grid">${LANGS.map((l) => input("title." + l.code, v.title?.[l.code], l.name)).join("")}</div></div>
      <div class="panel"><h3>Video file per language (MP4)</h3>
        ${LANGS.map((l) => `<div class="field"><label><span>${l.name}</span><span>${v.files?.[l.code] ? `<a href="${mediaUrl(v.files[l.code])}" target="_blank">play ↗</a>` : ""}</span></label>
          <div style="display:flex;gap:8px"><input type="text" name="files.${l.code}" value="${esc(v.files?.[l.code] ?? "")}" placeholder="videos/${esc(v.code || "CODE")}${l.code === "en" ? "ENG" : l.code === "it" ? "ITA" : l.code === "es" ? "ESP" : l.code === "fr" ? "FRA" : "DEU"}.mp4" style="flex:1"><input type="file" accept="video/mp4,video/*" class="hidden" data-vfile="${l.code}"><button type="button" class="btn small" data-vpick="${l.code}">Upload…</button></div>
          <div class="progress hidden" data-vprog="${l.code}"><i></i></div></div>`).join("")}
        <div class="hint">Large files are better uploaded via FTP to <code>/discloj/media/videos/</code> — then type <code>videos/NAME.mp4</code>.</div>
      </div>
    </div>
  </form>`;
}
function viewVideo(r) {
  const v = videoByCode(r.a); if (!v) return `<div class="empty">Video not found</div>`;
  return `<div class="a-title"><div><div class="eyebrow"><a href="#/videos">Videos</a> · ${esc(v.code)}</div><h1>${esc(L(v.title))}</h1></div>
    <div class="actions"><button class="btn danger" id="delVideo">Delete</button><button class="btn primary" id="saveVideo">Save &amp; publish</button></div></div>` + videoForm(v, false);
}
function viewNewVideo() {
  const v = { code: "", order: store.videos.length, title: {}, files: {}, places: [], published: true };
  return `<div class="a-title"><div><div class="eyebrow"><a href="#/videos">Videos</a></div><h1>New video</h1></div><div class="actions"><button class="btn primary" id="saveVideo" data-new="1">Create &amp; publish</button></div></div>` + videoForm(v, true);
}

function viewPages() {
  const ids = [...new Set(["about", "privacy", "disclaimer", ...Object.keys(store.pages)])];
  return `<div class="a-title"><h1>Pages</h1><div class="actions"><button class="btn" id="addPage">+ Add page</button></div></div>
  <div class="panel"><table class="table"><thead><tr><th>ID</th><th>Title (EN)</th><th>Body</th><th>Status</th></tr></thead><tbody>
  ${ids.map((id) => { const pg = store.pages[id]; return `<tr><td>${esc(id)}</td><td><a href="#/page/${id}">${esc(L(pg?.title) || id)}</a></td><td>${LANGS.map((l) => `<span class="status ${pg?.body?.[l.code] ? "" : "off"}" style="margin-right:4px">${l.code.toUpperCase()}</span>`).join("")}</td><td><span class="status ${pg?.published === false ? "off" : ""}">${!pg ? "missing" : pg.published === false ? "hidden" : "published"}</span></td></tr>`; }).join("")}
  </tbody></table></div><div class="hint">The footer of the website shows the pages <code>about</code>, <code>privacy</code> and <code>disclaimer</code> (when published). If a page body is empty, the app shows its built-in default text — write here only if you want to replace it.</div>`;
}
function viewPage(r) {
  const id = r.a; const pg = store.pages[id] || { title: {}, body: {}, published: true };
  return `<div class="a-title"><div><div class="eyebrow"><a href="#/pages">Pages</a> · ${esc(id)}</div><h1>${esc(L(pg.title) || id)}</h1></div>
    <div class="actions"><a class="btn" href="${SITE_ROOT}#/en/page/${id}" target="_blank">View ↗</a><button class="btn primary" id="savePage">Save &amp; publish</button></div></div>
  <form id="f" onsubmit="return false" style="display:flex;flex-direction:column;gap:16px">
    <div class="panel">${check("published", pg.published !== false, "Published")}</div>
    <div class="panel"><h3>Content in each language</h3>${langTabs("pg")}${langPanes((l) => input("title." + l, pg.title?.[l], "Title (" + l.toUpperCase() + ")") + textarea("body." + l, pg.body?.[l], "Text (" + l.toUpperCase() + ") — plain text, blank line = new paragraph", 18))}</div>
  </form>`;
}

function viewSettings() {
  const s = store.settings || {};
  return `<div class="a-title"><h1>Settings</h1><div class="actions"><button class="btn primary" id="saveSettings">Save</button></div></div>
  <form id="f" onsubmit="return false" style="display:flex;flex-direction:column;gap:16px">
    <div class="panel"><h3>Site</h3>
      ${input("mediaBaseUrl", s.mediaBaseUrl ?? "https://clicksolutionspro.com/discloj/media/", "Media base URL (where photos/ and videos/ live)", "url")}
      <div class="row3">${input("credits", s.credits ?? "by Fadi & Sami", "Credits")}${input("cover", s.cover ?? "cover.jpg", "Cover image (path or URL)")}${input("contactEmail", s.contactEmail ?? "", "Contact e-mail (optional)", "email")}</div>
      <div class="field"><label>Default language</label><select name="defaultLanguage">${LANGS.map((l) => `<option value="${l.code}" ${(s.defaultLanguage || "en") === l.code ? "selected" : ""}>${l.name}</option>`).join("")}</select></div>
    </div>
    <div class="panel"><h3>Title per language</h3><div class="lang-grid">${LANGS.map((l) => input("title." + l.code, s.title?.[l.code], l.name)).join("")}</div></div>
    <div class="panel"><h3>Subtitle per language</h3><div class="lang-grid">${LANGS.map((l) => input("subtitle." + l.code, s.subtitle?.[l.code], l.name)).join("")}</div></div>
  </form>`;
}

function viewAppVersion() {
  const u = store.settings?.appUpdate || {};
  return `<div class="a-title"><div><div class="eyebrow">Native apps (Android / iOS)</div><h1>App version management</h1></div><div class="actions"><button class="btn primary" id="saveAppVersion">Save</button></div></div>
  <form id="f" onsubmit="return false" class="cols">
    <div class="panel"><h3>Versions</h3>
      ${input("appUpdate.latestVersion", u.latestVersion ?? APP_VERSION, "Latest version (older apps see a polite update suggestion)")}
      ${input("appUpdate.minVersion", u.minVersion ?? "", "Minimum version (older apps are BLOCKED until they update — leave empty to never block)")}
      <div class="hint">This admin/site code is <b>v${APP_VERSION}</b>. Version format: 2.0.4. The app compares its own version on every launch and offers the right store per device.</div>
    </div>
    <div class="panel"><h3>Store links</h3>
      ${input("appUpdate.androidUrl", u.androidUrl ?? "https://play.google.com/store/apps/details?id=com.clicksolutionspro.discloj", "Google Play URL (Android)", "url")}
      ${input("appUpdate.iosUrl", u.iosUrl ?? "", "App Store URL (iPhone) — fill in after the app is published", "url")}
      <div class="hint">If a store URL is empty, devices of that platform are never prompted.</div>
    </div>
  </form>`;
}

function viewTools() {
  return `<div class="a-title"><h1>Import / Export</h1></div>
  <div class="cols">
    <div class="panel"><h3>Import content.json</h3>
      <div class="hint">Loads the original disc content (places, photos, videos) into Firestore. Documents you already edited here are skipped unless you tick "overwrite".</div>
      <label class="check"><input type="checkbox" id="impForce"> Overwrite documents edited in adminos</label>
      <input type="file" id="impFile" accept="application/json" class="hidden">
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="impSite">Import from site (data/content.json)</button><button class="btn" id="impPick">Import from file…</button></div>
      <div class="progress hidden" id="impProg"><i></i></div><div class="hint" id="impLog"></div>
    </div>
    <div class="panel"><h3>Export backup</h3><div class="hint">Downloads everything (settings, places, photos, videos, pages) as one JSON file.</div><button class="btn" id="expBtn">Download backup JSON</button></div>
  </div>`;
}

// ---------- render ----------
function render() {
  if (!user) { $root.innerHTML = `<div class="login"><form class="box" id="loginForm"><div class="eyebrow">Discover the Land of Jesus</div><h1>Adminos</h1>
    ${input("email", localStorage.getItem("adminos.email") || "", "E-mail", "email", "autocomplete=username required")}${input("password", "", "Password", "password", "autocomplete=current-password required")}
    <div class="err" id="loginErr"></div><button class="btn primary" type="submit">Sign in</button><a href="#" id="forgot" class="hint">Forgot password?</a></form></div>`;
    return;
  }
  if (user.uid !== ADMIN_UID) { $root.innerHTML = `<div class="login"><div class="box"><h1>Not authorised</h1><p class="hint">${esc(user.email)} is signed in but is not the admin account.<br>UID: <code>${esc(user.uid)}</code></p><button class="btn" id="signOut">Sign out</button></div></div>`; return; }
  const r = route();
  if (!store.ready && !store.places.length) { $root.innerHTML = shell(`<div class="loading">Loading content…</div>`, r); return; }
  const views = { places: viewPlaces, place: viewPlace, photo: viewPhoto, newphoto: viewNewPhoto, videos: viewVideos, video: viewVideo, newvideo: viewNewVideo, pages: viewPages, page: viewPage, settings: viewSettings, appversion: viewAppVersion, tools: viewTools };
  $root.innerHTML = shell((views[r.view] || viewPlaces)(r), r);
  dirty = false;
}
let lastHash = location.hash;
subscribe(() => { if (!dirty) render(); }); // don't wipe a half-edited form when other content changes
window.addEventListener("hashchange", () => { if (dirty && !confirm("You have unsaved changes. Leave anyway?")) { history.replaceState(null, "", lastHash); return; } lastHash = location.hash; dirty = false; render(); });
window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
document.addEventListener("input", (e) => { if (e.target.closest("#f")) dirty = true; });

// ---------- actions ----------
document.addEventListener("click", async (e) => {
  const T = e.target;
  if (T.closest("#signOut")) { e.preventDefault(); await signOut(auth); return; }
  const tab = T.closest("[data-tab]"); if (tab) { activeLang = tab.dataset.tab; const box = tab.closest(".panel"); box.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === activeLang)); box.querySelectorAll("[data-pane]").forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== activeLang)); return; }
  const r = route();

  if (T.closest("#addPlace, #addPlace2")) {
    const code = prompt("New place code (2 letters, e.g. QQ):")?.trim().toLowerCase(); if (!code) return;
    if (!/^[a-z0-9]{2,4}$/.test(code) || placeById(code)) return toast("Invalid or existing code", true);
    const title = prompt("Title (English):") || code.toUpperCase();
    if (await save("places", code, { code, order: store.places.length + 1, title: { en: title }, videoCode: null, coverPhoto: null, published: false, photoCount: 0 }, "Place created (hidden until published)")) go("place", code);
    return;
  }
  if (T.closest("#savePlace")) {
    const d = collect(document.getElementById("f")); d.videoCode = d.videoCode || null; d.coverPhoto = d.coverPhoto || null;
    if (d.lat === null) delete d.lat; if (d.lng === null) delete d.lng;
    d.photoCount = photosOfPlace(r.a).length;
    await save("places", r.a, d); return;
  }
  if (T.closest("#delPlace")) { if (!confirm("Delete this place?")) return; try { await deleteDoc(doc(db, "places", r.a)); toast("Deleted"); go("places"); } catch (err) { toast(err.message, true); } return; }
  const mv = T.closest("[data-move]"); if (mv) {
    e.preventDefault(); const [code, d] = mv.dataset.move.split("|"); const photos = photosOfPlace(r.a); const i = photos.findIndex((p) => p.code === code); const j = i + (+d);
    if (j < 0 || j >= photos.length) return;
    const b = writeBatch(db); photos.forEach((p, k) => { const order = k === i ? j + 1 : k === j ? i + 1 : k + 1; b.set(doc(db, "photos", p.id), { order, editedInAdmin: true, updatedAt: serverTimestamp() }, { merge: true }); });
    try { await b.commit(); toast("Order updated"); } catch (err) { toast(err.message, true); } return;
  }
  if (T.closest("#savePhoto")) {
    const btn = T.closest("#savePhoto"); const d = collect(document.getElementById("f"));
    const code = (d.code || "").toUpperCase().trim(); if (!/^[A-Z0-9_-]{3,12}$/.test(code)) return toast("Code must be like AN31", true);
    if (btn.dataset.new && photoById(code)) return toast("A photo with this code already exists", true);
    d.code = code; d.videoCode = d.videoCode || null; for (const [g] of GOSPELS) d.bible[g] = d.bible[g] || null;
    if (await save("photos", code, d, "Photo saved — live in the app")) { if (btn.dataset.new) go("photo", code); else render(); }
    return;
  }
  if (T.closest("#delPhoto")) { if (!confirm("Delete photo " + r.a + "? (The image file itself is not removed.)")) return; const ph = photoById(r.a); try { await deleteDoc(doc(db, "photos", r.a)); toast("Deleted"); go("place", ph?.place || "places"); } catch (err) { toast(err.message, true); } return; }
  if (T.closest("#imgPick")) { document.getElementById("imgFile").click(); return; }
  const vp = T.closest("[data-vpick]"); if (vp) { document.querySelector(`[data-vfile="${vp.dataset.vpick}"]`).click(); return; }

  if (T.closest("#saveVideo")) {
    const btn = T.closest("#saveVideo"); const d = collect(document.getElementById("f"));
    const code = (d.code || "").toUpperCase().trim(); if (!/^[A-Z0-9_-]{2,12}$/.test(code)) return toast("Code must be like H70", true);
    if (btn.dataset.new && videoByCode(code)) return toast("A video with this code already exists", true);
    d.code = code; d.places = Object.entries(d.places || {}).filter(([, on]) => on).map(([id]) => id);
    for (const l of LANGS) if (!d.files[l.code]) delete d.files[l.code];
    if (await save("videos", code, d, "Video saved")) { if (btn.dataset.new) go("video", code); else render(); }
    return;
  }
  if (T.closest("#delVideo")) { if (!confirm("Delete video " + r.a + "?")) return; try { await deleteDoc(doc(db, "videos", r.a)); toast("Deleted"); go("videos"); } catch (err) { toast(err.message, true); } return; }

  if (T.closest("#addPage")) { const id = prompt("Page id (letters only, e.g. contact):")?.trim().toLowerCase(); if (!id || !/^[a-z0-9-]{2,30}$/.test(id)) return; go("page", id); return; }
  if (T.closest("#savePage")) { const d = collect(document.getElementById("f")); await save("pages", r.a, d, "Page saved"); return; }
  if (T.closest("#saveAppVersion")) { const d = collect(document.getElementById("f")); await save("settings", "site", d, "App version settings saved"); return; }
  if (T.closest("#saveSettings")) { const d = collect(document.getElementById("f")); d.languages = LANGS; await save("settings", "site", d, "Settings saved"); return; }

  if (T.closest("#impSite")) { try { const data = await (await fetch(SITE_ROOT + "data/content.json")).json(); await importContent(data); } catch (err) { toast("Could not load data/content.json: " + err.message, true); } return; }
  if (T.closest("#impPick")) { document.getElementById("impFile").click(); return; }
  if (T.closest("#expBtn")) {
    const out = {}; for (const c of ["settings", "places", "photos", "videos", "pages"]) { const qs = await getDocs(collection(db, c)); out[c] = qs.docs.map((d) => ({ id: d.id, ...d.data() })); }
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `discloj-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); return;
  }
});

document.addEventListener("change", async (e) => {
  const T = e.target;
  if (T.id === "imgFile" && T.files[0]) {
    const form = document.getElementById("f"); const code = (form.querySelector("[name=code]").value || "NEW").toUpperCase();
    const prog = document.getElementById("imgProg"); prog.classList.remove("hidden");
    try {
      const full = await resizeImage(T.files[0], 1600, 0.86), th = await resizeImage(T.files[0], 480, 0.78);
      const stamp = Date.now().toString(36);
      const url = await uploadBlob(`media/photos/${code}-${stamp}.jpg`, full, (p) => (prog.firstElementChild.style.width = p * 80 + "%"));
      const turl = await uploadBlob(`media/photos/thumbs/${code}-${stamp}.jpg`, th, (p) => (prog.firstElementChild.style.width = 80 + p * 20 + "%"));
      form.querySelector("[name=image]").value = url; form.querySelector("[name=thumb]").value = turl; dirty = true;
      document.getElementById("imgPreview").innerHTML = `<img src="${url}" alt="">`; toast("Image uploaded — press Save");
    } catch (err) { uploadError(err); } finally { prog.classList.add("hidden"); }
    return;
  }
  if (T.dataset.vfile && T.files[0]) {
    const l = T.dataset.vfile; const form = document.getElementById("f"); const code = (form.querySelector("[name=code]").value || "VIDEO").toUpperCase();
    const prog = document.querySelector(`[data-vprog="${l}"]`); prog.classList.remove("hidden");
    try {
      const url = await uploadBlob(`media/videos/${code}-${l.toUpperCase()}-${Date.now().toString(36)}.mp4`, T.files[0], (p) => (prog.firstElementChild.style.width = p * 100 + "%"));
      form.querySelector(`[name="files.${l}"]`).value = url; dirty = true; toast("Video uploaded — press Save");
    } catch (err) { uploadError(err); } finally { prog.classList.add("hidden"); }
    return;
  }
  if (T.id === "impFile" && T.files[0]) { try { await importContent(JSON.parse(await T.files[0].text())); } catch (err) { toast("Invalid file: " + err.message, true); } }
});

async function importContent(data) {
  const force = document.getElementById("impForce")?.checked; const log = document.getElementById("impLog"); const prog = document.getElementById("impProg"); prog.classList.remove("hidden");
  const existing = {}; for (const c of ["places", "photos", "videos"]) { const qs = await getDocs(collection(db, c)); existing[c] = Object.fromEntries(qs.docs.map((d) => [d.id, d.data()])); }
  const items = [
    ["settings", "site", { languages: data.languages, defaultLanguage: "en", mediaBaseUrl: "https://clicksolutionspro.com/discloj/media/", title: { en: "Discover the Land of Jesus", it: "Scopri la Terra di Gesù", es: "Descubre la Tierra de Jesús", fr: "Découvre la Terre de Jésus", de: "Entdecke das Land Jesu" }, credits: "by Fadi & Sami", cover: "cover.jpg" }],
    ...data.places.map((p) => ["places", p.code, { ...p, published: true }]),
    ...data.photos.map(({ sourceBmp, ...p }) => ["photos", p.code, { ...p, published: true }]),
    ...data.videos.map(({ sourceMpg, ...v }) => ["videos", v.code, { ...v, published: true }]),
    ...[["privacy", { en: "Privacy Policy", it: "Informativa sulla privacy", es: "Política de privacidad", fr: "Politique de confidentialité", de: "Datenschutzerklärung" }], ["disclaimer", { en: "Disclaimer", it: "Avvertenze", es: "Aviso legal", fr: "Avertissement", de: "Haftungsausschluss" }], ["about", { en: "About", it: "Chi siamo", es: "Acerca de", fr: "À propos", de: "Über uns" }]].map(([id, title]) => ["pages", id, { title, body: { en: "", it: "", es: "", fr: "", de: "" }, published: true }]),
  ];
  let done = 0, skipped = 0, batch = writeBatch(db), n = 0;
  for (const [col, id, d] of items) {
    const ex = existing[col]?.[id];
    if (ex?.editedInAdmin && !force) { skipped++; continue; }
    if (col === "settings" && store.settings && Object.keys(store.settings).length && !force) { skipped++; continue; }
    batch.set(doc(db, col, id), { ...d, updatedAt: serverTimestamp(), ...(ex ? {} : { createdAt: serverTimestamp() }) }, { merge: true }); n++; done++;
    if (n >= 400) { await batch.commit(); batch = writeBatch(db); n = 0; prog.firstElementChild.style.width = (done / items.length) * 100 + "%"; }
  }
  if (n) await batch.commit();
  prog.classList.add("hidden"); log.textContent = `Imported ${done} documents, skipped ${skipped} (already edited).`; toast("Import finished");
}

// ---------- auth ----------
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "loginForm") return; e.preventDefault();
  const email = e.target.email.value.trim(), pw = e.target.password.value; const err = document.getElementById("loginErr"); err.textContent = "";
  try { localStorage.setItem("adminos.email", email); await signInWithEmailAndPassword(auth, email, pw); } catch (ex) { err.textContent = ex.code === "auth/invalid-credential" ? "Wrong e-mail or password." : ex.message; }
});
document.addEventListener("click", async (e) => { if (e.target.id === "forgot") { e.preventDefault(); const email = document.querySelector("[name=email]")?.value.trim(); if (!email) return toast("Type your e-mail first", true); try { await sendPasswordResetEmail(auth, email); toast("Reset e-mail sent"); } catch (ex) { toast(ex.message, true); } } });

let storeStarted = false;
// Local preview of the admin UI without signing in (localhost only; saves will be refused by Firestore rules):  localStorage.adminosDemo = "1"
const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
if (IS_LOCAL && localStorage.getItem("adminosDemo") === "1") { user = { uid: ADMIN_UID, email: "demo preview (not signed in)" }; storeStarted = true; startStore({ all: true }); render(); }
onAuthStateChanged(auth, (u) => { if (!u && IS_LOCAL && localStorage.getItem("adminosDemo") === "1") return; user = u; if (u && u.uid === ADMIN_UID && !storeStarted) { storeStarted = true; startStore({ all: true }); } render(); });
