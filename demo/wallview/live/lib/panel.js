/* Wall-art panel geometry at REAL size, in metres (glTF units). DOM-free: runs in the browser and in Node.
 * Axes: +X right, +Y up, +Z out of the wall. The back of the panel is at z = 0 (against the wall), centred on x/y.
 * model-viewer (ar-placement="wall") and AR Quick Look (vertical plane anchoring) both put the back (-Z) on the wall.
 *
 * Size convention = the 2D viewer (wall-viewer.js): the variant size is the ARTWORK size; mat and frame are added around
 * it (outer size = art + 2 x (mat + frame)).
 *
 * Two texturing strategies, same geometry:
 *  - "atlas": ONE primitive, ONE material, ONE texture (front composite + small colour patches). Used in the browser:
 *    a single mesh is the safest input for AR Quick Look (multi-object USDZ can float off the wall, Apple forum 734506).
 *  - "parts": one primitive per role; the artwork texture is the ORIGINAL image bytes (cover-crop done with UVs, no
 *    re-encoding) and frame / mat / sides are plain colours. Used server-side (Scene Viewer needs a real URL) because
 *    it needs no image library at all.
 */

export const FRAME_COLORS = { black: ["#1b1b1b", "#3a3a3a"], white: ["#f4f4f2", "#d9d9d6"], oak: ["#b88a55", "#8c6239"] }; // = wall-viewer.js
export const FRAME_CM = 2.2, MAT_CM = 5;                       // defaults = wall-viewer.js
export const DEPTH_CM = { print: 0.5, canvas: 3, framed: 2, neon: 0.6 }; // canvas 3 cm = CANVAS_DEPTH_CM of wall-viewer.js
const RECESS_CM = 0.8;     // frame lip above the mat / artwork
const MAT_THICK_CM = 0.15; // visible bevel of the mat window
const MAT_COLOR = "#fbfaf7";

function shade(hex, k) {
  var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  var f = function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); };
  return "#" + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}

/* opts: { wCm, hCm, mode: "print"|"canvas"|"neon", frame: "none"|"black"|"white"|"oak", frameCm, mat: bool, matCm } */
export function layoutPanel(opts) {
  var mode = opts.mode || "print";
  var framed = mode === "print" && opts.frame && opts.frame !== "none";
  var hasMat = mode === "print" && !!opts.mat;
  var f = framed ? (opts.frameCm > 0 ? opts.frameCm : FRAME_CM) / 100 : 0;
  var m = hasMat ? (opts.matCm > 0 ? opts.matCm : MAT_CM) / 100 : 0;
  var w = opts.wCm / 100, h = opts.hCm / 100;
  if (!(w > 0 && h > 0)) throw new Error("bad size " + opts.wCm + " x " + opts.hCm);
  var D = (framed ? DEPTH_CM.framed : DEPTH_CM[mode] || DEPTH_CM.print) / 100;
  var W = w + 2 * (f + m), H = h + 2 * (f + m);

  // layers from outside to inside: ring layers then the artwork
  var layers = [], z = D;
  if (framed) { layers.push({ role: "frame", inset: f, z: z }); z -= RECESS_CM / 100; }
  if (hasMat) { layers.push({ role: "mat", inset: m, z: z }); z -= MAT_THICK_CM / 100; }
  layers.push({ role: "art", inset: 0, z: z });

  var faces = [];
  function quad(role, kind, a, b, c, d, n, extra) {
    // ensure counter-clockwise winding seen from the normal side (glTF front faces)
    var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    var cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    var p = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0 ? [a, b, c, d] : [a, d, c, b];
    var face = { role: role, kind: kind, p: p, n: n };
    if (extra) for (var k in extra) face[k] = extra[k];
    faces.push(face);
  }
  var O = { x0: -W / 2, y0: -H / 2, x1: W / 2, y1: H / 2 }, R = O;
  for (var i = 0; i < layers.length; i++) {
    var L = layers[i], zf = L.z;
    if (L.role === "art") {
      quad("art", "front", [R.x0, R.y0, zf], [R.x1, R.y0, zf], [R.x1, R.y1, zf], [R.x0, R.y1, zf], [0, 0, 1]);
      break;
    }
    var I = { x0: R.x0 + L.inset, y0: R.y0 + L.inset, x1: R.x1 - L.inset, y1: R.y1 - L.inset };
    var zn = layers[i + 1].z, inner = L.role + "Inner";
    // front ring (4 bands)
    quad(L.role, "front", [R.x0, I.y1, zf], [R.x1, I.y1, zf], [R.x1, R.y1, zf], [R.x0, R.y1, zf], [0, 0, 1]);
    quad(L.role, "front", [R.x0, R.y0, zf], [R.x1, R.y0, zf], [R.x1, I.y0, zf], [R.x0, I.y0, zf], [0, 0, 1]);
    quad(L.role, "front", [R.x0, I.y0, zf], [I.x0, I.y0, zf], [I.x0, I.y1, zf], [R.x0, I.y1, zf], [0, 0, 1]);
    quad(L.role, "front", [I.x1, I.y0, zf], [R.x1, I.y0, zf], [R.x1, I.y1, zf], [I.x1, I.y1, zf], [0, 0, 1]);
    // inner walls down to the next layer, facing the centre
    quad(inner, "solid", [I.x0, I.y0, zn], [I.x0, I.y1, zn], [I.x0, I.y1, zf], [I.x0, I.y0, zf], [1, 0, 0]);
    quad(inner, "solid", [I.x1, I.y0, zn], [I.x1, I.y1, zn], [I.x1, I.y1, zf], [I.x1, I.y0, zf], [-1, 0, 0]);
    quad(inner, "solid", [I.x0, I.y1, zn], [I.x1, I.y1, zn], [I.x1, I.y1, zf], [I.x0, I.y1, zf], [0, -1, 0]);
    quad(inner, "solid", [I.x0, I.y0, zn], [I.x1, I.y0, zn], [I.x1, I.y0, zf], [I.x0, I.y0, zf], [0, 1, 0]);
    R = I;
  }
  // artwork rectangle (front plane coordinates)
  var A = R;
  // outer sides, from the front of the outermost layer down to the wall
  var zt = layers[0].z;
  var side = framed ? "frameSide" : mode === "canvas" ? "wrap" : mode === "neon" ? "neonEdge" : "edge";
  var kind = side === "wrap" ? "wrap" : "solid";
  quad(side, kind, [O.x0, O.y0, 0], [O.x0, O.y1, 0], [O.x0, O.y1, zt], [O.x0, O.y0, zt], [-1, 0, 0], { dir: [1, 0] });
  quad(side, kind, [O.x1, O.y0, 0], [O.x1, O.y1, 0], [O.x1, O.y1, zt], [O.x1, O.y0, zt], [1, 0, 0], { dir: [-1, 0] });
  quad(side, kind, [O.x0, O.y1, 0], [O.x1, O.y1, 0], [O.x1, O.y1, zt], [O.x0, O.y1, zt], [0, 1, 0], { dir: [0, -1] });
  quad(side, kind, [O.x0, O.y0, 0], [O.x1, O.y0, 0], [O.x1, O.y0, zt], [O.x0, O.y0, zt], [0, -1, 0], { dir: [0, 1] });
  if (mode !== "neon") quad("back", "solid", [O.x0, O.y0, 0], [O.x1, O.y0, 0], [O.x1, O.y1, 0], [O.x0, O.y1, 0], [0, 0, -1]);

  var fc = framed ? FRAME_COLORS[opts.frame] || FRAME_COLORS.black : null;
  var colors = {
    frame: fc ? fc[0] : "#000000", frameInner: fc ? shade(fc[1], 0.8) : "#000000", frameSide: fc ? shade(fc[1], 0.9) : "#000000",
    mat: MAT_COLOR, matInner: "#e6e2da", edge: "#efede8", back: "#cfc6b8", neonEdge: "rgba(255,255,255,0.22)"
  };
  return {
    mode: mode, framed: framed, hasMat: hasMat, frameStyle: framed ? opts.frame : "none",
    W: W, H: H, D: D, zTop: zt, art: A, artCm: [opts.wCm, opts.hCm], faces: faces, colors: colors,
    roughness: mode === "neon" ? 0.35 : mode === "canvas" ? 0.92 : 0.8
  };
}

// cover-crop (like a print shop): the part of the image (pixels) that fills an artW x artH rectangle
export function cropFor(imgW, imgH, artW, artH) {
  var ir = imgW / imgH, tr = artW / artH, sw = imgW, sh = imgH, sx = 0, sy = 0;
  if (ir > tr) { sw = sh * tr; sx = (imgW - sw) / 2; } else { sh = sw / tr; sy = (imgH - sh) / 2; }
  return { sx: sx, sy: sy, sw: sw, sh: sh };
}

// point of the front plane a wrap face samples (gallery wrap: the edge strip of the image, mirrored onto the side)
function frontPoint(face, p, zTop) {
  if (face.kind !== "wrap") return [p[0], p[1]];
  var t = zTop - p[2];
  return [p[0] + face.dir[0] * t, p[1] + face.dir[1] * t];
}

/* Texture atlas plan: front composite (frame + mat + art, real proportions) + a column of solid colour patches. */
export function atlasPlan(L, maxPx) {
  maxPx = maxPx || 2048;
  var PATCH = 16, roles = [];
  L.faces.forEach(function (fc) { if (fc.kind === "solid" && roles.indexOf(fc.role) < 0) roles.push(fc.role); });
  var ppm = Math.min((maxPx - PATCH - 4) / Math.max(L.W, L.H), 6000); // px per metre (60 px/cm max)
  var frontW = Math.max(PATCH * roles.length, Math.round(L.W * ppm)), frontH = Math.max(PATCH * roles.length, Math.round(L.H * ppm));
  var width = frontW + PATCH + 4, height = frontH, patches = {};
  roles.forEach(function (r, i) { patches[r] = { x: frontW + 4, y: i * PATCH, w: PATCH, h: PATCH }; });
  return { ppm: ppm, frontW: frontW, frontH: frontH, width: width, height: height, patches: patches };
}

function pushQuad(acc, face, uvOf) {
  var base = acc.pos.length / 3;
  face.p.forEach(function (p) {
    acc.pos.push(p[0], p[1], p[2]); acc.nor.push(face.n[0], face.n[1], face.n[2]);
    if (uvOf) { var uv = uvOf(face, p); acc.uv.push(uv[0], uv[1]); }
  });
  acc.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}
function finish(acc, material) {
  var n = acc.pos.length / 3;
  return {
    positions: new Float32Array(acc.pos), normals: new Float32Array(acc.nor),
    uvs: acc.uv.length ? new Float32Array(acc.uv) : null,
    indices: n > 65535 ? new Uint32Array(acc.idx) : new Uint16Array(acc.idx), material: material
  };
}
function newAcc() { return { pos: [], nor: [], uv: [], idx: [] }; }

/* Strategy "atlas": image = the painted atlas (see atlas_canvas.js). Returns the input of buildGlb(). */
export function modelAtlas(L, plan, image) {
  var uvOf = function (face, p) {
    if (face.kind === "solid") {
      var pa = plan.patches[face.role];
      return [(pa.x + pa.w / 2) / plan.width, (pa.y + pa.h / 2) / plan.height];
    }
    var q = frontPoint(face, p, L.zTop);
    return [((q[0] + L.W / 2) / L.W) * plan.frontW / plan.width, ((L.H / 2 - q[1]) / L.H) * plan.frontH / plan.height];
  };
  var acc = newAcc();
  L.faces.forEach(function (fc) { pushQuad(acc, fc, uvOf); });
  var neon = L.mode === "neon";
  return {
    primitives: [finish(acc, 0)],
    materials: [{ name: "artwork", baseColor: [1, 1, 1, 1], texture: 0, roughness: L.roughness, metallic: 0,
      alphaMode: neon ? "BLEND" : "OPAQUE", emissiveTexture: neon ? 0 : undefined, emissive: neon ? [1, 1, 1] : undefined }],
    images: [image]
  };
}

/* Strategy "parts": image = { bytes, mimeType, width, height } of the ORIGINAL artwork (no re-encoding). */
export function modelParts(L, image) {
  var A = L.art, c = cropFor(image.width, image.height, A.x1 - A.x0, A.y1 - A.y0);
  var artUv = function (face, p) {
    var q = frontPoint(face, p, L.zTop);
    var fx = (q[0] - A.x0) / (A.x1 - A.x0), fy = (A.y1 - q[1]) / (A.y1 - A.y0);
    return [(c.sx + fx * c.sw) / image.width, (c.sy + fy * c.sh) / image.height];
  };
  var groups = {}, order = [];
  L.faces.forEach(function (fc) {
    var key = fc.role === "art" || fc.role === "wrap" ? "art" : fc.role;
    if (!groups[key]) { groups[key] = newAcc(); order.push(key); }
    pushQuad(groups[key], fc, key === "art" ? artUv : null);
  });
  var neon = L.mode === "neon", materials = [], primitives = [];
  order.forEach(function (key, i) {
    if (key === "art") {
      materials.push({ name: "artwork", baseColor: [1, 1, 1, 1], texture: 0, roughness: L.roughness, metallic: 0,
        alphaMode: neon ? "BLEND" : "OPAQUE", emissiveTexture: neon ? 0 : undefined, emissive: neon ? [1, 1, 1] : undefined });
    } else {
      var col = parseColor(L.colors[key] || "#808080");
      materials.push({ name: key, baseColor: col, roughness: key.indexOf("frame") === 0 ? 0.55 : 0.85, metallic: 0,
        alphaMode: col[3] < 1 ? "BLEND" : "OPAQUE" });
    }
    primitives.push(finish(groups[key], i));
  });
  return { primitives: primitives, materials: materials, images: [{ bytes: image.bytes, mimeType: image.mimeType }] };
}

// "#rrggbb" or "rgba(r,g,b,a)" -> linear RGBA (glTF factors are linear)
export function parseColor(s) {
  var r, g, b, a = 1, m = /rgba?\(([^)]+)\)/.exec(s);
  if (m) { var p = m[1].split(",").map(Number); r = p[0]; g = p[1]; b = p[2]; if (p.length > 3) a = p[3]; }
  else { var n = parseInt(s.slice(1), 16); r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255; }
  var lin = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return [lin(r), lin(g), lin(b), a];
}
