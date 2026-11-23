/* Apparition douce au défilement (IntersectionObserver). Jamais sur le calculateur, rien si l'utilisateur réduit les animations. */
(function () {
  'use strict';
  if (!('IntersectionObserver' in window)) { return; }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
  var cibles = document.querySelectorAll('main .liste-outils li, main .liste-rubriques li, main details.faq, main ol.etapes li, ' +
    'main .liste-guides li, main .conteneur > h2, main .encadre, main .tableau-defile');
  var hauteur = window.innerHeight || 800;
  var obs = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('vu'); obs.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
  var rang = 0;
  Array.prototype.forEach.call(cibles, function (el) {
    if (el.closest('.outil')) { return; }
    // Déjà à l'écran au chargement : on ne cache rien (pas de clignotement).
    if (el.getBoundingClientRect().top < hauteur) { return; }
    var frere = el.previousElementSibling;
    rang = (frere && frere.classList.contains('rv')) ? Math.min(rang + 1, 5) : 0;
    el.style.setProperty('--d', (rang * 60) + 'ms');
    el.classList.add('rv');
    obs.observe(el);
  });
}());
