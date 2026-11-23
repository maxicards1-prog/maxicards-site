// Apparition douce au défilement (23/11/2026). Seuls les blocs SOUS l'écran de départ sont animés : ce qui est
// visible à l'arrivée (outil, réponse) s'affiche tout de suite. Rien si prefers-reduced-motion ou navigateur ancien.
// Pas de mesure forcée de la page : le 1er passage de l'observateur dit ce qui est hors écran.
(function () {
  "use strict";
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var cibles = document.querySelectorAll(
    "main h2, .liste-outils li, .photo, .videos li, details.faq, .encadre, .chaine, .sommaire");
  var vus = new WeakSet();
  var obs = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      var el = e.target;
      if (!vus.has(el)) {
        vus.add(el);
        if (e.isIntersecting || e.boundingClientRect.top < 0) {
          obs.unobserve(el);
        } else {
          el.classList.add("revele");
        }
        return;
      }
      if (e.isIntersecting) {
        el.classList.add("vu");
        obs.unobserve(el);
      }
    });
  }, { rootMargin: "0px 0px -6% 0px" });
  for (var i = 0; i < cibles.length; i++) obs.observe(cibles[i]);
})();
