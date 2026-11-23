/* Convertir.  Tous les traitements se font dans le navigateur : aucun fichier n'est envoyé.
   Bibliothèques chargées à la demande depuis /convertir/assets/lib/ (licences : page Crédits). */
(() => {
  'use strict';

  const BASE = document.documentElement.dataset.base || '/convertir';
  const LIB = BASE + '/assets/lib/';
  const MO = 1024 * 1024;
  const MOBILE = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const LIMITE_PIXELS = MOBILE ? 16000000 : 40000000;
  const LIMITES = { pdf: 300 * MO, image: 80 * MO, heic: 80 * MO, video: 1024 * MO };
  const NOMS_TYPES = { pdf: 'PDF', image: 'image', heic: 'photo HEIC', video: 'vidéo ou audio' };

  // ---------- petites aides ----------
  function el(tag, attrs, ...enfants) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'texte') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const e of enfants) if (e !== null && e !== undefined) n.append(e);
    return n;
  }
  function taille(o) {
    if (o < 1024) return o + ' o';
    if (o < MO) return (o / 1024).toFixed(0) + ' Ko';
    return (o / MO).toFixed(o < 10 * MO ? 1 : 0).replace('.', ',') + ' Mo';
  }
  const pause = () => new Promise((r) => setTimeout(r, 0));
  const sansExt = (nom) => nom.replace(/\.[^.]+$/, '') || 'fichier';
  const ext = (nom) => (nom.match(/\.([^.]+)$/) || ['', ''])[1].toLowerCase();
  class Erreur extends Error {}

  function genre(f) {
    const t = (f.type || '').toLowerCase();
    const e = ext(f.name);
    if (t === 'application/pdf' || e === 'pdf') return 'pdf';
    if (t === 'image/heic' || t === 'image/heif' || e === 'heic' || e === 'heif') return 'heic';
    if (t.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'avif', 'jfif'].includes(e)) return 'image';
    if (t.startsWith('video/') || t.startsWith('audio/') ||
        ['mp4', 'mov', 'm4v', 'm4a', 'webm', 'mp3', 'wav', 'ogg', 'aac', 'flac'].includes(e)) return 'video';
    if (['doc', 'docx', 'odt', 'rtf'].includes(e)) return 'word';
    if (['xls', 'xlsx', 'ods', 'csv'].includes(e)) return 'tableur';
    if (['ppt', 'pptx', 'odp'].includes(e)) return 'presentation';
    return 'autre';
  }

  // Pages : « 1-3, 5, 8- » -> indices (base 0), dans l'ordre, sans doublon
  function plage(texte, total) {
    const res = [];
    const vus = new Set();
    const morceaux = texte.replace(/\s+/g, '').split(/[,;]/).filter(Boolean);
    if (!morceaux.length) throw new Erreur('Indiquez des numéros de pages, par exemple : 1-3, 5');
    for (const m of morceaux) {
      const r = m.match(/^(\d*)-(\d*)$/);
      let a; let b;
      if (r) { a = r[1] ? +r[1] : 1; b = r[2] ? +r[2] : total; } else if (/^\d+$/.test(m)) { a = b = +m; } else {
        throw new Erreur(`« ${m} » n'est pas compris. Écrivez par exemple : 1-3, 5, 8-10`);
      }
      if (a < 1 || b < 1 || a > total || b > total) throw new Erreur(`La page ${Math.max(a, b)} n'existe pas : ce PDF a ${total} page${total > 1 ? 's' : ''}.`);
      if (a > b) [a, b] = [b, a];
      for (let i = a; i <= b; i++) if (!vus.has(i)) { vus.add(i); res.push(i - 1); }
    }
    return res;
  }
  function groupesDePlages(texte, total) {
    return texte.replace(/\s+/g, '').split(/[,;]/).filter(Boolean).map((m) => ({ nom: m, pages: plage(m, total) }));
  }

  // ---------- chargement des bibliothèques ----------
  const scripts = {};
  function script(src) {
    if (!scripts[src]) {
      scripts[src] = new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = ok;
        s.onerror = () => { delete scripts[src]; ko(new Erreur('Un module n\'a pas pu se charger. Vérifiez votre connexion puis réessayez.')); };
        document.head.appendChild(s);
      });
    }
    return scripts[src];
  }
  async function pdfLib() { await script(LIB + 'pdf-lib-1.17.1/pdf-lib.min.js'); return window.PDFLib; }
  async function lame() { await script(LIB + 'lamejs-1.2.1/lame.min.js'); return window.lamejs; }
  let pdfjsP = null;
  function pdfjs() {
    if (!pdfjsP) {
      pdfjsP = import(LIB + 'pdfjs-4.10.38/pdf.min.mjs').then((m) => {
        m.GlobalWorkerOptions.workerSrc = LIB + 'pdfjs-4.10.38/pdf.worker.min.mjs';
        return m;
      }).catch((e) => { pdfjsP = null; throw new Erreur('Le lecteur de PDF n\'a pas pu se charger (' + e.message + ').'); });
    }
    return pdfjsP;
  }

  // ---------- lecture des fichiers ----------
  async function ouvrirPdfjs(f) {
    const lib = await pdfjs();
    const data = new Uint8Array(await f.arrayBuffer());
    try {
      return await lib.getDocument({
        data, isEvalSupported: false, cMapUrl: LIB + 'pdfjs-4.10.38/cmaps/', cMapPacked: true,
        standardFontDataUrl: LIB + 'pdfjs-4.10.38/standard_fonts/',
      }).promise;
    } catch (e) {
      if (e && e.name === 'PasswordException') throw new Erreur(`« ${f.name} » est protégé par un mot de passe. Ouvrez-le avec son mot de passe et enregistrez une copie sans protection, puis réessayez.`);
      throw new Erreur(`« ${f.name} » n'est pas un PDF lisible (fichier abîmé ou incomplet).`);
    }
  }
  async function ouvrirPdfLib(f) {
    const { PDFDocument } = await pdfLib();
    const octets = await f.arrayBuffer();
    try {
      return await PDFDocument.load(octets, { updateMetadata: false });
    } catch (e) {
      if (e && /encrypt/i.test(e.message || '')) throw new Erreur(`« ${f.name} » est protégé (chiffré). Enregistrez-en une copie sans protection depuis votre lecteur de PDF, puis réessayez.`);
      throw new Erreur(`« ${f.name} » n'est pas un PDF lisible (fichier abîmé ou incomplet).`);
    }
  }

  let travailleur = null;
  let compteur = 0;
  const attentes = new Map();
  function heic(f) {
    if (!travailleur) {
      travailleur = new Worker(BASE + '/assets/js/heic-worker.js');
      travailleur.onmessage = (e) => {
        const a = attentes.get(e.data.id);
        if (!a) return;
        attentes.delete(e.data.id);
        if (e.data.erreur) a.ko(new Erreur(`« ${a.nom} » : ${e.data.erreur}`)); else a.ok(e.data);
      };
      travailleur.onerror = () => {
        for (const a of attentes.values()) a.ko(new Erreur('Le décodeur HEIC a planté (photo trop grande pour cet appareil ?).'));
        attentes.clear();
        travailleur = null;
      };
    }
    return f.arrayBuffer().then((buf) => new Promise((ok, ko) => {
      const id = ++compteur;
      attentes.set(id, { ok, ko, nom: f.name });
      travailleur.postMessage({ id, base: LIB + 'libheif-1.23.5/', buffer: buf }, [buf]);
    })).then((r) => {
      const c = document.createElement('canvas');
      c.width = r.w; c.height = r.h;
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(r.data), r.w, r.h), 0, 0);
      return { source: c, w: r.w, h: r.h, liberer: () => { c.width = c.height = 0; } };
    });
  }

  async function decoderImage(f) {
    if (genre(f) === 'heic') {
      // Safari sait souvent lire le HEIC tout seul ; sinon, libheif.
      try { return await decoderNatif(f); } catch (e) { return heic(f); }
    }
    return decoderNatif(f);
  }
  async function decoderNatif(f) {
    const url = URL.createObjectURL(f);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (!img.naturalWidth) throw new Error('vide');
      return { source: img, w: img.naturalWidth, h: img.naturalHeight, liberer: () => URL.revokeObjectURL(url) };
    } catch (e) {
      URL.revokeObjectURL(url);
      try {
        const bm = await createImageBitmap(f);
        return { source: bm, w: bm.width, h: bm.height, liberer: () => bm.close() };
      } catch (e2) {
        throw new Erreur(`Impossible de lire l'image « ${f.name} » : format non reconnu par votre navigateur.`);
      }
    }
  }

  // Dessine l'image sur une toile (taille voulue, plafond de pixels de l'appareil)
  let reduction = false;
  function toile(im, largeur, hauteur, fondBlanc) {
    let w = Math.max(1, Math.round(largeur || im.w));
    let h = Math.max(1, Math.round(hauteur || im.h));
    if (w * h > LIMITE_PIXELS) {
      const k = Math.sqrt(LIMITE_PIXELS / (w * h));
      w = Math.floor(w * k); h = Math.floor(h * k);
      reduction = true;
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Erreur('Image trop grande pour la mémoire de cet appareil.');
    if (fondBlanc) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im.source, 0, 0, w, h);
    return c;
  }
  function versBlob(c, type, qualite) {
    return new Promise((ok, ko) => c.toBlob((b) => {
      if (b) ok(b); else ko(new Erreur('Image trop grande pour la mémoire de cet appareil. Essayez sur un ordinateur.'));
    }, type, qualite));
  }
  const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  function formatDe(f) {
    const t = (f.type || '').toLowerCase();
    if (t === 'image/png') return 'image/png';
    if (t === 'image/webp') return 'image/webp';
    return 'image/jpeg';
  }

  // ---------- archive ZIP (sans compression, noms UTF-8) ----------
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  async function zip(fichiers) {
    const parts = []; const central = []; let pos = 0;
    const enc = new TextEncoder();
    const d = new Date();
    const heure = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const jour = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of fichiers) {
      const data = new Uint8Array(await f.blob.arrayBuffer());
      const nom = enc.encode(f.nom);
      const crc = crc32(data);
      const loc = new DataView(new ArrayBuffer(30));
      loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true);
      loc.setUint16(8, 0, true); loc.setUint16(10, heure, true); loc.setUint16(12, jour, true);
      loc.setUint32(14, crc, true); loc.setUint32(18, data.length, true); loc.setUint32(22, data.length, true);
      loc.setUint16(26, nom.length, true); loc.setUint16(28, 0, true);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true);
      cen.setUint16(8, 0x0800, true); cen.setUint16(10, 0, true); cen.setUint16(12, heure, true);
      cen.setUint16(14, jour, true); cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true);
      cen.setUint32(24, data.length, true); cen.setUint16(28, nom.length, true);
      cen.setUint32(42, pos, true);
      parts.push(loc.buffer, nom, data);
      central.push(cen.buffer, nom);
      pos += 30 + nom.length + data.length;
    }
    const tailleCentral = central.reduce((s, x) => s + x.byteLength, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true);
    fin.setUint32(12, tailleCentral, true); fin.setUint32(16, pos, true);
    return new Blob([...parts, ...central, fin.buffer], { type: 'application/zip' });
  }

  // ---------- traitements ----------
  async function pdfVersImages(fichiers, o, ui, type) {
    const sorties = [];
    for (const f of fichiers) {
      const doc = await ouvrirPdfjs(f);
      const n = doc.numPages;
      const pages = o.pages && o.pages.trim() ? plage(o.pages, n) : [...Array(n).keys()];
      const echelle = Number(o.resolution) / 72;
      const chiffres = String(n).length;
      for (let i = 0; i < pages.length; i++) {
        ui.progres(`« ${f.name} » : page ${pages[i] + 1} (${i + 1} sur ${pages.length})`, i / pages.length);
        const page = await doc.getPage(pages[i] + 1);
        let vp = page.getViewport({ scale: echelle });
        if (vp.width * vp.height > LIMITE_PIXELS) {
          vp = page.getViewport({ scale: echelle * Math.sqrt(LIMITE_PIXELS / (vp.width * vp.height)) });
          reduction = true;
        }
        const c = document.createElement('canvas');
        c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const b = await versBlob(c, type, 0.9);
        sorties.push({ nom: `${sansExt(f.name)}-page-${String(pages[i] + 1).padStart(chiffres, '0')}.${EXT[type]}`, blob: b });
        page.cleanup(); c.width = c.height = 0;
      }
      await doc.destroy();
    }
    return { sorties };
  }

  async function imagesVersPdf(fichiers, o, ui) {
    const { PDFDocument } = await pdfLib();
    const pdf = await PDFDocument.create();
    const A4 = [595.28, 841.89];
    const marge = Number(o.marge) || 0;
    for (let i = 0; i < fichiers.length; i++) {
      const f = fichiers[i];
      ui.progres(`Image ${i + 1} sur ${fichiers.length} : « ${f.name} »`, i / fichiers.length);
      let emb = null;
      if ((f.type || '') === 'image/png') {
        try { emb = await pdf.embedPng(await f.arrayBuffer()); } catch (e) { emb = null; }
      }
      if (!emb) {
        const im = await decoderImage(f);
        const c = toile(im, 0, 0, true);
        im.liberer();
        emb = await pdf.embedJpg(await (await versBlob(c, 'image/jpeg', 0.9)).arrayBuffer());
        c.width = c.height = 0;
      }
      let pw; let ph;
      if (o.page === 'image') { pw = emb.width * 0.75 + 2 * marge; ph = emb.height * 0.75 + 2 * marge; } else {
        const paysage = o.page === 'a4-paysage' || (o.page === 'a4' && emb.width > emb.height);
        [pw, ph] = paysage ? [A4[1], A4[0]] : A4;
      }
      const k = Math.min((pw - 2 * marge) / emb.width, (ph - 2 * marge) / emb.height);
      const w = emb.width * k; const h = emb.height * k;
      pdf.addPage([pw, ph]).drawImage(emb, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      await pause();
    }
    ui.progres('Création du PDF…', 1);
    const nom = fichiers.length === 1 ? sansExt(fichiers[0].name) + '.pdf' : 'images.pdf';
    return { sorties: [{ nom, blob: new Blob([await pdf.save()], { type: 'application/pdf' }) }] };
  }

  async function convertirImages(fichiers, o, ui) {
    const type = MIME[o.format] || 'image/jpeg';
    const sorties = [];
    for (let i = 0; i < fichiers.length; i++) {
      const f = fichiers[i];
      ui.progres(`Image ${i + 1} sur ${fichiers.length} : « ${f.name} »`, i / fichiers.length);
      const im = await decoderImage(f);
      const c = toile(im, 0, 0, type === 'image/jpeg');
      im.liberer();
      sorties.push({ nom: `${sansExt(f.name)}.${EXT[type]}`, blob: await versBlob(c, type, Number(o.qualite || 92) / 100) });
      c.width = c.height = 0;
      await pause();
    }
    return { sorties };
  }

  async function compresserImages(fichiers, o, ui) {
    const sorties = []; const notes = [];
    let avant = 0; let apres = 0;
    for (let i = 0; i < fichiers.length; i++) {
      const f = fichiers[i];
      ui.progres(`Image ${i + 1} sur ${fichiers.length} : « ${f.name} »`, i / fichiers.length);
      const im = await decoderImage(f);
      const max = Number(o.maxi) || 0;
      const k = max && Math.max(im.w, im.h) > max ? max / Math.max(im.w, im.h) : 1;
      const type = o.format === 'meme' ? (formatDe(f) === 'image/png' ? 'image/png' : formatDe(f)) : MIME[o.format];
      const c = toile(im, im.w * k, im.h * k, type === 'image/jpeg');
      im.liberer();
      const b = await versBlob(c, type, Number(o.qualite) / 100);
      c.width = c.height = 0;
      avant += f.size;
      if (b.size >= f.size && k === 1) {
        notes.push(`« ${f.name} » est déjà bien compressée : l'original est gardé tel quel.`);
        sorties.push({ nom: f.name, blob: f });
        apres += f.size;
      } else {
        sorties.push({ nom: `${sansExt(f.name)}-compresse.${EXT[type]}`, blob: b });
        apres += b.size;
      }
      await pause();
    }
    const gain = avant ? Math.round((1 - apres / avant) * 100) : 0;
    notes.unshift(`Avant : ${taille(avant)}. Après : ${taille(apres)}${gain > 0 ? ` (−${gain} %)` : ''}.`);
    return { sorties, notes };
  }

  async function redimensionner(fichiers, o, ui) {
    const sorties = [];
    for (let i = 0; i < fichiers.length; i++) {
      const f = fichiers[i];
      ui.progres(`Image ${i + 1} sur ${fichiers.length} : « ${f.name} »`, i / fichiers.length);
      const im = await decoderImage(f);
      let w; let h;
      if (o.mode === 'pourcent') {
        const p = Number(o.pourcent);
        if (!(p > 0 && p <= 400)) throw new Erreur('Indiquez un pourcentage entre 1 et 400.');
        w = im.w * p / 100; h = im.h * p / 100;
      } else {
        const lw = Number(o.largeur) || 0; const lh = Number(o.hauteur) || 0;
        if (!lw && !lh) throw new Erreur('Indiquez une largeur ou une hauteur en pixels.');
        if (lw > 20000 || lh > 20000) throw new Erreur('20 000 pixels au plus par côté.');
        if (lw && lh && o.ratio !== 'non') { const k = Math.min(lw / im.w, lh / im.h); w = im.w * k; h = im.h * k; } else if (lw && lh) { w = lw; h = lh; } else if (lw) { w = lw; h = im.h * lw / im.w; } else { h = lh; w = im.w * lh / im.h; }
      }
      const type = formatDe(f);
      const c = toile(im, w, h, type === 'image/jpeg');
      im.liberer();
      sorties.push({ nom: `${sansExt(f.name)}-${c.width}x${c.height}.${EXT[type]}`, blob: await versBlob(c, type, 0.92) });
      c.width = c.height = 0;
      await pause();
    }
    return { sorties };
  }

  async function fusionner(fichiers, o, ui) {
    if (fichiers.length < 2) throw new Erreur('Ajoutez au moins deux PDF à fusionner.');
    const { PDFDocument } = await pdfLib();
    const out = await PDFDocument.create();
    for (let i = 0; i < fichiers.length; i++) {
      ui.progres(`Ajout de « ${fichiers[i].name} » (${i + 1} sur ${fichiers.length})`, i / fichiers.length);
      const src = await ouvrirPdfLib(fichiers[i]);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
      await pause();
    }
    ui.progres('Enregistrement du PDF fusionné…', 1);
    return { sorties: [{ nom: 'fusion.pdf', blob: new Blob([await out.save()], { type: 'application/pdf' }) }] };
  }

  async function extraire(src, indices, PDFDocument) {
    const out = await PDFDocument.create();
    (await out.copyPages(src, indices)).forEach((p) => out.addPage(p));
    return new Blob([await out.save()], { type: 'application/pdf' });
  }

  async function diviser(fichiers, o, ui) {
    const { PDFDocument } = await pdfLib();
    const f = fichiers[0];
    const src = await ouvrirPdfLib(f);
    const n = src.getPageCount();
    let groupes;
    if (o.mode === 'plages') groupes = groupesDePlages(o.plages || '', n).map((g) => ({ nom: 'pages-' + g.nom, pages: g.pages }));
    else {
      const t = o.mode === 'groupes' ? Math.max(1, Math.floor(Number(o.groupe) || 0)) : 1;
      if (o.mode === 'groupes' && !(Number(o.groupe) >= 1)) throw new Erreur('Indiquez un nombre de pages par fichier (1 ou plus).');
      groupes = [];
      for (let d = 0; d < n; d += t) {
        const pages = [...Array(Math.min(t, n - d)).keys()].map((x) => x + d);
        groupes.push({ nom: pages.length === 1 ? `page-${d + 1}` : `pages-${d + 1}-${d + pages.length}`, pages });
      }
    }
    if (!groupes.length) throw new Erreur('Indiquez au moins une plage de pages, par exemple : 1-3, 4-6');
    if (groupes.length === 1 && groupes[0].pages.length === n) throw new Erreur('Cette plage reprend tout le PDF : rien à diviser.');
    const sorties = [];
    for (let i = 0; i < groupes.length; i++) {
      ui.progres(`Fichier ${i + 1} sur ${groupes.length}`, i / groupes.length);
      sorties.push({ nom: `${sansExt(f.name)}-${groupes[i].nom}.pdf`, blob: await extraire(src, groupes[i].pages, PDFDocument) });
      await pause();
    }
    return { sorties };
  }

  async function supprimerPages(fichiers, o, ui) {
    const { PDFDocument } = await pdfLib();
    const f = fichiers[0];
    const src = await ouvrirPdfLib(f);
    const n = src.getPageCount();
    const enlever = new Set(plage(o.pages || '', n));
    const garder = [...Array(n).keys()].filter((i) => !enlever.has(i));
    if (!garder.length) throw new Erreur('Vous ne pouvez pas supprimer toutes les pages.');
    ui.progres('Création du nouveau PDF…', 0.5);
    return {
      sorties: [{ nom: `${sansExt(f.name)}-modifie.pdf`, blob: await extraire(src, garder, PDFDocument) }],
      notes: [`${enlever.size} page${enlever.size > 1 ? 's' : ''} supprimée${enlever.size > 1 ? 's' : ''}, ${garder.length} gardée${garder.length > 1 ? 's' : ''}.`],
    };
  }

  async function pivoter(fichiers, o, ui) {
    const { degrees } = await pdfLib();
    const sorties = [];
    for (const f of fichiers) {
      ui.progres(`« ${f.name} »`, 0.5);
      const doc = await ouvrirPdfLib(f);
      const n = doc.getPageCount();
      const cibles = o.pages && o.pages.trim() ? plage(o.pages, n) : [...Array(n).keys()];
      const a = Number(o.angle);
      for (const i of cibles) {
        const p = doc.getPage(i);
        p.setRotation(degrees((((p.getRotation().angle + a) % 360) + 360) % 360));
      }
      sorties.push({ nom: `${sansExt(f.name)}-pivote.pdf`, blob: new Blob([await doc.save()], { type: 'application/pdf' }) });
    }
    return { sorties };
  }

  async function compresserPdf(fichiers, o, ui) {
    const { PDFDocument } = await pdfLib();
    const reglages = { leger: [150, 0.8], moyen: [110, 0.7], fort: [80, 0.55] }[o.niveau] || [110, 0.7];
    const sorties = []; const notes = [];
    for (const f of fichiers) {
      const doc = await ouvrirPdfjs(f);
      const out = await PDFDocument.create();
      const n = doc.numPages;
      for (let i = 1; i <= n; i++) {
        ui.progres(`« ${f.name} » : page ${i} sur ${n}`, (i - 1) / n);
        const page = await doc.getPage(i);
        const vp1 = page.getViewport({ scale: 1 });
        let vp = page.getViewport({ scale: reglages[0] / 72 });
        if (vp.width * vp.height > LIMITE_PIXELS) vp = page.getViewport({ scale: Math.sqrt(LIMITE_PIXELS / (vp1.width * vp1.height)) });
        const c = document.createElement('canvas');
        c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        const jpg = await out.embedJpg(await (await versBlob(c, 'image/jpeg', reglages[1])).arrayBuffer());
        out.addPage([vp1.width, vp1.height]).drawImage(jpg, { x: 0, y: 0, width: vp1.width, height: vp1.height });
        page.cleanup(); c.width = c.height = 0;
      }
      await doc.destroy();
      const b = new Blob([await out.save()], { type: 'application/pdf' });
      if (b.size >= f.size * 0.95) {
        notes.push(`« ${f.name} » (${taille(f.size)}) ne devient pas plus léger à ce niveau (${taille(b.size)}) : il est déjà optimisé. Gardez l'original ou essayez le niveau « forte ».`);
      } else {
        notes.push(`« ${f.name} » : ${taille(f.size)} → ${taille(b.size)} (−${Math.round((1 - b.size / f.size) * 100)} %).`);
        sorties.push({ nom: `${sansExt(f.name)}-compresse.pdf`, blob: b });
      }
    }
    return { sorties, notes };
  }

  function duree(f) {
    return new Promise((ok) => {
      const url = URL.createObjectURL(f);
      const v = document.createElement(f.type.startsWith('audio/') ? 'audio' : 'video');
      const fin = (d) => { URL.revokeObjectURL(url); ok(d); };
      v.preload = 'metadata';
      v.onloadedmetadata = () => fin(isFinite(v.duration) ? v.duration : 0);
      v.onerror = () => fin(0);
      setTimeout(() => fin(0), 8000);
      v.src = url;
    });
  }

  async function videoVersMp3(fichiers, o, ui) {
    const sorties = [];
    const maxMin = MOBILE ? 20 : 60;
    for (const f of fichiers) {
      ui.progres(`Lecture de « ${f.name} »…`, 0);
      const d = await duree(f);
      if (d > maxMin * 60) throw new Erreur(`« ${f.name} » dure ${Math.round(d / 60)} min : au-delà de ${maxMin} min${MOBILE ? ' sur téléphone' : ''}, la mémoire du navigateur ne suffit pas. Coupez la vidéo en morceaux${MOBILE ? ' ou utilisez un ordinateur (60 min)' : ''}.`);
      const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!Ctx) throw new Erreur('Votre navigateur ne sait pas décoder le son. Essayez avec Chrome, Edge, Firefox ou Safari à jour.');
      const ctx = new Ctx(2, 1, 44100);
      const brut = await f.arrayBuffer();
      let audio;
      try {
        audio = await new Promise((ok, ko) => { const p = ctx.decodeAudioData(brut, ok, ko); if (p && p.catch) p.catch(ko); });
      } catch (e) {
        throw new Erreur(`Impossible d'extraire le son de « ${f.name} » : pas de piste audio, ou format de son non pris en charge par ce navigateur.`);
      }
      const lj = await lame();
      const canaux = Math.min(2, audio.numberOfChannels);
      const enc = new lj.Mp3Encoder(canaux, audio.sampleRate, Number(o.debit) || 192);
      const L = audio.getChannelData(0);
      const R = canaux > 1 ? audio.getChannelData(1) : null;
      const morceaux = [];
      const pas = 1152 * 20;
      const vers16 = (src, a, b) => { const out = new Int16Array(b - a); for (let i = a; i < b; i++) { const s = Math.max(-1, Math.min(1, src[i])); out[i - a] = s < 0 ? s * 0x8000 : s * 0x7FFF; } return out; };
      for (let i = 0, t = 0; i < L.length; i += pas, t++) {
        const fin = Math.min(L.length, i + pas);
        const m = R ? enc.encodeBuffer(vers16(L, i, fin), vers16(R, i, fin)) : enc.encodeBuffer(vers16(L, i, fin));
        if (m.length) morceaux.push(new Uint8Array(m));
        if (t % 25 === 0) { ui.progres(`Encodage MP3 de « ${f.name} »`, i / L.length); await pause(); }
      }
      const fin = enc.flush();
      if (fin.length) morceaux.push(new Uint8Array(fin));
      sorties.push({ nom: sansExt(f.name) + '.mp3', blob: new Blob(morceaux, { type: 'audio/mpeg' }) });
    }
    return { sorties };
  }

  // ---------- options ----------
  const OPT = {
    resolution: { label: 'Qualité des images', type: 'select', val: '150', choix: [['96', 'Écran (96 ppp, léger)'], ['150', 'Bonne (150 ppp)'], ['300', 'Impression (300 ppp, lourd)']] },
    pages: { label: 'Pages (vide = toutes)', type: 'text', val: '', aide: 'Exemple : 1-3, 5, 8-' },
    page: { label: 'Format de page', type: 'select', val: 'a4', choix: [['a4', 'A4, sens automatique'], ['a4-portrait', 'A4 portrait'], ['a4-paysage', 'A4 paysage'], ['image', 'Taille de l\'image']] },
    marge: { label: 'Marges', type: 'select', val: '0', choix: [['0', 'Sans marge'], ['20', 'Petites (7 mm)'], ['40', 'Grandes (14 mm)']] },
    format: { label: 'Format de sortie', type: 'select', val: 'jpg', choix: [['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WEBP']] },
    qualiteConv: { id: 'qualite', label: 'Qualité JPG / WEBP', type: 'range', val: '92', min: 50, max: 100, step: 1, unite: ' %' },
    qualite: { label: 'Qualité', type: 'range', val: '75', min: 30, max: 95, step: 1, unite: ' %', aide: '75 % : bon compromis. Plus bas = plus léger.' },
    maxi: { label: 'Taille maximale', type: 'select', val: '1920', choix: [['0', 'Garder la taille'], ['3840', '3840 px (4K)'], ['2560', '2560 px'], ['1920', '1920 px (Full HD)'], ['1280', '1280 px'], ['800', '800 px']] },
    formatComp: { id: 'format', label: 'Format de sortie', type: 'select', val: 'jpg', choix: [['jpg', 'JPG (le plus compatible)'], ['webp', 'WEBP (le plus léger)'], ['meme', 'Même format qu\'à l\'origine']] },
    modeRedim: { id: 'mode', label: 'Redimensionner', type: 'select', val: 'pixels', choix: [['pixels', 'En pixels'], ['pourcent', 'En pourcentage']] },
    largeur: { label: 'Largeur (px)', type: 'number', val: '1080', min: 1, si: (o) => o.mode === 'pixels' },
    hauteur: { label: 'Hauteur (px)', type: 'number', val: '', min: 1, aide: 'Vide = calculée pour garder les proportions.', si: (o) => o.mode === 'pixels' },
    ratio: { label: 'Proportions', type: 'select', val: 'oui', choix: [['oui', 'Garder (l\'image tient dans le cadre)'], ['non', 'Étirer à la taille exacte']], si: (o) => o.mode === 'pixels' && o.largeur && o.hauteur },
    pourcent: { label: 'Pourcentage', type: 'number', val: '50', min: 1, max: 400, si: (o) => o.mode === 'pourcent' },
    modeDiv: { id: 'mode', label: 'Découper', type: 'select', val: 'chaque', choix: [['chaque', 'Une page par fichier'], ['groupes', 'Tous les N pages'], ['plages', 'Selon mes plages']] },
    groupe: { label: 'Pages par fichier', type: 'number', val: '2', min: 1, si: (o) => o.mode === 'groupes' },
    plages: { label: 'Plages (un fichier par plage)', type: 'text', val: '1-3, 4-6', aide: 'Séparez les fichiers par des virgules.', si: (o) => o.mode === 'plages' },
    pagesSuppr: { id: 'pages', label: 'Pages à supprimer', type: 'text', val: '', aide: 'Exemple : 2, 5-7' },
    angle: { label: 'Rotation', type: 'select', val: '90', choix: [['90', '90° vers la droite'], ['180', '180° (à l\'envers)'], ['270', '90° vers la gauche']] },
    niveau: { label: 'Compression', type: 'select', val: 'moyen', choix: [['leger', 'Légère (150 ppp)'], ['moyen', 'Moyenne (110 ppp, conseillée)'], ['fort', 'Forte (80 ppp, le plus léger)']] },
    debit: { label: 'Qualité du MP3', type: 'select', val: '192', choix: [['128', '128 kb/s (léger)'], ['192', '192 kb/s (conseillé)'], ['256', '256 kb/s'], ['320', '320 kb/s (maximum)']] },
  };

  // ---------- les outils ----------
  const IMG = ['image', 'heic'];
  const OUTILS = {
    'pdf-en-jpg': { titre: 'PDF en JPG', k: ['pdf'], multi: true, btn: 'Convertir en JPG', opts: ['resolution', 'pages'], run: (f, o, u) => pdfVersImages(f, o, u, 'image/jpeg') },
    'pdf-en-png': { titre: 'PDF en PNG', k: ['pdf'], multi: true, btn: 'Convertir en PNG', opts: ['resolution', 'pages'], run: (f, o, u) => pdfVersImages(f, o, u, 'image/png') },
    'jpg-en-pdf': { titre: 'Images en PDF', k: IMG, multi: true, ordre: true, btn: 'Créer le PDF', opts: ['page', 'marge'], run: imagesVersPdf },
    'heic-en-jpg': { titre: 'HEIC en JPG', k: IMG, multi: true, btn: 'Convertir', opts: ['format', 'qualiteConv'], run: convertirImages },
    'convertir-image': { titre: 'Convertir une image (JPG, PNG, WEBP)', k: IMG, multi: true, btn: 'Convertir', opts: ['format', 'qualiteConv'], run: convertirImages },
    'compresser-image': { titre: 'Compresser des images', k: IMG, multi: true, btn: 'Compresser', opts: ['qualite', 'maxi', 'formatComp'], run: compresserImages },
    'redimensionner-image': { titre: 'Redimensionner des images', k: IMG, multi: true, btn: 'Redimensionner', opts: ['modeRedim', 'largeur', 'hauteur', 'ratio', 'pourcent'], run: redimensionner },
    'fusionner-pdf': { titre: 'Fusionner des PDF', k: ['pdf'], multi: true, ordre: true, btn: 'Fusionner', opts: [], run: fusionner },
    'diviser-pdf': { titre: 'Diviser un PDF', k: ['pdf'], multi: false, btn: 'Diviser', opts: ['modeDiv', 'groupe', 'plages'], run: diviser },
    'supprimer-pages-pdf': { titre: 'Supprimer des pages d\'un PDF', k: ['pdf'], multi: false, btn: 'Supprimer ces pages', opts: ['pagesSuppr'], run: supprimerPages },
    'pivoter-pdf': { titre: 'Pivoter un PDF', k: ['pdf'], multi: true, btn: 'Pivoter', opts: ['angle', 'pages'], run: pivoter },
    'compresser-pdf': { titre: 'Compresser un PDF', k: ['pdf'], multi: true, btn: 'Compresser', opts: ['niveau'], run: compresserPdf },
    'mp4-en-mp3': { titre: 'MP4 en MP3', k: ['video'], multi: true, btn: 'Extraire le MP3', opts: ['debit'], run: videoVersMp3 },
  };
  // Pages qui réutilisent un outil avec un réglage par défaut différent
  const ALIAS = {
    'png-en-pdf': ['jpg-en-pdf', {}], 'heic-en-pdf': ['jpg-en-pdf', {}],
    'heic-en-png': ['heic-en-jpg', { format: 'png' }],
    'png-en-jpg': ['convertir-image', { format: 'jpg' }], 'webp-en-jpg': ['convertir-image', { format: 'jpg' }],
    'jpg-en-png': ['convertir-image', { format: 'png' }], 'webp-en-png': ['convertir-image', { format: 'png' }],
    'jpg-en-webp': ['convertir-image', { format: 'webp' }],
  };
  const PAR_GENRE = {
    pdf: ['pdf-en-jpg', 'compresser-pdf', 'fusionner-pdf', 'diviser-pdf', 'supprimer-pages-pdf', 'pivoter-pdf', 'pdf-en-png'],
    image: ['jpg-en-pdf', 'convertir-image', 'compresser-image', 'redimensionner-image'],
    heic: ['heic-en-jpg', 'jpg-en-pdf', 'compresser-image', 'redimensionner-image'],
    video: ['mp4-en-mp3'],
  };
  const ACCEPT = { pdf: '.pdf,application/pdf', image: 'image/*', heic: '.heic,.heif,image/heic,image/heif', video: 'video/*,audio/*,.mp4,.mov,.m4a' };

  function resoudre(id) {
    if (OUTILS[id]) return { id, outil: OUTILS[id], defaut: {} };
    if (ALIAS[id]) return { id: ALIAS[id][0], outil: OUTILS[ALIAS[id][0]], defaut: ALIAS[id][1] };
    return null;
  }

  // ---------- interface ----------
  function monter(section) {
    const auto = section.dataset.outil === 'auto';
    let actuel = auto ? null : resoudre(section.dataset.outil);
    let fichiers = [];
    let urls = [];
    let occupe = false;

    const entree = el('input', { type: 'file', class: 'visuellement-cache', id: 'fichiers-' + Math.random().toString(36).slice(2) });
    const depot = el('div', { class: 'depot' },
      el('p', { class: 'depot-titre', texte: auto ? 'Déposez n\'importe quel fichier ici' : 'Glissez vos fichiers ici' }),
      el('label', { class: 'bouton principal', for: entree.id, texte: 'Choisir des fichiers' }), entree,
      el('p', { class: 'aide depot-aide' }));
    const liste = el('ul', { class: 'fichiers' });
    const choix = el('div', { class: 'choix', hidden: true });
    const options = el('div', { class: 'grille options' });
    const lancer = el('button', { type: 'button', class: 'principal', disabled: true, texte: 'Convertir' });
    const vider = el('button', { type: 'button', texte: 'Tout effacer', hidden: true });
    const barre = el('progress', { max: '1', value: '0' });
    const prog = el('div', { class: 'progression', hidden: true }, barre, el('span'));
    const etat = el('div', { class: 'message', role: 'status', 'aria-live': 'polite' });
    const sortie = el('div', { class: 'sorties' });
    section.replaceChildren(depot, choix, liste, options, el('div', { class: 'boutons' }, lancer, vider), prog, etat, sortie);

    const valeurs = {};
    function nettoyer() { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; sortie.replaceChildren(); }
    function dire(texte, erreur) { etat.textContent = texte || ''; etat.classList.toggle('erreur', !!erreur); }

    function preparer() {
      const o = actuel ? actuel.outil : null;
      entree.multiple = o ? !!o.multi : true;
      entree.accept = o ? o.k.map((k) => ACCEPT[k]).join(',') : '';
      depot.querySelector('.depot-aide').textContent = o
        ? `${o.k.map((k) => NOMS_TYPES[k]).filter((x, i, a) => a.indexOf(x) === i).join(' ou ')}${o.multi ? ' (plusieurs à la fois possible)' : ''} · rien n'est envoyé sur Internet`
        : 'PDF, images (JPG, PNG, WEBP, HEIC), vidéos MP4 · tout reste sur votre appareil';
      lancer.textContent = o ? o.btn : 'Convertir';
      options.replaceChildren();
      if (!o) return;
      for (const cle of o.opts) {
        const d = OPT[cle];
        const id = d.id || cle;
        if (valeurs[id] === undefined || !(id in valeurs)) valeurs[id] = actuel.defaut[id] !== undefined ? actuel.defaut[id] : d.val;
        const nid = 'opt-' + id + '-' + Math.random().toString(36).slice(2, 7);
        let champ;
        if (d.type === 'select') {
          champ = el('select', { id: nid });
          for (const [v, t] of d.choix) champ.append(el('option', { value: v, texte: t, selected: String(valeurs[id]) === v }));
        } else {
          champ = el('input', { id: nid, type: d.type === 'range' ? 'range' : d.type === 'number' ? 'number' : 'text', value: valeurs[id], min: d.min, max: d.max, step: d.step, inputmode: d.type === 'number' ? 'numeric' : null, autocomplete: 'off' });
        }
        const sortieVal = d.type === 'range' ? el('output', { texte: valeurs[id] + (d.unite || '') }) : null;
        const bloc = el('div', { class: 'champ' }, el('label', { for: nid }, d.label, sortieVal ? ' : ' : null, sortieVal), champ, d.aide ? el('p', { class: 'aide', texte: d.aide }) : null);
        bloc.dataset.cle = cle;
        champ.addEventListener('input', () => { valeurs[id] = champ.value; if (sortieVal) sortieVal.textContent = champ.value + (d.unite || ''); visibilite(); });
        options.append(bloc);
      }
      visibilite();
    }
    function visibilite() {
      for (const bloc of options.children) { const d = OPT[bloc.dataset.cle]; bloc.hidden = d.si ? !d.si(valeurs) : false; }
    }

    function afficherListe() {
      liste.replaceChildren();
      const o = actuel && actuel.outil;
      fichiers.forEach((f, i) => {
        const info = el('span', { class: 'aide', texte: taille(f.size) });
        const li = el('li', {}, el('span', { class: 'nom', texte: f.name }), info);
        if (o && o.ordre && fichiers.length > 1) {
          li.append(el('button', { type: 'button', class: 'mini', 'aria-label': 'Monter ' + f.name, texte: '↑', disabled: i === 0, onclick: () => { [fichiers[i - 1], fichiers[i]] = [fichiers[i], fichiers[i - 1]]; afficherListe(); } }));
          li.append(el('button', { type: 'button', class: 'mini', 'aria-label': 'Descendre ' + f.name, texte: '↓', disabled: i === fichiers.length - 1, onclick: () => { [fichiers[i + 1], fichiers[i]] = [fichiers[i], fichiers[i + 1]]; afficherListe(); } }));
        }
        li.append(el('button', { type: 'button', class: 'mini', 'aria-label': 'Retirer ' + f.name, texte: '✕', onclick: () => { fichiers.splice(i, 1); afficherListe(); } }));
        liste.append(li);
        if (genre(f) === 'pdf' && o && !f._pages) {
          ouvrirPdfLib(f).then((d) => { f._pages = d.getPageCount(); info.textContent = `${taille(f.size)} · ${f._pages} page${f._pages > 1 ? 's' : ''}`; }).catch(() => {});
        } else if (f._pages) info.textContent = `${taille(f.size)} · ${f._pages} page${f._pages > 1 ? 's' : ''}`;
      });
      lancer.disabled = !actuel || !fichiers.length || occupe;
      vider.hidden = !fichiers.length;
    }

    function proposer() {
      // Accueil : on propose les outils qui conviennent aux fichiers déposés
      const genres = [...new Set(fichiers.map(genre))];
      choix.replaceChildren();
      choix.hidden = false;
      const g = genres[0];
      if (genres.length > 1) {
        choix.append(el('p', { texte: 'Vous avez mélangé plusieurs sortes de fichiers. Déposez-en d\'une seule sorte à la fois (que des PDF, que des images…).' }));
        return;
      }
      if (!PAR_GENRE[g]) {
        const quoi = { word: 'Les fichiers Word', tableur: 'Les tableurs (Excel)', presentation: 'Les présentations (PowerPoint)' }[g] || 'Ce type de fichier';
        choix.append(el('p', { texte: `${quoi} ne sont pas encore pris en charge. Nous ne proposons que des conversions qui marchent vraiment dans votre navigateur, sans envoyer vos fichiers.` }));
        if (g === 'word') choix.append(el('p', { class: 'aide', texte: 'Astuce : dans Word ou LibreOffice, « Fichier › Enregistrer sous › PDF » le fait gratuitement et sans perte.' }));
        return;
      }
      choix.append(el('p', { class: 'etiquette', texte: `Que voulez-vous faire de ${fichiers.length > 1 ? 'ces fichiers' : 'ce fichier'} ?` }));
      const boutons = el('div', { class: 'boutons' });
      for (const id of PAR_GENRE[g]) {
        boutons.append(el('button', { type: 'button', texte: OUTILS[id].titre, 'aria-pressed': actuel && actuel.id === id ? 'true' : 'false', onclick: () => { actuel = resoudre(id); for (const k of Object.keys(valeurs)) delete valeurs[k]; preparer(); proposer(); afficherListe(); nettoyer(); dire(''); } }));
      }
      choix.append(boutons);
    }

    function ajouter(liste2) {
      nettoyer(); dire('');
      let ajout = [...liste2];
      if (!ajout.length) return;
      const refus = [];
      if (actuel) {
        const o = actuel.outil;
        ajout = ajout.filter((f) => {
          const g = genre(f);
          if (!o.k.includes(g)) { refus.push(f); return false; }
          return true;
        });
        if (refus.length) {
          const g = genre(refus[0]);
          const autre = PAR_GENRE[g] ? ` Pour ${g === 'pdf' ? 'un PDF' : g === 'video' ? 'une vidéo' : 'une image'}, essayez « ${OUTILS[PAR_GENRE[g][0]].titre} » depuis l'accueil.` : '';
          dire(`« ${refus[0].name} » n'est pas un fichier accepté ici (${o.k.map((k) => NOMS_TYPES[k]).join(', ')}).${autre}`, true);
        }
        if (!o.multi) { ajout = ajout.slice(0, 1); fichiers = []; }
      }
      for (const f of ajout) {
        const g = genre(f);
        if (LIMITES[g] && f.size > LIMITES[g]) { dire(`« ${f.name} » pèse ${taille(f.size)} : c'est trop pour un traitement dans le navigateur (maximum ${taille(LIMITES[g])}).`, true); continue; }
        fichiers.push(f);
      }
      if (fichiers.length > 300) { fichiers = fichiers.slice(0, 300); dire('300 fichiers au plus à la fois.', true); }
      if (auto) proposer();
      afficherListe();
    }

    entree.addEventListener('change', () => { ajouter(entree.files); entree.value = ''; });
    ['dragenter', 'dragover'].forEach((t) => section.addEventListener(t, (e) => { e.preventDefault(); depot.classList.add('survol'); }));
    ['dragleave', 'drop'].forEach((t) => section.addEventListener(t, (e) => { e.preventDefault(); if (t === 'drop' || !section.contains(e.relatedTarget)) depot.classList.remove('survol'); }));
    section.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files) ajouter(e.dataTransfer.files); });
    vider.addEventListener('click', () => { fichiers = []; nettoyer(); dire(''); if (auto) { choix.hidden = true; actuel = null; preparer(); } afficherListe(); });

    const ui = {
      progres(texte, frac) { prog.hidden = false; prog.lastChild.textContent = texte; barre.value = Math.max(0, Math.min(1, frac || 0)); },
    };
    lancer.addEventListener('click', async () => {
      if (occupe || !actuel || !fichiers.length) return;
      occupe = true; lancer.disabled = true; nettoyer(); dire(''); reduction = false;
      const t0 = performance.now();
      try {
        const res = await actuel.outil.run(fichiers.slice(), Object.assign({}, valeurs), ui);
        prog.hidden = true;
        afficherResultats(res, (performance.now() - t0) / 1000);
      } catch (e) {
        prog.hidden = true;
        if (!(e instanceof Erreur)) console.error(e);
        dire(e instanceof Erreur ? e.message : `Échec de la conversion : ${e && e.message ? e.message : e}. Si le fichier est très gros, essayez sur un ordinateur.`, true);
      } finally {
        occupe = false; afficherListe();
      }
    });

    function lien(f) {
      const u = URL.createObjectURL(f.blob); urls.push(u);
      return el('a', { class: 'bouton', href: u, download: f.nom }, `Télécharger ${f.nom} `, el('span', { class: 'aide', texte: `(${taille(f.blob.size)})` }));
    }
    async function afficherResultats(res, secondes) {
      const s = res.sorties || [];
      const notes = (res.notes || []).slice();
      if (reduction) notes.push('Image très grande : elle a été réduite pour tenir dans la mémoire de cet appareil.');
      if (s.length) notes.unshift(`Terminé en ${secondes < 1 ? 'moins d\'une seconde' : Math.round(secondes) + ' s'} : ${s.length} fichier${s.length > 1 ? 's' : ''} prêt${s.length > 1 ? 's' : ''}.`);
      dire(notes.join(' '));
      if (!s.length) return;
      const bloc = el('div', { class: 'resultat' });
      if (s.length > 1) {
        const tout = el('button', { type: 'button', class: 'principal', texte: `Tout télécharger (.zip, ${s.length} fichiers)` });
        tout.addEventListener('click', async () => {
          tout.disabled = true; tout.textContent = 'Préparation du ZIP…';
          try {
            const z = await zip(unique(s));
            const u = URL.createObjectURL(z); urls.push(u);
            const a = el('a', { href: u, download: (actuel.id || 'fichiers') + '.zip' });
            document.body.append(a); a.click(); a.remove();
            tout.textContent = `ZIP téléchargé (${taille(z.size)})`;
          } catch (e) { tout.textContent = 'ZIP impossible : téléchargez un par un'; }
        });
        bloc.append(tout);
      }
      const ul = el('ul', { class: 'liens' });
      s.slice(0, 200).forEach((f) => {
        const li = el('li', {}, lien(f));
        if (f.blob.type.startsWith('image/') && s.length <= 40) {
          const u = URL.createObjectURL(f.blob); urls.push(u);
          li.prepend(el('img', { src: u, alt: '', class: 'apercu', loading: 'lazy' }));
        }
        ul.append(li);
      });
      if (s.length > 200) ul.append(el('li', { class: 'aide', texte: `… et ${s.length - 200} autres : utilisez le ZIP.` }));
      bloc.append(ul);
      sortie.append(bloc);
      bloc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    function unique(s) {
      const vus = new Map();
      return s.map((f) => {
        let n = f.nom; const k = vus.get(n) || 0; vus.set(n, k + 1);
        if (k) n = n.replace(/(\.[^.]+)?$/, `-${k + 1}$1`);
        return { nom: n, blob: f.blob };
      });
    }

    preparer();
    afficherListe();
  }

  document.querySelectorAll('section.outil[data-outil]').forEach(monter);
})();
