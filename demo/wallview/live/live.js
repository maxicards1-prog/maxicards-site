/* Mode « caméra en direct » de la démo WallView (extrait du prototype prototype_live, sans toucher l'appli).
 * Le modèle 3D à la vraie taille est fabriqué dans le navigateur (aucun envoi, aucun serveur) :
 *  - iPhone / iPad (Safari) : USDZ fabriqué ici -> AR Quick Look, ancrage « mur » ;
 *  - Android (Chrome + ARCore) : WebXR de model-viewer, ar-placement="wall" ;
 *  - autre cas : aperçu 3D + message clair (Scene Viewer ne lit pas les adresses blob:). */
import { layoutPanel, atlasPlan, modelAtlas, FRAME_CM, MAT_CM } from "./lib/panel.js";
import { paintAtlas, encodeCanvas } from "./lib/atlas_canvas.js";
import { buildGlb } from "./lib/glb.js";

var $ = function (id) { return document.getElementById(id); };
var mv = $("mv");

var PRODUCTS = [
  { id: "cote-sauvage", title: "Affiche « Côte sauvage »", image: "live/oeuvres/cote-sauvage.jpg", mode: "print", frame: "black", mat: true,
    sizes: [["A4", 21, 29.7], ["30 × 40 cm", 30, 40], ["50 × 70 cm", 50, 70], ["70 × 100 cm", 70, 100]], size: 2 },
  { id: "formes", title: "Toile « Formes »", image: "live/oeuvres/formes.jpg", mode: "canvas", frame: "none", mat: false,
    sizes: [["60 × 45 cm", 60, 45], ["80 × 60 cm", 80, 60], ["120 × 90 cm", 120, 90]], size: 1 },
  { id: "good-vibes", title: "Néon « Good vibes »", image: "live/oeuvres/good-vibes.png", mode: "neon", frame: "none", mat: false,
    sizes: [["60 × 30 cm", 60, 30], ["100 × 50 cm", 100, 50]], size: 1 }
];
var FRAMES = [["none", "Sans"], ["black", "Noir"], ["white", "Blanc"], ["oak", "Chêne"]];

var QUICK_LOOK = (function () { var a = document.createElement("a"); return !!(a.relList && a.relList.supports && a.relList.supports("ar")); })();
var usdzMod = null; // chargé d'avance sur iPhone : le toucher ouvre Quick Look sans attente
if (QUICK_LOOK) import("./lib/usdz.js").then(function (m) { usdzMod = m; });

var st = { product: PRODUCTS[0], sizeIndex: 2, frame: "black", mat: true, art: null, build: 0, current: null, usdz: null, usdzPromise: null };

function fmt(cm) { return (Math.round(cm * 10) / 10).toString().replace(".", ","); }
function status(text, warn) { var s = $("status"); s.textContent = text || ""; s.classList.toggle("warn", !!warn); }

function loadImage(src) {
  return new Promise(function (ok, ko) {
    var img = new Image();
    img.onload = function () { ok(img); };
    img.onerror = function () { ko(new Error("image: " + src)); };
    img.src = src;
  });
}

function chip(html, pressed, onclick) {
  var b = document.createElement("button");
  b.type = "button"; b.className = "lv-chip"; b.textContent = html; b.setAttribute("aria-pressed", pressed ? "true" : "false");
  b.addEventListener("click", onclick);
  return b;
}

function render() {
  var p = st.product;
  var row = $("lvArt"); row.textContent = "";
  PRODUCTS.forEach(function (q) { row.appendChild(chip(q.title, q === p, function () { selectProduct(q); })); });
  var sr = $("lvSize"); sr.textContent = "";
  p.sizes.forEach(function (s, i) { sr.appendChild(chip(s[0], i === st.sizeIndex, function () { st.sizeIndex = i; render(); rebuild(); })); });
  var print = p.mode === "print";
  $("lvFrameBlock").hidden = !print;
  var fr = $("lvFrame"); fr.textContent = "";
  FRAMES.forEach(function (f) { fr.appendChild(chip(f[1], st.frame === f[0], function () { st.frame = f[0]; render(); rebuild(); })); });
  $("lvMat").setAttribute("aria-pressed", st.mat ? "true" : "false");
  $("lvMat").textContent = st.mat ? "Avec passe-partout" : "Sans passe-partout";
}

function selectProduct(p) {
  st.product = p; st.frame = p.frame; st.mat = p.mat; st.sizeIndex = p.size;
  render();
  status("Chargement de l'œuvre…");
  loadImage(p.image).then(function (img) { if (st.product === p) { st.art = img; rebuild(); } })
    .catch(function () { status("L'œuvre n'a pas pu être chargée.", true); });
}
$("lvMat").addEventListener("click", function () { st.mat = !st.mat; render(); rebuild(); });

function layoutNow() {
  var s = st.product.sizes[st.sizeIndex];
  return layoutPanel({ wCm: s[1], hCm: s[2], mode: st.product.mode, frame: st.frame, frameCm: FRAME_CM, mat: st.mat, matCm: MAT_CM });
}

async function rebuild() {
  if (!st.art) return;
  var token = ++st.build, L = layoutNow(), s = st.product.sizes[st.sizeIndex];
  st.usdz = null; st.usdzPromise = null;
  var plan = atlasPlan(L), canvas = paintAtlas(L, plan, st.art);
  var image = await encodeCanvas(canvas, L.mode === "neon");
  var model = modelAtlas(L, plan, image), glb = buildGlb(model);
  if (token !== st.build) return;
  var src = URL.createObjectURL(new Blob([glb], { type: "model/gltf-binary" }));
  st.current = { L: L, model: model, canvas: canvas, glb: glb };
  var old = mv.src;
  mv.src = src;
  if (old && old.indexOf("blob:") === 0) mv.addEventListener("load", function () { URL.revokeObjectURL(old); }, { once: true });
  var outW = L.W * 100, outH = L.H * 100;
  $("dimW").textContent = fmt(outW) + " cm"; $("dimH").textContent = fmt(outH) + " cm";
  mv.updateHotspot({ name: "hotspot-w", position: "0 " + (-L.H / 2 - 0.07) + " " + L.zTop });
  mv.updateHotspot({ name: "hotspot-h", position: (L.W / 2 + 0.12) + " 0 " + L.zTop });
  $("lvStage").classList.toggle("night", L.mode === "neon");
  var extra = L.framed || L.hasMat ? " · avec " + (L.framed ? "cadre" : "") + (L.framed && L.hasMat ? " et " : "") + (L.hasMat ? "passe-partout" : "") + " : " + fmt(outW) + " × " + fmt(outH) + " cm" : "";
  var sl = $("lvSizes"); sl.textContent = ""; var strong = document.createElement("strong"); strong.textContent = "Œuvre " + fmt(s[1]) + " × " + fmt(s[2]) + " cm"; sl.appendChild(strong); sl.appendChild(document.createTextNode(extra));
  status("");
  if (QUICK_LOOK) setTimeout(function () { if (token === st.build) makeUsdz().catch(function () {}); }, 400);
}

// iPhone : USDZ fabriqué à partir du même maillage et de la même texture (ancrage vertical = mur)
async function makeUsdz() {
  if (st.usdz) return st.usdz;
  if (st.usdzPromise) return st.usdzPromise;
  var cur = st.current;
  if (!cur) throw new Error("pas de modèle");
  st.usdzPromise = import("./lib/usdz.js").then(function (m) { return m.buildUsdz(cur.model, cur.canvas, "mur"); }).then(function (bytes) {
    if (st.current !== cur) throw new Error("périmé");
    st.usdz = { bytes: bytes, url: URL.createObjectURL(new Blob([bytes], { type: "model/vnd.usdz+zip" })) };
    return st.usdz;
  });
  return st.usdzPromise;
}

var HINT = "Visez votre mur et bougez le téléphone lentement : l'œuvre se colle au mur, à sa vraie taille.";

// L'appareil gère-t-il la réalité augmentée ? (affiche le bon message, avec QR code sur ordinateur)
function arSupport() {
  var coarse = window.matchMedia && matchMedia("(pointer:coarse)").matches;
  var live = QUICK_LOOK || mv.canActivateAR;
  var box = $("noAr");
  box.hidden = live;
  if (live) return;
  box.classList.toggle("is-phone", coarse);
  $("noArDesktop").hidden = coarse;
  $("noArPhone").hidden = !coarse;
  $("liveBtn").classList.add("is-off");
}

$("liveBtn").addEventListener("click", async function () {
  var btn = this;
  if (!st.current) { status("Un instant, l'œuvre se prépare…"); return; }
  if (QUICK_LOOK) {
    if (st.usdz && usdzMod) { usdzMod.openQuickLook(st.usdz.url, true); status(HINT); return; } // synchrone : garde le geste
    btn.disabled = true; status("Préparation du fichier 3D pour votre iPhone…");
    try {
      var u = await makeUsdz(), m = usdzMod || await import("./lib/usdz.js");
      m.openQuickLook(u.url, true);
      status(HINT);
    } catch (e) { status("La réalité augmentée n'a pas pu démarrer. Essayez le mode photo plus bas.", true); }
    btn.disabled = false;
    return;
  }
  if (mv.canActivateAR) { status("Ouverture de la caméra… " + HINT); mv.activateAR(); return; }
  arSupport();
  $("noAr").scrollIntoView({ behavior: "smooth", block: "center" });
});
mv.addEventListener("ar-status", function (e) {
  if (e.detail.status === "failed") status("La vue en direct n'est pas disponible sur cet appareil. Essayez Chrome (Android) ou Safari (iPhone), ou le mode photo plus bas.", true);
  if (e.detail.status === "session-started") status("");
});
mv.addEventListener("ar-tracking", function (e) {
  if (e.detail.status === "not-tracking") status("Bougez doucement le téléphone et visez une partie du mur avec un peu de relief ou de lumière.", true);
});
mv.addEventListener("error", function () { status("Le modèle 3D n'a pas pu être chargé.", true); });
mv.addEventListener("load", function () { arSupport(); });

// accroche de test (Playwright) : état et fabrication du fichier iPhone
window.__wv = { st: st, PRODUCTS: PRODUCTS, quickLook: QUICK_LOOK, makeUsdz: makeUsdz, selectProduct: selectProduct,
  set: function (o) { for (var k in o) st[k] = o[k]; render(); return rebuild(); } };

customElements.whenDefined("model-viewer").then(function () { selectProduct(PRODUCTS[0]); });
