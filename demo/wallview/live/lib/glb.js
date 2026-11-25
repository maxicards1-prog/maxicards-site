/* Minimal binary glTF 2.0 (GLB) writer — no dependency, DOM-free (browser + Node).
 * Input: { primitives: [{positions, normals, uvs|null, indices, material}], materials: [...], images: [{bytes, mimeType, wrap?}] }
 * Writes one mesh (one primitive per entry) under one node, textures embedded in the binary chunk.
 * Additions for the home objects (the wall-art output is byte-for-byte the same as before):
 *  - image.wrap = "repeat" -> its own REPEAT sampler (wallpaper); otherwise the CLAMP sampler 0;
 *  - material.mrTexture -> metallicRoughnessTexture (G = roughness, B = metallic; mirrors, TV screens, chrome legs);
 *  - material.alphaCutoff (alphaMode MASK). */

export function buildGlb(model) {
  var chunks = [], byteLength = 0;
  var gltf = {
    asset: { version: "2.0", generator: "WallView live prototype" },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: "artwork" }],
    meshes: [{ name: "artwork", primitives: [] }],
    buffers: [], bufferViews: [], accessors: [], materials: [], textures: [], images: [], samplers: []
  };
  function addView(bytes, target) {
    var pad = (4 - (byteLength % 4)) % 4;
    if (pad) { chunks.push(new Uint8Array(pad)); byteLength += pad; }
    var view = { buffer: 0, byteOffset: byteLength, byteLength: bytes.byteLength };
    if (target) view.target = target;
    chunks.push(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    byteLength += bytes.byteLength;
    gltf.bufferViews.push(view);
    return gltf.bufferViews.length - 1;
  }
  function addAccessor(arr, type, componentType, target, minmax) {
    var size = type === "VEC3" ? 3 : type === "VEC2" ? 2 : 1;
    var acc = { bufferView: addView(arr, target), componentType: componentType, count: arr.length / size, type: type };
    if (minmax) {
      var mn = [Infinity, Infinity, Infinity].slice(0, size), mx = [-Infinity, -Infinity, -Infinity].slice(0, size);
      for (var i = 0; i < arr.length; i += size) for (var k = 0; k < size; k++) { mn[k] = Math.min(mn[k], arr[i + k]); mx[k] = Math.max(mx[k], arr[i + k]); }
      acc.min = mn.map(Math.fround); acc.max = mx.map(Math.fround);
    }
    gltf.accessors.push(acc);
    return gltf.accessors.length - 1;
  }

  model.primitives.forEach(function (p) {
    var attributes = {
      POSITION: addAccessor(p.positions, "VEC3", 5126, 34962, true),
      NORMAL: addAccessor(p.normals, "VEC3", 5126, 34962)
    };
    if (p.uvs) attributes.TEXCOORD_0 = addAccessor(p.uvs, "VEC2", 5126, 34962);
    var indices = addAccessor(p.indices, "SCALAR", p.indices instanceof Uint32Array ? 5125 : 5123, 34963);
    gltf.meshes[0].primitives.push({ attributes: attributes, indices: indices, material: p.material, mode: 4 });
  });

  var repeatSampler = -1;
  (model.images || []).forEach(function (img) {
    gltf.images.push({ bufferView: addView(img.bytes), mimeType: img.mimeType });
    if (img.wrap === "repeat" && repeatSampler < 0) repeatSampler = 1;
    gltf.textures.push({ source: gltf.images.length - 1, sampler: img.wrap === "repeat" ? 1 : 0 });
  });
  if (gltf.images.length) gltf.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 });
  if (repeatSampler > 0) gltf.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 });

  model.materials.forEach(function (m) {
    var pbr = { baseColorFactor: m.baseColor || [1, 1, 1, 1], metallicFactor: m.metallic || 0, roughnessFactor: m.roughness == null ? 0.8 : m.roughness };
    if (m.texture != null) pbr.baseColorTexture = { index: m.texture };
    if (m.mrTexture != null) pbr.metallicRoughnessTexture = { index: m.mrTexture };
    var out = { name: m.name, pbrMetallicRoughness: pbr };
    if (m.alphaMode && m.alphaMode !== "OPAQUE") out.alphaMode = m.alphaMode;
    if (m.alphaMode === "MASK" && m.alphaCutoff != null) out.alphaCutoff = m.alphaCutoff;
    if (m.emissiveTexture != null) out.emissiveTexture = { index: m.emissiveTexture };
    if (m.emissive) out.emissiveFactor = m.emissive;
    if (m.doubleSided) out.doubleSided = true;
    gltf.materials.push(out);
  });

  ["textures", "images", "samplers"].forEach(function (k) { if (!gltf[k].length) delete gltf[k]; });
  var binPad = (4 - (byteLength % 4)) % 4;
  if (binPad) { chunks.push(new Uint8Array(binPad)); byteLength += binPad; }
  gltf.buffers.push({ byteLength: byteLength });

  var json = new TextEncoder().encode(JSON.stringify(gltf));
  var jsonPad = (4 - (json.length % 4)) % 4, jsonLen = json.length + jsonPad;
  var total = 12 + 8 + jsonLen + 8 + byteLength;
  var out = new Uint8Array(total), dv = new DataView(out.buffer), o = 0;
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); o = 12;
  dv.setUint32(o, jsonLen, true); dv.setUint32(o + 4, 0x4e4f534a, true); o += 8;
  out.set(json, o); for (var i = 0; i < jsonPad; i++) out[o + json.length + i] = 0x20; o += jsonLen;
  dv.setUint32(o, byteLength, true); dv.setUint32(o + 4, 0x004e4942, true); o += 8;
  chunks.forEach(function (c) { out.set(c, o); o += c.byteLength; });
  return out;
}

/* Reads a GLB back (tests and debugging): returns { json, bbox: {min, max, size} } from the POSITION accessors. */
export function inspectGlb(bytes) {
  var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB");
  var jsonLen = dv.getUint32(12, true);
  var json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen)));
  var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  json.meshes.forEach(function (mesh) {
    mesh.primitives.forEach(function (p) {
      var a = json.accessors[p.attributes.POSITION];
      for (var k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a.min[k]); mx[k] = Math.max(mx[k], a.max[k]); }
    });
  });
  return { json: json, bbox: { min: mn, max: mx, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] } };
}

/* Width / height of a JPEG or PNG from its header (server side: no image library needed). */
export function imageSize(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) { // PNG IHDR
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: dv.getUint32(16), height: dv.getUint32(20), mimeType: "image/png" };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) { // JPEG: walk segments up to a SOF marker
    var i = 2;
    while (i < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      var mk = bytes[i + 1], len = (bytes[i + 2] << 8) | bytes[i + 3];
      if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) {
        return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8], mimeType: "image/jpeg" };
      }
      i += 2 + len;
    }
  }
  throw new Error("unsupported image (JPEG or PNG only)");
}
