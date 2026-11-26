/* Test de l'écran tactile : points multiples. Les doigts sont dessinés dans la zone ; rien n'est enregistré ni envoyé. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$, T = TP.t;
  var zone = $('tZone'), verdict = $('tVerdict'), eAct = $('tActifs'), eMax = $('tMax'), eAnn = $('tAnnonce'), eType = $('tType'), btnRaz = $('tRaz');
  var suivi = TP.creerSuiviPoints(), pts = {};
  eAnn.textContent = (navigator.maxTouchPoints || 0) > 0 ? T('{n} points annoncés par l’appareil', { n: navigator.maxTouchPoints }) : T('aucun écran tactile annoncé');
  function maj() { var e = suivi.etat(); eAct.textContent = e.actifs; eMax.textContent = e.max; }
  function place(el, ev) { var r = zone.getBoundingClientRect(); el.style.left = (ev.clientX - r.left) + 'px'; el.style.top = (ev.clientY - r.top) + 'px'; }
  zone.addEventListener('pointerdown', function (ev) {
    ev.preventDefault();
    try { zone.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ }
    suivi.pose(ev.pointerId);
    var el = TP.creer('div', T('doigt'), String(Object.keys(pts).length + 1)); pts[ev.pointerId] = el; zone.appendChild(el); place(el, ev);
    eType.textContent = ev.pointerType === 'touch' ? T('doigt') : (ev.pointerType === 'pen' ? T('stylet') : T('souris (pas un écran tactile)'));
    maj();
    var e = suivi.etat();
    if (ev.pointerType === 'touch') {
      TP.verdict(verdict, 'ok', (e.actifs > 1 ? T('Ça marche : {n} doigts détectés', { n: e.actifs }) : T('Ça marche : {n} doigt détecté', { n: e.actifs })), T('Posez 2, 3, 5 puis 10 doigts en même temps : le maximum détecté s’affiche. Une zone qui ne réagit pas indique un défaut local de la dalle.'));
    } else {
      TP.verdict(verdict, 'info', T('Ce n’est pas un toucher'), (ev.pointerType === 'pen' ? T('Ce clic vient d’un stylet. Touchez l’écran avec le doigt pour tester le tactile.') : T('Ce clic vient d’une souris. Touchez l’écran avec le doigt pour tester le tactile.')));
    }
  });
  zone.addEventListener('pointermove', function (ev) { if (pts[ev.pointerId]) { place(pts[ev.pointerId], ev); } });
  function fin(ev) {
    suivi.leve(ev.pointerId);
    var el = pts[ev.pointerId];
    if (el) { el.classList.add('fin'); delete pts[ev.pointerId]; setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 600); }
    maj();
  }
  zone.addEventListener('pointerup', fin);
  zone.addEventListener('pointercancel', fin);
  ['contextmenu', 'dragstart', 'selectstart'].forEach(function (n) { zone.addEventListener(n, function (e) { e.preventDefault(); }); });
  btnRaz.addEventListener('click', function () { suivi.raz(); Object.keys(pts).forEach(function (k) { if (pts[k].parentNode) { pts[k].parentNode.removeChild(pts[k]); } }); pts = {}; maj(); TP.verdict(verdict, 'attente', T('Compteur remis à zéro'), T('Touchez la zone avec un ou plusieurs doigts.')); });
  maj();
}());
