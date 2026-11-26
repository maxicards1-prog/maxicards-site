/* Test visio : micro et caméra ensemble, comme dans Teams, Zoom, Meet ou Discord. Rien n'est envoyé. */
(function () {
  'use strict';
  var TP = window.TP, M = TP.media, $ = TP.$, T = TP.t;
  var flux = null, mesure = null, minuteur = 0, debut = 0;
  var video = $('visioVideo'), zoneC = $('visioVerdictCam'), zoneM = $('visioVerdictMic'), barre = $('visioBarre'), db = $('visioDb');
  var selM = $('visioMicSelect'), selC = $('visioCamSelect'), btnD = $('visioDemarrer'), btnA = $('visioArreter'), miroir = $('visioMiroir');

  function arreter(msg) {
    ouverture++;
    clearInterval(minuteur); minuteur = 0;
    if (mesure) { mesure.arreter(); mesure = null; }
    M.arreter(flux); flux = null; video.srcObject = null;
    btnD.disabled = false; btnA.disabled = true; M.regler(barre, 0); db.textContent = '– dB';
    if (msg !== false) {
      TP.verdict(zoneC, 'attente', T('Caméra arrêtée'), T('Cliquez sur « Démarrer » pour recommencer.'));
      TP.verdict(zoneM, 'attente', T('Micro arrêté'), '');
    }
  }
  function evaluerMicro() {
    if (!mesure) { return; }
    var s = mesure.stats(), d = TP.diagnosticMicro(s);
    var det = T(' (crête {pic})', { pic: M.texteDb(s.pic) });
    if (d.etat === 'aucun') { TP.verdict(zoneM, 'ko', T('Micro : aucun son reçu'), T('Parlez plus fort. Si rien ne bouge, choisissez un autre micro dans la liste, vérifiez qu’il n’est pas coupé et que le système autorise le micro.'), null, '/depannage/micro-ne-fonctionne-pas-windows-11/', T('Micro qui ne marche pas')); }
    else if (d.etat === 'faible') { TP.verdict(zoneM, 'ko', T('Micro : son trop faible'), T('Rapprochez-vous du micro ou augmentez le volume d’entrée dans les réglages de son.') + det, null, '/depannage/micro-trop-faible/', T('Micro trop faible')); }
    else if (d.etat === 'sature') { TP.verdict(zoneM, 'ko', T('Micro : le son sature'), T('Éloignez-vous du micro ou baissez le volume d’entrée.') + det, null, '/depannage/micro-qui-sature/', T('Micro qui sature')); }
    else { TP.verdict(zoneM, 'ok', T('Micro : ça marche'), (d.etat === 'fort' ? T('Niveau élevé, proche du maximum.') : T('Bon niveau.')) + det); }
  }
  function diagnostiquerPanne(errCombinee) {
    function essai(c) { return M.ouvrir(c).then(function (f) { M.arreter(f); return null; }, function (e) { return e; }); }
    TP.verdict(zoneC, 'attente', T('Recherche de la panne…'), '');
    TP.verdict(zoneM, 'attente', T('Recherche de la panne…'), '');
    var n = ouverture;   // un nouveau démarrage pendant le diagnostic rend ce résultat périmé
    Promise.all([essai({ video: true }), essai({ audio: true })]).then(function (r) {
      if (n !== ouverture) { return; }
      var ec = r[0], em = r[1];
      if (ec) { var a = TP.erreurMedia(ec, 'camera'); TP.verdict(zoneC, 'ko', T('Caméra : {quoi}', { quoi: a.titre.toLowerCase() }), a.texte, null, a.lien, a.lienTexte); }
      else { TP.verdict(zoneC, 'ok', T('Caméra : accessible'), T('La caméra répond seule ; le problème vient du micro ou de la combinaison.')); }
      if (em) { var b = TP.erreurMedia(em, 'micro'); TP.verdict(zoneM, 'ko', T('Micro : {quoi}', { quoi: b.titre.toLowerCase() }), b.texte, null, b.lien, b.lienTexte); }
      else { TP.verdict(zoneM, 'ok', T('Micro : accessible'), T('Le micro répond seul.')); }
      if (!ec && !em) { var g = TP.erreurMedia(errCombinee, 'both'); TP.verdict(zoneM, 'ko', T('Les deux répondent séparément, pas ensemble'), g.texte, null, g.lien, g.lienTexte); }
    });
  }
  var ouverture = 0;
  function demarrer() {
    if (flux) { arreter(false); }
    // 26/11/2026 (relecture sécurité) : un double clic ou un arrêt pendant l'ouverture ne laisse plus un flux allumé.
    var n = ++ouverture;
    btnD.disabled = true;
    var c = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: {} };
    if (selM.value) { c.audio.deviceId = { exact: selM.value }; }
    if (selC.value) { c.video.deviceId = { exact: selC.value }; }
    TP.verdict(zoneC, 'attente', T('Autorisez la caméra et le micro…'), T('Votre navigateur va demander l’accès : cliquez sur « Autoriser ».'));
    TP.verdict(zoneM, 'attente', T('En attente…'), '');
    M.ouvrir(c).then(function (f) {
      if (n !== ouverture) { M.arreter(f); return; }
      flux = f; btnD.disabled = true; btnA.disabled = false;
      video.srcObject = f; video.play().catch(function () { /* ok */ });
      M.remplir(selM, 'audioinput', T('Micro par défaut')); M.remplir(selC, 'videoinput', T('Caméra par défaut'));
      var vt = f.getVideoTracks()[0], s = vt && vt.getSettings ? vt.getSettings() : {};
      TP.verdict(zoneC, 'ok', T('Caméra : ça marche'), s.width ? T('Image reçue en {w} × {h}. Vérifiez le cadrage et la lumière sur l’aperçu.', { w: s.width, h: s.height }) : T('Image reçue. Vérifiez le cadrage et la lumière sur l’aperçu.'));
      mesure = M.mesure(f, function (n) { M.regler(barre, n.pic); db.textContent = M.texteDb(n.pic); });
      TP.verdict(zoneM, 'attente', T('Parlez maintenant'), T('Dites une phrase à voix normale pendant 3 secondes.'));
      debut = Date.now();
      minuteur = setInterval(function () { if (Date.now() - debut >= 3000) { evaluerMicro(); } }, 1000);
    }, function (err) {
      if (n !== ouverture) { return; }
      btnD.disabled = false;
      diagnostiquerPanne(err);
    });
  }
  miroir.addEventListener('change', function () { video.classList.toggle('miroir', miroir.checked); });
  btnD.addEventListener('click', demarrer);
  btnA.addEventListener('click', function () { arreter(); });
  selM.addEventListener('change', function () { if (flux) { demarrer(); } });
  selC.addEventListener('change', function () { if (flux) { demarrer(); } });
  window.addEventListener('pagehide', function () { arreter(false); });
  btnA.disabled = true;
  if (!M.dispo()) { var e = TP.erreurMedia({ name: 'NoApiError' }, 'both'); TP.verdict(zoneC, 'ko', T('Ça ne marche pas : {quoi}', { quoi: e.titre.toLowerCase() }), e.texte, null, e.lien, e.lienTexte); btnD.disabled = true; }
}());
