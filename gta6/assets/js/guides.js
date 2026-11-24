// Recherche instantanée sur la page « Tous les guides » (24/11/2026). Aucun envoi : tout se passe dans la page.
(function () {
  "use strict";
  var champ = document.getElementById("cherche-guide");
  if (!champ) return;
  var compte = document.getElementById("compte-guides");
  var aucun = document.getElementById("aucun-guide");
  var populaires = document.querySelector(".populaires");
  var sections = document.querySelectorAll(".rubrique-guides:not(.populaires)");
  var themes = document.querySelector(".themes");
  var L = (document.documentElement.lang || "fr").slice(0, 2);
  var MOTS = {fr: ["guide", "guides", " trouvé", " trouvés"], en: ["guide", "guides", " found", " found"],
              es: ["guía", "guías", " encontrada", " encontradas"], pt: ["guia", "guias", " encontrado", " encontrados"]};
  var M = MOTS[L] || MOTS.fr;
  function TX(n, actif) { return n + " " + (n > 1 ? M[1] : M[0]) + (actif ? (n > 1 ? M[3] : M[2]) : ""); }
  function net(t) { return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
  function filtrer() {
    var mots = net(champ.value).split(/\s+/).filter(Boolean);
    var vus = {}, n = 0;
    for (var i = 0; i < sections.length; i++) {
      var items = sections[i].querySelectorAll("li"), visibles = 0;
      for (var j = 0; j < items.length; j++) {
        var texte = net(items[j].getAttribute("data-cherche") || "");
        var ok = mots.every(function (m) { return texte.indexOf(m) !== -1; });
        items[j].hidden = !ok;
        if (ok) {
          visibles++;
          var lien = items[j].querySelector("a").getAttribute("href");
          if (!vus[lien]) { vus[lien] = 1; n++; }
        }
      }
      sections[i].hidden = visibles === 0;
    }
    var actif = mots.length > 0;
    if (populaires) populaires.hidden = actif;
    if (themes) themes.hidden = actif;
    aucun.hidden = n > 0;
    compte.textContent = TX(n, actif);
    var revs = document.querySelectorAll(".rubrique-guides .revele");
    for (var k = 0; k < revs.length; k++) revs[k].classList.add("vu");
  }
  champ.addEventListener("input", filtrer);
})();
