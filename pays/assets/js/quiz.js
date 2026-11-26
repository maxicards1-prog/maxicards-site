/* Quiz des drapeaux et des capitales : 10 questions, 4 choix. Seul le meilleur score est gardé, dans ce navigateur
   (localStorage, clés pays-quiz-drapeau et pays-quiz-capitale). Rien n'est envoyé. */
(function () {
  'use strict';
  var LP = window.LP, D = window.PD || [];
  var zone = document.getElementById('quiz');
  if (!zone || !LP || D.length < 4) { return; }
  var type = zone.getAttribute('data-type') === 'capitale' ? 'capitale' : 'drapeau';
  var NB = 10;
  var PAR = {};
  D.forEach(function (p) { PAR[p.i] = p; });
  var $ = function (id) { return document.getElementById(id); };
  var cont = $('continent'), question = $('question'), img = $('quizDrapeau'), retour = $('retour'), suivant = $('suivant');
  var boutons = [0, 1, 2, 3].map(function (k) { return $('c' + k); });
  var dossier = img.getAttribute('src').replace(/[^\/]+\.svg$/, '');
  var racine = dossier.replace(/assets\/drapeaux\/$/, '');
  var CLE = 'pays-quiz-' + type;
  var etat = null;

  function records() {
    try {
      var v = JSON.parse(window.localStorage.getItem(CLE) || '{}');
      return v && typeof v === 'object' ? v : {};
    } catch (e) { return {}; }
  }
  function noter(k, n) {
    try {
      var r = records();
      if (!(r[k] >= n)) { r[k] = n; window.localStorage.setItem(CLE, JSON.stringify(r)); }
    } catch (e) { /* stockage refusé : tant pis pour le record */ }
  }
  function cleContinent() { return cont.value || 'monde'; }
  function tableau() {
    $('score').textContent = etat.bons + ' / ' + etat.n;
    $('rang').textContent = Math.min(etat.n + (etat.fini ? 0 : 1), NB) + ' / ' + NB;
    var r = records()[cleContinent()];
    $('record').textContent = typeof r === 'number' ? r + ' / ' + NB : '–';
  }
  function libelle(p) { return type === 'capitale' ? p.c : p.n; }

  function poser() {
    var liste = LP.parContinent(D, cont.value);
    etat.q = LP.questionQuiz(liste, type, Math.random, etat.vus);
    if (!etat.q) { return; }
    etat.vus.push(etat.q.bonne);
    var p = PAR[etat.q.bonne];
    img.src = dossier + p.i.toLowerCase() + '.svg';
    img.alt = type === 'capitale' ? 'Drapeau ' + LP.de(p) : 'Drapeau à reconnaître';
    question.textContent = type === 'capitale' ? 'Quelle est la capitale ' + LP.de(p) + ' ?' : 'Quel pays a ce drapeau ?';
    boutons.forEach(function (b, k) {
      b.hidden = false;
      b.disabled = false;
      b.className = '';
      b.textContent = libelle(PAR[etat.q.choix[k]]);
    });
    while (retour.firstChild) { retour.removeChild(retour.firstChild); }
    suivant.hidden = true;
    tableau();
  }

  function repondre(k) {
    if (!etat.q || etat.fini || boutons[k].disabled) { return; }
    var bonne = etat.q.choix.indexOf(etat.q.bonne);
    var p = PAR[etat.q.bonne];
    boutons.forEach(function (b) { b.disabled = true; });
    boutons[bonne].className = 'bon';
    etat.n++;
    while (retour.firstChild) { retour.removeChild(retour.firstChild); }
    if (k === bonne) {
      etat.bons++;
      retour.appendChild(document.createTextNode('Bonne réponse ! '));
    } else {
      boutons[k].className = 'faux';
      retour.appendChild(document.createTextNode('Raté : ' + (type === 'capitale' ? 'la capitale ' + LP.de(p) + ' est ' + p.c : 'c\'est le drapeau ' + LP.de(p)) + '. '));
    }
    var a = document.createElement('a');
    a.href = racine + p.s + '/';
    a.textContent = 'Voir la fiche ' + LP.de(p);
    retour.appendChild(a);
    suivant.hidden = false;
    suivant.textContent = etat.n >= NB ? 'Voir mon score' : 'Question suivante';
    tableau();
    suivant.focus({ preventScroll: true });
  }

  function finir() {
    etat.fini = true;
    noter(cleContinent(), etat.bons);
    question.textContent = 'Terminé : ' + etat.bons + ' bonne' + (etat.bons > 1 ? 's' : '') + ' réponse' + (etat.bons > 1 ? 's' : '') + ' sur ' + NB + '.';
    boutons.forEach(function (b) { b.hidden = true; });
    while (retour.firstChild) { retour.removeChild(retour.firstChild); }
    retour.appendChild(document.createTextNode(etat.bons === NB ? 'Sans faute ! Essayez un autre continent.' :
      etat.bons >= 7 ? 'Très bien. Rejouez pour battre votre record.' : 'Rejouez : les pays changent à chaque partie.'));
    suivant.textContent = 'Rejouer';
    suivant.hidden = false;
    tableau();
  }

  function demarrer() {
    etat = { n: 0, bons: 0, vus: [], q: null, fini: false };
    poser();
  }

  boutons.forEach(function (b, k) { b.addEventListener('click', function () { repondre(k); }); });
  suivant.addEventListener('click', function () {
    if (etat.fini) { demarrer(); } else if (etat.n >= NB) { finir(); } else { poser(); }
  });
  cont.addEventListener('change', demarrer);
  demarrer();
}());
