/* Quiz des départements : 4 jeux (numéro → nom, nom → numéro, préfecture, carte), séries de 10 questions.
   Seul le meilleur score de chaque jeu est gardé dans ce navigateur (localStorage), rien n'est envoyé. */
(function () {
  'use strict';
  var FR = window.FR, U = window.FRU;
  if (!FR || !U) { return; }
  var N = 10;
  var zone = U.el('quizZone'), enonce = U.el('quizEnonce'), choixUl = U.el('quizChoix'), retour = U.el('quizRetour');
  var suite = U.el('quizSuite'), etat = U.el('quizEtat'), record = U.el('quizRecord'), lancer = U.el('quizLancer');
  var carteBloc = U.el('quizCarte'), svg = U.el('carteQuiz');
  var radios = document.querySelectorAll('input[name="mode"]');
  if (!zone || !lancer) { return; }
  var liste = null, index = null, mode = 'numero', questions = [], i = 0, score = 0, repondu = false;

  function cleRecord(m) { return 'maxicards-france-quiz-' + m; }
  function lireRecord(m) {
    try { return FR.meilleur(window.localStorage.getItem(cleRecord(m)), 0, N); } catch (e) { return 0; }
  }
  function garderRecord(m, s) {
    var r = FR.meilleur(lireRecord(m), s, N);
    try { window.localStorage.setItem(cleRecord(m), String(r)); } catch (e) { /* stockage refusé : tant pis */ }
    return r;
  }
  function afficherRecord() {
    var r = lireRecord(mode);
    record.textContent = r ? 'Votre meilleur score à ce jeu : ' + r + '/' + N + '.' : 'Pas encore de score à ce jeu.';
  }
  function choisirMode(m) {
    mode = FR.modeValide(m) || 'numero';
    Array.prototype.forEach.call(radios, function (r) { r.checked = r.value === mode; });
    afficherRecord();
  }
  function nettoyerCarte() {
    if (!svg) { return; }
    Array.prototype.forEach.call(svg.querySelectorAll('.dep'), function (g) { g.classList.remove('bon', 'faux'); });
  }
  function marquerCarte(code, cls) {
    if (!svg) { return; }
    Array.prototype.forEach.call(svg.querySelectorAll('.dep[data-c="' + code + '"]'), function (g) { g.classList.add(cls); });
  }
  function poser() {
    repondu = false;
    var q = questions[i], d = index[q.cible];
    enonce.textContent = FR.enonce(d, mode);
    etat.textContent = 'Question ' + (i + 1) + ' sur ' + N + ' · score : ' + score;
    retour.textContent = '';
    retour.className = 'retour';
    suite.hidden = true;
    U.vider(choixUl);
    nettoyerCarte();
    carteBloc.hidden = mode !== 'carte';
    choixUl.hidden = mode === 'carte';
    if (mode !== 'carte') {
      q.choix.forEach(function (c) {
        var li = U.creer('li');
        var b = U.creer('button', 'choix', FR.libelleChoix(index[c], mode));
        b.type = 'button';
        b.setAttribute('data-c', c);
        b.addEventListener('click', function () { repondre(c, b); });
        li.appendChild(b);
        choixUl.appendChild(li);
      });
    }
  }
  function repondre(c, bouton) {
    if (repondu) { return; }
    repondu = true;
    var q = questions[i], d = index[q.cible];
    var bon = FR.verifier(q, c);
    if (bon) { score++; }
    retour.className = 'retour ' + (bon ? 'ok' : 'ko');
    var juste = mode === 'prefecture' ? d.p + ' est la préfecture ' + d.de + ' (' + d.c + ').' : d.n + ' porte le numéro ' + d.c + '.';
    retour.textContent = (bon ? 'Bonne réponse ! ' : 'Raté. ') + juste;
    if (mode === 'carte') {
      marquerCarte(q.cible, 'bon');
      if (!bon && index[c]) { marquerCarte(c, 'faux'); retour.textContent += ' Vous avez cliqué sur ' + index[c].n + ' (' + c + ').'; }
    } else {
      Array.prototype.forEach.call(choixUl.querySelectorAll('button'), function (b) {
        b.disabled = true;
        if (b.getAttribute('data-c') === q.cible) { b.classList.add('bon'); }
      });
      if (!bon && bouton) { bouton.classList.add('faux'); }
    }
    etat.textContent = 'Question ' + (i + 1) + ' sur ' + N + ' · score : ' + score;
    suite.textContent = i + 1 < N ? 'Question suivante' : 'Voir mon score';
    suite.hidden = false;
    suite.focus();
  }
  function finir() {
    var r = garderRecord(mode, score);
    enonce.textContent = 'Score : ' + score + '/' + N;
    retour.className = 'retour';
    retour.textContent = score === N ? 'Parfait, aucune erreur !' : score >= 7 ? 'Très bien. Rejouez pour viser 10/10.' :
      'Les erreurs sont là pour apprendre : relisez les bonnes réponses et rejouez.';
    etat.textContent = 'Meilleur score à ce jeu : ' + r + '/' + N + '.';
    U.vider(choixUl);
    choixUl.hidden = true;
    carteBloc.hidden = true;
    suite.hidden = true;
    lancer.textContent = 'Rejouer';
    lancer.hidden = false;
    lancer.focus();
    afficherRecord();
  }
  function demarrer() {
    if (!liste) { return; }
    var graine = Math.floor(Math.random() * 4294967295);
    questions = FR.serie(liste, mode, N, FR.hasard(graine));
    i = 0;
    score = 0;
    zone.hidden = false;
    lancer.hidden = true;
    poser();
    enonce.focus();
  }
  suite.addEventListener('click', function () {
    i++;
    if (i < N) { poser(); enonce.focus(); } else { finir(); }
  });
  lancer.addEventListener('click', demarrer);
  Array.prototype.forEach.call(radios, function (r) {
    r.addEventListener('change', function () {
      if (!r.checked) { return; }
      choisirMode(r.value);
      U.ecrire(mode === 'numero' ? {} : { mode: mode });
      if (!zone.hidden) { demarrer(); }
    });
  });
  if (svg) {
    var clic = function (e) {
      if (mode !== 'carte' || repondu || zone.hidden) { return; }
      var t = e.target;
      while (t && t !== svg && !(t.classList && t.classList.contains('dep'))) { t = t.parentNode; }
      if (t && t !== svg) { repondre(t.getAttribute('data-c'), null); }
    };
    svg.addEventListener('click', clic);
    svg.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clic(e); }
    });
  }
  U.donnees().then(function (l) {
    liste = l;
    index = U.parCode(l);
    choisirMode(U.param('mode'));
    lancer.disabled = false;
  }, function () {
    U.erreur('erreurOutil', "Le quiz n'a pas pu charger la liste des départements. Rechargez la page.");
  });
  U.partage();
})();
