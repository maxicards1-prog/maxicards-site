/* Générateur de surnoms Pokémon. Listes de mots écrites pour le site ; tout reste dans le navigateur. */
(function () {
  'use strict';
  if (!document.getElementById('genererSurnoms')) { return; }
  var P = window.POKEDEX || [];
  var MOTS = {
    mignon: ['Choupi', 'Doudou', 'Caramel', 'Noisette', 'Pistache', 'Praline', 'Guimauve', 'Pompon', 'Myrtille',
      'Biscotte', 'Moumoute', 'Cookie', 'Nougat', 'Câlin', 'Bisou', 'Plume', 'Coton', 'Mimosa', 'Frimousse',
      'Pépite', 'Fripouille', 'Loustic', 'Bambou', 'Cannelle', 'Macaron', 'Truffe', 'Grenadine', 'Clémentine'],
    drole: ['Tartiflette', 'Croquette', 'Raclette', 'Patate', 'Brioche', 'Cornichon', 'Saucisson', 'Camembert',
      'Baguette', 'Pâté', 'Flan', 'Gratin', 'Bigoudi', 'Chaussette', 'Moustache', 'Pantoufle', 'Gaufrette',
      'Ravioli', 'Nugget', 'Tonton', 'Mamie', 'Papy', 'Kevin', 'Gérard', 'Jean-Mi', 'Ginette', 'Dédé', 'Bernard'],
    epique: ['Titan', 'Orage', 'Fléau', 'Zénith', 'Nova', 'Éclipse', 'Typhon', 'Tempête', 'Brasier', 'Comète',
      'Colosse', 'Rafale', 'Météore', 'Tonnerre', 'Fureur', 'Spartan', 'Vortex', 'Néant', 'Augure', 'Apex',
      'Bastion', 'Dragon', 'Kraken', 'Phénix', 'Valkyrie', 'Mirage', 'Sentinelle', 'Chimère'],
    classique: ['Max', 'Rex', 'Léo', 'Milo', 'Luna', 'Nala', 'Oscar', 'Rio', 'Kiwi', 'Sky', 'Jade', 'Ruby',
      'Saphir', 'Onyx', 'Opale', 'Ambre', 'Zelda', 'Tom', 'Lola', 'Hugo', 'Nina', 'Félix', 'Iris', 'Lou', 'Sam',
      'Elio', 'Mia', 'Noé']
  };
  // un petit lexique par type (index des types de types.js)
  var PAR_TYPE = [
    ['Banal', 'Pépère', 'Simplet'], ['Uppercut', 'Judoka', 'Boxeur', 'Kimono'], ['Zéphyr', 'Plumeau', 'Nuage', 'Alizé'],
    ['Venin', 'Toxique', 'Fiole', 'Ciguë'], ['Argile', 'Dune', 'Sablé', 'Terreau'], ['Galet', 'Silex', 'Caillou', 'Granit'],
    ['Scarabée', 'Bzzz', 'Cocon', 'Grillon'], ['Fantôme', 'Boo', 'Ombre', 'Brume'], ['Boulon', 'Chrome', 'Titane', 'Rivet'],
    ['Braise', 'Cendre', 'Flamme', 'Ignis', 'Piment'], ['Vague', 'Ondine', 'Abysse', 'Marin', 'Bulle'],
    ['Sève', 'Fougère', 'Mousse', 'Basilic', 'Trèfle'], ['Volt', 'Watt', 'Zap', 'Éclair', 'Pile'],
    ['Oracle', 'Mystik', 'Rêveur', 'Hypno'], ['Givre', 'Frimas', 'Glaçon', 'Sorbet', 'Flocon'],
    ['Drakon', 'Écaille', 'Wyverne', 'Griffe'], ['Minuit', 'Corbeau', 'Malice', 'Nocturne'],
    ['Paillette', 'Féerie', 'Fée', 'Lutin', 'Étoile']
  ];
  var SUFFIXES = { mignon: ['ou', 'ette', 'inou', 'ichou', 'y'], drole: ['ito', 'ounet', 'asse', 'man'],
    epique: ['or', 'ax', 'ion', 'ar'], classique: ['o', 'a', 'i', 'us'] };
  // Version anglaise (24/11/2026) : listes écrites pour le site, même structure
  var EN = document.documentElement.lang === 'en';
  if (EN) {
    MOTS = {
      mignon: ['Peanut', 'Muffin', 'Cupcake', 'Biscuit', 'Pudding', 'Marshmallow', 'Cookie', 'Pebble', 'Button',
        'Snuggles', 'Bubbles', 'Sprinkles', 'Honey', 'Maple', 'Waffles', 'Noodle', 'Pickle', 'Mochi', 'Cuddles',
        'Fluffy', 'Pumpkin', 'Sugar', 'Bean', 'Twinkle', 'Dumpling', 'Jellybean', 'Nugget', 'Sweetpea'],
      drole: ['Sir Chomps', 'Meatball', 'Taco', 'Burrito', 'Potato', 'Spud', 'Nacho', 'Pancake', 'Meatloaf',
        'Gary', 'Kevin', 'Steve', 'Doug', 'Barry', 'Nigel', 'Uncle Bob', 'Grandpa', 'Captain Oops', 'Lasagna',
        'Sock', 'Toaster', 'Wiggles', 'Hiccup', 'Dorito', 'Sushi', 'Chowder', 'Pretzel', 'Brownie'],
      epique: ['Titan', 'Storm', 'Havoc', 'Zenith', 'Nova', 'Eclipse', 'Typhoon', 'Tempest', 'Inferno', 'Comet',
        'Colossus', 'Gale', 'Meteor', 'Thunder', 'Fury', 'Spartan', 'Vortex', 'Oblivion', 'Omen', 'Apex',
        'Bastion', 'Warlord', 'Kraken', 'Phoenix', 'Valkyrie', 'Mirage', 'Sentinel', 'Chimera'],
      classique: ['Max', 'Rex', 'Leo', 'Milo', 'Luna', 'Nala', 'Oscar', 'Rio', 'Kiwi', 'Sky', 'Jade', 'Ruby',
        'Sapphire', 'Onyx', 'Opal', 'Amber', 'Zelda', 'Tom', 'Lola', 'Hugo', 'Nina', 'Felix', 'Iris', 'Lou', 'Sam',
        'Ellie', 'Mia', 'Noah']
    };
    PAR_TYPE = [
      ['Plain', 'Buddy', 'Average'], ['Uppercut', 'Judo', 'Boxer', 'Brawler'], ['Zephyr', 'Feather', 'Cloud', 'Breeze'],
      ['Venom', 'Toxic', 'Vial', 'Hemlock'], ['Clay', 'Dune', 'Sandy', 'Mudpie'], ['Pebble', 'Flint', 'Rocky', 'Granite'],
      ['Beetle', 'Bzzz', 'Cocoon', 'Cricket'], ['Ghostie', 'Boo', 'Shadow', 'Mist'], ['Bolt', 'Chrome', 'Titanium', 'Rivet'],
      ['Ember', 'Ash', 'Blaze', 'Ignis', 'Chili'], ['Wave', 'Splash', 'Abyss', 'Marina', 'Bubble'],
      ['Sprout', 'Fern', 'Moss', 'Basil', 'Clover'], ['Volt', 'Watt', 'Zap', 'Sparky', 'Static'],
      ['Oracle', 'Mystic', 'Dreamer', 'Hypno'], ['Frost', 'Blizzard', 'Icicle', 'Sorbet', 'Flurry'],
      ['Drako', 'Scales', 'Wyvern', 'Talon'], ['Midnight', 'Raven', 'Mischief', 'Nocturne'],
      ['Glitter', 'Pixie', 'Fairy', 'Sparkle', 'Starlight']
    ];
    SUFFIXES = { mignon: ['y', 'ie', 'kins', 'boo', 'ums'], drole: ['zilla', 'inator', 'meister', 'man'],
      epique: ['or', 'ax', 'ion', 'ar'], classique: ['o', 'a', 'i', 'us'] };
  }

  function hasard(n) {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function normaliser(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  }
  var index = {};
  P.forEach(function (p) { index[normaliser(p[1])] = p; });
  var dl = document.getElementById('listePokemonSurnom');
  if (dl) { P.forEach(function (p) { var o = document.createElement('option'); o.value = p[1]; dl.appendChild(o); }); }

  function racine(nom) {
    var n = nom.replace(/[^A-Za-zÀ-ÿ]/g, '');
    var m = n.match(/^[^aeiouyàâäéèêëîïôöûüAEIOUYÉÈ]*[aeiouyàâäéèêëîïôöûüAEIOUYÉÈ]+[^aeiouyàâäéèêëîïôöûüAEIOUYÉÈ]?/);
    return m ? m[0] : n.slice(0, 3);
  }
  function majuscule(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function generer() {
    var style = document.getElementById('styleSurnom').value;
    var max = Number(document.getElementById('longueurMax').value) || 12;
    var p = index[normaliser(document.getElementById('especeSurnom').value)];
    var candidats = MOTS[style].slice();
    if (p) {
      PAR_TYPE[p[3]].forEach(function (m) { candidats.push(m); });
      if (p[4] >= 0) { PAR_TYPE[p[4]].forEach(function (m) { candidats.push(m); }); }
      var r = racine(p[1]);
      SUFFIXES[style].forEach(function (s) { candidats.push(majuscule((r + s).toLowerCase())); });
      if (EN) {
        if (style === 'mignon') { candidats.push('Lil ' + majuscule(r.toLowerCase()), 'Mini' + r.toLowerCase()); }
        if (style === 'epique') { candidats.push(majuscule(r.toLowerCase()) + ' I', 'Mega' + r.toLowerCase()); }
        if (style === 'drole') { candidats.push('Mr. ' + majuscule(r.toLowerCase()), majuscule(r.toLowerCase()) + 'zilla'); }
      } else {
      if (style === 'mignon') { candidats.push('Mini' + r.toLowerCase(), "P'tit " + r); }
      if (style === 'epique') { candidats.push(majuscule(r.toLowerCase()) + ' Ier', 'Méga' + r.toLowerCase()); }
      if (style === 'drole') { candidats.push(majuscule(r.toLowerCase()) + 'ounet', 'Monsieur ' + r); }
      }
    }
    var vus = {}, sortie = [];
    candidats = candidats.filter(function (c) {
      var k = c.toLowerCase();
      if (vus[k] || c.length > max || c.length < 2) { return false; }
      vus[k] = true; return true;
    });
    while (sortie.length < 12 && candidats.length) { sortie.push(candidats.splice(hasard(candidats.length), 1)[0]); }
    var zone = document.getElementById('surnoms');
    while (zone.firstChild) { zone.removeChild(zone.firstChild); }
    sortie.forEach(function (s) {
      var li = document.createElement('li');
      li.className = 'surnom apparait';
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = s;
      b.title = EN ? 'Copy "' + s + '"' : 'Copier « ' + s + ' »';
      b.addEventListener('click', function () {
        var ok = function () { document.getElementById('messageSurnom').textContent = EN ? '"' + s + '" copied (' + s.length + ' characters).' : '« ' + s + ' » copié (' + s.length + ' caractères).'; };
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s).then(ok, ok); } else { ok(); }
      });
      var l = document.createElement('span');
      l.className = 'aide';
      l.textContent = s.length + (EN ? ' chars' : ' car.');
      li.appendChild(b); li.appendChild(l);
      zone.appendChild(li);
    });
    document.getElementById('messageSurnom').textContent = EN
      ? (p ? 'Ideas for ' + p[1] + ' (types included). Click a nickname to copy it.'
        : 'Tip: type a species to get ideas based on its name and types. Click to copy.')
      : p
      ? 'Idées pour ' + p[1] + ' (types pris en compte). Cliquez sur un surnom pour le copier.'
      : 'Astuce : écrivez une espèce pour des idées liées à son nom et à ses types. Cliquez pour copier.';
  }
  document.getElementById('genererSurnoms').addEventListener('click', generer);
  generer();
})();
