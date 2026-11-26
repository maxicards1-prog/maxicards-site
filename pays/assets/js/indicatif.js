/* Quel pays a l'indicatif +xx ? On tape un indicatif, un numéro ou un nom de pays. La saisie reste dans la page :
   elle n'est ni envoyée, ni gardée, ni recopiée dans l'adresse. */
(function () {
  'use strict';
  var LP = window.LP, D = window.PD || [];
  var saisie = document.getElementById('saisie');
  var liste = document.getElementById('resultats');
  var msg = document.getElementById('message');
  if (!saisie || !LP || !D.length) { return; }
  var PAR = {};
  D.forEach(function (p) { PAR[p.i] = p; });
  var lien = document.querySelector('link[rel="stylesheet"]');
  var assets = lien ? lien.getAttribute('href').replace(/style\.css.*$/, '') : '/pays/assets/';
  var racine = assets.replace(/assets\/$/, '');

  function vider(el) { while (el.firstChild) { el.removeChild(el.firstChild); } }
  function ligne(p) {
    var li = document.createElement('li');
    var img = document.createElement('img');
    img.src = assets + 'drapeaux/' + p.i.toLowerCase() + '.svg';
    img.alt = '';
    img.width = 48;
    img.height = 36;
    var div = document.createElement('div');
    var a = document.createElement('a');
    a.href = racine + p.s + '/';
    var fort = document.createElement('strong');
    fort.textContent = p.n + ' : +' + p.t + (p.r && p.r.length ? ' ' + p.r.join(' / ') : '');
    a.appendChild(fort);
    var info = document.createElement('span');
    info.textContent = 'Capitale : ' + p.c + ' · depuis la France, composez 00 ' + p.t + (p.r && p.r.length ? ' ' + p.r[0] + ' puis la suite du numéro.' : (p.np ? ' puis le numéro sans le ' + p.np + ' du début.' : ' puis le numéro en entier.'));
    div.appendChild(a);
    div.appendChild(info);
    li.appendChild(img);
    li.appendChild(div);
    return li;
  }

  function maj() {
    var v = String(saisie.value || '').slice(0, 60);
    vider(liste);
    msg.textContent = '';
    if (!v.trim()) { return; }
    var isos, texte;
    if (/\d/.test(v)) {
      var r = LP.chercherIndicatif(v, D);
      isos = r.pays;
      if (!r.code) {
        texte = r.chiffres ? 'Aucun pays n\'a un indicatif qui commence par +' + r.chiffres.slice(0, 4) + '. Vérifiez le numéro (sans le 0 du début).' : '';
      } else if (isos.length > 1) {
        texte = '+' + r.code + ' est partagé par ' + isos.length + ' pays' + (r.code === '1' ? ' : tapez les 3 chiffres suivants (indicatif régional) pour trouver le bon.' : ' : les chiffres suivants les distinguent.');
      } else if (isos.length === 1) {
        texte = '+' + r.code + ' : ' + PAR[isos[0]].n + '.';
      }
    } else {
      isos = LP.chercherNom(v, D, 12);
      texte = isos.length ? '' : 'Aucun pays trouvé pour « ' + v.trim().slice(0, 40) + ' ».';
    }
    msg.textContent = texte || '';
    isos.slice(0, 30).forEach(function (i) { liste.appendChild(ligne(PAR[i])); });
  }

  saisie.addEventListener('input', maj);
  maj();
}());
