/* Animaux : âge, rations, calendriers. Logique pure (aucun accès à la page) : testée sous Node, copiée dans public/assets/js/. */
(function (racine) {
  'use strict';
  function fabriquer(D) {
    var CU = { D: D };
    var C = D.chien, F = C.formule, EN = D.energie, CS = D.cession, JOUR = 86400000;

    // ---------- gabarit du chien ----------
    CU.gabarit = function (kg) {
      if (!isFinite(kg) || kg <= 0) { return null; }
      for (var i = 0; i < C.classes.length; i++) { if (kg <= C.classes[i].max) { return C.classes[i].id; } }
      return 'geant';
    };
    CU.classe = function (id) {
      for (var i = 0; i < C.classes.length; i++) { if (C.classes[i].id === id) { return C.classes[i]; } }
      return null;
    };
    CU.race = function (id) {
      for (var i = 0; i < D.races.length; i++) { if (D.races[i].id === id) { return D.races[i]; } }
      return null;
    };
    CU.gabaritRace = function (id) {
      var r = CU.race(id);
      return r ? CU.gabarit((r.kg[0] + r.kg[1]) / 2) : null;
    };

    // ---------- âge du chien en âge humain (repère usuel par gabarit) ----------
    CU.pente = function (gab) { var t = C.table[gab]; return t[t.length - 1] - t[t.length - 2]; };
    CU.humainRepere = function (gab, ans) {
      var t = C.table[gab];
      if (!t || !isFinite(ans) || ans < 0) { return NaN; }
      var n = t.length;
      if (ans > n) { return NaN; } // la source s'arrête à n ans : aucun repère fiable au-delà
      if (ans <= 1) { return t[0] * ans; }
      if (ans >= n) { return t[n - 1]; }
      var i = Math.floor(ans);
      return i === ans ? t[i - 1] : t[i - 1] + (t[i] - t[i - 1]) * (ans - i);
    };
    // sens inverse : âge humain -> âge du chien (années), borné à age_max
    CU.chienDepuisHumain = function (gab, h) {
      var t = C.table[gab];
      if (!t || !isFinite(h) || h < 0) { return NaN; }
      var n = t.length;
      if (h > t[n - 1]) { return NaN; } // au-delà du tableau source : pas de repère fiable
      if (h <= t[0]) { return h / t[0]; }
      if (h >= t[n - 1]) { return n; }
      for (var i = 1; i < n; i++) {
        if (h <= t[i]) { return i + (h - t[i - 1]) / (t[i] - t[i - 1]); }
      }
      return n;
    };
    // formule de l'étude de l'université de Californie à San Diego (Wang et al., 2020) : 16 x ln(âge) + 31
    CU.humainFormule = function (ans) {
      if (!isFinite(ans) || ans < F.age_min || ans > F.age_etude) { return NaN; } // étude : 0,1 à 16 ans
      return F.a * Math.log(ans) + F.b;
    };

    // ---------- âge du chat en âge humain ----------
    CU.chatHumain = function (ans) {
      if (!isFinite(ans) || ans < 0) { return NaN; }
      ans = Math.min(ans, D.age_max);
      var c = D.chat;
      if (ans <= 1) { return c.an1 * ans; }
      if (ans <= 2) { return c.an1 + (c.an2 - c.an1) * (ans - 1); }
      return c.an2 + c.par_an * (ans - 2);
    };
    CU.chatDepuisHumain = function (h) {
      if (!isFinite(h) || h < 0) { return NaN; }
      h = Math.min(h, 400);
      var c = D.chat;
      if (h <= c.an1) { return h / c.an1; }
      if (h <= c.an2) { return 1 + (h - c.an1) / (c.an2 - c.an1); }
      return Math.min(D.age_max, 2 + (h - c.an2) / c.par_an);
    };
    // étape de vie (International Cat Care), âge en mois
    CU.chatEtape = function (mois) {
      if (!isFinite(mois) || mois < 0) { return ''; }
      if (mois <= 4) { return 'chaton (jusqu\'à 4 mois environ)'; }
      if (mois < 12) { return 'jeune chat (de 4 à 12 mois environ)'; }
      if (mois < 24) { return 'junior (de 1 à 2 ans)'; }
      if (mois < 84) { return 'adulte (à partir de 2 ans)'; }
      return 'mature (à partir de 7 ans)';
    };

    // ---------- ration : énergie au repos x facteur, divisée par l'énergie du paquet ----------
    CU.rer = function (kg) { return isFinite(kg) && kg > 0 ? EN.coef * Math.pow(kg, EN.exp) : NaN; };
    CU.facteur = function (espece, id) {
      var l = EN[espece] || [];
      for (var i = 0; i < l.length; i++) { if (l[i].id === id) { return l[i].f; } }
      return NaN;
    };
    CU.kcalJour = function (espece, kg, id) { return CU.rer(kg) * CU.facteur(espece, id); };
    CU.grammes = function (kcal, kcal100) { return isFinite(kcal) && kcal100 > 0 ? kcal / (kcal100 / 100) : NaN; };
    // nombre de repas du chiot selon le gabarit et l'âge en mois (repères Royal Canin)
    CU.repasChiot = function (gab, mois) {
      if (!isFinite(mois) || mois < 0) { return ''; }
      if (mois < 1) { return 'Avant le sevrage, le chiot est nourri par sa mère.'; }
      if (mois < 2) { return 'Pendant le sevrage : quatre repas par jour, quelle que soit la race.'; }
      var pet = gab === 'petit', gr = gab === 'grand' || gab === 'geant';
      if (pet) {
        if (mois < 4) { return 'Trois repas par jour jusqu\'à 4 mois.'; }
        if (mois < 10) { return 'Deux repas par jour de 4 à 10 mois.'; }
      } else if (gr) {
        if (mois < 6) { return 'Trois repas par jour jusqu\'à 6 mois.'; }
        if (mois < 12) { return 'Deux repas par jour de 6 mois à 1 an.'; }
      } else {
        if (mois < 4) { return 'Trois repas par jour (repère des petites et des grandes races).'; }
        if (mois < 6) { return 'Entre petites et grandes races : trois ou deux repas, selon l\'étiquette et votre vétérinaire.'; }
        if (mois < 12) { return 'Deux repas par jour (repère des grandes races jusqu\'à 1 an).'; }
      }
      return 'Chien adulte : des horaires réguliers ; le nombre de repas se décide avec votre vétérinaire.';
    };

    // ---------- dates (jours entiers en UTC : numéro de jour depuis le 01/01/1970) ----------
    CU.ajouterMois = function (j, n) {
      var d = new Date(j * JOUR), m = d.getUTCMonth() + n, an = d.getUTCFullYear() + Math.floor(m / 12), mo = ((m % 12) + 12) % 12;
      var max = new Date(Date.UTC(an, mo + 1, 0)).getUTCDate();
      return Date.UTC(an, mo, Math.min(d.getUTCDate(), max)) / JOUR;
    };
    // mode : chiot | chaton | chienne | chatte ; j : naissance (chiot, chaton) ou saillie (chienne, chatte)
    // opt : { gab } pour le chiot ; { ovulation } (jour) pour la chienne
    CU.evenements = function (mode, j, opt) {
      opt = opt || {};
      var E = [];
      function add(jour, titre, detail, fin) { E.push({ jour: jour, fin: fin || null, titre: titre, detail: detail || '' }); }
      var M = CU.ajouterMois;
      if (mode === 'chiot' || mode === 'chaton') {
        var cess = j + CS.semaines_min * 7, chien = mode === 'chiot';
        add(j, 'Naissance', 'Jour 0 du calendrier.');
        add(cess - CS.certificat_jours, 'Certificat d\'engagement et de connaissance : délivré au plus tard ce jour-là',
          'Pour une cession dès les 8 semaines, la personne qui adopte doit avoir reçu ce certificat au moins 7 jours avant. Il est propre à l\'espèce (un pour le ' + (chien ? 'chien' : 'chat') + ').');
        add(cess, '8 semaines : âge minimum pour être cédé',
          'Un chiot ou un chaton ne peut pas être cédé avant 8 semaines. Il doit être identifié (puce ou tatouage, fichier Icad) avant la cession, par le cédant.');
        if (chien) {
          add(M(j, CS.id_chien_mois), '4 mois : identification obligatoire du chien', 'Au plus tard à cet âge, le chien doit être identifié (et dès la cession).');
          var gab = opt.gab || 'moyen';
          if (gab === 'petit') { add(M(j, 4), '4 mois : passage à deux repas par jour (petite race)', 'Repère Royal Canin : trois repas jusqu\'à 4 mois, puis deux jusqu\'à 10 mois.'); }
          else if (gab === 'grand' || gab === 'geant') { add(M(j, 6), '6 mois : passage à deux repas par jour (grande race)', 'Repère Royal Canin : trois repas jusqu\'à 6 mois, puis deux jusqu\'à 1 an.'); }
          var a = C.adulte_mois[gab] || C.adulte_mois.moyen, cl = CU.classe(gab) || CU.classe('moyen');
          add(M(j, a[0]), a[0] === a[1] ? 'Vers ' + a[0] + ' mois : croissance terminée (' + cl.nom.toLowerCase() + ' gabarit)' : 'De ' + a[0] + ' à ' + a[1] + ' mois : croissance terminée (' + cl.nom.toLowerCase() + ' gabarit)',
            'Repère Royal Canin pour ce gabarit. La maturité mentale prend un peu plus de temps. Le changement d\'alimentation se décide avec votre vétérinaire.', a[0] === a[1] ? null : M(j, a[1]));
        } else {
          add(M(j, 4), '4 mois : fin de la période « chaton »', 'Repère International Cat Care : chaton jusqu\'à 4 mois environ, puis jeune chat jusqu\'à 12 mois.');
          add(M(j, CS.id_chat_mois), '7 mois : identification obligatoire du chat', 'Au plus tard à cet âge, le chat doit être identifié (et dès la cession).');
          add(M(j, 12), '1 an : début de la période « junior »', 'Repère International Cat Care : junior de 1 à 2 ans.');
          add(M(j, 24), '2 ans : chat adulte', 'Repère International Cat Care : adulte à partir de 2 ans.');
        }
      } else if (mode === 'chienne') {
        var G = D.gestation.chienne;
        add(j, 'Saillie (date retenue)', 'Les jours ci-dessous sont comptés à partir de cette date.');
        add(j + G.echo[0], 'Échographie : fenêtre habituelle', 'Le Manuel vétérinaire MSD indique 25 à 35 jours de gestation pour l\'échographie. À programmer avec votre vétérinaire.', j + G.echo[1]);
        add(j + G.radio[0], 'Radiographie : le squelette des chiots devient visible', 'Le squelette n\'est pas détectable avant 42-45 jours environ ; prononcé vers 47-48 jours (MSD). Seul le vétérinaire décide d\'un examen.', j + G.radio[1]);
        if (isFinite(opt.ovulation)) {
          add(opt.ovulation + G.ovul[0], 'Mise bas : fenêtre calculée depuis l\'ovulation', '62 à 64 jours après l\'ovulation (MSD) : c\'est le calcul le plus précis, si la date d\'ovulation a été mesurée par votre vétérinaire.', opt.ovulation + G.ovul[1]);
        }
        add(j + G.saillie[0], 'Mise bas : début de la fenêtre large', 'Depuis la saillie, la mise bas se situe entre 58 et 72 jours (MSD), car on ne connaît pas toujours le moment exact de l\'ovulation.', j + G.saillie[1]);
        add(j + G.repere, 'Date repère : 63 jours', 'Moyenne indiquée par les sources vétérinaires. Ce n\'est pas une date garantie : confirmez avec votre vétérinaire.');
      } else if (mode === 'chatte') {
        var H = D.gestation.chatte;
        add(j, 'Saillie (date retenue)', 'Les jours ci-dessous sont comptés à partir de cette date.');
        add(j + H.plage[0], 'Début de la fenêtre de mise bas', 'La gestation de la chatte dure de 60 à 67 jours selon VCA Animal Hospitals.', j + H.plage[1]);
        add(j + H.moyenne[0], 'Moyenne : de 63 à 65 jours', 'Moyenne indiquée par VCA Animal Hospitals.', j + H.moyenne[1]);
        add(j + H.repere, 'Date repère : 65 jours', 'Valeur du Manuel vétérinaire MSD. Ce n\'est pas une date garantie : confirmez avec votre vétérinaire.');
        add(j + H.plage[1] + 1, 'Au-delà de cette date', 'La fenêtre habituelle est dépassée : demandez l\'avis de votre vétérinaire.');
      }
      E.sort(function (a, b) { return a.jour - b.jour; });
      return E;
    };

    // ---------- fichier de calendrier .ics (généré dans le navigateur, rien n'est envoyé) ----------
    function jourIcs(j) { return new Date(j * JOUR).toISOString().slice(0, 10).replace(/-/g, ''); }
    function echap(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
    // RFC 5545 § 3.1 : lignes de 75 octets au plus, la suite commence par une espace (sans couper un caractère)
    function plier(l) {
      var out = [], cur = '', n = 0;
      for (var i = 0; i < l.length; i++) {
        var c = l.charAt(i), code = l.charCodeAt(i), b;
        if (code >= 0xD800 && code <= 0xDBFF && i + 1 < l.length) { c = l.substr(i, 2); i++; b = 4; }
        else { b = code < 0x80 ? 1 : (code < 0x800 ? 2 : 3); }
        if (n + b > 75) { out.push(cur); cur = ' '; n = 1; }
        cur += c; n += b;
      }
      out.push(cur);
      return out.join('\r\n');
    }
    CU.ics = function (evts, prefixe, horodatage) {
      var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//maxicards.net//animaux//FR', 'CALSCALE:GREGORIAN'];
      var stamp = new Date(horodatage || 0).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
      evts.forEach(function (e, i) {
        var fin = (e.fin || e.jour) + 1;
        L.push('BEGIN:VEVENT', 'UID:animaux-' + e.jour + '-' + i + '@maxicards.net', 'DTSTAMP:' + stamp,
          'DTSTART;VALUE=DATE:' + jourIcs(e.jour), 'DTEND;VALUE=DATE:' + jourIcs(fin),
          'SUMMARY:' + echap(prefixe + ' : ' + e.titre), 'DESCRIPTION:' + echap(e.detail), 'END:VEVENT');
      });
      L.push('END:VCALENDAR');
      return L.map(plier).join('\r\n') + '\r\n';
    };
    return CU;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = fabriquer; }
  else { racine.CU = fabriquer(racine.CU_DATA); }
}(typeof window !== 'undefined' ? window : this));
