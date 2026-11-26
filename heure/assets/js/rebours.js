/* Comptes à rebours (Noël, Nouvel An, date choisie) : jours, heures, minutes et secondes jusqu'à minuit (heure de l'appareil).
   Le lien de partage ne contient que la date (AAAA-MM-JJ), jamais de texte. */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;
  var section = document.querySelector('[data-rebours]');
  var mode = section ? section.getAttribute('data-rebours') : 'date';
  var dernier = '';

  function maintenant() { var d = new Date(); return { a: d.getFullYear(), mo: d.getMonth() + 1, j: d.getDate() }; }

  // Date visée : {a, mo, j, nom} ou null.
  function cible() {
    var n = maintenant();
    if (mode === 'noel') {
      var x = HE.prochaineAnnuelle(n.a, n.mo, n.j, 12, 25);
      return { a: x.annee, mo: 12, j: 25, nom: 'Noël ' + x.annee, jour: x.aujourdhui };
    }
    if (mode === 'nouvel-an') {
      return { a: n.a + 1, mo: 1, j: 1, nom: 'le 1er janvier ' + (n.a + 1), jour: false, nouvelAn: n.mo === 1 && n.j === 1 };
    }
    var d = HX.lireDate(CQ.valeur('d'), 1000, 3000);
    if (!d) { return null; }
    d.nom = 'le ' + HX.dateLongue({ a: d.a, mo: d.mo, j: d.j, js: new Date(Date.UTC(d.a, d.mo - 1, d.j)).getUTCDay() });
    d.jour = d.a === n.a && d.mo === n.mo && d.j === n.j;
    return d;
  }

  function tic() {
    var c = cible();
    if (!c) { ['rJ', 'rH', 'rM', 'rS'].forEach(function (i) { HX.ecrire(i, '–'); }); return; }
    var t = new Date(c.a, c.mo - 1, c.j, 0, 0, 0, 0);
    t.setFullYear(c.a);
    var e = HE.ecart(Date.now(), t.getTime());
    if (c.jour) { e = { j: 0, h: 0, mi: 0, s: 0, passe: false }; }
    HX.ecrire('rJ', String(e.j));
    HX.ecrire('rH', String(e.h));
    HX.ecrire('rM', String(e.mi));
    HX.ecrire('rS', String(e.s));
    HX.ecrire('lJ', e.j > 1 ? 'jours' : 'jour');
    var cle = c.a + '-' + c.mo + '-' + c.j + (e.passe ? 'p' : '') + (c.jour ? 'j' : '') + (c.nouvelAn ? 'n' : '');
    if (cle !== dernier) { dernier = cle; phrase(c, e); }
  }

  function phrase(c, e) {
    var semaines = Math.floor(e.j / 7), reste = e.j % 7, msg;
    if (c.jour) {
      msg = mode === 'noel' ? 'C\'est Noël aujourd\'hui ! Joyeux Noël. Le compte à rebours repartira demain pour l\'an prochain.' : 'C\'est aujourd\'hui : ' + c.nom + '.';
    } else if (e.passe) {
      msg = c.nom.charAt(0).toUpperCase() + c.nom.slice(1) + ' est passé depuis ' + e.j + (e.j > 1 ? ' jours' : ' jour') + '.';
    } else {
      msg = (c.nouvelAn ? 'Bonne année ! ' : '') + 'Il reste ' + e.j + (e.j > 1 ? ' jours' : ' jour') + (e.j >= 7 ? ' (' + semaines + (semaines > 1 ? ' semaines' : ' semaine') +
        (reste ? ' et ' + reste + (reste > 1 ? ' jours' : ' jour') : '') + ')' : '') + ' avant ' + c.nom +
        ', à minuit (heure de votre appareil).';
      if (mode === 'noel' || mode === 'nouvel-an') {
        var js = new Date(Date.UTC(c.a, c.mo - 1, c.j)).getUTCDay();
        msg += ' ' + (mode === 'noel' ? 'Noël ' + c.a : 'Le 1er janvier ' + c.a) + ' tombe un ' + HX.JOURS[js] + '.';
      }
    }
    CQ.texte('phrase', msg);
  }

  // Raccourcis de la page « date au choix » : seulement des dates, jamais de texte libre.
  Array.prototype.forEach.call(document.querySelectorAll('[data-raccourci]'), function (b) {
    b.addEventListener('click', function () {
      var n = maintenant(), r = b.getAttribute('data-raccourci'), d;
      if (r === 'noel') { d = { a: HE.prochaineAnnuelle(n.a, n.mo, n.j, 12, 25).annee, mo: 12, j: 25 }; } else { d = { a: n.a + 1, mo: 1, j: 1 }; }
      var champ = CQ.el('d');
      champ.value = HX.iso(d);
      HX.signaler(champ);
      tic();
    });
  });

  // Nouvel An dans le monde : minuit du 1er janvier dans chaque ville, à l'heure de l'appareil.
  function mondeNouvelAn() {
    var corps = CQ.el('nouvelAnMonde');
    if (!corps) { return; }
    var n = maintenant(), a = n.a + 1, zi = HX.zoneAppareil(), now = Date.now();
    HX.ecrire('anMonde', String(a));
    var lignes = [];
    String(corps.getAttribute('data-villes') || '').split(',').forEach(function (id) {
      var v = HX.ville(id);
      if (!v) { return; }
      var t = HE.versInstant(v.zone, a, 1, 1, 0, 0).ms, p = HE.parties(zi, t);
      lignes.push({ ms: t, cellules: [v.nom + ' (' + v.pays + ')', HX.dateCourte(p) + ' à ' + HX.heureTexte(p), t <= now ? 'déjà en ' + a : t - now > 2 * HE.JOUR ? 'dans ' + Math.ceil((t - now) / HE.JOUR) + ' jours' : 'dans ' + HE.texteDuree(Math.ceil((t - now) / 60000))] });
    });
    lignes.sort(function (x, y) { return x.ms - y.ms; });
    CQ.lignes('nouvelAnMonde', lignes);
  }

  if (mode === 'date') { CQ.surChangement(['d'], function () { dernier = ''; tic(); }); }
  function demarrer() {
    mondeNouvelAn();
    HX.chaqueSeconde(tic);
    if (CQ.el('nouvelAnMonde')) { setInterval(mondeNouvelAn, 60000); }
  }
  // Sans champ à partager (Noël, Nouvel An), initPartage ne rappelle pas : on démarre directement.
  if (document.querySelector('[data-p]')) { CQ.initPartage(demarrer); } else { demarrer(); }
}());
