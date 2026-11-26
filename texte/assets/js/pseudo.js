/* Générateur de pseudo : listes de mots écrites par nous (TX_DATA.pseudos), tirage par crypto.getRandomValues (CQ.hasard). */
(function () {
  'use strict';
  var CQ = window.CQ, TX = window.TX, D = window.TX_DATA;
  if (!CQ || !TX || !D || !D.pseudos) { return; }
  var theme = CQ.el('gp-theme'), mot = CQ.el('gp-mot'), forme = CQ.el('gp-forme'), lon = CQ.el('gp-long');
  var chiffres = CQ.el('gp-chiffres'), liste = CQ.el('gp-liste'), msg = CQ.el('gp-msg');
  if (!theme || !liste) { return; }
  var minuterie = null;

  function ligne(p) {
    var li = CQ.cree('li'), s = CQ.cree('span', 'res-texte', p), b = CQ.cree('button', null, 'Copier');
    b.type = 'button';
    b.setAttribute('aria-label', 'Copier ' + p);
    b.addEventListener('click', function () { CQ.copier(p, 'Copié : ' + p); });
    li.appendChild(s);
    li.appendChild(b);
    return li;
  }

  function generer() {
    CQ.vider(liste);
    if (!CQ.hasard) {
      msg.textContent = 'Votre navigateur ne fournit pas de générateur aléatoire sûr : mettez-le à jour pour utiliser cet outil.';
      return;
    }
    var res = TX.pseudos(D.pseudos, {
      theme: theme.value, forme: forme.value, chiffres: chiffres.checked, mot: mot.value, longueurMax: parseInt(lon.value, 10)
    }, CQ.hasard, 10);
    res.forEach(function (p) { liste.appendChild(ligne(p)); });
    msg.textContent = res.length ? '' : 'Aucune idée assez courte : augmentez la longueur maximale ou raccourcissez votre mot.';
  }

  CQ.el('gp-generer').addEventListener('click', generer);
  ['gp-theme', 'gp-forme', 'gp-long', 'gp-chiffres'].forEach(function (id) { CQ.el(id).addEventListener('change', generer); });
  mot.addEventListener('input', function () {
    clearTimeout(minuterie);
    minuterie = setTimeout(generer, 300);
  });
  generer();
}());
