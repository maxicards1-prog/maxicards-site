/* Taille de vêtement femme et homme : lettres -> FR, EU, UK, US, IT ; mesures -> taille conseillée.
   Les mesures du corps ne sont ni gardées ni écrites dans l'adresse (seuls « pour » et « lettre » sont partagés). */
(function () {
  'use strict';
  var CQ = window.CQ, TL = window.TL, D = window.TL_DATA;
  function trouver(liste, lettre) { return liste.filter(function (x) { return x.lettre === lettre; })[0]; }
  function recalcul() {
    var homme = CQ.valeur('pour') === 'h';
    var liste = homme ? D.homme : D.femme;
    CQ.options('lettre', liste.map(function (x) { return [x.lettre, x.lettre]; }));
    CQ.montrer('blocF', !homme); CQ.montrer('blocH', homme);
    CQ.montrer('chTaille', !homme); CQ.montrer('chHanches', !homme);
    var l = CQ.valeur('lettre'), x = trouver(liste, l) || liste[0];
    if (homme) {
      CQ.texte('rEUh', String(x.eu)); CQ.texte('rUKh', String(x.uk)); CQ.texte('rPoitrineh', (x.poitrine - 4) + ' à ' + (x.poitrine + 4) + ' cm');
      CQ.texte('phrase', 'Taille ' + x.lettre + ' homme : tour de poitrine de ' + (x.poitrine - 4) + ' à ' + (x.poitrine + 4) + ' cm, veste en taille ' + x.eu + ' (UK/US ' + x.uk + ').');
    } else {
      CQ.texte('rFR', String(x.fr)); CQ.texte('rDE', String(x.de)); CQ.texte('rUK', String(x.uk)); CQ.texte('rUS', String(x.us)); CQ.texte('rIT', String(x.it));
      CQ.texte('phrase', 'Taille ' + x.lettre + ' femme : ' + x.fr + ' en France, ' + x.de + ' en Allemagne, ' + x.uk + ' au Royaume-Uni, ' + x.us + ' aux États-Unis, ' + x.it + ' en Italie.');
    }
    // taille conseillée à partir des mesures
    var po = CQ.nombre('poitrine', 0, 400), conseil = null, texte = '';
    if (homme) {
      var h = isFinite(po) ? TL.hommeDepuisPoitrine(po) : null;
      if (h) { conseil = h; CQ.texte('rConseil', 'Veste ' + h.eu); CQ.texte('rConseilL', h.lettre); texte = 'Tour de poitrine de ' + CQ.souple(po, 1) + ' cm : taille ' + h.lettre + ' (veste ' + h.eu + '). Entre deux tailles, prenez la plus grande.'; }
    } else {
      var r = TL.femmeDepuisMesures(po, CQ.nombre('taille', 0, 400), CQ.nombre('hanches', 0, 400));
      if (r && r.erreur) { texte = 'Le ' + r.erreur + ' est hors de la plage prévue : vérifiez la mesure en centimètres.'; }
      else if (r) {
        conseil = r.taille;
        CQ.texte('rConseil', String(r.taille.fr)); CQ.texte('rConseilL', r.taille.lettre);
        texte = 'Taille conseillée : ' + r.taille.fr + ' (' + r.taille.lettre + '), la plus grande des tailles trouvées.' + (r.ecart > 1 ? ' Vos mesures s’étalent sur plusieurs tailles : les marques coupent ' +
          'différemment, essayez la taille voisine et visez celle qui va aux hanches si vous portez un bas.' : '');
      }
    }
    if (!conseil) { CQ.texte('rConseil', '–'); CQ.texte('rConseilL', '–'); }
    CQ.texte('phraseM', texte);
    var cible = conseil ? conseil.lettre : x.lettre;
    CQ.surligner(homme ? 'tabH' : 'tabF', function (tr) { return tr.getAttribute('data-l') === cible; });
    CQ.surligner(homme ? 'tabF' : 'tabH', function () { return false; });
  }
  var p = CQ.params();
  if (p.get('pour') === 'h') { document.getElementById('pour').value = 'h'; }
  CQ.initPartage(recalcul);
  CQ.surChangement(['pour', 'lettre', 'poitrine', 'taille', 'hanches'], recalcul);
}());
