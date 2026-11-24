/* Convertir.  Tous les traitements se font dans le navigateur : aucun fichier n'est envoyé.
   Bibliothèques chargées à la demande depuis /convertir/assets/lib/ (licences : page Crédits). */
(() => {
  'use strict';

  // Langue de la page (<html lang="en"> pour /convertir/en/) : T(texte français, texte anglais).
  // Le français est le texte d'origine, inchangé ; l'anglais n'est utilisé que sur les pages anglaises.
  const EN = (document.documentElement.lang || '').toLowerCase().startsWith('en');
  const T = (fr, en) => (EN ? en : fr);

  const BASE = document.documentElement.dataset.base || '/convertir';
  const LIB = BASE + '/assets/lib/';
  const MO = 1024 * 1024;
  const MOBILE = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const LIMITE_PIXELS = MOBILE ? 16000000 : 40000000;
  const LIMITES = { pdf: 300 * MO, image: 80 * MO, heic: 80 * MO, svg: 20 * MO, video: 1024 * MO };
  const NOMS_TYPES = { pdf: 'PDF', image: 'image', heic: T('photo HEIC', 'HEIC photo'), svg: T('image SVG', 'SVG image'), video: T('vidéo ou audio', 'video or audio') };

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
    if (o < 1024) return o + T(' o', ' B');
    if (o < MO) return (o / 1024).toFixed(0) + T(' Ko', ' KB');
    return (o / MO).toFixed(o < 10 * MO ? 1 : 0).replace('.', EN ? '.' : ',') + T(' Mo', ' MB');
  }
  const pause = () => new Promise((r) => setTimeout(r, 0));
  const sansExt = (nom) => nom.replace(/\.[^.]+$/, '') || T('fichier', 'file');
  const ext = (nom) => (nom.match(/\.([^.]+)$/) || ['', ''])[1].toLowerCase();
  class Erreur extends Error {}

  function genre(f) {
    const t = (f.type || '').toLowerCase();
    const e = ext(f.name);
    if (t === 'application/pdf' || e === 'pdf') return 'pdf';
    if (t === 'image/heic' || t === 'image/heif' || e === 'heic' || e === 'heif') return 'heic';
    if (t === 'image/svg+xml' || e === 'svg') return 'svg';
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
    if (!morceaux.length) throw new Erreur(T('Indiquez des numéros de pages, par exemple : 1-3, 5', 'Enter page numbers, for example: 1-3, 5'));
    for (const m of morceaux) {
      const r = m.match(/^(\d*)-(\d*)$/);
      let a; let b;
      if (r) { a = r[1] ? +r[1] : 1; b = r[2] ? +r[2] : total; } else if (/^\d+$/.test(m)) { a = b = +m; } else {
        throw new Erreur(T(`« ${m} » n'est pas compris. Écrivez par exemple : 1-3, 5, 8-10`, `“${m}” is not understood. Write, for example: 1-3, 5, 8-10`));
      }
      if (a < 1 || b < 1 || a > total || b > total) throw new Erreur(T(`La page ${Math.max(a, b)} n'existe pas : ce PDF a ${total} page${total > 1 ? 's' : ''}.`, `Page ${Math.max(a, b)} does not exist: this PDF has ${total} page${total > 1 ? 's' : ''}.`));
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
        s.onerror = () => { delete scripts[src]; ko(new Erreur(T('Un module n\'a pas pu se charger. Vérifiez votre connexion puis réessayez.', 'A component could not load. Check your connection and try again.'))); };
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
      }).catch((e) => { pdfjsP = null; throw new Erreur(T('Le lecteur de PDF n\'a pas pu se charger (', 'The PDF reader could not load (') + e.message + ').'); });
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
      if (e && e.name === 'PasswordException') throw new Erreur(T(`« ${f.name} » est protégé par un mot de passe. Ouvrez-le avec son mot de passe et enregistrez une copie sans protection, puis réessayez.`, `“${f.name}” is password-protected. Open it with its password, save an unprotected copy, then try again.`));
      throw new Erreur(T(`« ${f.name} » n'est pas un PDF lisible (fichier abîmé ou incomplet).`, `“${f.name}” is not a readable PDF (damaged or incomplete file).`));
    }
  }
  async function ouvrirPdfLib(f) {
    const { PDFDocument } = await pdfLib();
    const octets = await f.arrayBuffer();
    try {
      return await PDFDocument.load(octets, { updateMetadata: false });
    } catch (e) {
      if (e && /encrypt/i.test(e.message || '')) throw new Erreur(T(`« ${f.name} » est protégé (chiffré). Enregistrez-en une copie sans protection depuis votre lecteur de PDF, puis réessayez.`, `“${f.name}” is protected (encrypted). Save an unprotected copy from your PDF reader, then try again.`));
      throw new Erreur(T(`« ${f.name} » n'est pas un PDF lisible (fichier abîmé ou incomplet).`, `“${f.name}” is not a readable PDF (damaged or incomplete file).`));
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
        if (e.data.erreur) a.ko(new Erreur(T(`« ${a.nom} » : ${e.data.erreur}`, `“${a.nom}”: ${e.data.erreur}`))); else a.ok(e.data);
      };
      travailleur.onerror = () => {
        for (const a of attentes.values()) a.ko(new Erreur(T('Le décodeur HEIC a planté (photo trop grande pour cet appareil ?).', 'The HEIC decoder crashed (photo too large for this device?).')));
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
        throw new Erreur(T(`Impossible de lire l'image « ${f.name} » : format non reconnu par votre navigateur.`, `Can't read the image “${f.name}”: your browser does not recognize this format.`));
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
    if (!ctx) throw new Erreur(T('Image trop grande pour la mémoire de cet appareil.', 'Image too large for this device\'s memory.'));
    if (fondBlanc) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im.source, 0, 0, w, h);
    return c;
  }
  function versBlob(c, type, qualite) {
    return new Promise((ok, ko) => c.toBlob((b) => {
      if (!b) ko(new Erreur(T('Image trop grande pour la mémoire de cet appareil. Essayez sur un ordinateur.', 'Image too large for this device\'s memory. Try on a computer.')));
      else if (type && b.type !== type) ko(new Erreur(type === 'image/webp' ? T('Votre navigateur (Safari) ne sait pas créer d\'images WEBP. Choisissez JPG ou PNG, ou utilisez Chrome, Edge ou Firefox.', 'Your browser (Safari) cannot create WEBP images. Choose JPG or PNG, or use Chrome, Edge or Firefox.') : T('Votre navigateur ne sait pas créer ce format d\'image.', 'Your browser cannot create this image format.')));
      else ok(b);
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
        ui.progres(T(`« ${f.name} » : page ${pages[i] + 1} (${i + 1} sur ${pages.length})`, `“${f.name}”: page ${pages[i] + 1} (${i + 1} of ${pages.length})`), i / pages.length);
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
      ui.progres(T(`Image ${i + 1} sur ${fichiers.length} : « ${f.name} »`, `Image ${i + 1} of ${fichiers.length}: “${f.name}”`), i / fichiers.length);
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
    ui.progres(T('Création du PDF…', 'Creating the PDF…'), 1);
    const nom = fichiers.length === 1 ? sansExt(fichiers[0].name) + '.pdf' : 'images.pdf';
    return { sorties: [{ nom, blob: new Blob([await pdf.save()], { type: 'application/pdf' }) }] };
  }

  async function convertirImages(fichiers, o, ui) {
    const type = MIME[o.format] || 'image/jpeg';
    const sorties = [];
    for (let i = 0; i < fichiers.length; i++) {
      const f = fichiers[i];
      ui.progres(T(`Image ${i + 1} sur ${fichiers.length} : « ${f.name} »`, `Image ${i + 1} of ${fichiers.length}: “${f.name}”`), i / fichiers.length);
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
      ui.progres(T(`Image ${i + 1} sur ${fichiers.length} : « ${f.name} »`, `Image ${i + 1} of ${fichiers.length}: “${f.name}”`), i / fichiers.length);
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
        notes.push(T(`« ${f.name} » est déjà bien compressée : l'original est gardé tel quel.`, `“${f.name}” is already well compressed: the original is kept as is.`));
        sorties.push({ nom: f.name, blob: f });
        apres += f.size;
      } else {
        sorties.push({ nom: T(`${sansExt(f.name)}-compresse.${EXT[type]}`, `${sansExt(f.name)}-compressed.${EXT[type]}`), blob: b });
        apres += b.size;
      }
      await pause();
    }
    const gain = avant ? Math.round((1 - apres / avant) * 100) : 0;
    notes.unshift(T(`Avant : ${taille(avant)}. Après : ${taille(apres)}${gain > 0 ? ` (−${gain} %)` : ''}.`, `Before: ${taille(avant)}. After: ${taille(apres)}${gain > 0 ? ` (−${gain}%)` : ''}.`));
    return { sorties, notes };
  }

  async function redimensionner(fichiers, o, ui) {
    const sorties = [];
    for (let i = 0; i < fichiers.length; i++) {
      const f = fichiers[i];
      ui.progres(T(`Image ${i + 1} sur ${fichiers.length} : « ${f.name} »`, `Image ${i + 1} of ${fichiers.length}: “${f.name}”`), i / fichiers.length);
      const im = await decoderImage(f);
      let w; let h;
      if (o.mode === 'pourcent') {
        const p = Number(o.pourcent);
        if (!(p > 0 && p <= 400)) throw new Erreur(T('Indiquez un pourcentage entre 1 et 400.', 'Enter a percentage between 1 and 400.'));
        w = im.w * p / 100; h = im.h * p / 100;
      } else {
        const lw = Number(o.largeur) || 0; const lh = Number(o.hauteur) || 0;
        if (!lw && !lh) throw new Erreur(T('Indiquez une largeur ou une hauteur en pixels.', 'Enter a width or a height in pixels.'));
        if (lw > 20000 || lh > 20000) throw new Erreur(T('20 000 pixels au plus par côté.', '20,000 pixels maximum per side.'));
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
    if (fichiers.length < 2) throw new Erreur(T('Ajoutez au moins deux PDF à fusionner.', 'Add at least two PDFs to merge.'));
    const { PDFDocument } = await pdfLib();
    const out = await PDFDocument.create();
    for (let i = 0; i < fichiers.length; i++) {
      ui.progres(T(`Ajout de « ${fichiers[i].name} » (${i + 1} sur ${fichiers.length})`, `Adding “${fichiers[i].name}” (${i + 1} of ${fichiers.length})`), i / fichiers.length);
      const src = await ouvrirPdfLib(fichiers[i]);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
      await pause();
    }
    ui.progres(T('Enregistrement du PDF fusionné…', 'Saving the merged PDF…'), 1);
    return { sorties: [{ nom: T('fusion.pdf', 'merged.pdf'), blob: new Blob([await out.save()], { type: 'application/pdf' }) }] };
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
      if (o.mode === 'groupes' && !(Number(o.groupe) >= 1)) throw new Erreur(T('Indiquez un nombre de pages par fichier (1 ou plus).', 'Enter a number of pages per file (1 or more).'));
      groupes = [];
      for (let d = 0; d < n; d += t) {
        const pages = [...Array(Math.min(t, n - d)).keys()].map((x) => x + d);
        groupes.push({ nom: pages.length === 1 ? `page-${d + 1}` : `pages-${d + 1}-${d + pages.length}`, pages });
      }
    }
    if (!groupes.length) throw new Erreur(T('Indiquez au moins une plage de pages, par exemple : 1-3, 4-6', 'Enter at least one page range, for example: 1-3, 4-6'));
    if (groupes.length === 1 && groupes[0].pages.length === n) throw new Erreur(T('Cette plage reprend tout le PDF : rien à diviser.', 'This range covers the whole PDF: nothing to split.'));
    const sorties = [];
    for (let i = 0; i < groupes.length; i++) {
      ui.progres(T(`Fichier ${i + 1} sur ${groupes.length}`, `File ${i + 1} of ${groupes.length}`), i / groupes.length);
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
    if (!garder.length) throw new Erreur(T('Vous ne pouvez pas supprimer toutes les pages.', 'You cannot delete every page.'));
    ui.progres(T('Création du nouveau PDF…', 'Creating the new PDF…'), 0.5);
    return {
      sorties: [{ nom: T(`${sansExt(f.name)}-modifie.pdf`, `${sansExt(f.name)}-edited.pdf`), blob: await extraire(src, garder, PDFDocument) }],
      notes: [T(`${enlever.size} page${enlever.size > 1 ? 's' : ''} supprimée${enlever.size > 1 ? 's' : ''}, ${garder.length} gardée${garder.length > 1 ? 's' : ''}.`, `${enlever.size} page${enlever.size > 1 ? 's' : ''} deleted, ${garder.length} kept.`)],
    };
  }

  async function pivoter(fichiers, o, ui) {
    const { degrees } = await pdfLib();
    const sorties = [];
    for (const f of fichiers) {
      ui.progres(T(`« ${f.name} »`, `“${f.name}”`), 0.5);
      const doc = await ouvrirPdfLib(f);
      const n = doc.getPageCount();
      const cibles = o.pages && o.pages.trim() ? plage(o.pages, n) : [...Array(n).keys()];
      const a = Number(o.angle);
      for (const i of cibles) {
        const p = doc.getPage(i);
        p.setRotation(degrees((((p.getRotation().angle + a) % 360) + 360) % 360));
      }
      sorties.push({ nom: T(`${sansExt(f.name)}-pivote.pdf`, `${sansExt(f.name)}-rotated.pdf`), blob: new Blob([await doc.save()], { type: 'application/pdf' }) });
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
        ui.progres(T(`« ${f.name} » : page ${i} sur ${n}`, `“${f.name}”: page ${i} of ${n}`), (i - 1) / n);
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
        notes.push(T(`« ${f.name} » (${taille(f.size)}) ne devient pas plus léger à ce niveau (${taille(b.size)}) : il est déjà optimisé. Gardez l'original ou essayez le niveau « forte ».`, `“${f.name}” (${taille(f.size)}) does not get smaller at this level (${taille(b.size)}): it is already optimized. Keep the original or try the “High” level.`));
      } else {
        notes.push(T(`« ${f.name} » : ${taille(f.size)} → ${taille(b.size)} (−${Math.round((1 - b.size / f.size) * 100)} %).`, `“${f.name}”: ${taille(f.size)} → ${taille(b.size)} (−${Math.round((1 - b.size / f.size) * 100)}%).`));
        sorties.push({ nom: T(`${sansExt(f.name)}-compresse.pdf`, `${sansExt(f.name)}-compressed.pdf`), blob: b });
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
      ui.progres(T(`Lecture de « ${f.name} »…`, `Reading “${f.name}”…`), 0);
      const d = await duree(f);
      if (d > maxMin * 60) throw new Erreur(T(`« ${f.name} » dure ${Math.round(d / 60)} min : au-delà de ${maxMin} min${MOBILE ? ' sur téléphone' : ''}, la mémoire du navigateur ne suffit pas. Coupez la vidéo en morceaux${MOBILE ? ' ou utilisez un ordinateur (60 min)' : ''}.`, `“${f.name}” lasts ${Math.round(d / 60)} min: beyond ${maxMin} min${MOBILE ? ' on a phone' : ''}, the browser runs out of memory. Cut the video into parts${MOBILE ? ' or use a computer (60 min)' : ''}.`));
      const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!Ctx) throw new Erreur(T('Votre navigateur ne sait pas décoder le son. Essayez avec Chrome, Edge, Firefox ou Safari à jour.', 'Your browser cannot decode the audio. Try an up-to-date Chrome, Edge, Firefox or Safari.'));
      const ctx = new Ctx(2, 1, 44100);
      const brut = await f.arrayBuffer();
      let audio;
      try {
        audio = await new Promise((ok, ko) => { const p = ctx.decodeAudioData(brut, ok, ko); if (p && p.catch) p.catch(ko); });
      } catch (e) {
        throw new Erreur(T(`Impossible d'extraire le son de « ${f.name} » : pas de piste audio, ou format de son non pris en charge par ce navigateur.`, `Can't extract the audio from “${f.name}”: no audio track, or an audio format this browser does not support.`));
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
        if (t % 25 === 0) { ui.progres(T(`Encodage MP3 de « ${f.name} »`, `Encoding “${f.name}” to MP3`), i / L.length); await pause(); }
      }
      const fin = enc.flush();
      if (fin.length) morceaux.push(new Uint8Array(fin));
      sorties.push({ nom: sansExt(f.name) + '.mp3', blob: new Blob(morceaux, { type: 'audio/mpeg' }) });
    }
    return { sorties };
  }

  // MP3 (ou autre son) -> WAV 16 bits, à la fréquence d'origine (24/11/2026)
  async function versWav(fichiers, o, ui) {
    const sorties = [];
    const maxMin = MOBILE ? 10 : 30;
    for (const f of fichiers) {
      ui.progres(T(`Lecture de « ${f.name} »…`, `Reading “${f.name}”…`), 0);
      const d = await duree(f);
      if (d > maxMin * 60) throw new Erreur(T(`« ${f.name} » dure ${Math.round(d / 60)} min : un WAV de plus de ${maxMin} min${MOBILE ? ' sur téléphone' : ''} dépasse la mémoire du navigateur (environ 10 Mo par minute). Coupez le son en morceaux${MOBILE ? ' ou utilisez un ordinateur (30 min)' : ''}.`, `“${f.name}” lasts ${Math.round(d / 60)} min: a WAV longer than ${maxMin} min${MOBILE ? ' on a phone' : ''} exceeds the browser's memory (about 10 MB per minute). Cut the audio into parts${MOBILE ? ' or use a computer (30 min)' : ''}.`));
      const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!Ctx) throw new Erreur(T('Votre navigateur ne sait pas décoder le son. Essayez avec Chrome, Edge, Firefox ou Safari à jour.', 'Your browser cannot decode the audio. Try an up-to-date Chrome, Edge, Firefox or Safari.'));
      const ctx = new Ctx(2, 1, 44100);
      const brut = await f.arrayBuffer();
      let audio;
      try {
        audio = await new Promise((ok, ko) => { const p = ctx.decodeAudioData(brut, ok, ko); if (p && p.catch) p.catch(ko); });
      } catch (e) {
        throw new Erreur(T(`Impossible de lire le son de « ${f.name} » : fichier abîmé, ou format non pris en charge par ce navigateur.`, `Can't read the audio of “${f.name}”: damaged file, or a format this browser does not support.`));
      }
      const canaux = Math.min(2, audio.numberOfChannels);
      const n = audio.length;
      const taille = 44 + n * canaux * 2;
      const buf = new ArrayBuffer(taille);
      const v = new DataView(buf);
      const ecr = (pos, txt) => { for (let i = 0; i < txt.length; i++) v.setUint8(pos + i, txt.charCodeAt(i)); };
      ecr(0, 'RIFF'); v.setUint32(4, taille - 8, true); ecr(8, 'WAVE'); ecr(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, canaux, true);
      v.setUint32(24, audio.sampleRate, true); v.setUint32(28, audio.sampleRate * canaux * 2, true);
      v.setUint16(32, canaux * 2, true); v.setUint16(34, 16, true); ecr(36, 'data'); v.setUint32(40, n * canaux * 2, true);
      const C = [audio.getChannelData(0), canaux > 1 ? audio.getChannelData(1) : null];
      let pos = 44;
      for (let i = 0; i < n; i++) {
        for (let c = 0; c < canaux; c++) { const s = Math.max(-1, Math.min(1, C[c][i])); v.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7FFF, true); pos += 2; }
        if (i % 441000 === 0) { ui.progres(T(`Création du WAV de « ${f.name} »`, `Creating the WAV for “${f.name}”`), i / n); await pause(); }
      }
      sorties.push({ nom: sansExt(f.name) + '.wav', blob: new Blob([buf], { type: 'audio/wav' }) });
    }
    return { sorties };
  }

  // ---------- nouveaux outils (23/11/2026) ----------
  // Point « visuel » (origine en bas à gauche de la page telle qu'affichée) -> coordonnées PDF, rotation de la page
  function repere(page) {
    const b = page.getCropBox ? page.getCropBox() : Object.assign({ x: 0, y: 0 }, page.getSize());
    const r = (((page.getRotation().angle || 0) % 360) + 360) % 360;
    const W = b.width; const H = b.height;
    const VW = r % 180 ? H : W; const VH = r % 180 ? W : H;
    const vers = (vx, vy) => {
      if (r === 90) return { x: b.x + W - vy, y: b.y + vx };
      if (r === 180) return { x: b.x + W - vx, y: b.y + H - vy };
      if (r === 270) return { x: b.x + vy, y: b.y + H - vx };
      return { x: b.x + vx, y: b.y + vy };
    };
    return { VW, VH, r, vers };
  }
  function texteSur(page, police, texte, taille, vx, vy, angle, couleur, opacite, degrees) {
    const R = repere(page);
    const p = R.vers(vx, vy);
    page.drawText(texte, { x: p.x, y: p.y, size: taille, font: police, color: couleur, opacity: opacite, rotate: degrees(R.r + (angle || 0)) });
  }
  function verifTexte(police, texte) {
    try { police.encodeText(texte); } catch (e) {
      throw new Erreur(T('Ce texte contient un caractère que la police standard des PDF ne sait pas écrire (emoji, alphabet non latin…). Retirez-le et réessayez.', 'This text contains a character the standard PDF font cannot write (emoji, non-Latin alphabet…). Remove it and try again.'));
    }
  }

  async function numeroter(fichiers, o, ui) {
    const { StandardFonts, rgb, degrees } = await pdfLib();
    const sorties = [];
    for (const f of fichiers) {
      ui.progres(T(`« ${f.name} »`, `“${f.name}”`), 0.3);
      const doc = await ouvrirPdfLib(f);
      const police = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const debut = Math.max(0, Math.floor(Number(o.debut) || 1));
      const saut = o.couverture === 'oui' ? 1 : 0;
      const total = pages.length - saut + debut - 1;
      const t = Number(o.taillePolice) || 11;
      const marge = 28;
      pages.forEach((page, i) => {
        if (i < saut) return;
        const k = i - saut + debut;
        const texte = { n: `${k}`, page: `Page ${k}`, sur: `${k} / ${total}`, pagesur: T(`Page ${k} sur ${total}`, `Page ${k} of ${total}`) }[o.formatNum] || `${k}`;
        const R = repere(page);
        const tw = police.widthOfTextAtSize(texte, t);
        const [h, v] = (o.position || 'bas-centre').split('-');
        const vx = v === 'gauche' ? marge : v === 'droite' ? R.VW - marge - tw : (R.VW - tw) / 2;
        const vy = h === 'haut' ? R.VH - marge - t : marge;
        texteSur(page, police, texte, t, vx, vy, 0, rgb(0.15, 0.15, 0.15), 1, degrees);
      });
      sorties.push({ nom: T(`${sansExt(f.name)}-numerote.pdf`, `${sansExt(f.name)}-numbered.pdf`), blob: new Blob([await doc.save()], { type: 'application/pdf' }) });
    }
    return { sorties };
  }

  async function filigrane(fichiers, o, ui) {
    const { StandardFonts, rgb, degrees } = await pdfLib();
    const texte = (o.texteFil || '').trim().slice(0, 60);
    if (!texte) throw new Erreur(T('Écrivez le texte du filigrane, par exemple : CONFIDENTIEL', 'Type the watermark text, for example: CONFIDENTIAL'));
    const couleur = { gris: rgb(0.45, 0.45, 0.45), rouge: rgb(0.8, 0.1, 0.1), bleu: rgb(0.12, 0.35, 0.8) }[o.couleurFil] || rgb(0.45, 0.45, 0.45);
    const opacite = Math.min(0.9, Math.max(0.05, Number(o.opacite) / 100 || 0.25));
    const sorties = [];
    for (const f of fichiers) {
      ui.progres(T(`« ${f.name} »`, `“${f.name}”`), 0.3);
      const doc = await ouvrirPdfLib(f);
      const police = await doc.embedFont(StandardFonts.HelveticaBold);
      verifTexte(police, texte);
      const pages = doc.getPages();
      const cibles = o.pages && o.pages.trim() ? plage(o.pages, pages.length) : [...pages.keys()];
      for (const i of cibles) {
        const page = pages[i];
        const R = repere(page);
        const diag = o.sensFil !== 'horizontal';
        const a = diag ? Math.atan2(R.VH, R.VW) : 0;
        const place = diag ? Math.hypot(R.VW, R.VH) * 0.7 : R.VW * 0.8;
        const t = Math.min(160, place / police.widthOfTextAtSize(texte, 1));
        const tw = police.widthOfTextAtSize(texte, t);
        const th = t * 0.7;
        const cx = R.VW / 2; const cy = R.VH / 2;
        const vx = cx - (tw / 2) * Math.cos(a) + (th / 2) * Math.sin(a);
        const vy = cy - (tw / 2) * Math.sin(a) - (th / 2) * Math.cos(a);
        texteSur(page, police, texte, t, vx, vy, a * 180 / Math.PI, couleur, opacite, degrees);
      }
      sorties.push({ nom: T(`${sansExt(f.name)}-filigrane.pdf`, `${sansExt(f.name)}-watermarked.pdf`), blob: new Blob([await doc.save()], { type: 'application/pdf' }) });
    }
    return { sorties };
  }

  async function pdfVersTexte(fichiers, o, ui) {
    const sorties = []; const notes = [];
    for (const f of fichiers) {
      const doc = await ouvrirPdfjs(f);
      const n = doc.numPages;
      const morceaux = [];
      let car = 0;
      for (let i = 1; i <= n; i++) {
        ui.progres(T(`« ${f.name} » : page ${i} sur ${n}`, `“${f.name}”: page ${i} of ${n}`), (i - 1) / n);
        const page = await doc.getPage(i);
        const contenu = await page.getTextContent();
        let t = '';
        for (const it of contenu.items) { if ('str' in it) { t += it.str; if (it.hasEOL) t += '\n'; } }
        t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
        car += t.replace(/\s/g, '').length;
        morceaux.push(o.separer === 'non' ? t : `--- Page ${i} ---\n${t}`);
        page.cleanup();
        if (i % 10 === 0) await pause();
      }
      await doc.destroy();
      if (car < 20 * n && car < 200) {
        notes.push(T(`« ${f.name} » ne contient presque pas de texte : c'est sans doute un document scanné (des photos de pages). Le site ne fait pas de reconnaissance de caractères (OCR).`, `“${f.name}” contains almost no text: it is probably a scanned document (photos of pages). This site does not do text recognition (OCR).`));
        if (!car) continue;
      }
      notes.push(T(`« ${f.name} » : ${car.toLocaleString('fr-FR')} caractères extraits de ${n} page${n > 1 ? 's' : ''}.`, `“${f.name}”: ${car.toLocaleString('en-US')} characters extracted from ${n} page${n > 1 ? 's' : ''}.`));
      sorties.push({ nom: sansExt(f.name) + '.txt', blob: new Blob(['﻿' + morceaux.join('\n\n') + '\n'], { type: 'text/plain;charset=utf-8' }) });
    }
    return { sorties, notes };
  }

  async function extrairePages(fichiers, o, ui) {
    const { PDFDocument } = await pdfLib();
    const f = fichiers[0];
    const src = await ouvrirPdfLib(f);
    const n = src.getPageCount();
    if (!(o.pagesExtr || '').trim()) throw new Erreur(T('Indiquez les pages à extraire, par exemple : 2, 5-7', 'Enter the pages to extract, for example: 2, 5-7'));
    const pages = plage(o.pagesExtr, n);
    ui.progres(T('Création du PDF…', 'Creating the PDF…'), 0.5);
    if (o.modeExtr === 'chaque') {
      const sorties = [];
      for (const i of pages) { sorties.push({ nom: `${sansExt(f.name)}-page-${i + 1}.pdf`, blob: await extraire(src, [i], PDFDocument) }); await pause(); }
      return { sorties };
    }
    return { sorties: [{ nom: T(`${sansExt(f.name)}-extrait.pdf`, `${sansExt(f.name)}-extracted.pdf`), blob: await extraire(src, pages, PDFDocument) }],
      notes: [T(`${pages.length} page${pages.length > 1 ? 's' : ''} extraite${pages.length > 1 ? 's' : ''} sur ${n}.`, `${pages.length} of ${n} page${n > 1 ? 's' : ''} extracted.`)] };
  }

  async function organiser(fichiers, o, ui) {
    const { PDFDocument } = await pdfLib();
    const f = fichiers[0];
    const etat = o.__ordre;
    if (!etat || etat.fichier !== f) throw new Erreur(T('Patientez : les miniatures des pages sont en cours d\'affichage.', 'Please wait: the page thumbnails are still loading.'));
    const ordre = etat.ordre.filter((x) => !etat.retirees.has(x));
    if (!ordre.length) throw new Erreur(T('Vous avez retiré toutes les pages : gardez-en au moins une.', 'You removed every page: keep at least one.'));
    if (!etat.retirees.size && ordre.every((x, i) => x === i)) throw new Erreur(T('L\'ordre n\'a pas changé : déplacez des pages avec les flèches, ou retirez-en, puis réessayez.', 'The order has not changed: move pages with the arrows, or remove some, then try again.'));
    const src = await ouvrirPdfLib(f);
    ui.progres(T('Création du PDF réorganisé…', 'Creating the reordered PDF…'), 0.5);
    return { sorties: [{ nom: T(`${sansExt(f.name)}-organise.pdf`, `${sansExt(f.name)}-reordered.pdf`), blob: await extraire(src, ordre, PDFDocument) }],
      notes: [T(`${ordre.length} page${ordre.length > 1 ? 's' : ''} dans le nouvel ordre${etat.retirees.size ? `, ${etat.retirees.size} retirée${etat.retirees.size > 1 ? 's' : ''}` : ''}.`, `${ordre.length} page${ordre.length > 1 ? 's' : ''} in the new order${etat.retirees.size ? `, ${etat.retirees.size} removed` : ''}.`)] };
  }

  // Signature : rogne le dessin aux pixels non transparents
  function rogner(c) {
    const ctx = c.getContext('2d');
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    let x0 = width; let y0 = height; let x1 = -1; let y1 = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const m = 4;
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(width - 1, x1 + m); y1 = Math.min(height - 1, y1 + m);
    const r = document.createElement('canvas');
    r.width = x1 - x0 + 1; r.height = y1 - y0 + 1;
    r.getContext('2d').drawImage(c, x0, y0, r.width, r.height, 0, 0, r.width, r.height);
    return r;
  }

  async function signer(fichiers, o, ui) {
    const { degrees } = await pdfLib();
    const f = fichiers[0];
    const s = o.__signature;
    if (!s || s.fichier !== f) throw new Erreur(T('Patientez : l\'aperçu de la page est en cours d\'affichage.', 'Please wait: the page preview is still loading.'));
    const sig = rogner(s.pad);
    if (!sig) throw new Erreur(T('Dessinez d\'abord votre signature dans le cadre (ou importez une image de signature).', 'First draw your signature in the box (or import a signature image).'));
    if (!s.pos) throw new Erreur(T('Touchez l\'aperçu de la page à l\'endroit où placer la signature.', 'Tap the page preview where the signature should go.'));
    ui.progres(T('Ajout de la signature…', 'Adding the signature…'), 0.5);
    const doc = await ouvrirPdfLib(f);
    const page = doc.getPage(s.pos.page - 1);
    const png = await doc.embedPng(await (await versBlob(sig, 'image/png')).arrayBuffer());
    const vp = s.pos.vp;
    const w = vp.width * (Number(s.largeur) || 30) / 100;
    const h = w * sig.height / sig.width;
    const cx = s.pos.fx * vp.width; const cy = s.pos.fy * vp.height;
    const [x, y] = vp.convertToPdfPoint(cx - w / 2, cy + h / 2);
    page.drawImage(png, { x, y, width: w, height: h, rotate: degrees(vp.rotation || 0) });
    return { sorties: [{ nom: T(`${sansExt(f.name)}-signe.pdf`, `${sansExt(f.name)}-signed.pdf`), blob: new Blob([await doc.save()], { type: 'application/pdf' }) }],
      notes: [T('Signature ajoutée en page ', 'Signature added on page ') + s.pos.page + T('. Pour signer à un autre endroit, recommencez avec le fichier obtenu.', '. To sign in another place, start again with the new file.')] };
  }

  async function svgVersImage(fichiers, o, ui) {
    const sorties = [];
    for (let i = 0; i < fichiers.length; i++) {
      const f = fichiers[i];
      ui.progres(T(`« ${f.name} »`, `“${f.name}”`), i / fichiers.length);
      const texte = await f.text();
      const d = new DOMParser().parseFromString(texte, 'image/svg+xml');
      const svg = d.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== 'svg' || d.getElementsByTagName('parsererror').length) throw new Erreur(T(`« ${f.name} » n'est pas un SVG valide.`, `“${f.name}” is not a valid SVG.`));
      const nb = (v) => { const m = /^\s*([\d.]+)\s*(px)?\s*$/.exec(v || ''); return m ? parseFloat(m[1]) : 0; };
      let w = nb(svg.getAttribute('width')); let h = nb(svg.getAttribute('height'));
      const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
      if ((!w || !h) && vb.length === 4 && vb[2] > 0 && vb[3] > 0) { if (w) h = w * vb[3] / vb[2]; else if (h) w = h * vb[2] / vb[3]; else { w = vb[2]; h = vb[3]; } }
      if (!w || !h) { w = 300; h = 150; }
      const cible = o.largeurSvg || 'x2';
      const k = cible[0] === 'x' ? Number(cible.slice(1)) : Number(cible) / w;
      const W = Math.max(1, Math.round(w * k)); const H = Math.max(1, Math.round(h * k));
      if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      try {
        const img = new Image(); img.src = url;
        await img.decode().catch(() => { throw new Erreur(T(`Votre navigateur n'arrive pas à afficher « ${f.name} ».`, `Your browser cannot display “${f.name}”.`)); });
        const type = o.format === 'jpg' ? 'image/jpeg' : 'image/png';
        const c = toile({ source: img, w: W, h: H }, W, H, type === 'image/jpeg' || o.fond === 'blanc');
        sorties.push({ nom: `${sansExt(f.name)}.${EXT[type]}`, blob: await versBlob(c, type, 0.92) });
        c.width = c.height = 0;
      } finally { URL.revokeObjectURL(url); }
    }
    return { sorties };
  }

  async function versIco(fichiers, o, ui) {
    const tailles = o.taillesIco === 'complet' ? [16, 24, 32, 48, 64, 128, 256] : [16, 32, 48];
    const sorties = [];
    for (const f of fichiers) {
      ui.progres(T(`« ${f.name} »`, `“${f.name}”`), 0.3);
      const im = await decoderImage(f);
      const pngs = [];
      for (const t of tailles) {
        const c = document.createElement('canvas'); c.width = c.height = t;
        const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        const k = o.cadrage === 'remplir' ? Math.max(t / im.w, t / im.h) : Math.min(t / im.w, t / im.h);
        const w = im.w * k; const h = im.h * k;
        ctx.drawImage(im.source, (t - w) / 2, (t - h) / 2, w, h);
        pngs.push(new Uint8Array(await (await versBlob(c, 'image/png')).arrayBuffer()));
      }
      im.liberer();
      const tete = new DataView(new ArrayBuffer(6 + 16 * tailles.length));
      tete.setUint16(2, 1, true); tete.setUint16(4, tailles.length, true);
      let pos = tete.byteLength;
      tailles.forEach((t, i) => {
        const e = 6 + 16 * i;
        tete.setUint8(e, t >= 256 ? 0 : t); tete.setUint8(e + 1, t >= 256 ? 0 : t);
        tete.setUint16(e + 4, 1, true); tete.setUint16(e + 6, 32, true);
        tete.setUint32(e + 8, pngs[i].length, true); tete.setUint32(e + 12, pos, true);
        pos += pngs[i].length;
      });
      sorties.push({ nom: sansExt(f.name) + '.ico', blob: new Blob([tete.buffer, ...pngs], { type: 'image/x-icon' }) });
    }
    return { sorties, notes: [T(`Icône créée en ${tailles.join(', ')} px.`, `Icon created in ${tailles.join(', ')} px.`)] };
  }

  async function noirEtBlanc(fichiers, o, ui) {
    const sorties = [];
    const seuil = Number(o.seuil) || 128;
    for (let i = 0; i < fichiers.length; i++) {
      const f = fichiers[i];
      ui.progres(T(`Image ${i + 1} sur ${fichiers.length} : « ${f.name} »`, `Image ${i + 1} of ${fichiers.length}: “${f.name}”`), i / fichiers.length);
      const im = await decoderImage(f);
      const type = formatDe(f);
      const c = toile(im, 0, 0, type === 'image/jpeg');
      im.liberer();
      const ctx = c.getContext('2d');
      const bande = 256;
      for (let y = 0; y < c.height; y += bande) {
        const hh = Math.min(bande, c.height - y);
        const d = ctx.getImageData(0, y, c.width, hh);
        const p = d.data;
        for (let j = 0; j < p.length; j += 4) {
          let g = 0.299 * p[j] + 0.587 * p[j + 1] + 0.114 * p[j + 2];
          if (o.modeNb === 'seuil') g = g >= seuil ? 255 : 0;
          p[j] = p[j + 1] = p[j + 2] = g;
        }
        ctx.putImageData(d, 0, y);
        if ((y / bande) % 8 === 0) await pause();
      }
      sorties.push({ nom: T(`${sansExt(f.name)}-noir-et-blanc.${EXT[type]}`, `${sansExt(f.name)}-black-and-white.${EXT[type]}`), blob: await versBlob(c, type, 0.92) });
      c.width = c.height = 0;
    }
    return { sorties };
  }

  // ---------- panneaux spéciaux (signature, ordre des pages) ----------
  async function panneauSignature(f, zone, valeurs) {
    const etat = { fichier: f, pad: null, pos: null, largeur: valeurs.__largeur || 30 };
    valeurs.__signature = etat;
    const pad = el('canvas', { class: 'signature-pad', width: 900, height: 300, 'aria-label': T('Cadre pour dessiner votre signature', 'Box to draw your signature') });
    const pctx = pad.getContext('2d');
    etat.pad = pad;
    let encre = '#111111';
    let trace = false;
    const point = (e) => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) * pad.width / r.width, (e.clientY - r.top) * pad.height / r.height]; };
    pad.addEventListener('pointerdown', (e) => { trace = true; pad.setPointerCapture(e.pointerId); const [x, y] = point(e); pctx.beginPath(); pctx.moveTo(x, y); pctx.lineTo(x + 0.1, y); pctx.strokeStyle = encre; pctx.lineWidth = 6; pctx.lineCap = 'round'; pctx.lineJoin = 'round'; pctx.stroke(); });
    pad.addEventListener('pointermove', (e) => { if (!trace) return; const [x, y] = point(e); pctx.lineTo(x, y); pctx.stroke(); });
    const fin = () => { if (trace) { trace = false; dessiner(); } };
    pad.addEventListener('pointerup', fin); pad.addEventListener('pointercancel', fin);
    const effacer = el('button', { type: 'button', texte: T('Effacer la signature', 'Clear signature'), onclick: () => { pctx.clearRect(0, 0, pad.width, pad.height); dessiner(); } });
    const couleur = el('select', { 'aria-label': T('Couleur de l\'encre', 'Ink color') }, el('option', { value: '#111111', texte: T('Encre noire', 'Black ink') }), el('option', { value: '#1d3f9e', texte: T('Encre bleue', 'Blue ink') }));
    couleur.addEventListener('change', () => { encre = couleur.value; });
    const imp = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', class: 'visuellement-cache', id: 'sig-' + Math.random().toString(36).slice(2) });
    imp.addEventListener('change', async () => {
      const fi = imp.files[0]; imp.value = '';
      if (!fi) return;
      try {
        const im = await decoderNatif(fi);
        const k = Math.min(pad.width / im.w, pad.height / im.h);
        pctx.clearRect(0, 0, pad.width, pad.height);
        pctx.drawImage(im.source, (pad.width - im.w * k) / 2, (pad.height - im.h * k) / 2, im.w * k, im.h * k);
        im.liberer();
        // fond blanc d'une photo de signature -> transparent
        const d = pctx.getImageData(0, 0, pad.width, pad.height);
        for (let j = 0; j < d.data.length; j += 4) if (d.data[j] > 225 && d.data[j + 1] > 225 && d.data[j + 2] > 225) d.data[j + 3] = 0;
        pctx.putImageData(d, 0, 0);
        dessiner();
      } catch (e) { /* image illisible : rien */ }
    });
    const importer = el('label', { class: 'bouton', for: imp.id, texte: T('Importer une image', 'Import an image') });
    const choixPage = el('input', { type: 'number', min: 1, value: 1, inputmode: 'numeric', id: 'sigp-' + Math.random().toString(36).slice(2, 7) });
    const tailleSig = el('input', { type: 'range', min: 10, max: 60, step: 1, value: etat.largeur, id: 'sigt-' + Math.random().toString(36).slice(2, 7) });
    const sortieT = el('output', { texte: etat.largeur + ' %' });
    tailleSig.addEventListener('input', () => { etat.largeur = valeurs.__largeur = Number(tailleSig.value); sortieT.textContent = tailleSig.value + ' %'; dessiner(); });
    const apercu = el('canvas', { class: 'apercu-page', 'aria-label': T('Aperçu de la page : touchez pour placer la signature', 'Page preview: tap to place the signature') });
    const aide = el('p', { class: 'aide', texte: T('Chargement de l\'aperçu…', 'Loading preview…') });
    zone.replaceChildren(
      el('p', { class: 'etiquette', texte: T('1. Dessinez votre signature (souris, doigt ou stylet)', '1. Draw your signature (mouse, finger or stylus)') }), pad,
      el('div', { class: 'boutons' }, effacer, couleur, importer, imp),
      el('div', { class: 'grille options' },
        el('div', { class: 'champ' }, el('label', { for: choixPage.id, texte: T('Page à signer', 'Page to sign') }), choixPage),
        el('div', { class: 'champ' }, el('label', { for: tailleSig.id }, T('Largeur de la signature : ', 'Signature width: '), sortieT), tailleSig)),
      el('p', { class: 'etiquette', texte: T('2. Touchez la page à l\'endroit de la signature', '2. Tap the page where the signature goes') }), aide, apercu);
    let doc; let fond = null; let vp = null; let numero = 0;
    try { doc = await ouvrirPdfjs(f); } catch (e) { aide.textContent = e.message; aide.classList.add('erreur'); return; }
    if (valeurs.__signature !== etat) { doc.destroy(); return; }
    choixPage.max = doc.numPages; choixPage.value = doc.numPages;
    async function afficherPage() {
      const n = Math.min(doc.numPages, Math.max(1, Math.floor(Number(choixPage.value) || 1)));
      if (n === numero) return;
      numero = n; etat.pos = null;
      const page = await doc.getPage(n);
      vp = page.getViewport({ scale: 1 });
      const k = Math.min(2, 1000 / vp.width);
      const vpr = page.getViewport({ scale: k });
      const c = document.createElement('canvas'); c.width = Math.floor(vpr.width); c.height = Math.floor(vpr.height);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vpr }).promise;
      fond = c; apercu.width = c.width; apercu.height = c.height;
      aide.textContent = T(`Page ${n} sur ${doc.numPages}. Touchez l'endroit où doit aller le centre de la signature.`, `Page ${n} of ${doc.numPages}. Tap where the center of the signature should go.`);
      dessiner();
    }
    function dessiner() {
      if (!fond) return;
      const ctx = apercu.getContext('2d');
      ctx.drawImage(fond, 0, 0);
      if (!etat.pos) return;
      const sig = rogner(pad);
      if (!sig) return;
      const w = apercu.width * etat.largeur / 100; const h = w * sig.height / sig.width;
      ctx.drawImage(sig, etat.pos.fx * apercu.width - w / 2, etat.pos.fy * apercu.height - h / 2, w, h);
      ctx.strokeStyle = 'rgba(31,111,235,.8)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
      ctx.strokeRect(etat.pos.fx * apercu.width - w / 2, etat.pos.fy * apercu.height - h / 2, w, h); ctx.setLineDash([]);
    }
    apercu.addEventListener('click', (e) => {
      if (!vp) return;
      const r = apercu.getBoundingClientRect();
      etat.pos = { page: numero, vp, fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height };
      dessiner();
      aide.textContent = T(`Signature placée en page ${numero}. Cliquez sur « Signer le PDF », ou touchez ailleurs pour la déplacer.`, `Signature placed on page ${numero}. Click “Sign PDF”, or tap elsewhere to move it.`);
    });
    choixPage.addEventListener('change', afficherPage);
    await afficherPage();
  }

  async function panneauOrdre(f, zone, valeurs) {
    const etat = { fichier: f, ordre: [], retirees: new Set() };
    valeurs.__ordre = etat;
    const grille = el('ol', { class: 'pages-grille' });
    const aide = el('p', { class: 'aide', texte: T('Chargement des miniatures…', 'Loading thumbnails…') });
    zone.replaceChildren(el('p', { class: 'etiquette', texte: T('Déplacez les pages avec ◀ ▶, retirez-les avec ✕', 'Move pages with ◀ ▶, remove them with ✕') }), aide, grille);
    let doc;
    try { doc = await ouvrirPdfjs(f); } catch (e) { aide.textContent = e.message; aide.classList.add('erreur'); return; }
    if (valeurs.__ordre !== etat) { doc.destroy(); return; }
    const n = doc.numPages;
    etat.ordre = [...Array(n).keys()];
    const cases = [];
    for (let i = 0; i < n; i++) {
      const c = el('canvas', { class: 'miniature', width: 1, height: 1 });
      const li = el('li', { class: 'page-case' }, c, el('span', { class: 'num', texte: 'Page ' + (i + 1) }),
        el('span', { class: 'actions' },
          el('button', { type: 'button', class: 'mini', 'aria-label': T(`Déplacer la page ${i + 1} avant`, `Move page ${i + 1} earlier`), texte: '◀', onclick: () => bouger(i, -1) }),
          el('button', { type: 'button', class: 'mini', 'aria-label': T(`Retirer ou remettre la page ${i + 1}`, `Remove or restore page ${i + 1}`), texte: '✕', onclick: () => { if (etat.retirees.has(i)) etat.retirees.delete(i); else etat.retirees.add(i); rang(); } }),
          el('button', { type: 'button', class: 'mini', 'aria-label': T(`Déplacer la page ${i + 1} après`, `Move page ${i + 1} later`), texte: '▶', onclick: () => bouger(i, 1) })));
      cases.push({ li, c });
    }
    function bouger(i, d) {
      const p = etat.ordre.indexOf(i); const q = p + d;
      if (q < 0 || q >= etat.ordre.length) return;
      [etat.ordre[p], etat.ordre[q]] = [etat.ordre[q], etat.ordre[p]];
      rang();
    }
    function rang() {
      grille.replaceChildren(...etat.ordre.map((i) => { cases[i].li.classList.toggle('retiree', etat.retirees.has(i)); return cases[i].li; }));
      aide.textContent = T(`${n} page${n > 1 ? 's' : ''}${etat.retirees.size ? `, ${etat.retirees.size} retirée${etat.retirees.size > 1 ? 's' : ''}` : ''}. Les miniatures servent seulement à repérer les pages : le PDF obtenu garde la qualité d'origine.`, `${n} page${n > 1 ? 's' : ''}${etat.retirees.size ? `, ${etat.retirees.size} removed` : ''}. The thumbnails are only there to identify the pages: the new PDF keeps the original quality.`);
    }
    rang();
    const maxApercus = MOBILE ? 150 : 400;
    for (let i = 0; i < Math.min(n, maxApercus); i++) {
      if (valeurs.__ordre !== etat) break;
      const page = await doc.getPage(i + 1);
      const v1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: 220 / Math.max(v1.width, v1.height) });
      const c = cases[i].c; c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      page.cleanup();
    }
    if (n > maxApercus) aide.textContent += T(` Miniatures affichées pour les ${maxApercus} premières pages.`, ` Thumbnails shown for the first ${maxApercus} pages.`);
    doc.destroy();
  }

  // ---------- options ----------
  const OPT = {
    resolution: { label: T('Qualité des images', 'Image quality'), type: 'select', val: '150', choix: [['96', T('Écran (96 ppp, léger)', 'Screen (96 dpi, small)')], ['150', T('Bonne (150 ppp)', 'Good (150 dpi)')], ['300', T('Impression (300 ppp, lourd)', 'Print (300 dpi, large)')]] },
    pages: { label: T('Pages (vide = toutes)', 'Pages (blank = all)'), type: 'text', val: '', aide: T('Exemple : 1-3, 5, 8-', 'Example: 1-3, 5, 8-') },
    page: { label: T('Format de page', 'Page size'), type: 'select', val: 'a4', choix: [['a4', T('A4, sens automatique', 'A4, auto orientation')], ['a4-portrait', 'A4 portrait'], ['a4-paysage', T('A4 paysage', 'A4 landscape')], ['image', T('Taille de l\'image', 'Image size')]] },
    marge: { label: T('Marges', 'Margins'), type: 'select', val: '0', choix: [['0', T('Sans marge', 'No margin')], ['20', T('Petites (7 mm)', 'Small (7 mm)')], ['40', T('Grandes (14 mm)', 'Large (14 mm)')]] },
    format: { label: T('Format de sortie', 'Output format'), type: 'select', val: 'jpg', choix: [['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WEBP']] },
    qualiteConv: { id: 'qualite', label: T('Qualité JPG / WEBP', 'JPG / WEBP quality'), type: 'range', val: '92', min: 50, max: 100, step: 1, unite: ' %' },
    qualite: { label: T('Qualité', 'Quality'), type: 'range', val: '75', min: 30, max: 95, step: 1, unite: ' %', aide: T('75 % : bon compromis. Plus bas = plus léger.', '75%: a good balance. Lower = smaller file.') },
    maxi: { label: T('Taille maximale', 'Maximum size'), type: 'select', val: '1920', choix: [['0', T('Garder la taille', 'Keep original size')], ['3840', '3840 px (4K)'], ['2560', '2560 px'], ['1920', '1920 px (Full HD)'], ['1280', '1280 px'], ['800', '800 px']] },
    formatComp: { id: 'format', label: T('Format de sortie', 'Output format'), type: 'select', val: 'jpg', choix: [['jpg', T('JPG (le plus compatible)', 'JPG (most compatible)')], ['webp', T('WEBP (le plus léger)', 'WEBP (smallest)')], ['meme', T('Même format qu\'à l\'origine', 'Same format as the original')]] },
    modeRedim: { id: 'mode', label: T('Redimensionner', 'Resize'), type: 'select', val: 'pixels', choix: [['pixels', T('En pixels', 'By pixels')], ['pourcent', T('En pourcentage', 'By percentage')]] },
    largeur: { label: T('Largeur (px)', 'Width (px)'), type: 'number', val: '1080', min: 1, si: (o) => o.mode === 'pixels' },
    hauteur: { label: T('Hauteur (px)', 'Height (px)'), type: 'number', val: '', min: 1, aide: T('Vide = calculée pour garder les proportions.', 'Blank = calculated to keep the aspect ratio.'), si: (o) => o.mode === 'pixels' },
    ratio: { label: T('Proportions', 'Aspect ratio'), type: 'select', val: 'oui', choix: [['oui', T('Garder (l\'image tient dans le cadre)', 'Keep (image fits inside the box)')], ['non', T('Étirer à la taille exacte', 'Stretch to exact size')]], si: (o) => o.mode === 'pixels' && o.largeur && o.hauteur },
    pourcent: { label: T('Pourcentage', 'Percentage'), type: 'number', val: '50', min: 1, max: 400, si: (o) => o.mode === 'pourcent' },
    modeDiv: { id: 'mode', label: T('Découper', 'Split mode'), type: 'select', val: 'chaque', choix: [['chaque', T('Une page par fichier', 'One page per file')], ['groupes', T('Tous les N pages', 'Every N pages')], ['plages', T('Selon mes plages', 'By custom ranges')]] },
    groupe: { label: T('Pages par fichier', 'Pages per file'), type: 'number', val: '2', min: 1, si: (o) => o.mode === 'groupes' },
    plages: { label: T('Plages (un fichier par plage)', 'Ranges (one file per range)'), type: 'text', val: '1-3, 4-6', aide: T('Séparez les fichiers par des virgules.', 'Separate files with commas.'), si: (o) => o.mode === 'plages' },
    pagesSuppr: { id: 'pages', label: T('Pages à supprimer', 'Pages to delete'), type: 'text', val: '', aide: T('Exemple : 2, 5-7', 'Example: 2, 5-7') },
    angle: { label: 'Rotation', type: 'select', val: '90', choix: [['90', T('90° vers la droite', '90° clockwise')], ['180', T('180° (à l\'envers)', '180° (upside down)')], ['270', T('90° vers la gauche', '90° counterclockwise')]] },
    niveau: { label: T('Compression', 'Compression level'), type: 'select', val: 'moyen', choix: [['leger', T('Légère (150 ppp)', 'Low (150 dpi)')], ['moyen', T('Moyenne (110 ppp, conseillée)', 'Medium (110 dpi, recommended)')], ['fort', T('Forte (80 ppp, le plus léger)', 'High (80 dpi, smallest file)')]] },
    position: { label: T('Position du numéro', 'Number position'), type: 'select', val: 'bas-centre', choix: [['bas-centre', T('En bas, au centre', 'Bottom center')], ['bas-droite', T('En bas, à droite', 'Bottom right')], ['bas-gauche', T('En bas, à gauche', 'Bottom left')], ['haut-centre', T('En haut, au centre', 'Top center')], ['haut-droite', T('En haut, à droite', 'Top right')]] },
    formatNum: { label: T('Texte', 'Number style'), type: 'select', val: 'n', choix: [['n', '1, 2, 3…'], ['page', 'Page 1'], ['sur', '1 / 10'], ['pagesur', T('Page 1 sur 10', 'Page 1 of 10')]] },
    debut: { label: T('Premier numéro', 'Start at'), type: 'number', val: '1', min: 0 },
    couverture: { label: T('Première page', 'First page'), type: 'select', val: 'non', choix: [['non', T('Numérotée', 'Numbered')], ['oui', T('Sans numéro (couverture)', 'No number (cover)')]] },
    taillePolice: { label: T('Taille du texte', 'Font size'), type: 'select', val: '11', choix: [['9', T('Petite', 'Small')], ['11', T('Normale', 'Normal')], ['14', T('Grande', 'Large')]] },
    texteFil: { label: T('Texte du filigrane', 'Watermark text'), type: 'text', val: T('CONFIDENTIEL', 'CONFIDENTIAL'), aide: T('60 caractères au plus. Exemple : COPIE, BROUILLON, « Pour dossier de location uniquement ».', '60 characters max. Examples: COPY, DRAFT, “For rental application only”.') },
    sensFil: { label: T('Sens', 'Direction'), type: 'select', val: 'diagonale', choix: [['diagonale', T('En diagonale', 'Diagonal')], ['horizontal', 'Horizontal']] },
    couleurFil: { label: T('Couleur', 'Color'), type: 'select', val: 'gris', choix: [['gris', T('Gris', 'Gray')], ['rouge', T('Rouge', 'Red')], ['bleu', T('Bleu', 'Blue')]] },
    opacite: { label: T('Opacité', 'Opacity'), type: 'range', val: '25', min: 10, max: 60, step: 5, unite: ' %' },
    separer: { label: T('Repères de pages', 'Page markers'), type: 'select', val: 'oui', choix: [['oui', T('Indiquer « --- Page 1 --- »', 'Add “--- Page 1 ---”')], ['non', T('Texte continu', 'Continuous text')]] },
    pagesExtr: { label: T('Pages à extraire', 'Pages to extract'), type: 'text', val: '', aide: T('Exemple : 2, 5-7', 'Example: 2, 5-7') },
    modeExtr: { label: T('Résultat', 'Output'), type: 'select', val: 'un', choix: [['un', T('Un seul PDF avec ces pages', 'One PDF with these pages')], ['chaque', T('Un PDF par page', 'One PDF per page')]] },
    largeurSvg: { label: T('Taille de l\'image', 'Image size'), type: 'select', val: 'x2', choix: [['x1', T('Taille d\'origine', 'Original size')], ['x2', T('2 × (net sur écran Retina)', '2× (sharp on Retina screens)')], ['x4', '4 ×'], ['512', T('512 px de large', '512 px wide')], ['1024', T('1024 px de large', '1024 px wide')], ['2048', T('2048 px de large', '2048 px wide')]] },
    formatSvg: { id: 'format', label: 'Format', type: 'select', val: 'png', choix: [['png', T('PNG (garde la transparence)', 'PNG (keeps transparency)')], ['jpg', T('JPG (fond blanc)', 'JPG (white background)')]] },
    fond: { label: T('Fond', 'Background'), type: 'select', val: 'transparent', choix: [['transparent', 'Transparent'], ['blanc', T('Blanc', 'White')]], si: (o) => o.format !== 'jpg' },
    taillesIco: { label: T('Tailles', 'Sizes'), type: 'select', val: 'favicon', choix: [['favicon', T('16, 32 et 48 px (favicon)', '16, 32 and 48 px (favicon)')], ['complet', T('16 à 256 px (icône Windows)', '16 to 256 px (Windows icon)')]] },
    cadrage: { label: T('Image pas carrée', 'Non-square image'), type: 'select', val: 'contenir', choix: [['contenir', T('Garder toute l\'image (bords transparents)', 'Fit the whole image (transparent edges)')], ['remplir', T('Remplir le carré (recadrer au centre)', 'Fill the square (center crop)')]] },
    modeNb: { label: T('Rendu', 'Style'), type: 'select', val: 'gris', choix: [['gris', T('Niveaux de gris', 'Grayscale')], ['seuil', T('Noir et blanc pur (deux couleurs)', 'Pure black and white (two colors)')]] },
    seuil: { label: T('Seuil', 'Threshold'), type: 'range', val: '128', min: 20, max: 235, step: 1, aide: T('Plus haut = plus de noir.', 'Higher = more black.'), si: (o) => o.modeNb === 'seuil' },
    debit: { label: T('Qualité du MP3', 'MP3 quality'), type: 'select', val: '192', choix: [['128', T('128 kb/s (léger)', '128 kbps (small)')], ['192', T('192 kb/s (conseillé)', '192 kbps (recommended)')], ['256', T('256 kb/s', '256 kbps')], ['320', T('320 kb/s (maximum)', '320 kbps (maximum)')]] },
  };

  // ---------- les outils ----------
  const IMG = ['image', 'heic'];
  const OUTILS = {
    'pdf-en-jpg': { titre: T('PDF en JPG', 'PDF to JPG'), k: ['pdf'], multi: true, btn: T('Convertir en JPG', 'Convert to JPG'), opts: ['resolution', 'pages'], run: (f, o, u) => pdfVersImages(f, o, u, 'image/jpeg') },
    'pdf-en-png': { titre: T('PDF en PNG', 'PDF to PNG'), k: ['pdf'], multi: true, btn: T('Convertir en PNG', 'Convert to PNG'), opts: ['resolution', 'pages'], run: (f, o, u) => pdfVersImages(f, o, u, 'image/png') },
    'jpg-en-pdf': { titre: T('Images en PDF', 'Images to PDF'), k: IMG, multi: true, ordre: true, btn: T('Créer le PDF', 'Create PDF'), opts: ['page', 'marge'], run: imagesVersPdf },
    'heic-en-jpg': { titre: T('HEIC en JPG', 'HEIC to JPG'), k: IMG, multi: true, btn: T('Convertir', 'Convert'), opts: ['format', 'qualiteConv'], run: convertirImages },
    'convertir-image': { titre: T('Convertir une image (JPG, PNG, WEBP)', 'Convert an image (JPG, PNG, WEBP)'), k: IMG, multi: true, btn: T('Convertir', 'Convert'), opts: ['format', 'qualiteConv'], run: convertirImages },
    'compresser-image': { titre: T('Compresser des images', 'Compress images'), k: IMG, multi: true, btn: T('Compresser', 'Compress'), opts: ['qualite', 'maxi', 'formatComp'], run: compresserImages },
    'redimensionner-image': { titre: T('Redimensionner des images', 'Resize images'), k: IMG, multi: true, btn: T('Redimensionner', 'Resize'), opts: ['modeRedim', 'largeur', 'hauteur', 'ratio', 'pourcent'], run: redimensionner },
    'fusionner-pdf': { titre: T('Fusionner des PDF', 'Merge PDFs'), k: ['pdf'], multi: true, ordre: true, btn: T('Fusionner', 'Merge'), opts: [], run: fusionner },
    'diviser-pdf': { titre: T('Diviser un PDF', 'Split a PDF'), k: ['pdf'], multi: false, btn: T('Diviser', 'Split'), opts: ['modeDiv', 'groupe', 'plages'], run: diviser },
    'supprimer-pages-pdf': { titre: T('Supprimer des pages d\'un PDF', 'Delete PDF pages'), k: ['pdf'], multi: false, btn: T('Supprimer ces pages', 'Delete these pages'), opts: ['pagesSuppr'], run: supprimerPages },
    'pivoter-pdf': { titre: T('Pivoter un PDF', 'Rotate a PDF'), k: ['pdf'], multi: true, btn: T('Pivoter', 'Rotate'), opts: ['angle', 'pages'], run: pivoter },
    'compresser-pdf': { titre: T('Compresser un PDF', 'Compress a PDF'), k: ['pdf'], multi: true, btn: T('Compresser', 'Compress'), opts: ['niveau'], run: compresserPdf },
    'mp4-en-mp3': { titre: T('Extraire le son en MP3', 'Extract audio to MP3'), k: ['video'], multi: true, btn: T('Extraire le MP3', 'Extract MP3'), opts: ['debit'], run: videoVersMp3 },
    'audio-en-mp3': { titre: T('Audio en MP3', 'Audio to MP3'), k: ['video'], multi: true, btn: T('Convertir en MP3', 'Convert to MP3'), opts: ['debit'], run: videoVersMp3 },
    'mp3-en-wav': { titre: T('MP3 en WAV', 'MP3 to WAV'), k: ['video'], multi: true, btn: T('Convertir en WAV', 'Convert to WAV'), opts: [], run: versWav },
    'signer-pdf': { titre: T('Signer un PDF', 'Sign a PDF'), k: ['pdf'], multi: false, btn: T('Signer le PDF', 'Sign PDF'), opts: [], panneau: panneauSignature, run: signer },
    'numeroter-pages-pdf': { titre: T('Numéroter les pages', 'Add page numbers'), k: ['pdf'], multi: true, btn: T('Numéroter', 'Add page numbers'), opts: ['position', 'formatNum', 'debut', 'couverture', 'taillePolice'], run: numeroter },
    'filigrane-pdf': { titre: T('Ajouter un filigrane', 'Add a watermark'), k: ['pdf'], multi: true, btn: T('Ajouter le filigrane', 'Add watermark'), opts: ['texteFil', 'sensFil', 'couleurFil', 'opacite', 'pages'], run: filigrane },
    'pdf-en-texte': { titre: T('PDF en texte', 'PDF to text'), k: ['pdf'], multi: true, btn: T('Extraire le texte', 'Extract text'), opts: ['separer'], run: pdfVersTexte },
    'extraire-pages-pdf': { titre: T('Extraire des pages', 'Extract pages'), k: ['pdf'], multi: false, btn: T('Extraire', 'Extract'), opts: ['pagesExtr', 'modeExtr'], run: extrairePages },
    'organiser-pdf': { titre: T('Changer l\'ordre des pages', 'Reorder pages'), k: ['pdf'], multi: false, btn: T('Créer le PDF', 'Create PDF'), opts: [], panneau: panneauOrdre, run: organiser },
    'svg-en-png': { titre: T('SVG en PNG', 'SVG to PNG'), k: ['svg'], multi: true, btn: T('Convertir', 'Convert'), opts: ['largeurSvg', 'formatSvg', 'fond'], run: svgVersImage },
    'png-en-ico': { titre: T('Créer une icône ICO', 'Create an ICO icon'), k: IMG, multi: true, btn: T('Créer le fichier ICO', 'Create ICO file'), opts: ['taillesIco', 'cadrage'], run: versIco },
    'image-noir-et-blanc': { titre: T('Noir et blanc', 'Black and white'), k: IMG, multi: true, btn: T('Passer en noir et blanc', 'Convert to black and white'), opts: ['modeNb', 'seuil'], run: noirEtBlanc },
  };
  // Pages qui réutilisent un outil avec un réglage par défaut différent
  const ALIAS = {
    'png-en-pdf': ['jpg-en-pdf', {}], 'heic-en-pdf': ['jpg-en-pdf', {}],
    'heic-en-png': ['heic-en-jpg', { format: 'png' }],
    'png-en-jpg': ['convertir-image', { format: 'jpg' }], 'webp-en-jpg': ['convertir-image', { format: 'jpg' }],
    'jpg-en-png': ['convertir-image', { format: 'png' }], 'webp-en-png': ['convertir-image', { format: 'png' }],
    'jpg-en-webp': ['convertir-image', { format: 'webp' }],
    'png-en-webp': ['convertir-image', { format: 'webp' }], 'avif-en-jpg': ['convertir-image', { format: 'jpg' }],
    'avif-en-png': ['convertir-image', { format: 'png' }], 'jpg-en-ico': ['png-en-ico', {}], 'webp-en-pdf': ['jpg-en-pdf', {}],
    'wav-en-mp3': ['audio-en-mp3', { debit: '320' }], 'm4a-en-mp3': ['audio-en-mp3', {}],
  };
  const PAR_GENRE = {
    pdf: ['pdf-en-jpg', 'compresser-pdf', 'fusionner-pdf', 'signer-pdf', 'diviser-pdf', 'extraire-pages-pdf', 'supprimer-pages-pdf', 'organiser-pdf', 'pivoter-pdf', 'numeroter-pages-pdf', 'filigrane-pdf', 'pdf-en-texte', 'pdf-en-png'],
    image: ['jpg-en-pdf', 'convertir-image', 'compresser-image', 'redimensionner-image', 'image-noir-et-blanc', 'png-en-ico'],
    heic: ['heic-en-jpg', 'jpg-en-pdf', 'compresser-image', 'redimensionner-image'],
    svg: ['svg-en-png'],
    video: ['mp4-en-mp3'],
  };
  const ACCEPT = { pdf: '.pdf,application/pdf', image: 'image/*', heic: '.heic,.heif,image/heic,image/heif', svg: '.svg,image/svg+xml', video: 'video/*,audio/*,.mp4,.mov,.m4a,.wav,.mp3' };

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
      el('p', { class: 'depot-titre', texte: auto ? T('Déposez n\'importe quel fichier ici', 'Drop any file here') : T('Glissez vos fichiers ici', 'Drop your files here') }),
      el('label', { class: 'bouton principal', for: entree.id, texte: T('Choisir des fichiers', 'Choose files') }), entree,
      el('p', { class: 'aide depot-aide' }));
    const liste = el('ul', { class: 'fichiers' });
    const choix = el('div', { class: 'choix', hidden: true });
    const options = el('div', { class: 'grille options' });
    const extra = el('div', { class: 'extra' });
    let fichierPanneau = null;
    const lancer = el('button', { type: 'button', class: 'principal', disabled: true, texte: T('Convertir', 'Convert') });
    const vider = el('button', { type: 'button', texte: T('Tout effacer', 'Clear all'), hidden: true });
    const barre = el('progress', { max: '1', value: '0' });
    const prog = el('div', { class: 'progression', hidden: true }, barre, el('span'));
    const etat = el('div', { class: 'message', role: 'status', 'aria-live': 'polite' });
    const sortie = el('div', { class: 'sorties' });
    // Passe design 23/11 : icône animée (SVG constant, aucune donnée de l'utilisateur dedans)
    depot.insertAdjacentHTML('afterbegin', '<svg class="depot-icone" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 35h-3a9 9 0 0 1-1-17.9A12 12 0 0 1 34 13a8 8 0 0 1 2 22h-3"/><g class="depot-fleche"><path d="M24 41V23"/><path d="M17.5 29.5 24 23l6.5 6.5"/></g></svg>');
    section.classList.add('pret');
    section.replaceChildren(depot, choix, liste, options, extra, el('div', { class: 'boutons' }, lancer, vider), prog, etat, sortie);

    const valeurs = {};
    function nettoyer() { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; sortie.replaceChildren(); }
    function dire(texte, erreur) { etat.textContent = texte || ''; etat.classList.toggle('erreur', !!erreur); etat.classList.remove('ok'); }

    function preparer() {
      const o = actuel ? actuel.outil : null;
      entree.multiple = o ? !!o.multi : true;
      entree.accept = o ? o.k.map((k) => ACCEPT[k]).join(',') : '';
      depot.querySelector('.depot-aide').textContent = o
        ? T(`${o.k.map((k) => NOMS_TYPES[k]).filter((x, i, a) => a.indexOf(x) === i).join(' ou ')}${o.multi ? ' (plusieurs à la fois possible)' : ''} · rien n'est envoyé sur Internet`, `${o.k.map((k) => NOMS_TYPES[k]).filter((x, i, a) => a.indexOf(x) === i).join(' or ')}${o.multi ? ' (several at once)' : ''} · nothing is uploaded`)
        : T('PDF, images (JPG, PNG, WEBP, HEIC, SVG), vidéos et sons · tout reste sur votre appareil', 'PDF, images (JPG, PNG, WEBP, HEIC, SVG), video and audio · everything stays on your device');
      lancer.textContent = o ? o.btn : T('Convertir', 'Convert');
      options.replaceChildren();
      extra.replaceChildren(); fichierPanneau = null;
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
          li.append(el('button', { type: 'button', class: 'mini', 'aria-label': T('Monter ', 'Move up ') + f.name, texte: '↑', disabled: i === 0, onclick: () => { [fichiers[i - 1], fichiers[i]] = [fichiers[i], fichiers[i - 1]]; afficherListe(); } }));
          li.append(el('button', { type: 'button', class: 'mini', 'aria-label': T('Descendre ', 'Move down ') + f.name, texte: '↓', disabled: i === fichiers.length - 1, onclick: () => { [fichiers[i + 1], fichiers[i]] = [fichiers[i], fichiers[i + 1]]; afficherListe(); } }));
        }
        li.append(el('button', { type: 'button', class: 'mini', 'aria-label': T('Retirer ', 'Remove ') + f.name, texte: '✕', onclick: () => { fichiers.splice(i, 1); afficherListe(); } }));
        liste.append(li);
        if (genre(f) === 'pdf' && o && !f._pages) {
          ouvrirPdfLib(f).then((d) => { f._pages = d.getPageCount(); info.textContent = `${taille(f.size)} · ${f._pages} page${f._pages > 1 ? 's' : ''}`; }).catch(() => {});
        } else if (f._pages) info.textContent = `${taille(f.size)} · ${f._pages} page${f._pages > 1 ? 's' : ''}`;
      });
      lancer.disabled = !actuel || !fichiers.length || occupe;
      vider.hidden = !fichiers.length;
      if (o && o.panneau && fichiers[0] !== fichierPanneau) {
        fichierPanneau = fichiers[0] || null;
        if (fichierPanneau) o.panneau(fichierPanneau, extra, valeurs).catch((e) => { if (!(e instanceof Erreur)) console.error(e); });
        else { extra.replaceChildren(); delete valeurs.__signature; delete valeurs.__ordre; }
      }
    }

    function proposer() {
      // Accueil : on propose les outils qui conviennent aux fichiers déposés
      const genres = [...new Set(fichiers.map(genre))];
      choix.replaceChildren();
      choix.hidden = false;
      const g = genres[0];
      if (genres.length > 1) {
        choix.append(el('p', { texte: T('Vous avez mélangé plusieurs sortes de fichiers. Déposez-en d\'une seule sorte à la fois (que des PDF, que des images…).', 'You mixed several kinds of files. Drop one kind at a time (only PDFs, only images…).') }));
        return;
      }
      if (!PAR_GENRE[g]) {
        const quoi = { word: T('Les fichiers Word', 'Word files'), tableur: T('Les tableurs (Excel)', 'Spreadsheets (Excel)'), presentation: T('Les présentations (PowerPoint)', 'Presentations (PowerPoint)') }[g] || T('Ce type de fichier', 'Files of this type');
        choix.append(el('p', { texte: T(`${quoi} ne sont pas encore pris en charge. Nous ne proposons que des conversions qui marchent vraiment dans votre navigateur, sans envoyer vos fichiers.`, `${quoi} are not supported yet. We only offer conversions that truly work in your browser, without uploading your files.`) }));
        if (g === 'word') choix.append(el('p', { class: 'aide', texte: T('Astuce : dans Word ou LibreOffice, « Fichier › Enregistrer sous › PDF » le fait gratuitement et sans perte.', 'Tip: in Word or LibreOffice, “File › Save As › PDF” does it for free, with no quality loss.') }));
        return;
      }
      choix.append(el('p', { class: 'etiquette', texte: T(`Que voulez-vous faire de ${fichiers.length > 1 ? 'ces fichiers' : 'ce fichier'} ?`, `What do you want to do with ${fichiers.length > 1 ? 'these files' : 'this file'}?`) }));
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
          const autre = PAR_GENRE[g] ? T(` Pour ${g === 'pdf' ? 'un PDF' : g === 'video' ? 'une vidéo' : 'une image'}, essayez « ${OUTILS[PAR_GENRE[g][0]].titre} » depuis l'accueil.`, ` For ${g === 'pdf' ? 'a PDF' : g === 'video' ? 'a video' : 'an image'}, try “${OUTILS[PAR_GENRE[g][0]].titre}” from the home page.`) : '';
          dire(T(`« ${refus[0].name} » n'est pas un fichier accepté ici (${o.k.map((k) => NOMS_TYPES[k]).join(', ')}).${autre}`, `“${refus[0].name}” is not a file this tool accepts (${o.k.map((k) => NOMS_TYPES[k]).join(', ')}).${autre}`), true);
        }
        if (!o.multi) { ajout = ajout.slice(0, 1); fichiers = []; }
      }
      for (const f of ajout) {
        const g = genre(f);
        if (LIMITES[g] && f.size > LIMITES[g]) { dire(T(`« ${f.name} » pèse ${taille(f.size)} : c'est trop pour un traitement dans le navigateur (maximum ${taille(LIMITES[g])}).`, `“${f.name}” is ${taille(f.size)}: too large to process in the browser (maximum ${taille(LIMITES[g])}).`), true); continue; }
        fichiers.push(f);
      }
      if (fichiers.length > 300) { fichiers = fichiers.slice(0, 300); dire(T('300 fichiers au plus à la fois.', '300 files maximum at a time.'), true); }
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
        dire(e instanceof Erreur ? e.message : T(`Échec de la conversion : ${e && e.message ? e.message : e}. Si le fichier est très gros, essayez sur un ordinateur.`, `Conversion failed: ${e && e.message ? e.message : e}. If the file is very large, try on a computer.`), true);
      } finally {
        occupe = false; afficherListe();
      }
    });

    function lien(f) {
      const u = URL.createObjectURL(f.blob); urls.push(u);
      return el('a', { class: 'bouton', href: u, download: f.nom }, T(`Télécharger ${f.nom} `, `Download ${f.nom} `), el('span', { class: 'aide', texte: `(${taille(f.blob.size)})` }));
    }
    async function afficherResultats(res, secondes) {
      const s = res.sorties || [];
      const notes = (res.notes || []).slice();
      if (reduction) notes.push(T('Image très grande : elle a été réduite pour tenir dans la mémoire de cet appareil.', 'Very large image: it was scaled down to fit this device\'s memory.'));
      if (s.length) notes.unshift(T(`Terminé en ${secondes < 1 ? 'moins d\'une seconde' : Math.round(secondes) + ' s'} : ${s.length} fichier${s.length > 1 ? 's' : ''} prêt${s.length > 1 ? 's' : ''}.`, `Done in ${secondes < 1 ? 'less than a second' : Math.round(secondes) + ' s'}: ${s.length} file${s.length > 1 ? 's' : ''} ready.`));
      dire(notes.join(' '));
      if (!s.length) return;
      etat.classList.add('ok');
      etat.insertAdjacentHTML('afterbegin', '<svg class="coche" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>');
      const bloc = el('div', { class: 'resultat' });
      if (s.length > 1) {
        const tout = el('button', { type: 'button', class: 'principal', texte: T(`Tout télécharger (.zip, ${s.length} fichiers)`, `Download all (.zip, ${s.length} files)`) });
        tout.addEventListener('click', async () => {
          tout.disabled = true; tout.textContent = T('Préparation du ZIP…', 'Preparing the ZIP…');
          try {
            const z = await zip(unique(s));
            const u = URL.createObjectURL(z); urls.push(u);
            const a = el('a', { href: u, download: (actuel.id || 'fichiers') + '.zip' });
            document.body.append(a); a.click(); a.remove();
            tout.textContent = T(`ZIP téléchargé (${taille(z.size)})`, `ZIP downloaded (${taille(z.size)})`);
          } catch (e) { tout.textContent = T('ZIP impossible : téléchargez un par un', 'ZIP failed: download the files one by one'); }
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
      if (s.length > 200) ul.append(el('li', { class: 'aide', texte: T(`… et ${s.length - 200} autres : utilisez le ZIP.`, `… and ${s.length - 200} more: use the ZIP.`) }));
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
