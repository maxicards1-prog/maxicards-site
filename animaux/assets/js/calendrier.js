/* Calendriers (chiot, chaton) et fenêtres de mise bas (chienne, chatte) : un seul script. Rien n'est envoyé ni gardé. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  var mode = CQ.el('date').getAttribute('data-mode');
  var gestation = mode === 'chienne' || mode === 'chatte';
  var PREFIXE = { chiot: 'Chiot', chaton: 'Chaton', chienne: 'Mise bas de la chienne', chatte: 'Mise bas de la chatte' };
  var courant = [];
  function vider(id) { var n = CQ.el(id); while (n.firstChild) { n.removeChild(n.firstChild); } return n; }
  function span(classe, t) { var s = document.createElement('span'); if (classe) { s.className = classe; } s.textContent = t; return s; }
  function rendre(evts) {
    var ol = vider('liste'), auj = CQ.aujourdhui();
    evts.forEach(function (e) {
      var li = document.createElement('li');
      if ((e.fin || e.jour) < auj) { li.className = 'passe'; }
      var quand = CQ.dateLongue(e.jour) + (e.fin ? ' au ' + CQ.dateLongue(e.fin) : '');
      li.appendChild(span('quand', quand));
      li.appendChild(span('quoi', e.titre));
      if (e.detail) { li.appendChild(span('detail', e.detail)); }
      ol.appendChild(li);
    });
  }
  function recalcul() {
    var j = CQ.jour(CQ.valeur('date')), auj = CQ.aujourdhui();
    var bas = gestation ? auj - 120 : auj - 3650, haut = gestation ? auj + 5 : auj + 130;
    courant = [];
    vider('liste');
    CQ.el('telecharger').disabled = true;
    if (!isFinite(j)) { CQ.texte('etat', 'Choisissez une date.'); return; }
    if (j < bas || j > haut) {
      CQ.texte('etat', gestation ? 'Cette date semble trop éloignée : indiquez la date de saillie (au plus 4 mois en arrière).' : 'Cette date semble peu plausible (naissance dans les 10 dernières années, ou attendue dans les 4 mois).');
      return;
    }
    var opt = {};
    if (mode === 'chiot') { opt.gab = CQ.valeur('gab'); }
    if (mode === 'chienne' && CQ.el('ovul') && CQ.valeur('ovul')) {
      var o = CQ.jour(CQ.valeur('ovul'));
      if (isFinite(o) && o >= bas && o <= haut) { opt.ovulation = o; }
    }
    courant = CU.evenements(mode, j, opt);
    rendre(courant);
    CQ.texte('etat', courant.length + ' repères calculés. Ce sont des repères : confirmez avec votre vétérinaire.');
    CQ.el('telecharger').disabled = false;
  }
  function telecharger() {
    if (!courant.length) { return; }
    try {
      var texte = CU.ics(courant, PREFIXE[mode], Date.now());
      var blob = new Blob([texte], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'calendrier-' + mode + '.ics'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      CQ.texte('etat', 'Fichier créé dans votre navigateur : ouvrez-le pour l\'ajouter à votre agenda.');
    } catch (e) { CQ.texte('etat', 'Impossible de créer le fichier sur ce navigateur : recopiez les dates à la main.'); }
  }
  CQ.surChangement(['date', 'gab', 'ovul'], recalcul);
  CQ.el('telecharger').addEventListener('click', telecharger);
  recalcul();
}());
