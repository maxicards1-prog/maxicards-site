/* MAXICARDS V2 — animations natives (IntersectionObserver + requestAnimationFrame).
   Aucun cookie, aucun stockage, aucun appel réseau. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, w = window;
  var mm = w.matchMedia ? function (q) { return w.matchMedia(q).matches; } : function () { return false; };
  var anim = !mm('(prefers-reduced-motion: reduce)') && ('IntersectionObserver' in w) && ('requestAnimationFrame' in w);
  if (anim) root.classList.add('anim');
  var fin = mm('(hover: hover) and (pointer: fine)');

  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }

  function decoupe() {
    $$('.lettres').forEach(function (el) {
      var t = el.textContent, frag = d.createDocumentFragment();
      for (var i = 0; i < t.length; i++) {
        var s = d.createElement('span');
        s.className = 'c';
        s.style.setProperty('--i', String(i));
        s.textContent = t.charAt(i);
        frag.appendChild(s);
      }
      el.textContent = '';
      el.appendChild(frag);
      el.setAttribute('aria-hidden', 'true');
    });
  }

  function compte(el) {
    var cible = parseInt(el.getAttribute('data-count'), 10), t0 = 0, duree = 1500;
    function pas(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / duree, 1);
      el.textContent = String(Math.round(cible * (1 - Math.pow(1 - p, 3))));
      if (p < 1) w.requestAnimationFrame(pas);
    }
    w.requestAnimationFrame(pas);
  }

  function apparitions() {
    $$('.chaines, .shopify').forEach(function (g) {
      $$('[data-r]', g).forEach(function (el, i) { el.style.setProperty('--d', (i % 4) * 0.07 + 's'); });
    });
    var compteurs = $$('[data-count]');
    compteurs.forEach(function (el) { el.textContent = '0'; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('vu');
        var c = el.querySelector('[data-count]');
        if (c) compte(c);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    $$('[data-r]').forEach(function (el) { io.observe(el); });
  }

  function defilement() {
    var barre = d.querySelector('.progres'), heroIn = d.querySelector('.hero-in');
    var pars = $$('[data-par]'), attente = false;
    function maj() {
      attente = false;
      var y = w.pageYOffset || root.scrollTop, h = w.innerHeight, max = root.scrollHeight - h;
      if (barre) barre.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0).toFixed(4) + ')';
      if (heroIn && y < h * 1.3) {
        heroIn.style.transform = 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0)';
        heroIn.style.opacity = String(Math.max(1 - y / (h * 0.85), 0).toFixed(3));
      }
      for (var i = 0; i < pars.length; i++) {
        var el = pars[i], r = el.parentNode.getBoundingClientRect();
        if (r.bottom < -300 || r.top > h + 300) continue;
        var f = parseFloat(el.getAttribute('data-par')) || 0;
        var c = r.top + r.height / 2 - h / 2;
        el.style.transform = 'translate3d(0,' + (c * f).toFixed(1) + 'px,0)';
      }
    }
    function demande() { if (!attente) { attente = true; w.requestAnimationFrame(maj); } }
    w.addEventListener('scroll', demande, { passive: true });
    w.addEventListener('resize', demande, { passive: true });
    maj();
  }

  function souris() {
    var hero = d.querySelector('.hero');
    if (hero) hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--hx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      hero.style.setProperty('--hy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
    $$('.carte').forEach(function (el) {
      var penche = el.classList.contains('ch') || el.classList.contains('app');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--mx', x.toFixed(0) + 'px');
        el.style.setProperty('--my', y.toFixed(0) + 'px');
        if (penche) {
          var rx = ((y / r.height) - 0.5) * -7, ry = ((x / r.width) - 0.5) * 7;
          el.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
        }
      });
      if (penche) el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    $$('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.18, y = (e.clientY - r.top - r.height / 2) * 0.28;
        b.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  function demarre() {
    if (!anim) return;
    decoupe();
    apparitions();
    defilement();
    if (fin) souris();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', demarre); else demarre();
})();
