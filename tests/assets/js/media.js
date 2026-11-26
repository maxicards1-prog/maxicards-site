/* Micro et caméra : l'accès n'est demandé qu'au clic sur « Démarrer ». Les pistes sont arrêtées (track.stop()) sur « Arrêter »
   et en quittant la page. Rien n'est envoyé : le flux reste dans cet onglet. */
(function () {
  'use strict';
  var TP = window.TP;
  var M = TP.media = {};
  M.dispo = function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); };
  M.ouvrir = function (contraintes) {
    if (!M.dispo()) { var e = new Error('API absente'); e.name = 'NoApiError'; return Promise.reject(e); }
    return navigator.mediaDevices.getUserMedia(contraintes);
  };
  M.arreter = function (flux) {
    if (flux) { flux.getTracks().forEach(function (t) { try { t.stop(); } catch (e) { /* déjà arrêtée */ } }); }
  };
  // Liste des appareils (les noms n'apparaissent qu'après l'autorisation). type : 'audioinput' | 'videoinput' | 'audiooutput'
  M.remplir = function (select, type, vide) {
    if (!select || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) { return Promise.resolve(0); }
    var courant = select.value;
    return navigator.mediaDevices.enumerateDevices().then(function (liste) {
      var l = liste.filter(function (d) { return d.kind === type; });
      TP.vider(select);
      var o0 = TP.creer('option', '', vide);
      o0.value = '';
      select.appendChild(o0);
      l.forEach(function (d, i) {
        if (!d.deviceId) { return; }
        var o = TP.creer('option', '', d.label || ((type === 'videoinput' ? 'Caméra ' : 'Micro ') + (i + 1)));
        o.value = d.deviceId;
        select.appendChild(o);
      });
      if (courant) { select.value = courant; }
      return l.length;
    }, function () { return 0; });
  };
  // Mesure du niveau sonore d'un flux (AudioContext + AnalyserNode). cb({rms, pic, donnees}) à chaque image.
  M.mesure = function (flux, cb) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { return null; }
    var ctx = new Ctx();
    var src = ctx.createMediaStreamSource(flux);
    var an = ctx.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);   // pas de connexion à la sortie : aucun retour dans les haut-parleurs
    var donnees = new Float32Array(an.fftSize);
    var actif = true, raf = 0;
    var st = { picMax: 0, rmsMax: 0, saturees: 0, images: 0 };
    function boucle() {
      if (!actif) { return; }
      an.getFloatTimeDomainData(donnees);
      var n = TP.niveau(donnees);
      st.images++;
      if (n.pic > st.picMax) { st.picMax = n.pic; }
      if (n.rms > st.rmsMax) { st.rmsMax = n.rms; }
      if (n.pic >= TP.SEUILS_MICRO.sature) { st.saturees++; }
      cb(n, donnees, st);
      raf = requestAnimationFrame(boucle);
    }
    if (ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
    raf = requestAnimationFrame(boucle);
    return {
      stats: function () { return { pic: st.picMax, rms: st.rmsMax, saturees: st.saturees, images: st.images }; },
      raz: function () { st.picMax = 0; st.rmsMax = 0; st.saturees = 0; st.images = 0; },
      arreter: function () {
        actif = false; cancelAnimationFrame(raf);
        try { src.disconnect(); } catch (e) { /* ok */ }
        if (ctx.close) { ctx.close().catch(function () { /* ok */ }); }
      }
    };
  };
  // Dessine l'onde (canvas) et règle la barre du vu-mètre.
  M.dessinerOnde = function (canvas, donnees) {
    if (!canvas) { return; }
    var g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    var fond = (getComputedStyle(canvas).getPropertyValue('--onde-fond') || '').trim() || '#eef1f8';
    var trait = (getComputedStyle(canvas).getPropertyValue('--onde-trait') || '').trim() || '#4f46e5';
    g.fillStyle = fond; g.fillRect(0, 0, w, h);
    g.lineWidth = 2; g.strokeStyle = trait; g.beginPath();
    var pas = donnees.length / w;
    for (var x = 0; x < w; x++) {
      var v = donnees[Math.floor(x * pas)] || 0;
      var y = h / 2 - v * (h / 2) * 0.95;
      if (x === 0) { g.moveTo(x, y); } else { g.lineTo(x, y); }
    }
    g.stroke();
  };
  M.regler = function (barre, v) {   // v : 0 à 1 (crête), affichée en échelle racine pour que les petits sons se voient
    if (barre) { barre.style.width = Math.round(100 * Math.min(1, Math.sqrt(Math.max(0, v)))) + '%'; }
  };
  M.texteDb = function (v) { var d = TP.dbfs(v); return isFinite(d) ? TP.nf(d, 0) + ' dB' : '– dB'; };
}());
