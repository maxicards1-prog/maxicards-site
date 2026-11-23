/* Outils Roblox : mouvement du site (apparition au défilement, léger tilt des cartes).
   Aucun appel réseau, aucune librairie. Sans JavaScript ou avec « mouvement réduit », tout reste visible et immobile. */
(function () {
  'use strict';
  /* Polices Google : chargées après l'affichage (display=swap, repli aux mêmes proportions), pour ne pas retarder le 1er affichage */
  function polices() {
    var h = document.documentElement.getAttribute('data-polices');
    if (!h) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = h;
    document.head.appendChild(l);
  }
  if (document.readyState === 'complete') polices(); else window.addEventListener('load', polices);

  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calme) return;

  // Apparition au défilement : seuls les blocs encore hors de l'écran sont masqués puis révélés
  if ('IntersectionObserver' in window) {
    var cibles = document.querySelectorAll('.liste-outils li, .liste-guides li, h2.categorie, details.faq, .chaine-yt, .encadre-outil');
    var hauteur = window.innerHeight || 700;
    var vus = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('vu'); vus.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    var rang = 0, parent = null;
    Array.prototype.forEach.call(cibles, function (el) {
      if (el.getBoundingClientRect().top < hauteur) return;
      if (el.parentNode !== parent) { parent = el.parentNode; rang = 0; }
      el.style.setProperty('--d', (Math.min(rang++, 5) * 0.06) + 's');
      el.classList.add('attend');
      vus.observe(el);
    });
    // filet de sécurité : rien ne reste caché si l'observateur ne répond pas
    window.setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.attend:not(.vu)'), function (el) { el.classList.add('vu'); });
    }, 6000);
  }

  // Tilt des cartes à la souris (appareils avec pointeur précis seulement)
  if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var courante = null;
    var remettre = function (c) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); };
    document.addEventListener('pointermove', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target.closest('.carte-outil, .liste-guides a') : null;
      if (courante && courante !== t) { remettre(courante); courante = null; }
      if (!t) return;
      var r = t.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
      t.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
      t.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      courante = t;
    }, { passive: true });
    document.addEventListener('pointerleave', function () { if (courante) { remettre(courante); courante = null; } });
  }
})();
