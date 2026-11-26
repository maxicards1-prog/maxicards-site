/* Popularité d'un prénom : courbe filles / garçons, chiffres clés. Données : Insee (effectifs arrondis à 5). */
(function () {
  'use strict';
  var PR = window.PR, CP = window.CP;
  var pages = {};
  var sequence = 0;
  CP.chargerPages().then(function (p) { pages = p; });

  function rangTexte(rang) { return 'n° ' + PR.format(rang); }
  function sexeTexte(s) { return s === 'f' ? 'filles' : 'garçons'; }

  function afficher(nom, data, autres) {
    var e = data.n[nom];
    var st = PR.stats(e[0], e[1], data.a0, data.a1);
    var a1 = data.a1;
    var joli = PR.joli(nom);
    CP.montrer('resultat', true);
    CP.texte('titre', joli + ' : naissances par année');
    CP.texte('rTotal', PR.format(st.total));
    // dernière année
    CP.texte('rDer', PR.format(st.effDerniere));
    var rangs = [];
    if (st.rangF) { rangs.push(rangTexte(st.rangF) + ' chez les filles'); }
    if (st.rangG) { rangs.push(rangTexte(st.rangG) + ' chez les garçons'); }
    CP.texte('rDerL', 'naissances en ' + a1 + (rangs.length ? ' (' + rangs.join(', ') + ')' : ' (absent du fichier cette année)'));
    // pic
    CP.texte('rPic', st.pic.annee ? String(st.pic.annee) : '–');
    CP.texte('rPicL', st.pic.annee ? 'année du pic : environ ' + PR.format(st.pic.effectif) + ' naissances' : 'année du pic');
    // meilleur rang
    var m = st.meilleurRang;
    CP.texte('rRang', m.rang ? rangTexte(m.rang) : '–');
    CP.texte('rRangL', m.rang ? 'meilleur rang (' + m.annee + ', chez les ' + sexeTexte(m.sexe) + ')' : 'meilleur rang');
    // part filles / garçons
    var pf = Math.round(st.partF * 100), pg = Math.round(st.partG * 100);
    if (!st.total) { CP.texte('rPart', '–'); CP.texte('rPartL', 'filles / garçons'); }
    else if (!st.totalG || !st.totalF) {
      CP.texte('rPart', st.totalF ? '100 % filles' : '100 % garçons');
      CP.texte('rPartL', 'parmi les naissances recensées dans le fichier');
    } else if (pf >= 100 || pg >= 100) {
      // L'autre sexe existe mais pèse moins de 0,5 % : jamais « 100 % ».
      CP.texte('rPart', pf >= 100 ? '> 99 % filles' : '> 99 % garçons');
      CP.texte('rPartL', 'et ' + CP.entier(pf >= 100 ? st.totalG : st.totalF) + (pf >= 100 ? ' garçons' : ' filles') + ' depuis ' + st.premiere + ', parmi les naissances recensées dans le fichier');
    } else {
      CP.texte('rPart', pf + ' % filles');
      CP.texte('rPartL', 'et ' + pg + ' % de garçons, parmi les naissances recensées dans le fichier');
    }
    // tendance 5 ans
    var d1 = a1 - 4, d0 = a1 - 9;
    if (st.nouveau) {
      CP.texte('rTend', 'nouveau'); CP.texte('rTendL', 'aucune naissance recensée en ' + d0 + '-' + (a1 - 5) + ', puis ' + PR.format(st.recent) + ' en ' + d1 + '-' + a1);
    } else if (st.tendance === null) {
      CP.texte('rTend', '–'); CP.texte('rTendL', 'aucune naissance recensée sur ' + d0 + '-' + a1);
    } else {
      var pc = Math.round(st.tendance * 100);
      CP.texte('rTend', (pc > 0 ? '+' : pc < 0 ? '−' : '') + Math.abs(pc) + ' %');
      CP.texte('rTendL', d1 + '-' + a1 + ' contre ' + d0 + '-' + (a1 - 5) + ' (' + (pc > 0 ? 'en hausse' : pc < 0 ? 'en baisse' : 'stable') + ')');
    }
    // courbe
    var lignes = [];
    if (st.totalF) { lignes.push({ libelle: 'Filles', cls: 'c-f', serie: st.serieF }); }
    if (st.totalG) { lignes.push({ libelle: 'Garçons', cls: 'c-g', serie: st.serieG }); }
    var debut = Math.max(data.a0, st.premiere - 2);
    if (a1 - debut < 10) { debut = a1 - 10; }
    var resume = 'Courbe du nombre de naissances par année pour ' + joli + ', de ' + debut + ' à ' + a1 + '. ' +
      (st.pic.annee ? 'Le pic est en ' + st.pic.annee + ' avec environ ' + PR.format(st.pic.effectif) + ' naissances. ' : '') +
      'Le tableau des valeurs se trouve sous la courbe.';
    CP.texte('grapheInfo', 'Passez la souris ou touchez la courbe pour lire une année.');
    CP.tracer({ conteneur: CP.el('graphe'), legende: CP.el('legende'), info: CP.el('grapheInfo'), entete: CP.el('tableauEntete'),
      corps: CP.el('tableauVal'), a0: debut, a1: a1, lignes: lignes, resume: resume });
    // lien vers la page du prénom, seulement si elle existe
    var lp = CP.el('lienPage');
    CP.vider(lp);
    if (pages[PR.slug(nom)]) {
      var a = CP.nomLien(nom, pages);
      a.textContent = 'Voir la page de ' + joli + ' : décennies, classement, orthographes proches';
      lp.appendChild(a);
    }
    // autres orthographes proposées
    CP.suggestions(CP.el('suggestions'), autres || [], function (n) { lancer(PR.joli(n), true); }, 'Voir ce prénom');
  }

  function lancer(saisie, majChamp) {
    var s = PR.nettoyer(saisie);
    var champ = CP.el('p');
    if (majChamp && champ) { champ.value = PR.joli(s); champ.dispatchEvent(new Event('change')); }
    var mon = ++sequence;
    if (!s) {
      CP.montrer('resultat', false);
      CP.suggestions(CP.el('suggestions'), [], function () {});
      CP.etat('Tapez un prénom pour voir sa courbe.', false);
      return;
    }
    CP.etat('Chargement…', false);
    CP.chargerLettre(PR.lettre(s)).then(function (data) {
      if (mon !== sequence) { return; }
      var r = PR.chercher(s, data);
      if (r.type === 'exact') {
        CP.etat('', false);
        afficher(r.noms[0], data, r.variantes);
      } else if (r.type === 'variantes') {
        CP.etat('Orthographe trouvée dans le fichier : ' + PR.joli(r.noms[0]) + '.', false);
        afficher(r.noms[0], data, r.noms.slice(1));
      } else if (r.type === 'suggestions') {
        CP.montrer('resultat', false);
        CP.etat('Aucun prénom exactement comme « ' + PR.joli(s) + ' » dans le fichier. Vouliez-vous dire :', false);
        CP.suggestions(CP.el('suggestions'), r.noms, function (n) { lancer(PR.joli(n), true); }, 'Voir ce prénom');
      } else {
        CP.montrer('resultat', false);
        CP.suggestions(CP.el('suggestions'), [], function () {});
        CP.etat('Aucun prénom « ' + PR.joli(s) + ' » dans le fichier de l\'Insee. Cela ne veut pas dire qu\'il n\'a jamais été donné : l\'Insee ne publie pas les prénoms trop rares.', false);
      }
    }).catch(function () {
      if (mon !== sequence) { return; }
      CP.montrer('resultat', false);
      CP.etat(CP.MSG_ERREUR, true);
    });
  }

  var champ = CP.el('p');
  CP.el('formP').addEventListener('submit', function (ev) { ev.preventDefault(); lancer(champ.value, false); });
  champ.addEventListener('input', CP.attente(function () { if (PR.nettoyer(champ.value).length >= 2) { lancer(champ.value, false); } }, 450));
  var partage = CP.initPartage(function () { if (champ.value) { lancer(champ.value, false); } else { CP.etat('Tapez un prénom pour voir sa courbe.', false); } });
  CP.el('formP').addEventListener('submit', function () { partage.ecrire(); });
}());
