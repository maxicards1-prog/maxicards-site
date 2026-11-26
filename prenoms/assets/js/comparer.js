/* Comparer deux prénoms : courbe à deux lignes (trait plein / tirets) et tableau côte à côte. */
(function () {
  'use strict';
  var PR = window.PR, CP = window.CP;
  var pages = {};
  var sequence = 0;
  CP.chargerPages().then(function (p) { pages = p; });

  function resoudre(saisie) {
    var s = PR.nettoyer(saisie);
    if (!s) { return Promise.resolve({ etat: 'vide' }); }
    return CP.chargerLettre(PR.lettre(s)).then(function (data) {
      var r = PR.chercher(s, data);
      if (r.type === 'exact' || r.type === 'variantes') { return { etat: 'ok', nom: r.noms[0], data: data }; }
      if (r.type === 'suggestions') { return { etat: 'sug', noms: r.noms, saisie: s }; }
      return { etat: 'aucun', saisie: s };
    });
  }

  // entrées restreintes au sexe choisi : 'tous' | 'f' | 'g'
  function restreint(e, v) { return [v === 'f' ? 0 : e[0], v === 'g' ? 0 : e[1]]; }
  function serieSomme(st, a0, a1) {
    var vals = [];
    for (var y = a0; y <= a1; y++) { vals.push(PR.valeurAnnee(st.serieG, y) + PR.valeurAnnee(st.serieF, y)); }
    return { debut: a0, valeurs: vals };
  }
  function rangTexte(st, v) {
    var t = [];
    if ((v === 'tous' || v === 'f') && st.rangF) { t.push('n° ' + PR.format(st.rangF) + (v === 'tous' ? ' chez les filles' : '')); }
    if ((v === 'tous' || v === 'g') && st.rangG) { t.push('n° ' + PR.format(st.rangG) + (v === 'tous' ? ' chez les garçons' : '')); }
    return t.length ? t.join(', ') : 'absent du fichier';
  }
  function tendanceTexte(st) {
    if (st.nouveau) { return 'nouveau (rien avant)'; }
    if (st.tendance === null) { return '–'; }
    var pc = Math.round(st.tendance * 100);
    return (pc > 0 ? '+' : pc < 0 ? '−' : '') + Math.abs(pc) + ' %';
  }

  function dessiner(A, B, v) {
    var data = A.data;     // a0 et a1 sont communs à tous les fichiers
    var sa = PR.stats.apply(null, restreint(data.n[A.nom], v).concat([data.a0, data.a1]));
    var sb = PR.stats.apply(null, restreint(B.data.n[B.nom], v).concat([B.data.a0, B.data.a1]));
    var nomA = PR.joli(A.nom), nomB = PR.joli(B.nom);
    var qui = v === 'f' ? 'filles' : v === 'g' ? 'garçons' : 'filles et garçons ensemble';
    CP.montrer('resultat', true);
    CP.texte('nomA', nomA);
    CP.texte('nomB', nomB);
    var debut = Math.max(data.a0, Math.min(sa.premiere || data.a1, sb.premiere || data.a1) - 2);
    if (data.a1 - debut < 10) { debut = data.a1 - 10; }
    var lignes = [
      { libelle: nomA, cls: 'c-a', serie: serieSomme(sa, data.a0, data.a1) },
      { libelle: nomB, cls: 'c-b', serie: serieSomme(sb, data.a0, data.a1) }
    ];
    var resume = 'Courbes du nombre de naissances par année (' + qui + ') pour ' + nomA + ' (trait plein) et ' + nomB +
      ' (tirets), de ' + debut + ' à ' + data.a1 + '. Pic de ' + nomA + ' : ' + (sa.pic.annee || 'aucun') + ' ; pic de ' + nomB +
      ' : ' + (sb.pic.annee || 'aucun') + '. Le tableau des valeurs se trouve sous la courbe.';
    CP.texte('grapheInfo', 'Passez la souris ou touchez la courbe pour lire une année.');
    CP.tracer({ conteneur: CP.el('graphe'), legende: CP.el('legende'), info: CP.el('grapheInfo'), entete: CP.el('tableauEntete'),
      corps: CP.el('tableauVal'), a0: debut, a1: data.a1, lignes: lignes, resume: resume });

    var a1 = data.a1;
    var lignesTab = [
      ['Naissances depuis ' + data.a0 + ' (environ)', PR.format(sa.total), PR.format(sb.total)],
      ['Naissances en ' + a1, PR.format(sa.effDerniere), PR.format(sb.effDerniere)],
      ['Rang en ' + a1, rangTexte(sa, v), rangTexte(sb, v)],
      ['Année du pic', sa.pic.annee ? sa.pic.annee + ' (' + PR.format(sa.pic.effectif) + ')' : '–',
        sb.pic.annee ? sb.pic.annee + ' (' + PR.format(sb.pic.effectif) + ')' : '–'],
      ['Meilleur rang', sa.meilleurRang.rang ? 'n° ' + PR.format(sa.meilleurRang.rang) + ' (' + sa.meilleurRang.annee + ')' : '–',
        sb.meilleurRang.rang ? 'n° ' + PR.format(sb.meilleurRang.rang) + ' (' + sb.meilleurRang.annee + ')' : '–'],
      ['Tendance sur 5 ans', tendanceTexte(sa), tendanceTexte(sb)]
    ];
    if (v === 'tous') {
      lignesTab.splice(3, 0, ['Part de filles', sa.total ? Math.round(sa.partF * 100) + ' %' : '–', sb.total ? Math.round(sb.partF * 100) + ' %' : '–']);
    }
    var corps = CP.el('tabCompare');
    CP.vider(corps);
    lignesTab.forEach(function (l) {
      var tr = CP.creer('tr');
      var th = CP.creer('th', null, l[0]); th.scope = 'row'; tr.appendChild(th);
      tr.appendChild(CP.creer('td', 'nombre', l[1]));
      tr.appendChild(CP.creer('td', 'nombre', l[2]));
      corps.appendChild(tr);
    });
    var lp = CP.el('lienPages');
    CP.vider(lp);
    var liens = [A.nom, B.nom].filter(function (n) { return pages[PR.slug(n)]; });
    if (liens.length) {
      lp.appendChild(document.createTextNode('Pages détaillées : '));
      liens.forEach(function (n, i) { if (i) { lp.appendChild(document.createTextNode(' · ')); } lp.appendChild(CP.nomLien(n, pages)); });
    }
  }

  function comparer() {
    var mon = ++sequence;
    var v = CP.el('v').value;
    if (['tous', 'f', 'g'].indexOf(v) < 0) { v = 'tous'; }
    CP.suggestions(CP.el('sugA'), [], function () {});
    CP.suggestions(CP.el('sugB'), [], function () {});
    if (!PR.nettoyer(CP.el('a').value) || !PR.nettoyer(CP.el('b').value)) {
      CP.montrer('resultat', false);
      CP.etat('Tapez deux prénoms pour les comparer.', false);
      return;
    }
    CP.etat('Chargement…', false);
    Promise.all([resoudre(CP.el('a').value), resoudre(CP.el('b').value)]).then(function (rs) {
      if (mon !== sequence) { return; }
      var msgs = [];
      [['A', 'sugA', 'a'], ['B', 'sugB', 'b']].forEach(function (c, i) {
        var r = rs[i];
        if (r.etat === 'sug') {
          msgs.push('« ' + PR.joli(r.saisie) + ' » n\'est pas dans le fichier : choisissez une proposition sous le champ.');
          CP.suggestions(CP.el(c[1]), r.noms, function (n) { CP.el(c[2]).value = PR.joli(n); CP.el(c[2]).dispatchEvent(new Event('change')); comparer(); });
        } else if (r.etat === 'aucun') {
          msgs.push('Aucun prénom « ' + PR.joli(r.saisie) + ' » dans le fichier de l\'Insee (les prénoms trop rares ne sont pas publiés).');
        }
      });
      if (msgs.length) { CP.montrer('resultat', false); CP.etat(msgs.join(' '), false); return; }
      CP.etat('', false);
      dessiner(rs[0], rs[1], v);
    }).catch(function () {
      if (mon !== sequence) { return; }
      CP.montrer('resultat', false);
      CP.etat(CP.MSG_ERREUR, true);
    });
  }

  var partage = CP.initPartage(function () { if (CP.el('a').value && CP.el('b').value) { comparer(); } else { CP.etat('Tapez deux prénoms pour les comparer.', false); } });
  CP.el('formC').addEventListener('submit', function (ev) { ev.preventDefault(); comparer(); partage.ecrire(); });
  CP.el('v').addEventListener('change', function () { if (!CP.el('resultat').hidden) { comparer(); } });
}());
