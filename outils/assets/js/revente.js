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

  // ---- Version anglaise (24/11/2026) : eBay.com et TCGplayer, frais publiés, montants en dollars ----
  // eBay.com sans boutique, catégorie cartes à collectionner : 13,25 % du total de la vente (prix + port payé par
  // l'acheteur) jusqu'à 7 500 $, 2,35 % au-delà, + 0,30 $ par commande (0,40 $ au-dessus de 10 $).
  // TCGplayer vendeur Marketplace niveau 1-4 : commission 10,75 % du prix (plafond 75 $ par article, depuis le
  // 10/02/2026) + traitement du paiement 2,5 % de (prix + port) + 0,30 $. La taxe de vente n'est pas comptée.
  if (O.en) {
    PLATEFORMES = {
      ebay: { nom: 'eBay.com (no Store)' },
      tcgplayer: { nom: 'TCGplayer (Level 1-4)' },
      perso: { nom: 'Custom', taux: null, fixe: null, plafond: null }
    };
  }
  // ---- Espagnol (26/11/2026) : Cardmarket (mêmes règles qu'en français) et eBay.es vendeur particulier :
  // 11,5 % de l'importe total (prix + envoi payé par l'acheteur) jusqu'à 2 000 €, 2 % au-delà, + 0,05 € par commande
  // de moins de 10 € (0,35 € sinon) + tarifa por cumplimiento normativo 0,42 % du total (aide eBay.es id=4822).
  // ---- Portugais du Brésil : pas de grille officielle unique pour Mercado Livre ni LigaPokémon -> « Personalizado »
  // en reais ; Cardmarket (euros) et eBay.com (dollars) comme repères, montants dans la monnaie de la plateforme.
  if (O.lang === 'es') {
    PLATEFORMES = {
      cardmarket: { nom: 'Cardmarket', taux: 0.05, fixe: 0, plafond: 100 },
      ebay: { nom: 'eBay.es (particular)' },
      perso: { nom: 'Personalizado', taux: null, fixe: null, plafond: null }
    };
  }
  if (O.lang === 'pt') {
    PLATEFORMES = {
      perso: { nom: 'Personalizado', taux: null, fixe: null, plafond: null },
      cardmarket: { nom: 'Cardmarket (Europa)', taux: 0.05, fixe: 0, plafond: 100 },
      ebay: { nom: 'eBay.com (EUA)' }
    };
  }
  var MONNAIE_PT = { perso: 'BRL', cardmarket: 'EUR', ebay: 'USD' };
  function cent(v) { return Math.round(v * 100) / 100; }
  function fraisEn(cle, vente, port) {
    var total = vente + port;
    if (cle === 'ebay') {
      return cent(0.1325 * Math.min(total, 7500) + 0.0235 * Math.max(total - 7500, 0)) + (total <= 10 ? 0.30 : 0.40);
    }
    if (cle === 'ebayes') {
      return cent(0.115 * Math.min(total, 2000) + 0.02 * Math.max(total - 2000, 0)) + (total < 10 ? 0.05 : 0.35) +
        cent(0.0042 * total);
    }
    if (cle === 'tcgplayer') {
      return Math.min(cent(0.1075 * vente), 75) + cent(0.025 * total) + 0.30;
    }
    return cent(vente * val('tauxPerso', 100) / 100) + val('fixePerso', 1e6);
  }
  function bilanEn(cle, e) {
    function calc(vente) {
      var com = fraisEn(cle, vente, e.portEncaisse);
      var autres = cent(vente * e.autresPct);
      var net = vente + e.portEncaisse - com - autres - e.portReel - e.emballage;
      return { com: com + autres, net: net, benef: net - e.achat - e.gradation };
    }
    var x = calc(e.vente);
    // prix minimum sans perte : recherche par dichotomie (les frais ne suivent pas une formule simple)
    var bas = 0, haut = 1e7;
    if (calc(haut).benef < 0) { x.seuil = 0; return x; }
    for (var i = 0; i < 60; i++) { var m = (bas + haut) / 2; if (calc(m).benef >= 0) { haut = m; } else { bas = m; } }
    x.seuil = Math.ceil(Math.round(haut * 10000) / 100) / 100;
    return x;
  }
  function bilanPour(cle, e) {
    if (O.en) { return bilanEn(cle, e); }
    if (cle === 'ebay' && O.lang === 'es') { return bilanEn('ebayes', e); }
    if (cle === 'ebay' && O.lang === 'pt') { return bilanEn('ebay', e); }
    return bilan(regles(cle), e);
  }
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
    if (O.lang === 'pt') { O.monnaie = MONNAIE_PT[cle] || 'BRL'; }
    var e = entree();
    var b = bilanPour(cle, e);
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
    if (!corps) { return; }   // pas de comparaison en portugais (monnaies différentes)
    while (corps.firstChild) { corps.removeChild(corps.firstChild); }
    var meilleur = null, lignes = [];
    (O.en ? ['ebay', 'tcgplayer', 'perso'] : ['cardmarket', 'ebay', 'perso']).forEach(function (k) {
      if (k === 'perso' && cle !== 'perso') { return; }
      var r = O.en ? PLATEFORMES[k] : regles(k), x = bilanPour(k, e);
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
