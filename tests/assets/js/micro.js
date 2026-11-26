/* Test du micro : vu-mètre, onde, diagnostic et enregistrement de 5 s (Blob en mémoire, jamais envoyé). */
(function () {
  'use strict';
  var TP = window.TP, M = TP.media, $ = TP.$, T = TP.t;
  var flux = null, mesure = null, minuteur = 0, debut = 0, rec = null, urlAudio = '';
  var zone = $('microVerdict'), barre = $('microBarre'), db = $('microDb'), canvas = $('microCanvas');
  var btnD = $('microDemarrer'), btnA = $('microArreter'), btnR = $('microEnreg'), btnZ = $('microRaz'), sel = $('microSelect');
  var etatRec = $('microEnregEtat'), lecteur = $('microLecteur');

  var TEXTES = {
    aucun: { ok: 'ko', titre: T('Ça ne marche pas : aucun son reçu'), texte: T('Le micro est ouvert, mais aucun son n’arrive. Parlez plus fort ou tapotez le micro : si rien ne bouge, suivez ces étapes.'),
      etapes: [T('Vérifiez que le bon micro est choisi dans la liste ci-dessus, puis cliquez sur « Démarrer ».'),
        T('Vérifiez que le micro n’est pas coupé (bouton ou interrupteur sur le casque, sur le câble ou sur le micro).'),
        T('Windows 11 : Paramètres > Confidentialité et sécurité > Microphone. macOS : Réglages Système > Confidentialité et sécurité > Microphone. L’accès doit être activé pour votre navigateur.'),
        T('Dans les réglages de son du système, regardez si la jauge d’entrée bouge quand vous parlez et si le volume d’entrée n’est pas à zéro.'),
        T('Essayez une autre prise ou un autre port USB, et fermez les applications qui utilisent le micro (visio, enregistreur).')],
      lien: '/depannage/micro-ne-fonctionne-pas-windows-11/', lienTexte: T('Micro qui ne marche pas : la solution complète') },
    faible: { ok: 'ko', titre: T('Ça marche, mais le son est trop faible'), texte: T('Le micro capte un signal, mais bas : vos correspondants devront monter le volume ou vous entendront mal.'),
      etapes: [T('Rapprochez-vous du micro (ou placez le micro du casque près du coin de la bouche, sans souffler dedans).'),
        T('Augmentez le volume d’entrée du micro dans les réglages de son du système.'),
        T('Cliquez sur « Remettre la mesure à zéro », parlez normalement et regardez le résultat.')],
      lien: '/depannage/micro-trop-faible/', lienTexte: T('Micro trop faible : la solution complète') },
    sature: { ok: 'ko', titre: T('Ça marche, mais le son sature'), texte: T('Le signal touche le maximum : le son risque de grésiller ou de « craquer ». Une voix trop forte ou un volume d’entrée trop haut en est la cause.'),
      etapes: [T('Éloignez-vous un peu du micro et parlez à voix normale.'),
        T('Baissez le volume d’entrée du micro dans les réglages de son du système.'),
        T('Cliquez sur « Remettre la mesure à zéro », puis recommencez.')],
      lien: '/depannage/micro-qui-sature/', lienTexte: T('Micro qui sature ou grésille') },
    fort: { ok: 'ok', titre: T('Ça marche : le niveau est élevé'), texte: T('Le son passe bien, mais il frôle le maximum. Si vos correspondants entendent des craquements, baissez un peu le volume d’entrée.') },
    bon: { ok: 'ok', titre: T('Ça marche : bon niveau'), texte: T('Le micro capte votre voix avec un niveau correct. Enregistrez 5 secondes pour vous réécouter.') }
  };

  function affiche(etat, t) {
    var x = TEXTES[etat];
    TP.verdict(zone, x.ok, x.titre, x.texte + (t || ''), x.etapes, x.lien, x.lienTexte);
  }
  function evaluer() {
    if (!mesure) { return; }
    var s = mesure.stats();
    var d = TP.diagnosticMicro(s);
    var detail = T(' (crête {pic}, niveau moyen max {rms})', { pic: M.texteDb(s.pic), rms: M.texteDb(s.rms) });
    affiche(d.etat, d.etat === 'aucun' ? '' : detail);
  }
  function arreter(message) {
    ouverture++;
    clearInterval(minuteur); minuteur = 0;
    if (rec && rec.state === 'recording') { try { rec.stop(); } catch (e) { /* ok */ } }
    if (mesure) { mesure.arreter(); mesure = null; }
    M.arreter(flux); flux = null;
    btnD.disabled = false; btnA.disabled = true; btnR.disabled = true; btnZ.disabled = true;
    M.regler(barre, 0); db.textContent = '– dB';
    if (message !== false) { TP.verdict(zone, 'attente', T('Micro arrêté'), T('L’accès au micro est fermé. Cliquez sur « Démarrer le test » pour recommencer.')); }
  }
  var ouverture = 0;
  function demarrer() {
    if (flux) { arreter(false); }
    // 26/11/2026 (relecture sécurité) : un double clic ou un arrêt pendant l'ouverture ne laisse plus un flux allumé.
    var n = ++ouverture;
    btnD.disabled = true;
    var contraintes = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
    if (sel.value) { contraintes.audio.deviceId = { exact: sel.value }; }
    TP.verdict(zone, 'attente', T('Autorisez le micro…'), T('Votre navigateur va demander l’accès au micro : cliquez sur « Autoriser ».'));
    M.ouvrir(contraintes).then(function (f) {
      if (n !== ouverture) { M.arreter(f); return; }
      flux = f;
      btnD.disabled = true; btnA.disabled = false; btnR.disabled = false; btnZ.disabled = false;
      M.remplir(sel, 'audioinput', T('Micro par défaut')).then(function () {
        var t = flux && flux.getAudioTracks()[0];
        var id = t && t.getSettings ? t.getSettings().deviceId : '';
        if (id) { sel.value = id; }
      });
      mesure = M.mesure(flux, function (n, donnees) { M.regler(barre, n.pic); db.textContent = M.texteDb(n.pic); M.dessinerOnde(canvas, donnees); });
      if (!mesure) { TP.verdict(zone, 'ko', T('Navigateur non compatible'), T('Ce navigateur ne sait pas mesurer le son.')); return; }
      debut = Date.now();
      TP.verdict(zone, 'attente', T('Parlez maintenant'), T('Dites une phrase à voix normale pendant 3 secondes : le résultat s’affiche ensuite.'));
      minuteur = setInterval(function () { if (Date.now() - debut >= 3000) { evaluer(); } }, 1000);
      f.getAudioTracks().forEach(function (t) { t.addEventListener('ended', function () { if (flux === f) { arreter(false); TP.verdict(zone, 'ko', T('Le micro s’est arrêté'), T('L’appareil a été débranché ou repris par une autre application.'), [T('Rebranchez le micro, puis cliquez sur « Démarrer le test ».')], '/depannage/micro-ne-fonctionne-pas-windows-11/', T('Micro qui ne marche pas')); } }); });
    }, function (err) {
      if (n !== ouverture) { return; }
      var e = TP.erreurMedia(err, 'micro');
      TP.verdict(zone, 'ko', T('Ça ne marche pas : {quoi}', { quoi: e.titre.toLowerCase() }), e.texte, null, e.lien, e.lienTexte);
      btnD.disabled = false;
    });
  }
  function enregistrer() {
    if (!flux) { return; }
    if (!window.MediaRecorder) { etatRec.textContent = T('Ce navigateur ne sait pas enregistrer : le test de niveau fonctionne quand même.'); return; }
    var morceaux = [];
    try { rec = new MediaRecorder(flux); } catch (e) { etatRec.textContent = T('Enregistrement impossible avec ce navigateur.'); return; }
    rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) { morceaux.push(ev.data); } };
    rec.onstop = function () {
      clearInterval(rec._cd);
      btnR.disabled = !flux;
      if (!morceaux.length) { etatRec.textContent = T('Aucun son enregistré.'); return; }
      var blob = new Blob(morceaux, { type: rec.mimeType || 'audio/webm' });
      if (urlAudio) { URL.revokeObjectURL(urlAudio); }
      urlAudio = URL.createObjectURL(blob);
      TP.vider(lecteur);
      var a = TP.creer('audio'); a.controls = true; a.src = urlAudio;
      lecteur.appendChild(a);
      etatRec.textContent = T('Enregistrement terminé : appuyez sur lecture pour vous réécouter. Il reste dans cet onglet et n’est envoyé nulle part.');
    };
    rec.start();
    btnR.disabled = true;
    var reste = 5;
    etatRec.textContent = T('Enregistrement… {n} s (parlez)', { n: reste });
    rec._cd = setInterval(function () {
      reste--;
      if (reste <= 0) { clearInterval(rec._cd); if (rec.state === 'recording') { rec.stop(); } } else { etatRec.textContent = T('Enregistrement… {n} s (parlez)', { n: reste }); }
    }, 1000);
  }
  btnD.addEventListener('click', demarrer);
  btnA.addEventListener('click', function () { arreter(); });
  btnR.addEventListener('click', enregistrer);
  btnZ.addEventListener('click', function () { if (mesure) { mesure.raz(); debut = Date.now(); TP.verdict(zone, 'attente', T('Mesure remise à zéro'), T('Parlez pendant 3 secondes : le résultat s’affiche ensuite.')); } });
  sel.addEventListener('change', function () { if (flux) { demarrer(); } });
  window.addEventListener('pagehide', function () { arreter(false); if (urlAudio) { URL.revokeObjectURL(urlAudio); } });
  btnA.disabled = true; btnR.disabled = true; btnZ.disabled = true;
  if (!M.dispo()) { var e = TP.erreurMedia({ name: 'NoApiError' }, 'micro'); TP.verdict(zone, 'ko', T('Ça ne marche pas : {quoi}', { quoi: e.titre.toLowerCase() }), e.texte, null, e.lien, e.lienTexte); btnD.disabled = true; }
}());
