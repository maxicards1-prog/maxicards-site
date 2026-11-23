/* Calculateur de frais Cardmarket / eBay et de bénéfice de revente */
(function () {
  'use strict';
  var O = window.OCP;
  if (!O || !document.getElementById('plateforme')) { return; }

  var PLATEFORMES = {
    cardmarket: { nom: 'Cardmarket', taux: 0.05, fixe: 0, plafond: 100 },
    ebay: { nom: 'eBay.fr (particulier)', taux: 0, fixe: 0, plafond: null },
    perso: { nom: 'Personnalisé', taux: null, fixe: null, plafond: null }
  };

  function centimeSup(v) { return Math.ceil(Math.round(v * 10000) / 100) / 100; }
  function val(id, max) { var v = O.nombre(id, 0, max); return isFinite(v) ? v : 0; }

  function regles(cle) {
    var p = PLATEFORMES[cle];
    if (cle === 'perso') {
      return { nom: p.nom, taux: val('tauxPerso', 100) / 100, fixe: val('fixePerso', 1e6), plafond: null };
    }
    return p;
  }

  function commission(r, vente) {
    var c = centimeSup(vente * r.taux) + r.fixe;
    if (r.plafond !== null && c > r.plafond) { c = r.plafond; }
    return c;
  }

  function bilan(r, e) {
    var com = commission(r, e.vente);
    var autres = centimeSup(e.vente * e.autresPct);
    var net = e.vente + e.portEncaisse - com - autres - e.portReel - e.emballage;
    var benef = net - e.achat - e.gradation;
    var C = e.achat + e.gradation + e.portReel + e.emballage - e.portEncaisse;
    var seuil = (C + r.fixe) / (1 - r.taux - e.autresPct);
    if (r.plafond !== null && seuil * r.taux > r.plafond) { seuil = (C + r.plafond) / (1 - e.autresPct); }
    if (!(seuil > 0) || !isFinite(seuil)) { seuil = 0; }
    return { com: com + autres, net: net, benef: benef, seuil: centimeSup(seuil) };
  }

  function entree() {
    return {
      achat: val('achat', 1e7), vente: val('vente', 1e7), portEncaisse: val('portEncaisse', 1e5),
      portReel: val('portReel', 1e5), emballage: val('emballage', 1e5), gradation: val('gradation', 1e5),
      autresPct: Math.min(val('autresPct', 50), 50) / 100
    };
  }

  function cellule(tr, texte, classe) {
    var td = document.createElement('td');
    td.textContent = texte;
    if (classe) { td.className = classe; }
    tr.appendChild(td);
  }

  function calculer() {
    var cle = document.getElementById('plateforme').value;
    document.getElementById('blocPerso').hidden = cle !== 'perso';
    var e = entree();
    var b = bilan(regles(cle), e);
    O.texte('rCommission', O.euros(b.com));
    O.texte('rNet', O.euros(b.net));
    O.texte('rBenefice', O.euros(b.benef));
    O.classe('rBenefice', 'positif', b.benef > 0);
    O.classe('rBenefice', 'negatif', b.benef < 0);
    O.texte('rMarge', e.vente > 0 ? O.pourcent(b.benef / e.vente, 1) : '–');
    var mise = e.achat + e.gradation;
    O.texte('rRoi', mise > 0 ? O.pourcent(b.benef / mise, 1) : '–');
    O.texte('rSeuil', O.euros(b.seuil));

    var corps = document.getElementById('comparaison');
    while (corps.firstChild) { corps.removeChild(corps.firstChild); }
    var meilleur = null, lignes = [];
    ['cardmarket', 'ebay', 'perso'].forEach(function (k) {
      if (k === 'perso' && cle !== 'perso') { return; }
      var r = regles(k), x = bilan(r, e);
      lignes.push({ r: r, x: x });
      if (meilleur === null || x.benef > meilleur) { meilleur = x.benef; }
    });
    lignes.forEach(function (l) {
      var tr = document.createElement('tr');
      if (lignes.length > 1 && l.x.benef === meilleur) { tr.className = 'meilleur'; }
      cellule(tr, l.r.nom);
      cellule(tr, O.euros(l.x.com), 'nombre');
      cellule(tr, O.euros(l.x.net), 'nombre');
      cellule(tr, O.euros(l.x.benef), 'nombre');
      corps.appendChild(tr);
    });
  }

  O.surChangement(['achat', 'vente', 'plateforme', 'tauxPerso', 'fixePerso', 'portEncaisse', 'portReel',
    'emballage', 'gradation', 'autresPct'], calculer);
  calculer();
}());
