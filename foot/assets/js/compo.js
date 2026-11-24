/* Créateur de composition d'équipe : dessin sur un canvas, image PNG téléchargeable. Rien n'est envoyé. */
(function () {
  'use strict';
  var O = window.OCP;
  var tr = O.tr;
  var CLE = 'outilsfoot.compo';
  // Lignes de joueurs de champ, de la défense vers l'attaque (le gardien est ajouté à part).
  var SCHEMAS = {
    '11': ['4-4-2', '4-3-3', '4-2-3-1', '4-1-2-1-2', '3-5-2', '3-4-3', '5-3-2', '5-4-1', '4-5-1'],
    '8': ['3-3-1', '3-2-2', '2-3-2', '2-4-1', '3-1-3'],
    '7': ['3-2-1', '2-3-1', '3-1-2', '2-2-2'],
    '5': ['2-2', '1-2-1', '2-1-1', '1-1-2']
  };
  var COULEURS = { vert: ['#1f8a4c', '#23994f'], bleu: ['#1d4f91', '#215aa3'], gris: ['#3b4252', '#434c5e'] };
  var format = document.getElementById('format');
  var schema = document.getElementById('schema');
  var titre = document.getElementById('titre');
  var maillot = document.getElementById('maillot');
  var pelouse = document.getElementById('pelouse');
  var zoneNoms = document.getElementById('noms');
  var canvas = document.getElementById('terrain');
  var ctx = canvas.getContext('2d');
  var etat = { noms: [] };
  try { etat = JSON.parse(O.lire(CLE) || '{}') || {}; } catch (e) { etat = {}; }
  if (!Array.isArray(etat.noms)) { etat.noms = []; }
  if (etat.format && SCHEMAS[etat.format]) { format.value = etat.format; }
  if (typeof etat.titre === 'string') { titre.value = etat.titre.slice(0, 50); }
  if (typeof etat.maillot === 'string' && /^#[0-9a-f]{6}$/i.test(etat.maillot)) { maillot.value = etat.maillot; }

  function remplirSchemas() {
    schema.textContent = '';
    SCHEMAS[format.value].forEach(function (s) {
      var o = document.createElement('option'); o.value = s; o.textContent = s; schema.appendChild(o);
    });
    if (etat.schema && SCHEMAS[format.value].indexOf(etat.schema) >= 0) { schema.value = etat.schema; }
  }

  function positions() {
    var lignes = schema.value.split('-').map(Number);
    var pts = [{ x: 0.5, y: 0.92, poste: 'G' }];
    var n = lignes.length;
    lignes.forEach(function (nb, i) {
      var y = 0.78 - (i * (0.62 / Math.max(1, n - 1)));
      if (n === 1) { y = 0.5; }
      for (var k = 0; k < nb; k++) { pts.push({ x: (k + 1) / (nb + 1), y: y }); }
    });
    return pts;
  }

  function champsNoms(nb) {
    var anciens = Array.prototype.map.call(zoneNoms.querySelectorAll('input'), function (i) { return i.value; });
    if (anciens.length) { etat.noms = anciens; }
    zoneNoms.textContent = '';
    for (var i = 0; i < nb; i++) {
      var div = document.createElement('div');
      var lab = document.createElement('label');
      lab.setAttribute('for', 'nom' + i);
      lab.textContent = i === 0 ? tr('Gardien', 'Goalkeeper') : tr('Joueur ', 'Player ') + (i + 1);
      var inp = document.createElement('input');
      inp.type = 'text'; inp.id = 'nom' + i; inp.maxLength = 22; inp.autocomplete = 'off';
      inp.value = etat.noms[i] || '';
      inp.addEventListener('input', dessiner);
      div.appendChild(lab); div.appendChild(inp);
      zoneNoms.appendChild(div);
    }
  }

  function dessiner() {
    var W = canvas.width, H = canvas.height;
    var c = COULEURS[pelouse.value] || COULEURS.vert;
    for (var b = 0; b < 10; b++) { ctx.fillStyle = c[b % 2]; ctx.fillRect(0, b * H / 10, W, H / 10); }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4;
    var m = 30;
    ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
    ctx.beginPath(); ctx.moveTo(m, H / 2); ctx.lineTo(W - m, H / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, W * 0.13, 0, Math.PI * 2); ctx.stroke();
    var sl = W * 0.56, sh = H * 0.14;
    ctx.strokeRect((W - sl) / 2, m, sl, sh); ctx.strokeRect((W - sl) / 2, H - m - sh, sl, sh);
    ctx.strokeRect((W - sl * 0.45) / 2, m, sl * 0.45, sh * 0.4); ctx.strokeRect((W - sl * 0.45) / 2, H - m - sh * 0.4, sl * 0.45, sh * 0.4);
    var noms = Array.prototype.map.call(zoneNoms.querySelectorAll('input'), function (i) { return i.value.trim(); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    positions().forEach(function (p, i) {
      var x = m + p.x * (W - 2 * m), y = m + p.y * (H - 2 * m);
      ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#f5b300' : maillot.value; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.fillStyle = i === 0 ? '#111' : '#fff'; ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText(String(i + 1), x, y + 1);
      var nom = noms[i] || '';
      if (nom) {
        ctx.font = 'bold 22px system-ui, sans-serif';
        var w = ctx.measureText(nom).width + 16;
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, y + 36, w, 30);
        ctx.fillStyle = '#fff'; ctx.fillText(nom, x, y + 52);
      }
    });
    var t = titre.value.trim();
    ctx.font = 'bold 28px system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText((t ? t + ' · ' : '') + schema.value, m + 10, 16 + m);
    ctx.textAlign = 'right'; ctx.font = '18px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.fillText('maxicards.net/foot', W - m - 10, H - m - 14);
    O.ecrire(CLE, JSON.stringify({ format: format.value, schema: schema.value, titre: t, maillot: maillot.value, noms: noms }));
  }

  format.addEventListener('change', function () { remplirSchemas(); champsNoms(Number(format.value)); dessiner(); });
  [schema, titre, maillot, pelouse].forEach(function (e) { e.addEventListener('input', dessiner); e.addEventListener('change', dessiner); });
  document.getElementById('telecharger').addEventListener('click', function () {
    canvas.toBlob(function (blob) {
      if (!blob) { O.texte('message', tr('Téléchargement impossible sur ce navigateur : faites une capture d\'écran.', 'Download is not possible in this browser: take a screenshot instead.')); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = tr('composition-', 'lineup-') + schema.value + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }, 'image/png');
  });
  document.getElementById('vider').addEventListener('click', function () {
    Array.prototype.forEach.call(zoneNoms.querySelectorAll('input'), function (i) { i.value = ''; });
    dessiner();
  });
  remplirSchemas();
  champsNoms(Number(format.value));
  dessiner();
}());
