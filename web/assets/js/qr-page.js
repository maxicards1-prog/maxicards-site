/* Générateur de QR code : saisie -> QR.encoder (logique/qr.js) -> aperçu sur canvas, PNG et SVG.
 * Tout reste dans le navigateur : rien n'est envoyé, rien n'est écrit dans l'adresse ni enregistré. */
(function () {
  'use strict';
  var CQ = window.CQ, QR = window.QR;
  var section = document.querySelector('.outil[data-type]');
  if (!CQ || !QR || !section) { return; }

  var TYPES = ['lien', 'texte', 'wifi', 'email', 'tel', 'vcard'];
  var type = TYPES.indexOf(section.getAttribute('data-type')) >= 0 ? section.getAttribute('data-type') : 'lien';
  var onglets = Array.prototype.slice.call(section.querySelectorAll('.onglets button[data-type]'));
  var panneaux = Array.prototype.slice.call(section.querySelectorAll('[data-panneau]'));
  var canvas = CQ.el('qrApercu');
  var boutonPng = CQ.el('qrPng'), boutonSvg = CQ.el('qrSvg');
  var CHAMPS = ['qrLien', 'qrTexte', 'wifiSsid', 'wifiMdp', 'wifiSecu', 'wifiCache', 'mailAdresse', 'mailSujet',
    'mailMessage', 'telNumero', 'vcPrenom', 'vcNom', 'vcOrg', 'vcFonction', 'vcTel', 'vcEmail', 'vcSite', 'vcAdresse',
    'vcCp', 'vcVille', 'vcPays', 'qrCouleur', 'qrFond', 'qrTaille', 'qrMarge', 'qrNiveau'];
  var dernier = null;      // { res, o } : le dernier code valable
  var minuterie = null;

  function val(id, max) {
    var el = CQ.el(id);
    return el ? String(el.value).slice(0, max) : '';
  }
  function fr(n) { return CQ.entier(n); }

  // Le texte à mettre dans le code, selon l'onglet ouvert ; { vide: message } s'il manque l'essentiel.
  function contenu() {
    var t;
    switch (type) {
      case 'texte':
        t = val('qrTexte', QR.MAX_CARACTERES);
        return t.trim() ? { texte: t } : { vide: 'Écrivez le texte à mettre dans le QR code.' };
      case 'wifi':
        if (!val('wifiSsid', 64).trim()) { return { vide: 'Écrivez le nom du réseau Wi-Fi (SSID), tel qu\'il s\'affiche sur le téléphone.' }; }
        return { texte: QR.wifi({ ssid: val('wifiSsid', 64), motDePasse: val('wifiMdp', 128), securite: val('wifiSecu', 10),
          cache: CQ.coche('wifiCache') }) };
      case 'email':
        if (!/\S+@\S+/.test(val('mailAdresse', 254))) { return { vide: 'Écrivez l\'adresse e-mail du destinataire.' }; }
        return { texte: QR.email({ adresse: val('mailAdresse', 254), sujet: val('mailSujet', 200), message: val('mailMessage', 1500) }) };
      case 'tel':
        t = QR.tel(val('telNumero', 40));
        return t.length > 6 ? { texte: t } : { vide: 'Écrivez le numéro de téléphone.' };
      case 'vcard':
        if (!['vcPrenom', 'vcNom', 'vcOrg', 'vcTel', 'vcEmail'].some(function (id) { return val(id, 100).trim(); })) {
          return { vide: 'Écrivez au moins un nom, une entreprise, un téléphone ou un e-mail.' };
        }
        return { texte: QR.vcard({ prenom: val('vcPrenom', 100), nom: val('vcNom', 100), organisation: val('vcOrg', 100),
          fonction: val('vcFonction', 100), tel: val('vcTel', 40), email: val('vcEmail', 254), site: val('vcSite', 500),
          adresse: val('vcAdresse', 200), ville: val('vcVille', 100), codePostal: val('vcCp', 20), pays: val('vcPays', 60) }) };
      default:
        var a = QR.lienAnalyse(val('qrLien', 2000));
        if (a.refus) { return { vide: a.refus }; }
        return a.lien ? { texte: a.lien } : { vide: 'Écrivez l\'adresse du site (par exemple maxicards.net).' };
    }
  }

  function reglages() {
    var taille = CQ.nombre('qrTaille', 128, 2048), marge = CQ.nombre('qrMarge', 0, 10);
    var niveau = val('qrNiveau', 1);
    return {
      couleur: QR.couleurValide(val('qrCouleur', 7), '#000000'),
      fond: QR.couleurValide(val('qrFond', 7), '#ffffff'),
      taille: isFinite(taille) ? Math.round(taille) : 1024,
      marge: isFinite(marge) ? Math.round(marge) : 4,
      niveau: ['L', 'M', 'Q', 'H'].indexOf(niveau) >= 0 ? niveau : 'M'
    };
  }

  // Côté du PNG : au moins 2 pixels par module, sinon le code n'est plus lisible.
  function cotePng(res, o) {
    return Math.min(4096, Math.max(o.taille, (res.taille + 2 * o.marge) * 2));
  }

  // Dessine le code : chaque module tombe sur des pixels entiers (bords nets, pas de flou).
  function dessiner(cv, res, o, cote) {
    cv.width = cote;
    cv.height = cote;
    var ctx = cv.getContext('2d');
    if (!ctx) { return; }
    ctx.fillStyle = o.fond;
    ctx.fillRect(0, 0, cote, cote);
    if (!res) { return; }
    var n = res.taille, total = n + 2 * o.marge;
    function p(k) { return Math.round(k * cote / total); }
    ctx.fillStyle = o.couleur;
    for (var y = 0; y < n; y++) {
      var x = 0;
      while (x < n) {
        if (res.modules[y][x]) {
          var debut = x;
          while (x < n && res.modules[y][x]) { x++; }
          ctx.fillRect(p(debut + o.marge), p(y + o.marge), p(x + o.marge) - p(debut + o.marge), p(y + 1 + o.marge) - p(y + o.marge));
        } else {
          x++;
        }
      }
    }
  }

  function alertes(liste) {
    var ul = CQ.el('qrAlertes');
    if (!ul) { return; }
    while (ul.firstChild) { ul.removeChild(ul.firstChild); }
    liste.forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
  }

  function activer(oui) {
    [boutonPng, boutonSvg].forEach(function (b) { if (b) { b.disabled = !oui; } });
    section.classList.toggle('qr-vide', !oui);
  }

  function recalcul() {
    clearTimeout(minuterie);
    minuterie = null;
    var c = contenu(), o = reglages(), res = null, msg = [];
    CQ.texte('qrContenu', c.texte ? c.texte.slice(0, 600) + (c.texte.length > 600 ? '…' : '') : '');
    if (!c.vide) {
      try {
        res = QR.encoder(c.texte, o.niveau);
      } catch (e) {
        msg.push(e && e.code === 'TROP_LONG' ? e.message : 'Impossible de créer ce QR code : vérifiez le contenu.');
      }
    } else {
      msg.push(c.vide);
    }
    if (canvas) { dessiner(canvas, res, o, res ? Math.max(600, (res.taille + 2 * o.marge) * 3) : 600); }
    if (!res) {
      dernier = null;
      activer(false);
      ['qrVersion', 'qrModules', 'qrOctets'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('qrPngInfo', '');
      alertes(msg);
      return;
    }
    dernier = { res: res, o: o };
    activer(true);
    CQ.texte('qrVersion', String(res.version));
    CQ.texte('qrModules', res.taille + ' × ' + res.taille);
    CQ.texte('qrOctets', fr(res.caracteres) + ' / ' + fr(res.capacite) + (res.mode === 'octets' ? ' octets' : ' caractères'));
    var cote = cotePng(res, o);
    CQ.texte('qrPngInfo', 'PNG : ' + fr(cote) + ' × ' + fr(cote) + ' pixels, marge comprise. SVG : vectoriel, net à toutes les tailles.');

    // Avertissements
    if (o.marge < 4) {
      msg.push('Marge de ' + o.marge + ' module' + (o.marge > 1 ? 's' : '') + ' : la norme prévoit une zone vide de 4 modules autour du code. Sans elle, certains lecteurs ne le lisent pas.');
    }
    var ratio = QR.contraste(o.couleur, o.fond);
    if (ratio < 4) {
      msg.push('Contraste trop faible entre le code et le fond (' + CQ.decimal(ratio, 1) + ':1) : le code risque de ne pas être lu. Gardez un code foncé sur un fond clair.');
    }
    if (QR.luminance(o.couleur) > QR.luminance(o.fond)) {
      msg.push('Code plus clair que le fond : certains lecteurs ne lisent pas les QR codes inversés.');
    }
    if (res.caracteres > res.capacite * 0.9) {
      msg.push('Texte trop long ou presque : le code est presque plein. Raccourcissez le texte ou baissez le niveau de correction.');
    } else if (res.version >= 15) {
      msg.push('Beaucoup de contenu (version ' + res.version + ') : le code est très dense. Imprimez-le grand ou raccourcissez le texte.');
    }
    if (cote > o.taille) {
      msg.push('Taille demandée trop petite pour ce code : le PNG fera ' + fr(cote) + ' pixels de côté (2 pixels par module au moins).');
    }
    if (type === 'wifi' && val('wifiSecu', 10) !== 'nopass' && !val('wifiMdp', 128)) {
      msg.push('Mot de passe vide : si le réseau est ouvert, choisissez « Aucun (réseau ouvert) ».');
    }
    alertes(msg);
  }

  function planifier() {
    clearTimeout(minuterie);
    minuterie = setTimeout(recalcul, 60);
  }

  function telecharger(blob, nom) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nom;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function montrer(t) {
    type = TYPES.indexOf(t) >= 0 ? t : 'lien';
    onglets.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-type') === type)); });
    panneaux.forEach(function (p) { p.hidden = p.getAttribute('data-panneau') !== type; });
    recalcul();
  }

  onglets.forEach(function (b) {
    b.addEventListener('click', function () { montrer(b.getAttribute('data-type')); });
  });
  CQ.surChangement(CHAMPS, planifier);

  if (boutonPng) {
    boutonPng.addEventListener('click', function () {
      recalcul();
      if (!dernier) { return; }
      var cv = document.createElement('canvas');
      dessiner(cv, dernier.res, dernier.o, cotePng(dernier.res, dernier.o));
      if (!cv.toBlob) { alertes(['Ce navigateur ne sait pas créer le PNG : utilisez le SVG.']); return; }
      cv.toBlob(function (blob) {
        if (blob) { telecharger(blob, 'qr-code.png'); } else { alertes(['Le PNG n\'a pas pu être créé : essayez une taille plus petite.']); }
      }, 'image/png');
    });
  }
  if (boutonSvg) {
    boutonSvg.addEventListener('click', function () {
      recalcul();
      if (!dernier) { return; }
      var texte = QR.svg(dernier.res, { marge: dernier.o.marge, couleur: dernier.o.couleur, fond: dernier.o.fond,
        pixels: cotePng(dernier.res, dernier.o) });
      telecharger(new Blob([texte], { type: 'image/svg+xml' }), 'qr-code.svg');
    });
  }

  montrer(type);
}());
