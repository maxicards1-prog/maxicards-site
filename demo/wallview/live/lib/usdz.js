/* iPhone / iPad: builds the USDZ for AR Quick Look ourselves (same mesh and texture as the GLB, atlas strategy).
 *
 * Why not model-viewer's own USDZ?
 *  - model-viewer 4.3.1 exports with the default HORIZONTAL anchoring: on iPhone the artwork stands on the floor.
 *  - model-viewer 4.4.0 (PR #5201, 09/10/2026, "iOS device testing has not been run") drops the anchoring for
 *    ar-placement="wall" and lets Quick Look pick a surface (floor or wall).
 *
 * Two variants, to be compared on a real iPhone (URL parameter ?ios=...):
 *  - "mur" (default): VERTICAL plane anchoring -> Quick Look only looks for walls. Quick Look turns the content
 *    by +90 deg around X when it anchors it on a wall (its anchor's Y axis is the wall normal), so the mesh is
 *    rotated by -90 deg first: front (+Z) -> +Y = out of the wall, top (+Y) -> -Z. Same fix as model-viewer PR #4030
 *    (tested on device by its author, issue #3989).
 *  - "libre": no anchoring properties (model-viewer 4.4.0 behaviour): the shopper can place it on a wall or the floor.
 * "three" comes from the import map (vendor/). */
import * as THREE from "three";
import { USDZExporter } from "../vendor/three/examples/jsm/exporters/USDZExporter.js";

export async function buildUsdz(model, canvases, variantOrOpts) {
  /* Wall art (original call): buildUsdz(model, atlasCanvas, "mur" | "libre") -> unchanged output.
   * Home objects: buildUsdz(model, { base, mr }, { placement: "wall" | "floor", variant: "mur" | "libre" })
   *  - floor: HORIZONTAL plane anchoring, no rotation (Quick Look keeps Y up: the object stands on the floor);
   *  - mr canvas: metallic-roughness atlas (G = roughness, B = metallic) -> roughnessMap + metalnessMap;
   *  - BLEND -> transparent (opacity from the texture alpha), MASK -> alphaTest; wallpaper: REPEAT wrapping;
   *  - emissive only when the model asks for it (TV picture). */
  var art = !variantOrOpts || typeof variantOrOpts !== "object";
  var o = art ? { placement: "wall", variant: variantOrOpts } : variantOrOpts;
  var base = canvases && canvases.base ? canvases.base : canvases, mrCanvas = canvases && canvases.base ? canvases.mr : null;
  var floor = o.placement === "floor", wall = !floor && o.variant !== "libre";
  var p = model.primitives[0], m = model.materials[0];
  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(p.positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(p.normals, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(p.uvs, 2));
  geo.setIndex(new THREE.BufferAttribute(p.indices, 1));
  var tex = new THREE.CanvasTexture(base);
  tex.flipY = false; // glTF-style UVs (v = 0 at the top of the image)
  tex.colorSpace = THREE.SRGBColorSpace;
  var blend = m.alphaMode === "BLEND", mat, mrTex = null;
  if (art) {
    mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: m.roughness, metalness: 0, transparent: blend,
      emissiveMap: blend ? tex : null, emissive: blend ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0)
    });
  } else {
    if (o.repeat || (model.images[0] && model.images[0].wrap === "repeat")) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
    if (mrCanvas) { mrTex = new THREE.CanvasTexture(mrCanvas); mrTex.flipY = false; mrTex.colorSpace = THREE.NoColorSpace; }
    var em = m.emissiveTexture != null && m.emissive ? m.emissive : null;
    mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: mrTex ? 1 : m.roughness, metalness: mrTex ? 1 : (m.metallic || 0), roughnessMap: mrTex, metalnessMap: mrTex,
      transparent: blend, alphaTest: m.alphaMode === "MASK" ? (m.alphaCutoff || 0.5) : 0,
      emissiveMap: em ? tex : null, emissive: em ? new THREE.Color(em[0], em[1], em[2]) : new THREE.Color(0, 0, 0)
    });
  }
  var mesh = new THREE.Mesh(geo, mat);
  mesh.name = art ? "Artwork" : "Object";
  if (wall) { mesh.rotation.x = -Math.PI / 2; }
  mesh.updateMatrix(); // USDZExporter writes object.matrix (local)
  var scene = new THREE.Scene();
  scene.add(mesh);
  var opts = floor ? { ar: { anchoring: { type: "plane" }, planeAnchoring: { alignment: "horizontal" } }, includeAnchoringProperties: true }
    : wall ? { ar: { anchoring: { type: "plane" }, planeAnchoring: { alignment: "vertical" } }, includeAnchoringProperties: true }
    : { includeAnchoringProperties: false };
  opts.quickLookCompatible = true;
  opts.maxTextureSize = 2048;
  var buf = await new USDZExporter().parseAsync(scene, opts);
  tex.dispose(); if (mrTex) mrTex.dispose(); geo.dispose(); mat.dispose();
  return new Uint8Array(buf);
}

// Opens AR Quick Look on a USDZ blob, like model-viewer does (rel="ar" anchor with an <img> child, "download" for blobs).
export function openQuickLook(url, fixedScale) {
  var a = document.createElement("a");
  a.setAttribute("rel", "ar");
  a.setAttribute("download", "artwork.usdz");
  a.href = url + (fixedScale ? "#allowsContentScaling=0" : "");
  a.appendChild(document.createElement("img"));
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { a.remove(); }, 1000);
}
