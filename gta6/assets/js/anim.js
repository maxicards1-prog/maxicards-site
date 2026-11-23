// Apparition douce au défilement (23/11/2026). Seuls les blocs SOUS l'écran de départ sont animés : ce qui est
// visible à l'arrivée (outil, réponse) s'affiche tout de suite. Rien si prefers-reduced-motion ou navigateur ancien.
(function () {
  "use strict";
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var cibles = document.querySelectorAll(
    "main h2, .liste-outils li, .photo, .galerie .photo, .videos li, details.faq, .encadre, .chaine, .sommaire");
  var bas = window.innerHeight;
  var obs = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("vu");
        obs.unobserve(e.target);
      }
    });
  }, { rootMargin: "0px 0px -6% 0px" });
  var aObserver = [];
  for (var i = 0; i < cibles.length; i++) {
    if (cibles[i].getBoundingClientRect().top > bas) aObserver.push(cibles[i]);
  }
  aObserver.forEach(function (el) {
    el.classList.add("revele");
    obs.observe(el);
  });
})();
