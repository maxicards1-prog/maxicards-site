/* Tableau des codes GTA 6 : filtre par plateforme, catégorie, texte et codes connus. Aucun appel réseau. */
(function () {
  'use strict';
  var table = document.getElementById('tableCodes');
  if (!table) { return; }
  var lignes = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
  var plateforme = document.getElementById('plateforme');
  var categorie = document.getElementById('categorie');
  var recherche = document.getElementById('recherche');
  var connus = document.getElementById('connus');
  var compte = document.getElementById('compteCodes');
  var saisie = document.getElementById('saisiePlateforme');
  var messagePC = document.getElementById('messagePC');
  var LANGUE = (document.documentElement.lang || 'fr').slice(0, 2);
  var TEXTES = {
    fr: {
      ps5: 'Sur PS5 : appuyez sur ↑ (croix directionnelle) pour sortir le téléphone, maintenez L1 puis appuyez sur R1, puis tapez la combinaison avec la croix directionnelle.',
      xbox: 'Sur Xbox Series X|S : appuyez sur ↑ (croix directionnelle) pour sortir le téléphone, maintenez LB puis appuyez sur RB, puis tapez la combinaison avec la croix directionnelle.',
      pc: 'GTA 6 n’est pas sorti sur PC : aucune date n’est annoncée, il n’existe donc aucun code PC à ce jour. Les combinaisons ci-dessous sont celles des consoles.',
      compte: function (v, a) { return v + ' code' + (v > 1 ? 's' : '') + ' affiché' + (v > 1 ? 's' : '') + ', dont ' + a + ' avec une combinaison connue.'; }
    },
    en: {
      ps5: 'On PS5: press ↑ on the D-pad to bring up the phone, hold L1 then press R1, then enter the combination with the D-pad.',
      xbox: 'On Xbox Series X|S: press ↑ on the D-pad to bring up the phone, hold LB then press RB, then enter the combination with the D-pad.',
      pc: 'GTA 6 is not out on PC: no date has been announced, so there are no PC cheats yet. The combinations below are the console ones.',
      compte: function (v, a) { return v + ' cheat' + (v > 1 ? 's' : '') + ' shown, ' + a + ' with a known combination.'; }
    },
    es: {
      ps5: 'En PS5: pulsa ↑ en la cruceta para sacar el teléfono, mantén L1 y pulsa R1, y después introduce la combinación con la cruceta.',
      xbox: 'En Xbox Series X|S: pulsa ↑ en la cruceta para sacar el teléfono, mantén LB y pulsa RB, y después introduce la combinación con la cruceta.',
      pc: 'GTA 6 no ha salido en PC: no hay fecha anunciada, así que todavía no existe ningún truco para PC. Las combinaciones de abajo son las de consola.',
      compte: function (v, a) { return v + (v > 1 ? ' trucos mostrados' : ' truco mostrado') + ', ' + a + ' con una combinación conocida.'; }
    },
    pt: {
      ps5: 'No PS5: aperte ↑ no direcional para pegar o celular, segure L1 e aperte R1, depois digite a combinação no direcional.',
      xbox: 'No Xbox Series X|S: aperte ↑ no direcional para pegar o celular, segure LB e aperte RB, depois digite a combinação no direcional.',
      pc: 'GTA 6 não saiu no PC: nenhuma data foi anunciada, então ainda não existe código para PC. As combinações abaixo são as dos consoles.',
      compte: function (v, a) { return v + (v > 1 ? ' códigos exibidos' : ' código exibido') + ', ' + a + ' com combinação conhecida.'; }
    }
  };
  var TX = TEXTES[LANGUE] || TEXTES.fr;
  var TOUCHES = { ps5: TX.ps5, xbox: TX.xbox, pc: TX.pc };

  function sansAccent(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function appliquer() {
    var p = plateforme ? plateforme.value : 'ps5';
    var c = categorie ? categorie.value : 'tous';
    var q = recherche ? sansAccent(recherche.value.trim()) : '';
    var seulConnus = connus ? connus.checked : false;
    var vus = 0;
    var avecCode = 0;
    lignes.forEach(function (tr) {
      var ok = (c === 'tous' || tr.getAttribute('data-cat') === c) &&
        (!seulConnus || tr.getAttribute('data-connu') === '1') &&
        (q === '' || sansAccent(tr.textContent).indexOf(q) !== -1);
      tr.hidden = !ok;
      if (ok) {
        vus += 1;
        if (tr.getAttribute('data-connu') === '1') { avecCode += 1; }
      }
    });
    if (compte) {
      compte.textContent = TX.compte(vus, avecCode);
    }
    if (saisie) { saisie.textContent = TOUCHES[p] || TOUCHES.ps5; }
    if (messagePC) { messagePC.hidden = p !== 'pc'; }
  }

  [plateforme, categorie, connus].forEach(function (el) {
    if (el) { el.addEventListener('change', appliquer); }
  });
  if (recherche) { recherche.addEventListener('input', appliquer); }
  var params = new URLSearchParams(window.location.search);
  var cat = params.get('categorie');
  if (cat && categorie && categorie.querySelector('option[value="' + cat.replace(/[^a-z]/g, '') + '"]')) {
    categorie.value = cat.replace(/[^a-z]/g, '');
  }
  appliquer();
})();
