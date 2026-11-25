/* Browser only: paints the texture atlas of the "atlas" strategy (see panel.js) and encodes it for the GLB. */
import { FRAME_COLORS, cropFor } from "./panel.js";

export function paintAtlas(L, plan, img) {
  var c = document.createElement("canvas");
  c.width = plan.width; c.height = plan.height;
  var g = c.getContext("2d");
  var X = function (x) { return (x + L.W / 2) * (plan.frontW / L.W); };
  var Y = function (y) { return (L.H / 2 - y) * (plan.frontH / L.H); };
  if (L.mode !== "neon") { g.fillStyle = L.colors.mat; g.fillRect(0, 0, plan.frontW, plan.frontH); }
  if (L.framed) { // frame front: same diagonal gradient as the 2D viewer
    var fc = FRAME_COLORS[L.frameStyle], gr = g.createLinearGradient(0, 0, plan.frontW, plan.frontH);
    gr.addColorStop(0, fc[0]); gr.addColorStop(1, fc[1]);
    g.fillStyle = gr; g.fillRect(0, 0, plan.frontW, plan.frontH);
    if (L.frameStyle === "oak") { // light wood grain
      g.globalAlpha = 0.10; g.strokeStyle = "#3d2a14";
      for (var i = 0; i < plan.frontH; i += 3 + (i * 7) % 5) {
        g.lineWidth = 1 + (i % 3); g.beginPath(); g.moveTo(0, i); g.lineTo(plan.frontW, i + ((i * 13) % 9) - 4); g.stroke();
      }
      g.globalAlpha = 1;
    }
    if (L.hasMat) {
      var mr = bounds(L.faces.filter(function (f) { return f.role === "mat"; }));
      g.fillStyle = L.colors.mat; g.fillRect(X(mr.x0), Y(mr.y1), X(mr.x1) - X(mr.x0), Y(mr.y0) - Y(mr.y1));
    }
  }
  // artwork, cover-cropped to the chosen size ratio (like a print shop)
  var A = L.art, ax = X(A.x0), ay = Y(A.y1), aw = X(A.x1) - ax, ah = Y(A.y0) - ay;
  var cr = cropFor(img.width, img.height, aw, ah);
  g.drawImage(img, cr.sx, cr.sy, cr.sw, cr.sh, ax, ay, aw, ah);
  // repeat the last front column into the gap before the patches (no dark seam on wrapped edges at low mip levels)
  g.drawImage(c, plan.frontW - 1, 0, 1, plan.frontH, plan.frontW, 0, plan.width - plan.frontW, plan.frontH);
  // colour patches for the solid faces (sides, bevels, back)
  for (var role in plan.patches) {
    var p = plan.patches[role];
    g.fillStyle = L.colors[role] || "#808080"; g.fillRect(p.x, p.y, p.w, p.h);
  }
  return c;
}

function bounds(faces) {
  var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  faces.forEach(function (f) { f.p.forEach(function (p) {
    b.x0 = Math.min(b.x0, p[0]); b.y0 = Math.min(b.y0, p[1]); b.x1 = Math.max(b.x1, p[0]); b.y1 = Math.max(b.y1, p[1]);
  }); });
  return b;
}

// JPEG for opaque art (small), PNG when alpha is needed (neon)
export function encodeCanvas(canvas, alpha) {
  var type = alpha ? "image/png" : "image/jpeg";
  return new Promise(function (ok, ko) {
    canvas.toBlob(function (blob) {
      if (!blob) return ko(new Error("canvas encoding failed"));
      blob.arrayBuffer().then(function (buf) { ok({ bytes: new Uint8Array(buf), mimeType: type }); }, ko);
    }, type, 0.9);
  });
}
