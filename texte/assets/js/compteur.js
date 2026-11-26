/* Compteur de mots : mots, caractères, phrases, temps de lecture, limites SMS / X / Instagram. Rien n'est envoyé ni gardé. */
(function () {
  'use strict';
  var CQ = window.CQ, TX = window.TX;
  if (!CQ || !TX) { return; }
  var zone = CQ.el('cm-texte'), vl = CQ.el('cm-vl'), vo = CQ.el('cm-vo');
  if (!zone) { return; }
  var limites = Array.prototype.slice.call(document.querySelectorAll('.limite'));
  var prevu = false, minuterie = null;

  function barre(cle, n, max, depasse, texteNote) {
    var l = document.querySelector('.limite[data-cle="' + cle + '"]');
    CQ.el('cm-l-' + cle).textContent = CQ.entier(n) + ' / ' + CQ.entier(max);
    CQ.el('cm-b-' + cle).style.setProperty('--pos', Math.min(100, max ? n / max * 100 : 0).toFixed(1) + '%');
    l.classList.toggle('depasse', depasse);
    if (texteNote) { CQ.el('cm-n-' + cle).textContent = texteNote; }
  }

  function maj() {
    prevu = false;
    var t = zone.value;
    var r = TX.compter(t, vl ? vl.value : 214, vo ? vo.value : 180);
    CQ.texte('cm-mots', CQ.entier(r.mots));
    CQ.texte('cm-car', CQ.entier(r.caracteres));
    CQ.texte('cm-sans', CQ.entier(r.sansEspaces));
    CQ.texte('cm-phrases', CQ.entier(r.phrases));
    CQ.texte('cm-para', CQ.entier(r.paragraphes));
    CQ.texte('cm-lecture', TX.duree(r.lectureSec));
    CQ.texte('cm-parole', TX.duree(r.paroleSec));
    limites.forEach(function (l) {
      var cle = l.getAttribute('data-cle'), max = parseInt(l.getAttribute('data-max'), 10);
      if (cle === 'sms') {
        var s = TX.sms(t);
        var note = (s.gsm ? 'Alphabet de base : 160 caractères par SMS.' : 'Un emoji ou un caractère spécial : 70 caractères par SMS.')
          + (s.parties > 1 ? ' Ce message part en ' + s.parties + ' SMS.' : '');
        barre(cle, s.unites, s.limite, s.parties > 1, note);
      } else if (cle === 'x') {
        var px = TX.poidsX(t);
        barre(cle, px, max, px > max, '');
      } else {
        barre(cle, r.caracteres, max, r.caracteres > max, '');
      }
    });
  }
  function plus_tard() {
    if (zone.value.length > 20000) {
      clearTimeout(minuterie);
      minuterie = setTimeout(maj, 200);
    } else if (!prevu) {
      prevu = true;
      window.requestAnimationFrame(maj);
    }
  }

  zone.addEventListener('input', plus_tard);
  CQ.surChangement(['cm-vl', 'cm-vo'], maj);
  CQ.el('cm-effacer').addEventListener('click', function () { zone.value = ''; maj(); zone.focus(); });
  maj();
}());
