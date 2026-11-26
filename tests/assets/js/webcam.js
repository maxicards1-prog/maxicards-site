/* Test de la webcam : aperçu, résolution réelle, images par seconde mesurées, photo enregistrable sur l'appareil. Rien n'est envoyé. */
(function () {
  'use strict';
  var TP = window.TP, M = TP.media, $ = TP.$, T = TP.t;
  var flux = null, urlPhoto = '', instants = [], arretFps = null, noirTimer = 0;
  var video = $('camVideo'), zone = $('camVerdict'), sel = $('camSelect'), selRes = $('camResolution');
  var btnD = $('camDemarrer'), btnA = $('camArreter'), btnP = $('camPhoto'), miroir = $('camMiroir');
  var tRes = $('camRes'), tFps = $('camFps'), tNom = $('camNom'), zonePhoto = $('camPhotoZone');

  function contraintes() {
    var v = {};
    if (sel.value) { v.deviceId = { exact: sel.value }; }
    var r = selRes.value;
    if (r) { var p = r.split('x'); v.width = { ideal: +p[0] }; v.height = { ideal: +p[1] }; }
    return { video: v, audio: false };
  }
  function arreter(msg) {
    ouverture++;
    clearTimeout(noirTimer);
    if (arretFps) { arretFps(); arretFps = null; }
    M.arreter(flux); flux = null;
    video.srcObject = null;
    btnD.disabled = false; btnA.disabled = true; btnP.disabled = true;
    tRes.textContent = '–'; tFps.textContent = '–'; tNom.textContent = '–';
    if (msg !== false) { TP.verdict(zone, 'attente', T('Caméra arrêtée'), T('L’accès à la caméra est fermé (le voyant de la caméra doit s’éteindre). Cliquez sur « Démarrer » pour recommencer.')); }
  }
  function ips(f) { return T('{n} i/s', { n: TP.nf(f, 0) }); }
  function mesurerFps() {
    instants = [];
    var actif = true;
    function maj() { var f = TP.fpsFenetre(instants, 2000); if (actif && f) { tFps.textContent = ips(f); } }
    if (video.requestVideoFrameCallback) {
      var cb = function (now) { if (!actif) { return; } instants.push(now); if (instants.length > 400) { instants.shift(); } maj(); video.requestVideoFrameCallback(cb); };
      video.requestVideoFrameCallback(cb);
      return function () { actif = false; };
    }
    var prec = 0, t0 = performance.now(), iv = setInterval(function () {
      var q = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
      if (!q) { tFps.textContent = T('non mesurable'); return; }
      var maintenant = performance.now();
      if (prec) { var f = TP.fpsDepuisImages(q.totalVideoFrames - prec, maintenant - t0); tFps.textContent = ips(f); }
      prec = q.totalVideoFrames; t0 = maintenant;
    }, 1000);
    return function () { actif = false; clearInterval(iv); };
  }
  function verifierNoir() {
    if (!flux || !video.videoWidth) { return; }
    var c = document.createElement('canvas'); c.width = 32; c.height = 24;
    var g = c.getContext('2d');
    g.drawImage(video, 0, 0, 32, 24);
    var lum = TP.luminanceMoyenne(g.getImageData(0, 0, 32, 24).data);
    if (lum < 4) {
      TP.verdict(zone, 'ko', T('La caméra s’ouvre, mais l’image est noire'),
        T('La caméra répond, mais elle ne voit presque rien.'),
        [T('Ouvrez le cache ou le volet de confidentialité de la caméra, s’il y en a un.'), T('Éclairez la pièce : une caméra dans le noir donne une image noire.'),
         T('Retirez ce qui couvre l’objectif (autocollant, doigt, capuchon).'), T('Si c’est une caméra externe, essayez un autre port USB.')],
        '/depannage/webcam-non-detectee/', T('Webcam : que faire si elle ne marche pas'));
    }
  }
  var ouverture = 0;
  function demarrer() {
    if (flux) { arreter(false); }
    // 26/11/2026 (relecture sécurité) : un double clic ou un arrêt pendant l'ouverture ne laisse plus un flux allumé.
    var n = ++ouverture;
    btnD.disabled = true;
    TP.verdict(zone, 'attente', T('Autorisez la caméra…'), T('Votre navigateur va demander l’accès à la caméra : cliquez sur « Autoriser ».'));
    M.ouvrir(contraintes()).then(function (f) {
      if (n !== ouverture) { M.arreter(f); return; }
      flux = f;
      btnD.disabled = true; btnA.disabled = false; btnP.disabled = false;
      video.srcObject = f;
      video.play().catch(function () { /* lecture bloquée : l'image s'affichera au premier clic */ });
      var t = f.getVideoTracks()[0], s = t.getSettings ? t.getSettings() : {};
      M.remplir(sel, 'videoinput', T('Caméra par défaut')).then(function () { if (s.deviceId) { sel.value = s.deviceId; } });
      tNom.textContent = t.label || T('Caméra');
      function lire() {
        var s2 = t.getSettings ? t.getSettings() : {};
        var w = video.videoWidth || s2.width, h = video.videoHeight || s2.height;
        tRes.textContent = w && h ? w + ' × ' + h : '–';
        if (w && h) {
          var demande = selRes.value ? T(' (demandé : {res})', { res: selRes.value.replace('x', ' × ') }) : '';
          var annonce = s2.frameRate ? T(' La caméra annonce {n} images par seconde.', { n: TP.nf(s2.frameRate, 0) }) : '';
          TP.verdict(zone, 'ok', T('Ça marche : la caméra fonctionne'), T('Image reçue en {w} × {h}{demande}.{annonce} Vérifiez la netteté et la lumière sur l’aperçu.', { w: w, h: h, demande: demande, annonce: annonce }));
          clearTimeout(noirTimer); noirTimer = setTimeout(verifierNoir, 1500);
        }
      }
      video.onloadedmetadata = lire;
      video.onplaying = lire;
      arretFps = mesurerFps();
      t.addEventListener('ended', function () { if (flux === f) { arreter(false); TP.verdict(zone, 'ko', T('La caméra s’est arrêtée'), T('L’appareil a été débranché ou repris par une autre application.'), [T('Rebranchez la caméra, fermez les autres applications qui l’utilisent, puis cliquez sur « Démarrer ».')], '/depannage/webcam-non-detectee/', T('Webcam non détectée')); } });
    }, function (err) {
      if (n !== ouverture) { return; }
      var e = TP.erreurMedia(err, 'camera');
      TP.verdict(zone, 'ko', T('Ça ne marche pas : {quoi}', { quoi: e.titre.toLowerCase() }), e.texte, null, e.lien, e.lienTexte);
      btnD.disabled = false;
    });
  }
  function photo() {
    if (!flux || !video.videoWidth) { return; }
    var c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    c.toBlob(function (blob) {
      if (!blob) { return; }
      if (urlPhoto) { URL.revokeObjectURL(urlPhoto); }
      urlPhoto = URL.createObjectURL(blob);
      TP.vider(zonePhoto);
      var img = TP.creer('img', 'photo-test'); img.src = urlPhoto; img.alt = T('Photo prise avec la caméra'); img.width = c.width; img.height = c.height;
      var a = TP.creer('a', 'bouton-lien', T('Enregistrer la photo sur l’appareil')); a.href = urlPhoto; a.download = T('photo-test-webcam.png');
      zonePhoto.appendChild(img); zonePhoto.appendChild(a);
      zonePhoto.appendChild(TP.creer('p', 'aide', T('La photo reste dans cet onglet : elle n’est envoyée nulle part. Elle disparaît quand vous fermez la page.')));
    }, 'image/png');
  }
  miroir.addEventListener('change', function () { video.classList.toggle('miroir', miroir.checked); });
  btnD.addEventListener('click', demarrer);
  btnA.addEventListener('click', function () { arreter(); });
  btnP.addEventListener('click', photo);
  sel.addEventListener('change', function () { if (flux) { demarrer(); } });
  selRes.addEventListener('change', function () { if (flux) { demarrer(); } });
  window.addEventListener('pagehide', function () { arreter(false); if (urlPhoto) { URL.revokeObjectURL(urlPhoto); } });
  btnA.disabled = true; btnP.disabled = true;
  if (!M.dispo()) { var e = TP.erreurMedia({ name: 'NoApiError' }, 'camera'); TP.verdict(zone, 'ko', T('Ça ne marche pas : {quoi}', { quoi: e.titre.toLowerCase() }), e.texte, null, e.lien, e.lienTexte); btnD.disabled = true; }
}());
