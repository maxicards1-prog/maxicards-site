/* Wall Viewer — "see it on your wall" for posters, prints, canvases and neon signs.
 * Runs 100 % in the shopper's browser: the room photo never leaves the device (no upload, no AI cost).
 * Public API: window.WallViewer.open(options) — see DEFAULTS below. Loaded on demand by wall-button.js.
 */
(function () {
  "use strict";
  if (window.WallViewer) return;

  var DEFAULTS = {
    artworkUrl: "",            // image of the artwork alone (no mockup), ideally >= 1200 px
    title: "",
    sizes: [],                 // [{label, wCm, hCm, variantId, available}]
    selectedVariantId: null,
    mode: "print",             // "print" | "canvas" | "neon"
    frames: ["none", "black", "white", "oak"],
    defaultFrame: "black",
    mat: true,                 // offer a passe-partout
    accent: "#111111",
    lang: "en",
    photoRooms: [],            // photographed sample rooms shipped with the app: [{url, pxPerCm, anchor: [x, y]}], shown first
    rooms: [],                 // extra sample rooms: [{url, pxPerCm, label}] (merchant uploads)
    addToCart: true,
    badge: false,              // free plan: small "Powered by WallView" line under the privacy note
    onEvent: null,             // function(name, data) — anonymous analytics hook
    onExport: null             // function(blob) — replaces share/download (e.g. show the image in a sandboxed page)
  };

  var T = {
    en: {
      title: "See it on your wall", takePhoto: "Take a photo", choosePhoto: "Choose a photo",
      sample: "Sample room", size: "Size", frame: "Frame", none: "None", black: "Black", white: "White",
      oak: "Oak", mat: "Mat", measure: "Set scale", perspective: "Angle", night: "Night",
      share: "Save image", add: "Add to cart", added: "Added ✓ — view cart", close: "Close",
      hint: "Drag to move · pinch or use the slider to adjust the scale",
      perspHint: "Drag the 4 corners to match the angle of your wall",
      measureHint: "Draw a line along something you know (a door, a sheet of paper)…",
      howLong: "How long is this line?", door: "Door height (204 cm)", a4: "A4 sheet (29.7 cm)",
      custom: "Other (cm)", ok: "OK", cancel: "Cancel", privacy: "Your photo stays on your device.",
      scale: "Scale", soldOut: "Sold out", loading: "Loading…", error: "Could not load the image."
    },
    fr: {
      title: "Voir sur mon mur", takePhoto: "Prendre une photo", choosePhoto: "Choisir une photo",
      sample: "Pièce d'exemple", size: "Taille", frame: "Cadre", none: "Sans", black: "Noir", white: "Blanc",
      oak: "Chêne", mat: "Passe-partout", measure: "Régler l'échelle", perspective: "Angle", night: "Nuit",
      share: "Enregistrer l'image", add: "Ajouter au panier", added: "Ajouté ✓ — voir le panier", close: "Fermer",
      hint: "Glissez pour déplacer · pincez ou utilisez le curseur pour l'échelle",
      perspHint: "Tirez les 4 coins pour suivre l'angle du mur",
      measureHint: "Tracez une ligne le long d'un objet connu (une porte, une feuille)…",
      howLong: "Quelle longueur fait cette ligne ?", door: "Hauteur de porte (204 cm)", a4: "Feuille A4 (29,7 cm)",
      custom: "Autre (cm)", ok: "OK", cancel: "Annuler", privacy: "Votre photo reste sur votre appareil.",
      scale: "Échelle", soldOut: "Épuisé", loading: "Chargement…", error: "Impossible de charger l'image."
    }
  };

  var FRAME_COLORS = { black: ["#1b1b1b", "#3a3a3a"], white: ["#f4f4f2", "#d9d9d6"], oak: ["#b88a55", "#8c6239"] };
  var FRAME_CM = 2.2, MAT_CM = 5, CANVAS_DEPTH_CM = 3;

  // ---------- small helpers ----------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "style") e.style.cssText = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function loadImage(src) {
    return new Promise(function (ok, ko) {
      var img = new Image();
      if (!/^(data|blob):/.test(src)) img.crossOrigin = "anonymous";
      img.onload = function () { ok(img); };
      img.onerror = ko;
      img.src = src;
    });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- geometry: unit square -> quad homography (Heckbert) + affine triangle mapping ----------
  function squareToQuad(p) {
    var x0 = p[0][0], y0 = p[0][1], x1 = p[1][0], y1 = p[1][1], x2 = p[2][0], y2 = p[2][1], x3 = p[3][0], y3 = p[3][1];
    var dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    var a, b, c, d, e, f, g, h;
    if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
      a = x1 - x0; b = x2 - x1; c = x0; d = y1 - y0; e = y2 - y1; f = y0; g = 0; h = 0;
    } else {
      var den = dx1 * dy2 - dx2 * dy1;
      g = (dx3 * dy2 - dx2 * dy3) / den; h = (dx1 * dy3 - dx3 * dy1) / den;
      a = x1 - x0 + g * x1; b = x3 - x0 + h * x3; c = x0; d = y1 - y0 + g * y1; e = y3 - y0 + h * y3; f = y0;
    }
    return function (u, v) { var w = g * u + h * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; };
  }
  function affineFrom(s0, s1, s2, d0, d1, d2) {
    var x0 = s0[0], y0 = s0[1], x1 = s1[0], y1 = s1[1], x2 = s2[0], y2 = s2[1];
    var det = x0 * (y1 - y2) - x1 * (y0 - y2) + x2 * (y0 - y1);
    var i00 = (y1 - y2) / det, i01 = (y2 - y0) / det, i02 = (y0 - y1) / det;
    var i10 = (x2 - x1) / det, i11 = (x0 - x2) / det, i12 = (x1 - x0) / det;
    var i20 = (x1 * y2 - x2 * y1) / det, i21 = (x2 * y0 - x0 * y2) / det, i22 = (x0 * y1 - x1 * y0) / det;
    return [
      i00 * d0[0] + i01 * d1[0] + i02 * d2[0], i00 * d0[1] + i01 * d1[1] + i02 * d2[1],
      i10 * d0[0] + i11 * d1[0] + i12 * d2[0], i10 * d0[1] + i11 * d1[1] + i12 * d2[1],
      i20 * d0[0] + i21 * d1[0] + i22 * d2[0], i20 * d0[1] + i21 * d1[1] + i22 * d2[1]
    ];
  }
  function inflate(t, px) { // grow a triangle a little to hide seams between neighbours
    var cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    return t.map(function (p) {
      var dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1;
      return [p[0] + dx / l * px, p[1] + dy / l * px];
    });
  }
  function drawWarped(ctx, src, quad, base, n) { // draws canvas/image src into quad (device px), n x n grid
    var W = src.width, H = src.height, map = squareToQuad(quad), pts = [];
    var gx = quad[0][0] - quad[1][0] + quad[2][0] - quad[3][0], gy = quad[0][1] - quad[1][1] + quad[2][1] - quad[3][1];
    if (Math.abs(gx) < 0.5 && Math.abs(gy) < 0.5) { // parallelogram (no perspective): one exact affine draw, no seam
      var a = affineFrom([0, 0], [W, 0], [0, H], quad[0], quad[1], quad[3]);
      ctx.save();
      ctx.setTransform(base[0], base[1], base[2], base[3], base[4], base[5]);
      ctx.transform(a[0], a[1], a[2], a[3], a[4], a[5]);
      ctx.drawImage(src, 0, 0);
      ctx.restore();
      return;
    }
    for (var j = 0; j <= n; j++) { pts[j] = []; for (var i = 0; i <= n; i++) pts[j][i] = map(i / n, j / n); }
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
      var s00 = [i / n * W, j / n * H], s10 = [(i + 1) / n * W, j / n * H], s11 = [(i + 1) / n * W, (j + 1) / n * H], s01 = [i / n * W, (j + 1) / n * H];
      var tris = [[s00, s10, s11, pts[j][i], pts[j][i + 1], pts[j + 1][i + 1]], [s00, s11, s01, pts[j][i], pts[j + 1][i + 1], pts[j + 1][i]]];
      tris.forEach(function (t) {
        // 2 px: the shared diagonal only moves ~1/3 of it outward; nothing bleeds past the quad (src is clipped by its own bounds)
        var dst = inflate([t[3], t[4], t[5]], 2), m = affineFrom(t[0], t[1], t[2], t[3], t[4], t[5]);
        ctx.save();
        ctx.setTransform(base[0], base[1], base[2], base[3], base[4], base[5]);
        ctx.beginPath(); ctx.moveTo(dst[0][0], dst[0][1]); ctx.lineTo(dst[1][0], dst[1][1]); ctx.lineTo(dst[2][0], dst[2][1]); ctx.closePath();
        ctx.clip();
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
        ctx.drawImage(src, 0, 0);
        ctx.restore();
      });
    }
  }
  function inQuad(q, x, y) {
    var sign = 0;
    for (var i = 0; i < 4; i++) {
      var a = q[i], b = q[(i + 1) % 4], c = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
      if (c !== 0) { if (sign === 0) sign = c > 0 ? 1 : -1; else if ((c > 0 ? 1 : -1) !== sign) return false; }
    }
    return true;
  }

  // ---------- sample room drawn in code (known scale: 3.2 px per cm) ----------
  function sampleRoom(wall) {
    var S = 3.2, W = 1600, H = 1100, floorY = 880, c = document.createElement("canvas");
    c.width = W; c.height = H;
    var g = c.getContext("2d");
    var wg = g.createLinearGradient(0, 0, W, floorY);
    wg.addColorStop(0, wall[0]); wg.addColorStop(1, wall[1]);
    g.fillStyle = wg; g.fillRect(0, 0, W, floorY);
    var lg = g.createRadialGradient(W * 0.3, -200, 50, W * 0.3, -200, 1300); // soft window light
    lg.addColorStop(0, "rgba(255,250,235,0.35)"); lg.addColorStop(1, "rgba(255,250,235,0)");
    g.fillStyle = lg; g.fillRect(0, 0, W, floorY);
    g.fillStyle = "#8a6a4a"; g.fillRect(0, floorY, W, H - floorY);           // wooden floor
    for (var i = 0; i < 14; i++) {
      g.fillStyle = i % 2 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";
      g.fillRect(0, floorY + i * 16, W, 16);
    }
    g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(0, floorY - 10 * S / 3.2 * 3.2, W, 10); // baseboard
    // sofa (220 cm wide, seat 45 cm, back 85 cm)
    var sx = W / 2 - 110 * S, sw = 220 * S, top = floorY - 85 * S;
    g.fillStyle = "rgba(0,0,0,0.18)"; g.beginPath(); g.ellipse(W / 2, floorY + 8, sw / 2 + 30, 22, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#5c6b73"; roundRect(g, sx, top, sw, 60 * S, 26); g.fill();
    g.fillStyle = "#6d7d86"; roundRect(g, sx - 12, floorY - 45 * S, sw + 24, 32 * S, 22); g.fill();
    g.fillStyle = "#56646b"; roundRect(g, sx - 30, floorY - 62 * S, 34, 50 * S, 16); g.fill(); roundRect(g, sx + sw - 4, floorY - 62 * S, 34, 50 * S, 16); g.fill();
    g.fillStyle = "#3b3b3b"; g.fillRect(sx + 20, floorY - 13 * S, 10, 13 * S); g.fillRect(sx + sw - 30, floorY - 13 * S, 10, 13 * S);
    g.fillStyle = "#e8d9c0"; roundRect(g, sx + 40, top + 40, 55 * S, 38 * S, 18); g.fill(); // cushion
    // plant (pot 35 cm)
    var px = W - 200, py = floorY;
    g.fillStyle = "#c9b8a3"; roundRect(g, px - 18 * S, py - 40 * S, 36 * S, 40 * S, 10); g.fill();
    g.fillStyle = "#3f6b45";
    for (var k = 0; k < 9; k++) { g.beginPath(); g.ellipse(px + Math.cos(k) * 22 * S, py - 70 * S - Math.sin(k * 1.7) * 30 * S, 9 * S, 26 * S, k * 0.7, 0, Math.PI * 2); g.fill(); }
    // floor lamp
    g.fillStyle = "#2c2c2c"; g.fillRect(180, floorY - 160 * S, 6, 160 * S);
    g.fillStyle = "#efe6d6"; g.beginPath(); g.moveTo(140, floorY - 160 * S); g.lineTo(226, floorY - 160 * S); g.lineTo(206, floorY - 195 * S); g.lineTo(160, floorY - 195 * S); g.closePath(); g.fill();
    return { canvas: c, pxPerCm: S, anchor: [W / 2, top - 30 * S] }; // anchor = default artwork centre (above the sofa)
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  var SAMPLE_WALLS = [["#efe9e1", "#e2d9cc"], ["#c9d3c4", "#b3c0ae"], ["#2f3e4e", "#243241"]];

  // ---------- the viewer ----------
  function open(userOpts) {
    var o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in userOpts || {}) o[k] = userOpts[k];
    var t = T[(o.lang || "en").slice(0, 2)] || T.en;
    var emit = function (n, d) { try { if (o.onEvent) o.onEvent(n, d || {}); } catch (e) { /* analytics never breaks the viewer */ } };

    var st = {
      bg: null, pxPerCm: 1, center: [0, 0], quad: null, persp: false, frame: o.mode === "print" ? o.defaultFrame : "none",
      mat: o.mode === "print" && o.mat, night: o.mode === "neon", art: null, comp: null,
      size: Math.max(0, o.sizes.findIndex(function (s) { return String(s.variantId) === String(o.selectedVariantId); })),
      roomIdx: 0, measuring: false, line: null
    };
    if (!o.sizes.length) o.sizes = [{ label: "50 × 70 cm", wCm: 50, hCm: 70, variantId: null }];

    // ----- DOM -----
    var root = el("div", { "class": "wv-root", role: "dialog", "aria-modal": "true", "aria-label": t.title });
    root.style.setProperty("--wv-accent", o.accent);
    var canvas = el("canvas", { "class": "wv-canvas" });
    var stage = el("div", { "class": "wv-stage" }, [canvas, el("div", { "class": "wv-hint", text: t.hint })]);
    var fileCam = el("input", { type: "file", accept: "image/*", capture: "environment", hidden: "" });
    var fileLib = el("input", { type: "file", accept: "image/*", hidden: "" });
    var sizeRow = el("div", { "class": "wv-chips" }), frameRow = el("div", { "class": "wv-chips" });
    var scale = el("input", { type: "range", min: "-60", max: "60", value: "0", "aria-label": t.scale, "class": "wv-range" });
    var addBtn = el("button", { "class": "wv-primary", type: "button", text: t.add });
    var shareBtn = el("button", { "class": "wv-secondary", type: "button", text: t.share });
    var toggles = el("div", { "class": "wv-chips" });
    var header = el("div", { "class": "wv-head" }, [
      el("strong", { text: t.title }),
      el("button", { "class": "wv-x", type: "button", "aria-label": t.close, text: "×", onclick: close })
    ]);
    var sources = el("div", { "class": "wv-chips wv-sources" }, [
      el("button", { type: "button", "class": "wv-chip", text: "📷 " + t.takePhoto, onclick: function () { fileCam.click(); } }),
      el("button", { type: "button", "class": "wv-chip", text: "🖼️ " + t.choosePhoto, onclick: function () { fileLib.click(); } }),
      el("button", { type: "button", "class": "wv-chip", text: "🛋️ " + t.sample, onclick: nextRoom })
    ]);
    var panel = el("div", { "class": "wv-panel" }, [
      sources,
      el("div", { "class": "wv-label", text: t.size }), sizeRow,
      o.mode === "print" ? el("div", { "class": "wv-label", text: t.frame }) : null, o.mode === "print" ? frameRow : null,
      toggles,
      el("label", { "class": "wv-scale" }, [el("span", { text: t.scale }), scale]),
      el("div", { "class": "wv-actions" }, [shareBtn, o.addToCart ? addBtn : null]),
      el("div", { "class": "wv-privacy", text: "🔒 " + t.privacy + (o.badge ? " · Powered by WallView" : "") })
    ]);
    root.appendChild(el("div", { "class": "wv-box" }, [header, stage, panel, fileCam, fileLib]));
    document.body.appendChild(root);
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    var ctx = canvas.getContext("2d");

    function close() {
      root.remove(); document.body.style.overflow = prevOverflow;
      window.removeEventListener("resize", layout); document.removeEventListener("keydown", onKey);
      emit("close");
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);

    // ----- chips -----
    function chip(label, active, onclick, disabled) {
      var b = el("button", { type: "button", "class": "wv-chip" + (active ? " is-on" : ""), text: label, onclick: onclick });
      if (disabled) b.disabled = true;
      return b;
    }
    function renderChips() {
      sizeRow.innerHTML = "";
      o.sizes.forEach(function (s, i) {
        sizeRow.appendChild(chip(s.label + (s.available === false ? " · " + t.soldOut : ""), i === st.size, function () {
          var old = o.sizes[st.size]; st.size = i; rescaleQuad(old, o.sizes[i]); renderChips(); rebuildComposite(); draw();
          emit("size", { label: s.label });
        }));
      });
      frameRow.innerHTML = "";
      o.frames.forEach(function (f) {
        frameRow.appendChild(chip(t[f] || f, st.frame === f, function () { st.frame = f; renderChips(); rebuildComposite(); draw(); }));
      });
      toggles.innerHTML = "";
      if (o.mode === "print" && o.mat) toggles.appendChild(chip("▢ " + t.mat, st.mat, function () { st.mat = !st.mat; renderChips(); rebuildComposite(); draw(); }));
      toggles.appendChild(chip("⟂ " + t.perspective, st.persp, togglePersp));
      toggles.appendChild(chip("📏 " + t.measure, st.measuring, startMeasure));
      if (o.mode === "neon") toggles.appendChild(chip("🌙 " + t.night, st.night, function () { st.night = !st.night; renderChips(); draw(); }));
      var cur = o.sizes[st.size];
      addBtn.disabled = !cur || !cur.variantId || cur.available === false;
    }

    // ----- artwork composite (artwork + mat + frame) in an offscreen canvas, real proportions -----
    function outerCm() {
      var s = o.sizes[st.size], m = st.mat ? MAT_CM : 0, f = st.frame !== "none" ? FRAME_CM : 0;
      return [s.wCm + 2 * (m + f), s.hCm + 2 * (m + f)];
    }
    function rebuildComposite() {
      if (!st.art) return;
      var s = o.sizes[st.size], oc = outerCm(), ppc = Math.min(12, 1600 / Math.max(oc[0], oc[1]));
      var c = document.createElement("canvas");
      c.width = Math.round(oc[0] * ppc); c.height = Math.round(oc[1] * ppc);
      var g = c.getContext("2d"), f = st.frame !== "none" ? FRAME_CM * ppc : 0, m = st.mat ? MAT_CM * ppc : 0;
      if (f) {
        var fc = FRAME_COLORS[st.frame], gr = g.createLinearGradient(0, 0, c.width, c.height);
        gr.addColorStop(0, fc[0]); gr.addColorStop(1, fc[1]);
        g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
        g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = Math.max(1, ppc * 0.3); g.strokeRect(1, 1, c.width - 2, c.height - 2);
      }
      if (m) { g.fillStyle = "#fbfaf7"; g.fillRect(f, f, c.width - 2 * f, c.height - 2 * f); }
      var ax = f + m, ay = f + m, aw = c.width - 2 * (f + m), ah = c.height - 2 * (f + m);
      // cover-crop the artwork to the chosen size ratio (like a print shop would)
      var ir = st.art.width / st.art.height, tr = aw / ah, sw = st.art.width, sh = st.art.height, sx = 0, sy = 0;
      if (ir > tr) { sw = sh * tr; sx = (st.art.width - sw) / 2; } else { sh = sw / tr; sy = (st.art.height - sh) / 2; }
      g.drawImage(st.art, sx, sy, sw, sh, ax, ay, aw, ah);
      if (m) { g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = Math.max(1, ppc * 0.15); g.strokeRect(ax, ay, aw, ah); }
      if (o.mode === "canvas") { // stretched canvas: slight edge shading
        var eg = g.createLinearGradient(0, 0, c.width, 0);
        eg.addColorStop(0, "rgba(0,0,0,0.18)"); eg.addColorStop(0.04, "rgba(0,0,0,0)"); eg.addColorStop(0.96, "rgba(0,0,0,0)"); eg.addColorStop(1, "rgba(0,0,0,0.22)");
        g.fillStyle = eg; g.fillRect(0, 0, c.width, c.height);
      }
      st.comp = c;
    }

    // ----- placement in background pixel coordinates -----
    function rectQuad() {
      var oc = outerCm(), w = oc[0] * st.pxPerCm, h = oc[1] * st.pxPerCm, cx = st.center[0], cy = st.center[1];
      return [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
    }
    function currentQuad() { return st.persp && st.quad ? st.quad : rectQuad(); }
    function centroid(q) { return [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4]; }
    function scaleQuad(q, k) { var c = centroid(q); return q.map(function (p) { return [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]; }); }
    function rescaleQuad(oldS, newS) {
      if (!st.persp || !st.quad) return;
      var kOld = Math.hypot(oldS.wCm, oldS.hCm), kNew = Math.hypot(newS.wCm, newS.hCm);
      st.quad = scaleQuad(st.quad, kNew / kOld); // keeps the angle, follows the new real size (ratio change is approximated)
    }
    function togglePersp() { st.persp = !st.persp; if (st.persp) st.quad = rectQuad(); stage.querySelector(".wv-hint").textContent = st.persp ? t.perspHint : t.hint; renderChips(); draw(); }

    // ----- view transform (bg px -> canvas device px) -----
    var view = { s: 1, ox: 0, oy: 0, dpr: 1 };
    function layout() {
      var r = stage.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
      canvas.style.width = r.width + "px"; canvas.style.height = r.height + "px";
      view.dpr = dpr;
      if (st.bg) {
        var W = canvas.width, H = canvas.height, bw = st.bg.width, bh = st.bg.height;
        var fit = Math.min(W / bw, H / bh), cover = Math.max(W / bw, H / bh);
        // landscape room on a phone: fill the screen around the artwork (1.8x its size of wall stays visible around it)
        // instead of a small photo between two blurred bands
        var oc = outerCm(), artW = oc[0] * st.pxPerCm, artH = oc[1] * st.pxPerCm;
        var keep = artW > 0 && artH > 0 ? Math.min(W / (artW * 1.8), H / (artH * 1.8)) : fit;
        view.s = Math.max(fit, Math.min(cover, keep));
        var cx = st.center ? st.center[0] : bw / 2, cy = st.center ? st.center[1] : bh / 2;
        view.ox = bw * view.s >= W ? clamp(W / 2 - cx * view.s, W - bw * view.s, 0) : (W - bw * view.s) / 2;
        view.oy = bh * view.s >= H ? clamp(H / 2 - cy * view.s, H - bh * view.s, 0) : (H - bh * view.s) / 2;
      }
      draw();
    }
    function toBg(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      return [((clientX - r.left) * view.dpr - view.ox) / view.s, ((clientY - r.top) * view.dpr - view.oy) / view.s];
    }

    // ----- drawing (shared by screen and export) -----
    function wallLuma(q) { // average brightness of the wall around the artwork -> realistic ambient light
      try {
        var c = centroid(q), r = 24, x = clamp(Math.round(c[0] - r), 0, st.bg.width - 2 * r), y = clamp(Math.round(c[1] - r), 0, st.bg.height - 2 * r);
        if (!st.lumaCtx) { st.lumaCtx = document.createElement("canvas").getContext("2d", { willReadFrequently: true }); }
        var lc = st.lumaCtx; lc.canvas.width = 2 * r; lc.canvas.height = 2 * r;
        lc.drawImage(st.bg, x, y, 2 * r, 2 * r, 0, 0, 2 * r, 2 * r);
        var d = lc.getImageData(0, 0, 2 * r, 2 * r).data, sum = 0;
        for (var i = 0; i < d.length; i += 16) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        return sum / (d.length / 16) / 255;
      } catch (e) { return 0.75; }
    }
    function backdrop(g) { // soft blurred copy of the photo fills the letterbox bands instead of flat black
      if (st.blurSrc !== st.bg) { // tiny copy, scaled up with smoothing = a cheap blur that works in every browser
        var c = document.createElement("canvas"), r = 24 / Math.max(st.bg.width, st.bg.height);
        c.width = Math.max(1, Math.round(st.bg.width * r)); c.height = Math.max(1, Math.round(st.bg.height * r));
        c.getContext("2d").drawImage(st.bg, 0, 0, c.width, c.height);
        st.blurCanvas = c; st.blurSrc = st.bg;
      }
      var b = st.blurCanvas, W = g.canvas.width, H = g.canvas.height, s = Math.max(W / b.width, H / b.height);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
      g.drawImage(b, (W - b.width * s) / 2, (H - b.height * s) / 2, b.width * s, b.height * s);
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, 0, W, H);
    }
    function paint(g, base, scaleBg, forExport) {
      // base = [a,b,c,d,e,f] transform bg px -> target px
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "#111"; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      if (!st.bg) return;
      if (!forExport) backdrop(g);
      g.setTransform(base[0], base[1], base[2], base[3], base[4], base[5]);
      g.drawImage(st.bg, 0, 0);
      if (st.night) { g.fillStyle = "rgba(8,10,30,0.72)"; g.fillRect(0, 0, st.bg.width, st.bg.height); }
      if (!st.comp) return;
      var q = currentQuad(), dq = q.map(function (p) { return [base[0] * p[0] + base[2] * p[1] + base[4], base[1] * p[0] + base[3] * p[1] + base[5]]; });
      var depth = (o.mode === "canvas" ? CANVAS_DEPTH_CM : 1) * st.pxPerCm * scaleBg;
      // drop shadow (prints, canvases) or a faint clear acrylic backing (neon signs)
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      if (o.mode === "neon") { g.fillStyle = st.night ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.18)"; }
      else {
        g.shadowColor = "rgba(0,0,0,0.38)"; g.fillStyle = "rgba(0,0,0,0.9)";
        g.shadowBlur = Math.max(4, depth * 3); g.shadowOffsetX = depth * 0.6; g.shadowOffsetY = depth * 1.2;
      }
      g.beginPath(); g.moveTo(dq[0][0], dq[0][1]); for (var i = 1; i < 4; i++) g.lineTo(dq[i][0], dq[i][1]); g.closePath(); g.fill();
      g.restore();
      // artwork
      if (o.mode === "neon") {
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = "lighter";
        g.shadowColor = "rgba(255,255,255,0.9)"; g.shadowBlur = Math.max(8, depth * 10);
        drawWarped(g, st.comp, dq, [1, 0, 0, 1, 0, 0], st.persp ? 8 : 1);
        g.restore();
      } else {
        drawWarped(g, st.comp, dq, [1, 0, 0, 1, 0, 0], st.persp ? 10 : 1);
        // ambient light: darker rooms darken the print a little (multiply), like a real photo
        var L = wallLuma(q), k = clamp((0.85 - L) * 0.55, 0, 0.42);
        if (k > 0.01) {
          g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "multiply";
          var v = Math.round(255 * (1 - k)); g.fillStyle = "rgb(" + v + "," + v + "," + Math.round(v * 0.98) + ")";
          g.beginPath(); g.moveTo(dq[0][0], dq[0][1]); for (i = 1; i < 4; i++) g.lineTo(dq[i][0], dq[i][1]); g.closePath(); g.fill();
          g.restore();
        }
      }
      if (!forExport && st.persp) { // corner handles
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        dq.forEach(function (p) {
          g.beginPath(); g.arc(p[0], p[1], 11 * view.dpr, 0, Math.PI * 2);
          g.fillStyle = "rgba(255,255,255,0.95)"; g.fill(); g.lineWidth = 2 * view.dpr; g.strokeStyle = o.accent; g.stroke();
        });
        g.restore();
      }
    }
    function draw() {
      paint(ctx, [view.s, 0, 0, view.s, view.ox, view.oy], view.s, false);
      if (st.line) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        var a = st.line[0], b = st.line[1];
        ctx.strokeStyle = "#ffd400"; ctx.lineWidth = 4 * view.dpr; ctx.setLineDash([12 * view.dpr, 8 * view.dpr]);
        ctx.beginPath(); ctx.moveTo(a[0] * view.s + view.ox, a[1] * view.s + view.oy); ctx.lineTo(b[0] * view.s + view.ox, b[1] * view.s + view.oy); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ----- backgrounds -----
    function setBackground(img, pxPerCm, anchor) {
      var max = 2400, k = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      st.bg = c;
      // own photo: assume the picture shows ~2.6 m of wall vertically (typical phone shot); the user can fix it (scale / measure)
      st.pxPerCm = pxPerCm ? pxPerCm * k : c.height / 260;
      st.basePxPerCm = st.pxPerCm;
      st.center = anchor ? [anchor[0] * k, anchor[1] * k] : [c.width / 2, c.height * 0.42];
      st.persp = false; st.quad = null; scale.value = "0";
      layout(); renderChips();
    }
    function nextRoom() {
      var photos = (o.photoRooms || []).concat(o.rooms || []);
      var idx = st.roomIdx++ % (photos.length + SAMPLE_WALLS.length);
      var drawn = function (i) { var r = sampleRoom(SAMPLE_WALLS[i]); setBackground(r.canvas, r.pxPerCm, r.anchor); };
      if (idx < photos.length) {
        var m = photos[idx];
        loadImage(m.url).then(function (img) { setBackground(img, m.pxPerCm, m.anchor || null); })
          .catch(function () { drawn(0); }); // photo missing: fall back to a drawn room
      } else drawn(idx - photos.length);
      emit("room", { sample: true });
    }
    function onFile(e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var url = URL.createObjectURL(f);
      loadImage(url).then(function (img) { setBackground(img, null, null); URL.revokeObjectURL(url); emit("room", { sample: false }); })
        .catch(function () { alert(t.error); });
      e.target.value = "";
    }
    fileCam.addEventListener("change", onFile); fileLib.addEventListener("change", onFile);

    // ----- pointer interactions: drag, pinch, corners, measuring -----
    var pointers = {}, drag = null;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", function (e) {
      canvas.setPointerCapture(e.pointerId);
      var p = toBg(e.clientX, e.clientY);
      pointers[e.pointerId] = p;
      var ids = Object.keys(pointers);
      if (st.measuring) { st.line = [p, p]; drag = { type: "line" }; return; }
      if (ids.length === 2) { drag = { type: "pinch", d: dist(pointers[ids[0]], pointers[ids[1]]) }; return; }
      var q = currentQuad();
      if (st.persp) {
        for (var i = 0; i < 4; i++) if (Math.hypot(q[i][0] - p[0], q[i][1] - p[1]) * view.s < 26 * view.dpr) { drag = { type: "corner", i: i }; return; }
      }
      if (inQuad(q, p[0], p[1]) || true) drag = { type: "move", last: p }; // dragging anywhere moves the artwork (easier on phones)
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!(e.pointerId in pointers) || !drag) return;
      var p = toBg(e.clientX, e.clientY);
      pointers[e.pointerId] = p;
      if (drag.type === "line") { st.line[1] = p; draw(); return; }
      if (drag.type === "pinch") {
        var ids = Object.keys(pointers); if (ids.length < 2) return;
        var d = dist(pointers[ids[0]], pointers[ids[1]]), k = d / drag.d; drag.d = d;
        st.pxPerCm *= k; if (st.persp && st.quad) st.quad = scaleQuad(st.quad, k);
        syncSlider(); draw(); return;
      }
      if (drag.type === "corner") { st.quad[drag.i] = p; draw(); return; }
      if (drag.type === "move") {
        var dx = p[0] - drag.last[0], dy = p[1] - drag.last[1]; drag.last = p;
        st.center = [st.center[0] + dx, st.center[1] + dy];
        if (st.persp && st.quad) st.quad = st.quad.map(function (c) { return [c[0] + dx, c[1] + dy]; });
        draw();
      }
    });
    function up(e) {
      delete pointers[e.pointerId];
      if (drag && drag.type === "line") { finishMeasure(); }
      if (drag && drag.type === "pinch" && Object.keys(pointers).length === 1) { var id = Object.keys(pointers)[0]; drag = { type: "move", last: pointers[id] }; return; }
      if (!Object.keys(pointers).length) { if (drag && drag.type !== "line") emit("adjust"); drag = null; }
    }
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", function (e) { e.preventDefault(); var k = Math.exp(-e.deltaY * 0.0015); st.pxPerCm *= k; if (st.persp && st.quad) st.quad = scaleQuad(st.quad, k); syncSlider(); draw(); }, { passive: false });
    function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
    function syncSlider() { scale.value = String(clamp(Math.round(Math.log(st.pxPerCm / st.basePxPerCm) * 100), -60, 60)); }
    scale.addEventListener("input", function () {
      var target = st.basePxPerCm * Math.exp(Number(scale.value) / 100), k = target / st.pxPerCm;
      st.pxPerCm = target; if (st.persp && st.quad) st.quad = scaleQuad(st.quad, k); draw();
    });

    function startMeasure() {
      st.measuring = !st.measuring; st.line = null; renderChips(); draw();
      if (st.measuring) stage.querySelector(".wv-hint").textContent = t.measureHint;
    }
    function finishMeasure() {
      var a = st.line[0], b = st.line[1], px = dist(a, b);
      if (px < 10) { st.line = null; draw(); return; }
      askLength(function (cm) {
        if (cm > 0) {
          var k = (px / cm) / st.pxPerCm;
          st.pxPerCm = px / cm; st.basePxPerCm = st.pxPerCm; scale.value = "0";
          if (st.persp && st.quad) st.quad = scaleQuad(st.quad, k);
          emit("measure", { cm: cm });
        }
        st.measuring = false; st.line = null; stage.querySelector(".wv-hint").textContent = st.persp ? t.perspHint : t.hint; renderChips(); draw();
      });
    }
    function askLength(cb) {
      var input = el("input", { type: "number", min: "1", step: "0.1", placeholder: "cm", "class": "wv-input" });
      var box = el("div", { "class": "wv-ask" }, [
        el("strong", { text: t.howLong }),
        el("button", { type: "button", "class": "wv-chip", text: t.door, onclick: function () { done(204); } }),
        el("button", { type: "button", "class": "wv-chip", text: t.a4, onclick: function () { done(29.7); } }),
        el("div", { "class": "wv-row" }, [input, el("button", { type: "button", "class": "wv-primary", text: t.ok, onclick: function () { done(parseFloat(String(input.value).replace(",", "."))); } })]),
        el("button", { type: "button", "class": "wv-secondary", text: t.cancel, onclick: function () { done(0); } })
      ]);
      function done(v) { box.remove(); cb(v || 0); }
      stage.appendChild(box);
    }

    // ----- export / share -----
    shareBtn.addEventListener("click", function () {
      if (!st.bg) return;
      var c = document.createElement("canvas"); c.width = st.bg.width; c.height = st.bg.height;
      var g = c.getContext("2d");
      paint(g, [1, 0, 0, 1, 0, 0], 1, true);
      try {
        c.toBlob(function (blob) {
          if (!blob) return;
          var file = new File([blob], "on-my-wall.jpg", { type: "image/jpeg" });
          if (o.onExport) o.onExport(blob);
          else if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: o.title }).catch(function () {});
          } else {
            var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "on-my-wall.jpg"; a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
          }
          emit("share");
        }, "image/jpeg", 0.9);
      } catch (e) { shareBtn.disabled = true; } // tainted canvas (artwork host without CORS): hide export quietly
    });

    // ----- add to cart (standard Shopify Ajax cart API) -----
    addBtn.addEventListener("click", function () {
      var s = o.sizes[st.size];
      if (!s || !s.variantId) return;
      addBtn.disabled = true;
      fetch((window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : "/") + "cart/add.js", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ items: [{ id: Number(s.variantId), quantity: 1, properties: { _wall_preview: "1" } }] })
      }).then(function (r) {
        if (!r.ok) throw new Error("cart");
        addBtn.textContent = t.added; addBtn.disabled = false;
        addBtn.onclick = function () { window.location.href = (window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : "/") + "cart"; };
        document.dispatchEvent(new CustomEvent("wall-viewer:added", { detail: { variantId: s.variantId } }));
        emit("add_to_cart", { label: s.label });
      }).catch(function () { addBtn.disabled = false; });
    });

    // ----- start -----
    window.addEventListener("resize", layout);
    renderChips();
    var loadingMsg = el("div", { "class": "wv-loading", text: t.loading });
    stage.appendChild(loadingMsg);
    var artP = typeof o.artworkUrl === "string" ? loadImage(o.artworkUrl) : Promise.resolve(o.artworkUrl);
    artP.then(function (img) {
      st.art = img; loadingMsg.remove(); rebuildComposite();
      nextRoom();
      emit("open", { mode: o.mode });
    }).catch(function () { loadingMsg.textContent = t.error; });
    requestAnimationFrame(layout);
    return { close: close };
  }

  // ---------- size parsing from variant titles / options ("30x40 cm", "A3", "12 x 16 in", "50×70") ----------
  var PAPER = { A0: [84.1, 118.9], A1: [59.4, 84.1], A2: [42, 59.4], A3: [29.7, 42], A4: [21, 29.7], A5: [14.8, 21], A6: [10.5, 14.8], B1: [70.7, 100], B2: [50, 70.7] };
  function parseSize(text, portrait) {
    if (!text) return null;
    var s = String(text).replace(/,/g, ".").replace(/[″"]/g, " in ");
    var m = s.match(/(\d+(?:\.\d+)?)\s*(cm|mm|in|inch|inches|'')?\s*[x×X\*]\s*(\d+(?:\.\d+)?)\s*(cm|mm|in|inch|inches)?/);
    if (m) {
      var a = parseFloat(m[1]), b = parseFloat(m[3]), unit = (m[4] || m[2] || "").toLowerCase();
      var k = unit === "mm" ? 0.1 : /^in/.test(unit) || unit === "''" ? 2.54 : (!unit && Math.max(a, b) <= 60 && /\bin\b|inch/i.test(s)) ? 2.54 : 1;
      a *= k; b *= k;
      return { wCm: a, hCm: b };
    }
    var p = s.toUpperCase().match(/\b([AB]\d)\b/);
    if (p && PAPER[p[1]]) { var d = PAPER[p[1]]; return portrait === false ? { wCm: d[1], hCm: d[0] } : { wCm: d[0], hCm: d[1] }; }
    return null;
  }

  window.WallViewer = { open: open, parseSize: parseSize, version: "0.1.0" };
})();
