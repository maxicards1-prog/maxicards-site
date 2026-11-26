/* Taille de soutien-gorge : bande et bonnet. Aucune mesure n'est gardée ni écrite dans l'adresse. */
(function () {
  'use strict';
  var CQ = window.CQ, TL = window.TL;
  function recalcul() {
    var d = CQ.nombre('dessous', 0, 300), p = CQ.nombre('poitrine', 0, 300);
    var r = isFinite(d) && isFinite(p) ? TL.soutienGorge(d, p) : null;
    var vide = function () { ['rFR', 'rEU', 'rUK'].forEach(function (id) { CQ.texte(id, '–'); }); };
    if (!r) { vide(); CQ.texte('phrase', isFinite(d) && isFinite(p) ? 'Mesures hors de la plage prévue (dessous de 55 à 130 cm, poitrine de 60 à 170 cm).' : ''); return; }
    if (r.erreur) { vide(); CQ.texte('phrase', 'Le tour de poitrine doit être plus grand que le tour de dessous.'); return; }
    if (r.petit) { vide(); CQ.texte('phrase', 'L’écart est de ' + CQ.souple(r.ecart, 1) + ' cm : moins de 10 cm, le bonnet est plus petit que le AA des tableaux. Regardez le guide de la marque.'); return; }
    if (r.grand) { vide(); CQ.texte('phrase', 'L’écart est de ' + CQ.souple(r.ecart, 1) + ' cm : au-delà du bonnet F des tableaux. Regardez le guide d’une marque spécialisée.'); return; }
    CQ.texte('rFR', r.bandeFR + ' ' + r.bonnet.fr);
    CQ.texte('rEU', r.bandeEU + ' ' + r.bonnet.fr);
    CQ.texte('rUK', r.bandeUK + ' ' + r.bonnet.uk);
    CQ.texte('phrase', 'Bande ' + r.bandeEU + ' (dessous de poitrine arrondi à 5 cm), écart de ' + CQ.souple(r.ecart, 1) + ' cm : bonnet ' + r.bonnet.fr +
      '. Essayez aussi la taille voisine : les marques coupent différemment.');
  }
  CQ.surChangement(['dessous', 'poitrine'], recalcul);
  recalcul();
}());
