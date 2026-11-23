/* Motion léger d'Outils Foot (23/11/2026) : apparition au défilement et impulsion sur les résultats.
   Ne cache jamais ce qui est déjà à l'écran ; rien ne bouge si prefers-reduced-motion est activé. */
(function () {
  'use strict';
  var reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduit) { return; }

  // 1. Apparition au défilement : seulement les blocs SOUS l'écran au chargement
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -30px 0px' });
    var bas = window.innerHeight;
    var blocs = document.querySelectorAll('main .liste-outils li, main h2, details.faq, main figure, .tableau-defile');
    Array.prototype.forEach.call(blocs, function (el, i) {
      if (el.getBoundingClientRect().top > bas) {
        el.style.setProperty('--d', ((i % 3) * 70) + 'ms');
        el.classList.add('a-voir');
        io.observe(el);
      }
    });
  }

  // 2. Résultats des outils : petite impulsion quand un résultat change
  if ('MutationObserver' in window) {
    var CIBLES = '.tuile, .message, .equipe, .journee, .terrain-zone, table';
    Array.prototype.forEach.call(document.querySelectorAll('.outil'), function (outil) {
      var attente = null;
      var touches = [];
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          var n = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          var c = n && n.closest(CIBLES);
          if (c && outil.contains(c) && touches.indexOf(c) < 0) { touches.push(c); }
        });
        if (attente) { return; }
        attente = window.requestAnimationFrame(function () {
          touches.slice(0, 12).forEach(function (c) {
            c.classList.remove('maj');
            void c.offsetWidth;
            c.classList.add('maj');
          });
          touches = [];
          attente = null;
        });
      }).observe(outil, { childList: true, subtree: true, characterData: true });
    });
  }
})();
