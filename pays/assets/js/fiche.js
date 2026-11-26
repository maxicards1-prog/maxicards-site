/* Fiche pays : heure en direct dans la capitale (fuseau de la base IANA lue par le navigateur) et écart avec Paris. */
(function () {
  'use strict';
  var el = document.getElementById('heurePays');
  var info = document.getElementById('infoPays');
  if (!el || !window.Intl) { return; }
  var fuseau = el.getAttribute('data-fuseau');
  var fmt, fmtJour, parties;
  try {
    fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    fmtJour = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, weekday: 'long', day: 'numeric', month: 'long' });
    parties = function (tz, d) {
      var o = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        .formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
      return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute);
    };
  } catch (e) { return; }
  function duree(m) {
    var a = Math.abs(m), h = Math.floor(a / 60), r = a % 60;
    return h ? h + ' h' + (r ? ' ' + (r < 10 ? '0' : '') + r : '') : r + ' min';
  }
  function maj() {
    var d = new Date();
    el.textContent = fmt.format(d);
    if (info) {
      var ecart = Math.round((parties(fuseau, d) - parties('Europe/Paris', d)) / 60000);
      info.textContent = fmtJour.format(d) + ' · ' + (ecart === 0 ? 'même heure qu\'à Paris' : duree(ecart) + (ecart > 0 ? ' de plus' : ' de moins') + ' qu\'à Paris');
    }
  }
  maj();
  setInterval(maj, 1000);
}());
