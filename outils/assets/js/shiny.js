/* Compteur de shasse shiny : resets et chance cumulée. Sauvegarde uniquement sur l'appareil. */
(function () {
  'use strict';
  var O = window.OCP;
  if (!O || !document.getElementById('chiffre')) { return; }
  var CLE = 'ocp-shiny-v1';
  var TAUX = { g2: 1 / 8192, g6: 1 / 4096, charme: 3 / 4096, masuda: 6 / 4096, masudaCharme: 8 / 4096 };
  var etat = { n: 0, cible: '', taux: 'g6', tauxPerso: 4096, pas: 1, hist: [] };

  function entierSur(v, min, max, defaut) {
    v = Number(v);
    if (!isFinite(v)) { return defaut; }
    return Math.min(max, Math.max(min, Math.floor(v)));
  }

  function charger() {
    var brut = O.lire(CLE);
    if (!brut || brut.length > 20000) { return; }
    try {
      var s = JSON.parse(brut);
      if (!s || typeof s !== 'object') { return; }
      etat.n = entierSur(s.n, 0, 1e9, 0);
      etat.cible = typeof s.cible === 'string' ? s.cible.slice(0, 40) : '';
      etat.taux = (typeof s.taux === 'string' && (TAUX[s.taux] || s.taux === 'perso')) ? s.taux : 'g6';
      etat.tauxPerso = entierSur(s.tauxPerso, 1, 1e7, 4096);
      etat.pas = entierSur(s.pas, 1, 5, 1);
      etat.hist = Array.isArray(s.hist) ? s.hist.slice(0, 50).filter(function (h) {
        return h && typeof h.cible === 'string' && typeof h.date === 'string';
      }).map(function (h) {
        return { cible: h.cible.slice(0, 40), n: entierSur(h.n, 0, 1e9, 0), date: h.date.slice(0, 10) };
      }) : [];
    } catch (e) { /* donnée illisible : on repart de zéro */ }
  }

  function sauver() { O.ecrire(CLE, JSON.stringify(etat)); }

  function proba() {
    if (etat.taux === 'perso') { return 1 / etat.tauxPerso; }
    return TAUX[etat.taux];
  }

  function afficher() {
    var p = proba();
    O.texte('chiffre', O.entier(etat.n));
    O.texte('rCumul', O.pourcent(O.auMoinsUn(p, etat.n), 1));
    O.texte('rMoyenne', O.entier(Math.round(1 / p)));
    O.texte('r50', O.entier(O.essaisPour(p, 0.5)));
    O.texte('r90', O.entier(O.essaisPour(p, 0.9)));
    var statut;
    if (etat.n === 0) { statut = 'Appuyez sur +1 (ou la barre Espace) à chaque reset ou rencontre.'; }
    else if (etat.n < 1 / p) { statut = 'Encore ' + O.entier(Math.ceil(1 / p - etat.n)) + ' rencontres avant d’atteindre la moyenne (1 sur ' + O.entier(Math.round(1 / p)) + ').'; }
    else { statut = 'Vous avez dépassé la moyenne : seuls ' + O.pourcent(1 - O.auMoinsUn(p, etat.n), 1) + ' des chasseurs n’ont toujours rien à ce stade. Courage !'; }
    O.texte('rStatut', statut);
    document.getElementById('blocTauxPerso').hidden = etat.taux !== 'perso';
    var liste = document.getElementById('historique');
    while (liste.firstChild) { liste.removeChild(liste.firstChild); }
    etat.hist.forEach(function (h) {
      var li = document.createElement('li');
      li.textContent = (h.cible || 'Shiny') + ' : ' + O.entier(h.n) + ' rencontres (' + h.date + ')';
      liste.appendChild(li);
    });
    document.getElementById('blocHistorique').hidden = etat.hist.length === 0;
  }

  function ajouter(delta) {
    etat.n = Math.max(0, Math.min(1e9, etat.n + delta));
    sauver();
    afficher();
  }

  charger();
  document.getElementById('cible').value = etat.cible;
  document.getElementById('taux').value = etat.taux;
  document.getElementById('tauxPerso').value = String(etat.tauxPerso);
  document.getElementById('pas').value = String(etat.pas);

  document.getElementById('plus').addEventListener('click', function () { ajouter(etat.pas); });
  document.getElementById('moins').addEventListener('click', function () { ajouter(-etat.pas); });
  document.getElementById('raz').addEventListener('click', function () {
    if (etat.n === 0 || window.confirm('Remettre le compteur à zéro ?')) { etat.n = 0; sauver(); afficher(); }
  });
  document.getElementById('trouve').addEventListener('click', function () {
    var d = new Date();
    var date = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
    etat.hist.unshift({ cible: etat.cible, n: etat.n, date: date });
    etat.hist = etat.hist.slice(0, 50);
    etat.n = 0;
    sauver();
    afficher();
  });
  O.surChangement(['cible', 'taux', 'tauxPerso', 'pas'], function () {
    etat.cible = String(document.getElementById('cible').value).slice(0, 40);
    var t = document.getElementById('taux').value;
    etat.taux = (TAUX[t] || t === 'perso') ? t : 'g6';
    etat.tauxPerso = entierSur(document.getElementById('tauxPerso').value, 1, 1e7, 4096);
    etat.pas = entierSur(document.getElementById('pas').value, 1, 5, 1);
    sauver();
    afficher();
  });
  document.addEventListener('keydown', function (ev) {
    var cibleEl = ev.target;
    var tag = cibleEl && cibleEl.tagName ? cibleEl.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'button' || ev.ctrlKey || ev.metaKey || ev.altKey) { return; }
    if (ev.key === ' ' || ev.key === '+' || ev.key === 'ArrowUp') { ev.preventDefault(); ajouter(etat.pas); }
    else if (ev.key === '-' || ev.key === 'ArrowDown') { ev.preventDefault(); ajouter(-etat.pas); }
  });
  afficher();
}());
