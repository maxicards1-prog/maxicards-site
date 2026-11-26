/* Accordeur au micro (guitare, basse, ukulélé, violon, chromatique). Détection YIN dans le navigateur :
   le micro n'est demandé qu'au clic sur « Démarrer l'accordeur », il est coupé (track.stop()) sur « Arrêter », en quittant
   la page et quand l'onglet est caché. L'analyseur n'est jamais relié aux haut-parleurs. Rien n'est enregistré ni envoyé. */
(function () {
  'use strict';
  var MU = window.MU, $ = MU.$;
  var racine = $('accordeur');
  if (!racine) { return; }
  var FMIN = MU.borner(racine.getAttribute('data-fmin'), 20, 4000, 27);
  var FMAX = MU.borner(racine.getAttribute('data-fmax'), FMIN * 2, 4000, 2000);
  var R = MU.REGLAGES_ACCORDEUR;   // seuil de volume, clarté, silence, période, taille du tampon, médiane
  var btnD = $('accDemarrer'), btnA = $('accArreter'), btnE = $('accEcouter'), btnAuto = $('accAuto');
  var sel = $('accAccordage'), zoneCordes = $('accCordes'), champLa = $('accLa');
  var elNote = $('accNote'), elEn = $('accNoteEn'), elFreq = $('accFreq'), elCents = $('accCents'), elCible = $('accCible');
  var aiguille = $('accAiguille'), ecran = $('accEcran'), message = $('accMessage'), zone = $('accVerdict');

  var cordes = [], noms = [], nomsEn = [], boutons = [];
  var auto = true, cible = 0, dernierMidi = 69, derniereCorde = 0;
  var flux = null, src = null, an = null, tampon = null, minuteur = 0, hist = [], derniereNote = 0, debutConfus = 0, cleMessage = '', suivi = { f: 0, t0: 0, tok: 0, v: 0 };
  var ouverture = 0, enAttente = false;

  function la() { return MU.bornerLa(champLa ? champLa.value : 440); }

  /* ---------- cordes (lues dans data-cordes / data-noms / data-en de l'option choisie) ---------- */
  function construireCordes() {
    MU.vider(zoneCordes); boutons = []; cordes = []; noms = []; nomsEn = [];
    if (!sel || !zoneCordes) { return; }
    var o = sel.options[sel.selectedIndex];
    if (!o) { return; }
    cordes = MU.lireCordes(o.getAttribute('data-cordes'));
    noms = MU.lireNoms(o.getAttribute('data-noms'));
    nomsEn = MU.lireNoms(o.getAttribute('data-en'));
    cordes.forEach(function (m, i) {
      var nn = MU.nomNote(m), fr = noms[i] || nn.fr, en = nomsEn[i] || (nn.en + nn.octave);
      noms[i] = fr; nomsEn[i] = en;
      var b = MU.creer('button', 'acc-corde');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', 'Corde ' + (cordes.length - i) + ' : ' + fr + ' (' + en + ')');
      b.appendChild(MU.creer('span', 'acc-corde-num', String(cordes.length - i)));
      b.appendChild(MU.creer('span', 'acc-corde-nom', fr));
      b.appendChild(MU.creer('span', 'acc-corde-en', en));
      b.addEventListener('click', function () { auto = false; cible = i; majBoutons(); });
      zoneCordes.appendChild(b);
      boutons.push(b);
    });
    if (cible >= cordes.length) { cible = 0; auto = true; }
    derniereCorde = 0;
    majBoutons();
  }
  function majBoutons(detectee) {
    boutons.forEach(function (b, i) {
      b.setAttribute('aria-pressed', !auto && i === cible ? 'true' : 'false');
      b.classList.toggle('detectee', auto && i === detectee);
    });
    if (btnAuto) { btnAuto.setAttribute('aria-pressed', auto ? 'true' : 'false'); }
  }

  /* ---------- affichage ---------- */
  function annoncer(cle, texte) {   // zone aria-live : mise à jour seulement quand l'état change
    if (cle === cleMessage) { return; }
    cleMessage = cle;
    message.textContent = texte;
  }
  function eteindre(confus) {
    elNote.textContent = '–'; elEn.textContent = ''; elFreq.textContent = '–'; elCents.textContent = '–';
    if (elCible && !cordes.length) { elCible.textContent = '–'; }
    aiguille.style.left = '50%';
    ecran.className = 'acc-ecran eteint';
    boutons.forEach(function (b) { b.classList.remove('detectee'); });
    if (!flux) { return; }
    if (confus) {   // assez fort mais pas de note nette (banc du 26/11 : une autre corde résonne, ou plusieurs notes)
      annoncer('confus', cordes.length ? 'Son pas assez net : jouez une seule corde et étouffez les autres de la main.' : 'Son pas assez net : une seule note à la fois, au calme.');
    } else {
      annoncer('silence', cordes.length ? 'Jouez une corde, bien nettement.' : 'Jouez ou chantez une note.');
    }
  }
  function afficher(f) {
    var l = la(), cents, fr, en;
    if (cordes.length) {
      var idx = cible;
      if (auto) { f = MU.corrigerOctave(f, cordes, l); var p = MU.cordeProche(f, cordes, l); idx = p ? p.index : 0; derniereCorde = idx; }
      cents = MU.cents(f, MU.freqDeMidi(cordes[idx], l));
      fr = noms[idx]; en = nomsEn[idx];
      majBoutons(idx);
      var entendue = MU.noteProche(f, l);
      if (elCible && entendue) { elCible.textContent = entendue.fr + ' (' + entendue.en + entendue.octave + ')'; }
    } else {
      var n = MU.noteProche(f, l);
      if (!n) { return; }
      cents = n.cents; fr = n.fr; en = n.en + n.octave; dernierMidi = n.midi;
    }
    var etat = MU.etatJustesse(cents);
    elNote.textContent = fr; elEn.textContent = en;
    elFreq.textContent = MU.nf(f, 1) + ' Hz';
    elCents.textContent = MU.texteCents(cents);
    aiguille.style.left = (50 + Math.max(-50, Math.min(50, cents))) + '%';
    ecran.className = 'acc-ecran ' + etat;
    annoncer(etat + '|' + fr + en, MU.MESSAGES_JUSTESSE[etat] + ' (' + fr + ' ' + en + ')');
  }

  /* ---------- analyse (au plus 20 fois par seconde) ---------- */
  function analyser() {
    if (!an) { return; }
    an.getFloatTimeDomainData(tampon);
    var maintenant = Date.now();
    var v = MU.rms(tampon.subarray(tampon.length - R.FENETRE));   // volume des 85 dernières ms
    var r = v >= R.SEUIL_RMS ? MU.mesurer(tampon, an.context.sampleRate, { fmin: FMIN, fmax: FMAX }, suivi, maintenant) : null;
    MU.suivreNote(suivi, r, v, maintenant);
    if (v < 2 * R.SEUIL_RMS || (r && r.clarte >= R.SEUIL_CLARTE)) { debutConfus = maintenant; }
    if (r && r.clarte >= R.SEUIL_CLARTE) {
      // nouvelle note : on oublie l'ancienne, et on attend ATTENTE_MS (la toute première mesure après l'attaque est
      // souvent fausse de 5 à 20 cents, banc du 26/11) ; l'affichage précédent reste en place pendant ce temps
      if (suivi.t0 === maintenant) { hist = []; }
      derniereNote = maintenant;
      if (maintenant - suivi.t0 >= R.ATTENTE_MS) {
        hist.push(r.freq);
        if (hist.length > R.HISTOIRE) { hist.shift(); }
        afficher(MU.mediane(hist));
      }
    } else if (maintenant - derniereNote > R.SILENCE_MS) {
      hist = [];
      var confus = maintenant - debutConfus > R.SILENCE_MS;   // son net absent depuis 0,7 s alors que le volume est là
      if (ecran.className.indexOf('eteint') < 0 || cleMessage !== (confus ? 'confus' : 'silence')) { eteindre(confus); }
    }
  }

  /* ---------- micro ---------- */
  function couper(f) {
    if (f) { f.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { /* déjà arrêtée */ } }); }
  }
  function arreter(titre, texte) {
    ouverture++; enAttente = false;   // une ouverture en cours est désormais dépassée : elle sera refermée à son arrivée
    clearInterval(minuteur); minuteur = 0;
    if (src) { try { src.disconnect(); } catch (e) { /* ok */ } src = null; }
    an = null;
    couper(flux); flux = null;
    hist = [];
    btnD.disabled = !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia;
    btnA.disabled = true;
    eteindre();
    annoncer('arret', 'Accordeur arrêté.');
    if (titre !== false) {
      MU.verdict(zone, 'attente', titre || 'Micro coupé', texte || 'L’accès au micro est fermé. Cliquez sur « Démarrer l’accordeur » pour reprendre.');
    }
  }
  function erreur(err) {
    var e = MU.erreurMicro(err);
    MU.verdict(zone, 'ko', e.titre, e.texte, null, MU.LIEN_AIDE_MICRO, 'L’accordeur n’entend rien : les solutions');
  }
  function demarrer() {
    if (flux) { arreter(false); }
    var n = ++ouverture;
    enAttente = true;
    btnD.disabled = true;   // grisé dès le clic : pas de double ouverture
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { erreur({ name: 'NoApiError' }); return; }
    var c = MU.son.contexte();   // créé pendant le clic (sinon le navigateur le laisse muet)
    if (!c) { erreur({ name: 'NoApiError' }); return; }
    MU.verdict(zone, 'attente', 'Autorisez le micro…', 'Votre navigateur va demander l’accès au micro : cliquez sur « Autoriser ».');
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (f) {
      if (n !== ouverture) { couper(f); return; }
      enAttente = false;
      flux = f;
      src = c.createMediaStreamSource(f);
      an = c.createAnalyser();
      an.fftSize = R.TAILLE;
      src.connect(an);   // jamais relié à c.destination : aucun retour dans les haut-parleurs
      tampon = new Float32Array(an.fftSize);
      btnD.disabled = true; btnA.disabled = false;
      derniereNote = 0; debutConfus = Date.now(); cleMessage = ''; suivi = { f: 0, t0: 0, tok: 0, v: 0 };
      MU.verdict(zone, 'ok', 'Micro ouvert', cordes.length ? 'Jouez une corde à vide : l’accordeur reconnaît la corde la plus proche.' : 'Jouez ou chantez une note.');
      eteindre();
      minuteur = setInterval(analyser, R.PERIODE_MS);
      f.getAudioTracks().forEach(function (t) {
        t.addEventListener('ended', function () { if (flux === f) { arreter('Le micro s’est arrêté', 'L’appareil a été débranché ou repris par une autre application. Cliquez sur « Démarrer l’accordeur » pour reprendre.'); } });
      });
    }, function (err) {
      if (n !== ouverture) { return; }
      enAttente = false;
      erreur(err);
      btnD.disabled = false;
    });
  }

  /* ---------- note de référence ---------- */
  function ecouter() {
    var midi = cordes.length ? cordes[auto ? derniereCorde : cible] : dernierMidi;
    if (midi === undefined) { return; }
    MU.son.corde(MU.freqDeMidi(midi, la()), 0.6, 2.5);
  }

  btnD.addEventListener('click', demarrer);
  btnA.addEventListener('click', function () { arreter(); });
  if (btnE) { btnE.addEventListener('click', ecouter); }
  if (btnAuto) { btnAuto.addEventListener('click', function () { auto = true; majBoutons(); }); }
  if (sel) { sel.addEventListener('change', construireCordes); }
  if (champLa) { champLa.addEventListener('change', function () { champLa.value = String(la()); }); }
  window.addEventListener('pagehide', function () { arreter(false); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && (flux || enAttente)) { arreter('Micro coupé', 'L’onglet était caché : le micro a été coupé. Cliquez sur « Démarrer l’accordeur » pour reprendre.'); }
  });
  construireCordes();
  btnA.disabled = true;
  eteindre();
  annoncer('pret', 'Cliquez sur « Démarrer l’accordeur », puis jouez une corde.');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { erreur({ name: 'NoApiError' }); btnD.disabled = true; }
}());
