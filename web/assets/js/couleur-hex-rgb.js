/* HEX en RGB et RGB en HEX, dans les deux sens. Tout se passe dans le navigateur. */
(function () {
  'use strict';
  var COUL = window.COUL, CQ = window.CQ, CC = window.CC;
  var courante = COUL.lire('#1e90ff');

  function afficher(c, source) {
    courante = c;
    var hex = CQ.el('hex');
    if (source !== 'hex') { hex.value = COUL.hexAff(c); }
    ['r', 'g', 'b'].forEach(function (k) {
      if (source !== 'rgb') { CQ.el(k).value = String(c[k]); }
    });
    CC.peindre(CQ.el('apercu'), c);
    CQ.texte('vRgb', COUL.rgbTexte(c));
    CQ.texte('vHex', COUL.hexAff(c));
    CQ.texte('vR', String(c.r));
    CQ.texte('vG', String(c.g));
    CQ.texte('vB', String(c.b));
    CQ.texte('phrase', COUL.hexAff(c) + ' = rgb(' + c.r + ', ' + c.g + ', ' + c.b + '). Chaque nombre va de 0 à 255 : rouge ' + c.r + ', vert ' + c.g + ', bleu ' + c.b + '.');
    CC.versAdresse({ c: c });
  }

  function depuisHex() {
    var v = CQ.el('hex').value.trim();
    if (v === '') { CQ.texte('message', ''); return; }
    // Dans ce champ on attend un code hexadécimal ; les autres écritures sont aussi comprises.
    var c = COUL.lire(v);
    if (c) { CQ.texte('message', ''); afficher(c, 'hex'); }
    else { CQ.texte('message', 'Code HEX non reconnu. Il faut 3 ou 6 caractères parmi 0-9 et a-f, par exemple #1e90ff ou #fff.'); }
  }
  function depuisRgb() {
    var v = ['r', 'g', 'b'].map(function (k) { return CQ.nombre(k, 0, 255); });
    if (v.some(function (x) { return !isFinite(x); })) { CQ.texte('message', 'Entrez trois nombres entre 0 et 255.'); return; }
    CQ.texte('message', '');
    afficher(COUL.rgb(v[0], v[1], v[2]), 'rgb');
  }

  CQ.surChangement(['hex'], depuisHex);
  CQ.surChangement(['r', 'g', 'b'], depuisRgb);
  CC.lierCopie();
  CC.lierPartage(function () { return { c: courante }; });
  afficher(CC.depuisAdresse('c') || courante, 'init');
}());
