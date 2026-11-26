/* Couleurs : aides communes aux pages (adresse, copie, pastilles). Aucune donnée n'est envoyée.
   Dans l'adresse : uniquement un code couleur à 6 chiffres hexadécimaux (?c=rrggbb, ou ?t=rrggbb&f=rrggbb). */
(function () {
  'use strict';
  var COUL = window.COUL, CQ = window.CQ;
  var CLES = ['c', 't', 'f'];
  var minuterie = null;

  var CC = {
    // Lit ?cle=rrggbb dans l'adresse ; renvoie {r,g,b} ou null (valeur validée par une expression régulière).
    depuisAdresse: function (cle) {
      try {
        var v = new URLSearchParams(window.location.search).get(cle);
        if (typeof v === 'string' && /^[0-9a-fA-F]{6}$/.test(v)) { return COUL.depuisHex(v.toLowerCase()); }
      } catch (e) { /* adresse illisible : on ignore */ }
      return null;
    },
    // Écrit les couleurs dans l'adresse (history.replaceState), après une courte attente. valeurs : {c: {r,g,b}} ...
    versAdresse: function (valeurs) {
      clearTimeout(minuterie);
      minuterie = setTimeout(function () { CC.ecrireAdresse(valeurs); }, 350);
    },
    ecrireAdresse: function (valeurs) {
      var q = new URLSearchParams();
      CLES.forEach(function (k) {
        if (valeurs[k]) {
          var h = COUL.versHex(valeurs[k]);
          if (COUL.validHex(h)) { q.set(k, h); }
        }
      });
      try { window.history.replaceState(null, '', window.location.pathname + '?' + q.toString()); } catch (e) { /* rien */ }
    },
    // Peint un élément avec une couleur ({r,g,b} : la valeur hexadécimale est fabriquée ici, donc sûre).
    peindre: function (el, c) { if (el) { el.style.backgroundColor = '#' + COUL.versHex(c); } },
    // « 4,47:1 » (le ratio est tronqué, jamais arrondi vers le haut).
    ratio: function (r) { return COUL.ratioTronque(r).toFixed(2).replace('.', ',') + ':1'; },
    vider: function (el) { while (el.firstChild) { el.removeChild(el.firstChild); } },
    // Bouton-pastille : un carré de couleur et son code. surClic(c) est appelée au clic.
    pastille: function (c, surClic, etiquette) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pastille-btn';
      var hex = COUL.hexAff(c);
      b.setAttribute('aria-label', (etiquette ? etiquette + ' : ' : '') + hex + '. Utiliser cette couleur.');
      var carre = document.createElement('span');
      carre.className = 'carre';
      CC.peindre(carre, c);
      var t = document.createElement('span');
      t.className = 'hex';
      t.textContent = hex;
      b.appendChild(carre);
      b.appendChild(t);
      b.addEventListener('click', function () { surClic(c); });
      return b;
    },
    // Copie un texte : API moderne, sinon sélection temporaire. Renvoie une promesse (vrai si copié).
    copier: function (texte) {
      var repli = function () {
        var ok = false;
        try {
          var t = document.createElement('textarea');
          t.value = texte;
          t.setAttribute('readonly', '');
          t.className = 'visuellement-cache';
          document.body.appendChild(t);
          t.select();
          ok = document.execCommand('copy');
          document.body.removeChild(t);
        } catch (e) { ok = false; }
        return ok;
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(texte).then(function () { return true; }, function () { return repli(); });
      }
      return Promise.resolve(repli());
    },
    // Boutons [data-copie="id"] : copient le texte (ou la valeur) de l'élément désigné.
    lierCopie: function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-copie]'), function (b) {
        var libelle = b.textContent;
        b.addEventListener('click', function () {
          var cible = document.getElementById(b.getAttribute('data-copie'));
          if (!cible) { return; }
          var texte = typeof cible.value === 'string' && cible.tagName !== 'OUTPUT' ? cible.value : cible.textContent;
          CC.copier(texte).then(function (ok) {
            b.textContent = ok ? 'Copié' : 'Copiez à la main';
            setTimeout(function () { b.textContent = libelle; }, 1600);
          });
        });
      });
    },
    // Bouton « Copier le lien » (#copierLien) : le lien ne contient que les codes couleur de valeurs().
    lierPartage: function (valeurs) {
      var bouton = document.getElementById('copierLien');
      if (!bouton) { return; }
      bouton.addEventListener('click', function () {
        CC.ecrireAdresse(valeurs());
        CC.copier(window.location.href).then(function (ok) {
          CQ.texte('etatLien', ok ? 'Lien copié : il rouvre cette couleur.' : 'Copiez l\'adresse de la page : elle contient le code de la couleur.');
        });
      });
    },
    // Champ de couleur double : sélecteur (#sel) et champ texte (#saisie). surCouleur(c, source) est appelée si la saisie est lisible.
    lierSaisie: function (idSel, idSaisie, idMessage, surCouleur) {
      var sel = document.getElementById(idSel), saisie = document.getElementById(idSaisie), msg = document.getElementById(idMessage);
      if (sel) {
        sel.addEventListener('input', function () {
          var c = COUL.lire(sel.value);
          if (c) { if (msg) { msg.textContent = ''; } surCouleur(c, 'sel'); }
        });
      }
      if (saisie) {
        var lire = function () {
          if (saisie.value.trim() === '') { if (msg) { msg.textContent = ''; } return; }
          var c = COUL.lire(saisie.value);
          if (c) { if (msg) { msg.textContent = ''; } surCouleur(c, 'saisie'); }
          else if (msg) { msg.textContent = 'Code non reconnu. Essayez #1e90ff, rgb(30, 144, 255), hsl(210, 100%, 56%) ou un nom comme tomato.'; }
        };
        saisie.addEventListener('input', lire);
        saisie.addEventListener('change', lire);
      }
    },
    // Met à jour les deux champs d'une couleur (sauf celui d'où vient la saisie).
    poserChamps: function (idSel, idSaisie, c, source) {
      var sel = document.getElementById(idSel), saisie = document.getElementById(idSaisie);
      if (sel && source !== 'sel') { sel.value = '#' + COUL.versHex(c); }
      if (saisie && source !== 'saisie') { saisie.value = COUL.hexAff(c); }
    }
  };
  window.CC = CC;
}());
