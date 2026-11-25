/* Demo products drawn in code (no external images), used by the local demo and the phone demo page.
 * The page may set window.DEMO_OPTS (merged into WallViewer.open options) before loading this file. */
(function () {
  function poster() { // mid-century sunset poster, 2:3
    var c = document.createElement("canvas"); c.width = 1000; c.height = 1500;
    var g = c.getContext("2d");
    g.fillStyle = "#f3e9d8"; g.fillRect(0, 0, 1000, 1500);
    var sky = g.createLinearGradient(0, 0, 0, 1000); sky.addColorStop(0, "#f7c59f"); sky.addColorStop(1, "#ef8354");
    g.fillStyle = sky; g.fillRect(80, 80, 840, 1000);
    g.fillStyle = "#fff3d6"; g.beginPath(); g.arc(500, 640, 210, 0, Math.PI * 2); g.fill();
    [["#4f5d75", 760, 0.9], ["#2d3142", 860, 1.3]].forEach(function (l) {
      g.fillStyle = l[0]; g.beginPath(); g.moveTo(80, 1080);
      for (var x = 80; x <= 920; x += 20) g.lineTo(x, l[1] - Math.abs(Math.sin(x / 140 * l[2])) * 170);
      g.lineTo(920, 1080); g.closePath(); g.fill();
    });
    g.fillStyle = "#2d3142"; g.font = "bold 92px Georgia, serif"; g.textAlign = "center"; g.fillText("CÔTE SAUVAGE", 500, 1250);
    g.font = "40px Georgia, serif"; g.fillText("Bretagne · 1962", 500, 1330);
    return c;
  }
  function abstract() { // canvas print, 4:3
    var c = document.createElement("canvas"); c.width = 1600; c.height = 1200;
    var g = c.getContext("2d");
    g.fillStyle = "#e9e4da"; g.fillRect(0, 0, 1600, 1200);
    var cols = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"];
    for (var i = 0; i < 26; i++) {
      g.globalAlpha = 0.85; g.fillStyle = cols[i % 5];
      g.beginPath(); g.ellipse(200 + (i * 397) % 1300, 150 + (i * 211) % 900, 60 + (i * 37) % 220, 40 + (i * 53) % 160, i, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1; return c;
  }
  function neon() { // neon sign on transparent background, 2:1
    var c = document.createElement("canvas"); c.width = 1400; c.height = 700;
    var g = c.getContext("2d");
    g.lineCap = "round"; g.lineJoin = "round";
    g.font = "italic 230px 'Brush Script MT', 'Segoe Script', cursive"; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "#ff4fd8"; g.shadowBlur = 40; g.strokeStyle = "#ff8be6"; g.lineWidth = 14; g.strokeText("Good vibes", 700, 330);
    g.shadowBlur = 10; g.strokeStyle = "#fff0fb"; g.lineWidth = 5; g.strokeText("Good vibes", 700, 330);
    return c;
  }
  var products = [
    { title: "Affiche « Côte sauvage »", kind: "Affiche", price: "dès 19 €", art: poster(), mode: "print",
      sizes: [["A4", 21, 29.7], ["30 × 40 cm", 30, 40], ["50 × 70 cm", 50, 70], ["70 × 100 cm", 70, 100]] },
    { title: "Toile « Formes »", kind: "Toile sur châssis", price: "dès 79 €", art: abstract(), mode: "canvas",
      sizes: [["60 × 45 cm", 60, 45], ["80 × 60 cm", 80, 60], ["120 × 90 cm", 120, 90]] },
    { title: "Néon « Good vibes »", kind: "Néon LED", price: "dès 149 €", art: neon(), mode: "neon",
      sizes: [["60 × 30 cm", 60, 30], ["100 × 50 cm", 100, 50]] }
  ];
  var extra = window.DEMO_OPTS || {};
  var grid = document.getElementById("grid");
  products.forEach(function (p, i) {
    var card = document.createElement("article"); card.className = "card";
    var thumb = document.createElement("canvas"); thumb.width = 600; thumb.height = 600; thumb.className = "thumb";
    var tg = thumb.getContext("2d"); tg.fillStyle = p.mode === "neon" ? "#1d1b2b" : "#ecebe7"; tg.fillRect(0, 0, 600, 600);
    var k = Math.min(470 / p.art.width, 470 / p.art.height);
    if (p.mode !== "neon") { tg.shadowColor = "rgba(0,0,0,.22)"; tg.shadowBlur = 24; tg.shadowOffsetY = 10; }
    tg.drawImage(p.art, 300 - p.art.width * k / 2, 300 - p.art.height * k / 2, p.art.width * k, p.art.height * k);
    var kind = document.createElement("div"); kind.className = "kind"; kind.textContent = p.kind;
    var h = document.createElement("h3"); h.textContent = p.title;
    var price = document.createElement("div"); price.className = "price"; price.textContent = p.price;
    var b = document.createElement("button"); b.type = "button"; b.className = "try"; b.textContent = "Voir sur mon mur";
    b.onclick = function () {
      var opts = {
        artworkUrl: p.art, title: p.title, mode: p.mode, lang: "fr", accent: "#111111", addToCart: false,
        frames: p.mode === "print" ? ["none", "black", "white", "oak"] : ["none"], defaultFrame: "black", mat: p.mode === "print",
        sizes: p.sizes.map(function (s, j) { return { label: s[0], wCm: s[1], hCm: s[2], variantId: 1000 + i * 10 + j }; })
      };
      for (var key in extra) opts[key] = extra[key];
      WallViewer.open(opts);
    };
    card.appendChild(thumb); card.appendChild(kind); card.appendChild(h); card.appendChild(price); card.appendChild(b);
    grid.appendChild(card);
  });
})();
