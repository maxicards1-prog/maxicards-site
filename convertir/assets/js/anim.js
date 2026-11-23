/* Convertir : apparition douce au défilement (passe design 23/11/2026).
   Seuls les blocs SOUS la ligne de flottaison sont masqués puis révélés : rien ne bouge au chargement
   (pas de décalage de mise en page : opacity + transform). Coupé si l'utilisateur réduit les animations. */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cibles = document.querySelectorAll('main .liste-outils > li, main .liste-guides > li, main details.faq, main h2, main .encadre-outil');
  var bas = window.innerHeight;
  var io = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -6% 0px' });
  var rang = new Map();
  cibles.forEach(function (el) {
    if (el.getBoundingClientRect().top < bas) return;
    var parent = el.parentNode;
    var i = rang.get(parent) || 0;
    rang.set(parent, i + 1);
    el.style.transitionDelay = (i % 3) * 70 + 'ms';
    el.classList.add('apparait');
    io.observe(el);
  });
})();
