/* Lever et coucher du soleil (équations de la NOAA, d'après Jean Meeus) : lever, coucher, durée du jour, midi solaire,
   crépuscules, heure dorée et tableau du mois. Ville de la liste, ou coordonnées saisies ; la position de l'appareil n'est
   demandée qu'après un clic sur le bouton, et elle n'est ni envoyée, ni gardée, ni mise dans l'adresse. */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;
  var section = document.querySelector('[data-soleil]');
  var fixe = section ? HX.ville(section.getAttribute('data-soleil')) : null;
  var demandes = 0, MAX_DEMANDES = 5;

  function lieu() {
    if (fixe) { return { nom: fixe.nom, zone: fixe.zone, lat: fixe.lat, lon: fixe.lon, coords: false }; }
    var id = CQ.valeur('v');
    if (id === 'coords') {
      var la = CQ.nombre('lat', -89.9, 89.9), lo = CQ.nombre('lon', -180, 180);
      if (!isFinite(la) || !isFinite(lo)) { return null; }
      return { nom: 'ces coordonnées', zone: HX.zoneAppareil(), lat: la, lon: lo, coords: true };
    }
    var v = HX.ville(id) || HX.ville('paris');
    return { nom: v.nom, zone: v.zone, lat: v.lat, lon: v.lon, coords: false };
  }

  function h(zone, ms) { return ms === null ? '—' : HX.heureTexte(HE.parties(zone, ms)); }
  function plage(zone, a, b) { return a === null || b === null ? '—' : h(zone, a) + ' à ' + h(zone, b); }
  function ecartSecondes(s) {
    var a = Math.abs(Math.round(s)), signe = s > 0 ? '+' : s < 0 ? '−' : '';
    return a < 60 ? signe + a + ' s' : signe + Math.floor(a / 60) + ' min ' + HE.deux(a % 60) + ' s';
  }

  function recalcul() {
    var bloc = CQ.el('blocCoords');
    if (bloc) { bloc.hidden = CQ.valeur('v') !== 'coords'; }
    var L = lieu();
    var ids = ['rLever', 'rCoucher', 'rDuree', 'rMidi', 'rDiff'];
    if (!L) {
      ids.forEach(function (i) { CQ.texte(i, '–'); });
      CQ.texte('phrase', 'Indiquez une latitude et une longitude (par exemple 48,86 et 2,35 pour Paris), ou utilisez votre position.');
      CQ.lignes('crep', []); CQ.lignes('mois', []);
      return;
    }
    var d = HX.lireDate(CQ.valeur('d'), 1900, 2100);
    if (!d) { var pn = HE.parties(L.zone, Date.now()); d = { a: pn.a, mo: pn.mo, j: pn.j }; }
    var s = HE.soleil(d.a, d.mo, d.j, L.lat, L.lon);
    var hier = new Date(Date.UTC(d.a, d.mo - 1, d.j) - HE.JOUR), sh = HE.soleil(hier.getUTCFullYear(), hier.getUTCMonth() + 1, hier.getUTCDate(), L.lat, L.lon);
    var z = L.zone, dateTxt = HX.dateLongue({ a: d.a, mo: d.mo, j: d.j, js: new Date(Date.UTC(d.a, d.mo - 1, d.j)).getUTCDay() });
    CQ.texte('rLever', h(z, s.lever));
    CQ.texte('rCoucher', h(z, s.coucher));
    CQ.texte('rDuree', HE.texteDuree(s.duree));
    CQ.texte('rMidi', h(z, s.midi));
    CQ.texte('rDiff', s.etat || sh.etat ? '—' : ecartSecondes((s.duree - sh.duree) * 60));
    var msg;
    if (s.etat === 'jour') {
      msg = 'Le ' + dateTxt + ', le soleil ne se couche pas à ' + L.nom + ' : c\'est le jour polaire.';
    } else if (s.etat === 'nuit') {
      msg = 'Le ' + dateTxt + ', le soleil ne se lève pas à ' + L.nom + ' : c\'est la nuit polaire.';
    } else {
      msg = 'Le ' + dateTxt + ', à ' + L.nom + ', le soleil se lève à ' + h(z, s.lever) + ' et se couche à ' + h(z, s.coucher) +
        ' : ' + HE.texteDuree(s.duree) + ' de jour, ' + (s.duree >= sh.duree ? 'un peu plus' : 'un peu moins') + ' que la veille.';
    }
    msg += L.coords ? ' Heures données dans le fuseau de votre appareil (' + z.replace(/_/g, ' ') + ').' :
      (z === 'Europe/Paris' ? '' : ' Heures locales (' + HE.texteUTC(HE.decalage(z, s.midi || Date.UTC(d.a, d.mo - 1, d.j, 12))) + ').');
    CQ.texte('phrase', msg);
    CQ.lignes('crep', [
      { cellules: ['Aube et crépuscule astronomiques (soleil à 18° sous l\'horizon)', h(z, s.astroDebut), h(z, s.astroFin)] },
      { cellules: ['Aube et crépuscule nautiques (12° sous l\'horizon)', h(z, s.nautiqueDebut), h(z, s.nautiqueFin)] },
      { cellules: ['Aube et crépuscule civils (6° sous l\'horizon)', h(z, s.civilDebut), h(z, s.civilFin)] },
      { cellules: ['Lever et coucher du soleil', h(z, s.lever), h(z, s.coucher)] },
      { cellules: ['Heure dorée (soleil à moins de 6° au-dessus de l\'horizon)', plage(z, s.lever, s.doreeMatin), plage(z, s.doreeSoir, s.coucher)] }
    ]);
    // Mois entier.
    var n = new Date(Date.UTC(d.a, d.mo, 0)).getUTCDate(), lignes = [];
    for (var j = 1; j <= n; j++) {
      var x = HE.soleil(d.a, d.mo, j, L.lat, L.lon);
      lignes.push({ cellules: [j + (j === 1 ? 'er' : '') + ' ' + HX.MOIS[d.mo - 1], h(z, x.lever), h(z, x.coucher), x.etat === 'jour' ? '24 h' : HE.texteDuree(x.duree)],
        nombres: [1, 2, 3], classe: j === d.j ? 'ligne-active' : '' });
    }
    HX.ecrire('moisTitre', 'Le soleil jour par jour en ' + HX.MOIS[d.mo - 1] + ' ' + d.a);
    CQ.lignes('mois', lignes);
  }

  var geo = CQ.el('geo');
  if (geo) {
    geo.addEventListener('click', function () {
      if (geo.disabled) { return; }
      if (!navigator.geolocation) { CQ.texte('geoEtat', 'Votre navigateur ne donne pas la position : saisissez les coordonnées.'); return; }
      if (demandes >= MAX_DEMANDES) { CQ.texte('geoEtat', 'Position déjà demandée ' + MAX_DEMANDES + ' fois : saisissez les coordonnées.'); return; }
      demandes += 1;
      geo.disabled = true;
      CQ.texte('geoEtat', 'Demande de position en cours… (votre navigateur va vous demander l\'accord)');
      navigator.geolocation.getCurrentPosition(function (pos) {
        CQ.el('lat').value = String(Math.round(pos.coords.latitude * 100) / 100).replace('.', ',');
        CQ.el('lon').value = String(Math.round(pos.coords.longitude * 100) / 100).replace('.', ',');
        geo.disabled = false;
        CQ.texte('geoEtat', 'Position trouvée (arrondie à 1 km environ). Elle reste dans votre navigateur.');
        recalcul();
      }, function () {
        geo.disabled = false;
        CQ.texte('geoEtat', 'Position non disponible ou refusée : saisissez les coordonnées.');
      }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
    });
  }
  CQ.surChangement(['v', 'd', 'lat', 'lon'], recalcul);
  CQ.initPartage(recalcul);
}());
