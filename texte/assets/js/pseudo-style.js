/* Pseudo stylé : le pseudo dans chaque décoration (TX.CADRES), lettres éventuellement stylées ; copie en un clic. */
(function () {
  'use strict';
  var CQ = window.CQ, TX = window.TX;
  if (!CQ || !TX) { return; }
  var champ = CQ.el('ps-pseudo'), style = CQ.el('ps-style'), liste = CQ.el('ps-liste');
  if (!champ || !style || !liste) { return; }
  var sorties = [];

  TX.CADRES.forEach(function (c, i) {
    var li = CQ.cree('li'), s = CQ.cree('span', 'res-texte'), b = CQ.cree('button', null, 'Copier');
    b.type = 'button';
    b.setAttribute('data-i', String(i));
    b.setAttribute('aria-label', 'Copier la décoration ' + (i + 1));
    li.appendChild(s);
    li.appendChild(b);
    liste.appendChild(li);
    sorties.push(s);
  });

  function pseudo() { return champ.value.slice(0, 40); }
  function maj() {
    var p = pseudo(), vide = !p.trim();
    sorties.forEach(function (s, i) { s.textContent = vide ? '' : TX.pseudoStyle(p, style.value, i); });
  }
  liste.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('button[data-i]') : null;
    if (!b) { return; }
    if (!pseudo().trim()) { CQ.annonce('Tapez d\'abord votre pseudo'); champ.focus(); return; }
    CQ.copier(TX.pseudoStyle(pseudo(), style.value, parseInt(b.getAttribute('data-i'), 10)), 'Pseudo copié');
  });
  CQ.surChangement(['ps-pseudo', 'ps-style'], maj);
  maj();
}());
