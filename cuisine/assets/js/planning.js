/* Planning du repas de Noël : heures à rebours, conflits de four. Gardé dans localStorage (rien n'est envoyé). */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  var CLE = 'cuisine-planning-v1';
  var plats = [];
  var EXEMPLE = [
    { nom: 'Dinde farcie', prep: 40, cuisson: 180, repos: 30, four: true, temp: 165 },
    { nom: 'Gratin dauphinois', prep: 30, cuisson: 60, repos: 10, four: true, temp: 180 },
    { nom: 'Haricots verts', prep: 15, cuisson: 10, repos: 0, four: false, temp: 0 },
    { nom: 'Bûche (sortir du frigo)', prep: 0, cuisson: 0, repos: 30, four: false, temp: 0 }
  ];
  function sauver() {
    try { localStorage.setItem(CLE, JSON.stringify({ heure: CQ.valeur('heure'), plats: plats })); } catch (e) { /* stockage refusé : tant pis */ }
  }
  function charger() {
    try {
      var s = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (s && Array.isArray(s.plats)) {
        plats = s.plats.slice(0, 20).map(function (p) {
          return { nom: String(p.nom || '').slice(0, 60), prep: +p.prep || 0, cuisson: +p.cuisson || 0, repos: +p.repos || 0, four: !!p.four, temp: +p.temp || 0 };
        });
        if (/^\d{2}:\d{2}$/.test(s.heure)) { document.getElementById('heure').value = s.heure; }
      }
    } catch (e) { plats = []; }
  }
  function champNombre(valeur, etiquette, maj, max) {
    var d = document.createElement('div'); d.className = 'champ';
    var l = document.createElement('label'); l.textContent = etiquette;
    var i = document.createElement('input'); i.type = 'text'; i.setAttribute('inputmode', 'numeric'); i.autocomplete = 'off'; i.value = valeur ? String(valeur) : '0';
    i.addEventListener('input', function () { var v = parseInt(i.value.replace(/\D/g, ''), 10); maj(isFinite(v) ? Math.min(v, max) : 0); recalcul(); });
    i.setAttribute('aria-label', etiquette);
    d.appendChild(l); d.appendChild(i);
    return d;
  }
  function dessiner() {
    var zone = document.getElementById('plats');
    while (zone.firstChild) { zone.removeChild(zone.firstChild); }
    plats.forEach(function (p, idx) {
      var carte = document.createElement('div'); carte.className = 'plat-carte';
      var dn = document.createElement('div'); dn.className = 'champ';
      var ln = document.createElement('label'); ln.textContent = 'Plat ' + (idx + 1);
      var inom = document.createElement('input'); inom.type = 'text'; inom.maxLength = 60; inom.value = p.nom; inom.setAttribute('aria-label', 'Nom du plat ' + (idx + 1));
      inom.addEventListener('input', function () { p.nom = inom.value; recalcul(); });
      dn.appendChild(ln); dn.appendChild(inom); carte.appendChild(dn);
      var g = document.createElement('div'); g.className = 'grille';
      g.appendChild(champNombre(p.prep, 'Préparation (min)', function (v) { p.prep = v; }, 1440));
      g.appendChild(champNombre(p.cuisson, 'Cuisson (min)', function (v) { p.cuisson = v; }, 1440));
      g.appendChild(champNombre(p.repos, 'Repos avant de servir (min)', function (v) { p.repos = v; }, 600));
      var df = document.createElement('div'); df.className = 'champ';
      var lf = document.createElement('label'); lf.className = 'ligne-case';
      var cf = document.createElement('input'); cf.type = 'checkbox'; cf.checked = p.four;
      cf.addEventListener('change', function () { p.four = cf.checked; tt.hidden = !cf.checked; recalcul(); });
      lf.appendChild(cf); lf.appendChild(document.createTextNode(' Ce plat cuit au four'));
      df.appendChild(lf); g.appendChild(df);
      var tt = champNombre(p.temp, 'Température du four (°C)', function (v) { p.temp = v; }, 300);
      tt.hidden = !p.four; g.appendChild(tt);
      carte.appendChild(g);
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Retirer ce plat';
      b.addEventListener('click', function () { plats.splice(idx, 1); dessiner(); recalcul(); });
      carte.appendChild(b);
      zone.appendChild(carte);
    });
  }
  function recalcul() {
    var t = CQ.minutes(CQ.valeur('heure'));
    var cible = document.getElementById('conflits');
    while (cible.firstChild) { cible.removeChild(cible.firstChild); }
    if (!isFinite(t) || !plats.length) { CQ.lignes('chrono', []); CQ.texte('phrase', plats.length ? 'Indiquez l\'heure du repas.' : 'Ajoutez un plat ou chargez l\'exemple.'); sauver(); return; }
    var r = CU.planning(t, plats.map(function (p) { return { nom: p.nom || 'Plat', prep: p.prep, cuisson: p.cuisson, repos: p.repos, four: p.four, temp: p.temp }; }));
    CQ.lignes('chrono', r.etapes.map(function (e) { return { cellules: [CU.heure(e.t), e.nom || 'Plat', e.action], classe: e.service ? 'meilleur' : '' }; }));
    var premier = r.etapes.length ? r.etapes[0].t : t;
    CQ.texte('phrase', 'Première étape : ' + CU.heure(premier) + '. Repas à ' + CU.heure(t) + '.' + (r.conflits.length ? '' : ' Aucun conflit de four.'));
    r.conflits.forEach(function (c) {
      var p = document.createElement('p'); p.className = 'message alerte';
      p.textContent = 'Conflit de four : « ' + c.a + ' » (' + (c.tempA || '?') + ' °C) et « ' + c.b + ' » (' + (c.tempB || '?') + ' °C) veulent le four en même temps, de ' + CU.heure(c.debut) + ' à ' + CU.heure(c.fin) + ' (' + c.chevauchement + ' min). Pistes : terminer « ' + c.a + ' » plus tôt (à ' + CU.heure(c.debut) + ') et le garder couvert au chaud, ou cuire « ' + c.b + ' » après lui, ou le réchauffer en fin de cuisson.';
      cible.appendChild(p);
    });
    sauver();
  }
  document.getElementById('ajouter').addEventListener('click', function () {
    if (plats.length >= 20) { return; }
    plats.push({ nom: '', prep: 0, cuisson: 0, repos: 0, four: false, temp: 0 }); dessiner(); recalcul();
  });
  document.getElementById('exemple').addEventListener('click', function () {
    plats = EXEMPLE.map(function (p) { return JSON.parse(JSON.stringify(p)); }); dessiner(); recalcul();
  });
  document.getElementById('effacer').addEventListener('click', function () { plats = []; dessiner(); recalcul(); });
  document.getElementById('heure').addEventListener('input', recalcul);
  document.getElementById('heure').addEventListener('change', recalcul);
  charger();
  dessiner();
  recalcul();
}());
