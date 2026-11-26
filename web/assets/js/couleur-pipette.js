/* Pipette : choisir une couleur dans une image de votre ordinateur. L'image reste dans votre navigateur :
   elle n'est ni envoyée ni enregistrée. */
(function () {
  'use strict';
  var COUL = window.COUL, CQ = window.CQ, CC = window.CC;
  var MAX_OCTETS = 25 * 1024 * 1024;   // fichier : 25 Mo au plus
  var MAX_PIXELS = 64 * 1000 * 1000;   // image d'origine : 64 millions de pixels au plus
  var MAX_COTE = 1000;                 // image affichée : 1000 px sur le grand côté
  var COTE_MINI = 64;                  // image réduite pour les couleurs dominantes
  var courante = COUL.lire('#1e90ff');
  var toile = CQ.el('toile'), ctx = toile.getContext('2d', { willReadFrequently: true });
  var repere = CQ.el('repere'), zone = CQ.el('zoneImage');
  var pos = null;

  function message(t) { CQ.texte('message', t); }

  function afficherCouleur(c) {
    courante = c;
    CC.peindre(CQ.el('apercu'), c);
    CQ.texte('vHex', COUL.hexAff(c));
    CQ.texte('vRgb', COUL.rgbTexte(c));
    CQ.texte('vHsl', COUL.hslTexte(c));
    var nom = COUL.nomProche(c);
    CQ.texte('vNom', nom.exact ? nom.nom : nom.nom + ' (le plus proche)');
    CC.versAdresse({ c: c });
  }

  function lirePixel(x, y) {
    if (zone.hidden) { return; }
    x = Math.max(0, Math.min(toile.width - 1, Math.floor(x)));
    y = Math.max(0, Math.min(toile.height - 1, Math.floor(y)));
    var d;
    try { d = ctx.getImageData(x, y, 1, 1).data; } catch (e) { message('Cette image ne peut pas être lue par le navigateur.'); return; }
    pos = { x: x, y: y };
    repere.hidden = false;
    repere.style.left = ((x + 0.5) / toile.width * 100) + '%';
    repere.style.top = ((y + 0.5) / toile.height * 100) + '%';
    afficherCouleur(COUL.rgb(d[0], d[1], d[2]));
  }

  function depuisSouris(e) {
    var r = toile.getBoundingClientRect();
    if (!r.width || !r.height) { return; }
    lirePixel((e.clientX - r.left) * toile.width / r.width, (e.clientY - r.top) * toile.height / r.height);
  }

  function dominantes() {
    var mini = document.createElement('canvas');
    var e = Math.min(1, COTE_MINI / Math.max(toile.width, toile.height));
    mini.width = Math.max(1, Math.round(toile.width * e));
    mini.height = Math.max(1, Math.round(toile.height * e));
    var c2 = mini.getContext('2d', { willReadFrequently: true });
    c2.drawImage(toile, 0, 0, mini.width, mini.height);
    var liste = [];
    try { liste = COUL.dominantes(c2.getImageData(0, 0, mini.width, mini.height).data, 6); } catch (err) { liste = []; }
    var z = CQ.el('dominantes');
    CC.vider(z);
    liste.forEach(function (d) {
      var b = CC.pastille(d.couleur, function (c) { afficherCouleur(c); }, Math.round(d.part * 100) + ' % de l\'image');
      var part = document.createElement('span');
      part.className = 'part';
      part.textContent = Math.round(d.part * 100) + ' %';
      b.appendChild(part);
      z.appendChild(b);
    });
    CQ.el('blocDominantes').hidden = liste.length === 0;
  }

  function dessiner(source, w, h) {
    if (!(w > 0 && h > 0) || w * h > MAX_PIXELS) {
      message('Cette image est trop grande (plus de 64 millions de pixels). Choisissez-en une plus petite.');
      return;
    }
    var e = Math.min(1, MAX_COTE / Math.max(w, h));
    toile.width = Math.max(1, Math.round(w * e));
    toile.height = Math.max(1, Math.round(h * e));
    ctx.clearRect(0, 0, toile.width, toile.height);
    ctx.drawImage(source, 0, 0, toile.width, toile.height);
    if (source.close) { source.close(); }
    zone.hidden = false;
    message('');
    CQ.texte('etatImage', 'Image chargée (' + w + ' × ' + h + ' pixels). Cliquez ou touchez un point pour lire sa couleur.');
    dominantes();
    lirePixel(toile.width / 2, toile.height / 2);
  }

  function repli(fichier) {
    var lecteur = new FileReader();
    lecteur.onerror = function () { message('Impossible de lire ce fichier.'); };
    lecteur.onload = function () {
      var url = String(lecteur.result);
      if (url.indexOf('data:image/') !== 0) { message('Ce fichier n\'est pas une image.'); return; }
      var img = new Image();
      img.onload = function () { dessiner(img, img.naturalWidth, img.naturalHeight); };
      img.onerror = function () { message('Ce format d\'image n\'est pas pris en charge par votre navigateur.'); };
      img.src = url;
    };
    lecteur.readAsDataURL(fichier);
  }

  function charger(fichier) {
    if (!fichier) { return; }
    if (!/^image\//.test(fichier.type)) { message('Choisissez un fichier image (PNG, JPG, WebP, GIF…).'); return; }
    if (fichier.size > MAX_OCTETS) { message('Ce fichier est trop lourd (plus de 25 Mo).'); return; }
    message('');
    if (window.createImageBitmap) {
      window.createImageBitmap(fichier).then(function (bmp) { dessiner(bmp, bmp.width, bmp.height); }, function () { repli(fichier); });
    } else {
      repli(fichier);
    }
  }

  CQ.el('fichier').addEventListener('change', function (e) { charger(e.target.files && e.target.files[0]); });
  toile.addEventListener('click', depuisSouris);
  toile.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' && e.buttons === 1) { depuisSouris(e); } });
  toile.addEventListener('keydown', function (e) {
    var pas = e.shiftKey ? 10 : 1, p = pos || { x: toile.width / 2, y: toile.height / 2 };
    var d = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] }[e.key];
    if (!d) { return; }
    e.preventDefault();
    lirePixel(p.x + d[0], p.y + d[1]);
  });
  CC.lierCopie();
  CC.lierPartage(function () { return { c: courante }; });
  afficherCouleur(CC.depuisAdresse('c') || courante);
}());
