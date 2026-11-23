/* Apparition douce au défilement (IntersectionObserver), lancée après le chargement : aucune mesure forcée,
   jamais sur le calculateur, rien si l'utilisateur réduit les animations. */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) { return; }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
  function demarrer() {
    var cibles = Array.prototype.filter.call(document.querySelectorAll(
      'main .liste-outils li, main .liste-rubriques li, main details.faq, main ol.etapes li, ' +
      'main .liste-guides li, main .conteneur > h2, main .encadre, main .tableau-defile'), function (el) { return !el.closest('.outil'); });
    var vus = new WeakSet();
    var obs = new IntersectionObserver(function (entrees) {
      var rang = 0;
      entrees.forEach(function (e) {
        var el = e.target;
        if (!vus.has(el)) {
          // 1er passage : l'élément déjà à l'écran reste tel quel ; les autres seront révélés plus tard.
          vus.add(el);
          if (e.isIntersecting) { obs.unobserve(el); } else { el.classList.add('rv'); }
          return;
        }
        if (e.isIntersecting) {
          el.style.setProperty('--d', (Math.min(rang++, 5) * 60) + 'ms');
          el.classList.add('vu');
          obs.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
    cibles.forEach(function (el) { obs.observe(el); });
  }
  if (document.readyState === 'complete') { demarrer(); } else { window.addEventListener('load', demarrer, { once: true }); }
}());
