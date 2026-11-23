/* Mouvements légers (23/11/2026) : apparition au défilement et cartes du bandeau qui suivent la souris.
   Rien n'est caché si le script ne tourne pas ; rien ne bouge si l'appareil demande moins d'animations. */
(function () {
  'use strict';
  // 0. Police des titres : téléchargée en fond après la 1re page, utilisée dès la suivante (voir style.css)
  var script = document.currentScript;
  try {
    if (!localStorage.getItem('ocp-police') && window.FontFace && document.fonts && script) {
      window.addEventListener('load', function () {
        window.setTimeout(function () {
          var url = new URL('../polices/outfit-latin.woff2', script.src).href;
          new FontFace('Outfit', 'url(' + url + ')', { weight: '500 800' }).load().then(function () {
            try { localStorage.setItem('ocp-police', '1'); } catch (e) { /* stockage refusé : police système */ }
          }, function () {});
        }, 1200);
      });
    }
  } catch (e) { /* stockage refusé : police système */ }
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calme) { return; }

  // 1. Apparition au défilement : seulement les blocs encore sous l'écran au chargement (pas de saut visible)
  if ('IntersectionObserver' in window) {
    var cibles = document.querySelectorAll('main .liste-outils > li, main h2, main details.faq, main ol.etapes > li, main .tableau-defile, main .sources');
    var hauteur = window.innerHeight || 800;
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('revele'); obs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    var rang = 0, parent = null;
    Array.prototype.forEach.call(cibles, function (el) {
      if (el.getBoundingClientRect().top < hauteur) { return; }
      if (el.parentNode !== parent) { parent = el.parentNode; rang = 0; }
      if (el.tagName === 'LI') { el.style.transitionDelay = (rang++ % 4) * 70 + 'ms'; }
      el.classList.add('a-reveler');
      obs.observe(el);
    });
  }

  // 2. Bandeau d'accueil : les cartes s'inclinent un peu vers la souris (ordinateur seulement)
  var visuel = document.querySelector('.hero-visuel');
  if (visuel && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var attente = false;
    visuel.parentNode.addEventListener('pointermove', function (ev) {
      if (attente) { return; }
      attente = true;
      window.requestAnimationFrame(function () {
        var r = visuel.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
        visuel.style.setProperty('--rx', (y * -8).toFixed(2) + 'deg');
        visuel.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
        visuel.style.setProperty('--hx', Math.round((x + 0.5) * 100) + '%');
        attente = false;
      });
    });
    visuel.parentNode.addEventListener('pointerleave', function () {
      visuel.style.setProperty('--rx', '0deg'); visuel.style.setProperty('--ry', '0deg');
    });
  }
}());
