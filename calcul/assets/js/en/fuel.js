/* Fuel consumption: mpg (US), mpg (UK) and L/100 km, from a fill-up or by conversion, plus trip cost (no currency symbol). */
(function () {
  'use strict';
  var CQ = window.CQ;
  var KM_PER_MILE = 1.609344, L_PER_USGAL = 3.785411784, L_PER_UKGAL = 4.54609;
  // Everything goes through litres per 100 km.
  function fromMpgUs(v) { return 100 * L_PER_USGAL / (KM_PER_MILE * v); }
  function fromMpgUk(v) { return 100 * L_PER_UKGAL / (KM_PER_MILE * v); }
  function toMpgUs(l100) { return 100 * L_PER_USGAL / (KM_PER_MILE * l100); }
  function toMpgUk(l100) { return 100 * L_PER_UKGAL / (KM_PER_MILE * l100); }

  function show(prefix, l100) {
    if (isFinite(l100) && l100 > 0) {
      CQ.texte(prefix + '1', CQ.decimal(toMpgUs(l100), 1) + ' mpg');
      CQ.texte(prefix + '2', CQ.decimal(toMpgUk(l100), 1) + ' mpg');
      CQ.texte(prefix + '3', CQ.decimal(l100, 2) + ' L/100 km');
      CQ.texte(prefix + '4', CQ.decimal(100 / l100, 2) + ' km/L');
    } else {
      [1, 2, 3, 4].forEach(function (i) { CQ.texte(prefix + i, '–'); });
    }
  }
  function fillUp() {
    var dist = CQ.nombre('fd', 0, 1e6), fuel = CQ.nombre('ff', 0, 1e5);
    var km = dist * (CQ.valeur('fdu') === 'km' ? 1 : KM_PER_MILE);
    var u = CQ.valeur('ffu');
    var litres = fuel * (u === 'l' ? 1 : u === 'uk' ? L_PER_UKGAL : L_PER_USGAL);
    var l100 = isFinite(km) && isFinite(litres) && km > 0 ? litres / km * 100 : NaN;
    show('f', l100);
    CQ.texte('fNote', isFinite(l100) && l100 > 0 ? CQ.souple(km, 1) + ' km on ' + CQ.souple(litres, 2) + ' L: ' + CQ.souple(litres, 2) + ' ÷ ' + CQ.souple(km, 1) + ' × 100 = ' + CQ.souple(l100, 2) + ' L/100 km.' : 'Enter the distance driven and the fuel added.');
  }
  function economyL100() {
    var v = CQ.nombre('ev', 0, 1e4), u = CQ.valeur('eu');
    if (!isFinite(v) || v <= 0) { return NaN; }
    return u === 'l100' ? v : u === 'uk' ? fromMpgUk(v) : fromMpgUs(v);
  }
  function convert() {
    var l100 = economyL100();
    show('c', l100);
    CQ.texte('cNote', isFinite(l100) ? 'L/100 km = 235.215 ÷ mpg (US) = 282.481 ÷ mpg (UK).' : 'Enter a fuel economy figure above zero.');
  }
  function trip() {
    var l100 = economyL100();
    var dist = CQ.nombre('td', 0, 1e6), price = CQ.nombre('tp', 0, 1e4), people = CQ.nombre('tn', 1, 20);
    if (!isFinite(people)) { people = 1; }
    people = Math.floor(people);
    var legs = CQ.coche('tr') ? 2 : 1;
    var ids = ['tGal', 'tL', 'tCost', 'tPer', 'tMi', 'tKm'];
    if (!isFinite(l100) || !isFinite(dist) || !isFinite(price)) {
      ids.forEach(function (i) { CQ.texte(i, '–'); });
      CQ.texte('tNote', 'Enter the fuel economy above, a distance and a fuel price.'); return;
    }
    var km = dist * (CQ.valeur('tdu') === 'km' ? 1 : KM_PER_MILE) * legs;
    var litres = km * l100 / 100;
    var pu = CQ.valeur('tpu');
    var perLitre = price / (pu === 'l' ? 1 : pu === 'uk' ? L_PER_UKGAL : L_PER_USGAL);
    var cost = litres * perLitre;
    CQ.texte('tGal', CQ.decimal(litres / L_PER_USGAL, 2) + ' gal');
    CQ.texte('tL', CQ.decimal(litres, 2) + ' L');
    CQ.texte('tCost', CQ.decimal(cost, 2));
    CQ.texte('tPer', CQ.decimal(cost / people, 2));
    CQ.texte('tMi', km > 0 ? CQ.decimal(cost / (km / KM_PER_MILE), 3) : '–');
    CQ.texte('tKm', km > 0 ? CQ.decimal(cost / km, 3) : '–');
    CQ.texte('tNote', CQ.souple(km, 1) + ' km × ' + CQ.souple(l100, 2) + ' L/100 km ÷ 100 = ' + CQ.souple(litres, 2) + ' L; × ' + CQ.souple(perLitre, 4) + ' per liter = ' + CQ.decimal(cost, 2) + '.');
  }
  CQ.surChangement(['fd', 'fdu', 'ff', 'ffu'], fillUp);
  CQ.surChangement(['ev', 'eu'], function () { convert(); trip(); });
  CQ.surChangement(['td', 'tdu', 'tp', 'tpu', 'tn', 'tr'], trip);
  CQ.initPartage(function () { fillUp(); convert(); trip(); });
}());
