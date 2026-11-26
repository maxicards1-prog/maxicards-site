/* Outil « Numéro → département » et « Département → numéro », en direct pendant la frappe. */
(function () {
  'use strict';
  var FR = window.FR, U = window.FRU;
  if (!FR || !U) { return; }
  var champNum = U.el('num'), champNom = U.el('nom');
  var titre = U.el('resTitre'), detail = U.el('resDetail'), lienP = U.el('resLien'), noms = U.el('resNoms');
  if (!champNum || !champNom) { return; }
  var liste = null, index = null;

  function afficherDep(d) {
    titre.textContent = d.c + ' · ' + d.n;
    titre.className = 'gros ok';
    detail.textContent = 'Préfecture : ' + d.p + ' · Région : ' + d.r + ' · ' + FR.fr(d.pop) + ' habitants (' + d.a + ')';
    U.vider(lienP);
    lienP.appendChild(U.lien(d, 'Ouvrir la page ' + d.de + ' →'));
  }
  function message(t, cls) {
    titre.textContent = t;
    titre.className = 'gros' + (cls ? ' ' + cls : '');
    detail.textContent = '';
    U.vider(lienP);
  }
  function surNumero() {
    if (!liste) { return; }
    var r = FR.lireNumero(champNum.value);
    if (!r) { message('Tapez un numéro ou un nom.'); U.ecrire({}); return; }
    if (r.code && index[r.code]) { afficherDep(index[r.code]); U.ecrire({ n: r.code }); return; }
    U.ecrire({});
    if (r.special) { message(r.message, 'info'); return; }
    message(r.erreur || 'Numéro inconnu.', 'info');
  }
  function surNom() {
    if (!liste) { return; }
    var res = FR.chercher(liste, champNom.value, 8);
    U.vider(noms);
    if (FR.normaliser(champNom.value).length < 2) { noms.hidden = true; return; }
    noms.hidden = false;
    if (!res.length) {
      noms.appendChild(U.creer('li', 'vide', 'Aucun département ni aucune préfecture ne contient ce texte.'));
      return;
    }
    res.forEach(function (x) {
      var d = x.d;
      var li = U.creer('li');
      var a = U.lien(d, '');
      a.appendChild(U.creer('span', 'num', d.c));
      a.appendChild(U.creer('span', 'nom', d.n));
      a.appendChild(U.creer('span', 'pref', x.par === 'prefecture' ? 'préfecture : ' + d.p : d.p));
      li.appendChild(a);
      noms.appendChild(li);
    });
    if (res.length === 1 || res[0].score === 0) {
      champNum.value = res[0].d.c;
      afficherDep(res[0].d);
      U.ecrire({ n: res[0].d.c });
    }
  }
  U.donnees().then(function (l) {
    liste = l;
    index = U.parCode(l);
    var n = U.param('n');
    if (n && FR.lireNumero(n) && FR.lireNumero(n).code) { champNum.value = FR.lireNumero(n).code; }
    champNum.addEventListener('input', surNumero);
    champNom.addEventListener('input', surNom);
    surNumero();
    if (champNom.value) { surNom(); }
  }, function () {
    U.erreur('erreurOutil', "La liste des départements n'a pas pu être chargée. Rechargez la page.");
  });
  U.partage();
})();
