// Scroll-reveal: elements fade and rise as they enter the viewport.
(function () {
  var sel = '.pill, #ritual .hero > div:first-child, #ritual .hero > div:last-child > div, #bea > div, #join .join-h, #join .join-form, #foot';
  var els = document.querySelectorAll(sel);
  if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach(function (el) {
    var i = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.setProperty('--d', Math.min(i * 90, 360) + 'ms');
    el.classList.add('reveal');
    io.observe(el);
  });
})();

// Scroll-pinned "essentials": the section sticks to the screen and scroll progress picks the active slide.
(function () {
  var pin = document.querySelector('[data-pin]');
  if (!pin || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var slides = pin.querySelectorAll('.slide'), btns = pin.querySelectorAll('.pin-btn');
  var hex = pin.querySelector('[data-hex]'), label = pin.querySelector('[data-label]');
  var count = pin.querySelector('[data-count]'), bar = pin.querySelector('[data-bar]');
  var n = slides.length, cur = -1, ticking = false;
  function range() { return Math.max(1, pin.offsetHeight - window.innerHeight); }
  function update() {
    ticking = false;
    var p = Math.min(1, Math.max(0, -pin.getBoundingClientRect().top / range()));
    var i = Math.min(n - 1, Math.floor(p * n));
    pin.style.setProperty('--p', p.toFixed(3));
    hex.style.setProperty('--p', p.toFixed(3));
    bar.style.width = (p * 100).toFixed(1) + '%';
    if (i === cur) return;
    cur = i;
    slides.forEach(function (s, k) { s.classList.toggle('active', k === i); });
    btns.forEach(function (b, k) { b.classList.toggle('active', k === i); });
    hex.style.setProperty('--c', slides[i].dataset.c);
    label.style.setProperty('--fg', slides[i].dataset.fg);
    count.textContent = '0' + (i + 1);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  btns.forEach(function (b, k) {
    b.addEventListener('click', function () {
      var top = pin.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + ((k + 0.5) / n) * range(), behavior: 'smooth' });
    });
  });
  update();
})();

// Immersive layer: perfume-puff hero, liquid-fill type, misted CTA. Everything is scroll-scrubbed,
// so scrolling back up rewinds it; canvases render at half resolution because smoke is soft anyway.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RES = 0.5;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { v = clamp((v - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); }
  function rng(seed) { // mulberry32: same puff shape every load
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { return (r() + r() + r() - 1.5) / 1.5; }

  // Soft, lumpy cloud sprites built from overlapping radial gradients.
  function makeSprites(colors, count, r) {
    var out = [];
    for (var n = 0; n < count; n++) {
      var c = document.createElement('canvas'); c.width = c.height = 256;
      var g = c.getContext('2d');
      for (var k = 0; k < 18; k++) {
        var a = r() * Math.PI * 2, d = r() * 72, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d;
        var rad = 36 + r() * 64, col = colors[(r() * colors.length) | 0];
        var gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, 'rgba(' + col + ',0.5)');
        gr.addColorStop(0.45, 'rgba(' + col + ',0.2)');
        gr.addColorStop(1, 'rgba(' + col + ',0)');
        g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      }
      g.globalCompositeOperation = 'destination-in';
      var m = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      m.addColorStop(0.5, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m; g.fillRect(0, 0, 256, 256);
      out.push(c);
    }
    return out;
  }
  function sizeCanvas(cv, w, h) {
    var cw = Math.ceil(w * RES), ch = Math.ceil(h * RES);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  }
  function drawSprite(ctx, img, x, y, r, rot, a) {
    if (a <= 0.003 || r <= 0) return;
    var c = Math.cos(rot) * RES, s = Math.sin(rot) * RES;
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.setTransform(c, s, -s, c, x * RES, y * RES);
    ctx.drawImage(img, -r, -r, r * 2, r * 2);
  }

  var LIGHT = ['242,196,206', '248,225,230', '216,200,236', '239,234,247'];
  var DEEP = ['211,143,165', '184,160,216', '242,196,206'];

  // ---------- Hero: pin, blur + fade, perfume puff ----------
  (function () {
    var scene = document.querySelector('[data-hero]');
    var cv = document.querySelector('[data-smoke]');
    if (!scene || !cv || reduce) return;
    var stage = scene.querySelector('[data-hero-stage]'), fx = scene.querySelector('[data-hero-fx]');
    var cue = scene.querySelector('[data-cue]'), nozzle = scene.querySelector('[data-nozzle]');
    var h1 = scene.querySelector('[data-hero-h1]'), ctx = cv.getContext('2d');
    var r = rng(7), light = makeSprites(LIGHT, 5, r), deep = makeSprites(DEEP, 3, r);
    // Static grain knocked out of the smoke's alpha: dithers gradient banding and reads as fine mist.
    var gc = document.createElement('canvas'); gc.width = gc.height = 128;
    var gx = gc.getContext('2d'), gd = gx.createImageData(128, 128);
    for (var k = 3; k < gd.data.length; k += 4) gd.data[k] = r() * 22;
    gx.putImageData(gd, 0, 0);
    var grain = ctx.createPattern(gc, 'repeat');
    var W = 0, H = 0, origin = null, target = null, running = false;

    var N = window.innerWidth < 700 ? 80 : 120, puffs = [], drops = [];
    for (var i = 0; i < N; i++) {
      var u = i / N;
      puffs.push({
        t0: 0.02 + 0.3 * Math.pow(u, 1.5), // burst: most of the spray leaves early
        ang: gauss(r) * 0.42, dist: 0.3 + r() * 0.9, rise: r(), size: 0.55 + r() * 0.75,
        alpha: 0.2 + r() * 0.22, rot: r() * 6.28, spin: (r() - 0.5) * 1.2,
        w: 0.6 + r() * 0.8, ph1: r() * 6.28, ph2: r() * 6.28,
        img: u < 0.3 && r() < 0.6 ? deep[(r() * deep.length) | 0] : light[(r() * light.length) | 0]
      });
    }
    for (i = 0; i < 46; i++) drops.push({ t0: 0.015 + r() * 0.16, ang: gauss(r) * 0.3, dist: 0.25 + r() * 0.6, s: 0.6 + r() * 1.6 });

    function layout() {
      W = window.innerWidth; H = window.innerHeight;
      sizeCanvas(cv, W, H);
      stage.style.setProperty('--stick', Math.min(0, H - stage.offsetHeight) + 'px');
    }
    function progress() {
      return -scene.getBoundingClientRect().top / Math.max(1, scene.offsetHeight - H);
    }
    function center(el) { var b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }

    function draw(p, t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      var fade = 1 - smooth(0.85, 1.6, p);
      if (p <= 0 || fade <= 0 || !origin) return;

      // Mist veil over the whole screen while the cloud hangs in the air.
      var haze = 0.4 * smooth(0.15, 0.7, p) * fade;
      if (haze > 0.003) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(248,240,246,' + haze.toFixed(3) + ')'; ctx.fillRect(0, 0, cv.width, cv.height); }

      var dx = target.x - origin.x, dy = target.y - origin.y, len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      var minD = Math.min(W, H), L = clamp(len * 1.35, minD * 0.6, Math.max(W, H) * 0.95), R0 = minD * 0.24;

      for (var i = 0; i < puffs.length; i++) {
        var q = puffs[i], age = p - q.t0;
        if (age <= 0) continue;
        var e = 1 - Math.exp(-age * 6);
        var along = q.dist * L * (e + age * 0.08); // fast jet, then a slow drift
        var c = Math.cos(q.ang * (0.5 + e)), s = Math.sin(q.ang * (0.5 + e)); // cone opens as it travels
        var vx = dx * c - dy * s, vy = dx * s + dy * c;
        var rad = R0 * q.size * (0.1 + 1.5 * (1 - Math.exp(-age * 3.5)));
        var x = origin.x + vx * along + Math.sin(t * 0.00035 * q.w + q.ph1) * rad * 0.18 * e;
        var y = origin.y + vy * along - q.rise * H * 0.14 * age + Math.cos(t * 0.0003 * q.w + q.ph2) * rad * 0.14 * e;
        var a = q.alpha * smooth(0, 0.03, age) * fade / (1 + age * 0.9);
        drawSprite(ctx, q.img, x, y, rad, q.rot + age * q.spin + t * 0.00004 * q.spin, a);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = grain; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'source-over';

      // A fine glittering mist right at the nozzle in the first instant of the spray.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#D38FA5';
      for (i = 0; i < drops.length; i++) {
        var d = drops[i], da = p - d.t0;
        if (da <= 0 || da > 0.22) continue;
        var de = 1 - Math.exp(-da * 14), dc = Math.cos(d.ang), ds = Math.sin(d.ang);
        var px = origin.x + (dx * dc - dy * ds) * d.dist * L * de, py = origin.y + (dx * ds + dy * dc) * d.dist * L * de;
        ctx.globalAlpha = 0.7 * (1 - da / 0.22);
        ctx.beginPath(); ctx.arc(px * RES, py * RES, d.s * RES, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      running = false;
      var p = progress();
      if (p <= 1) { origin = center(nozzle); target = center(h1); } // freeze once unpinned so the cloud hangs in place

      var blur = 16 * smooth(0.04, 0.7, p), op = 1 - smooth(0.3, 0.92, p), sc = 1 + 0.07 * smooth(0, 1, p);
      fx.style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px)' : '';
      fx.style.opacity = op < 1 ? op.toFixed(3) : '';
      fx.style.transform = sc > 1.0005 ? 'scale(' + sc.toFixed(4) + ')' : '';
      fx.style.visibility = op <= 0.002 ? 'hidden' : '';
      cue.style.opacity = (1 - smooth(0, 0.05, p)).toFixed(3);

      draw(p, t);
      if (p > 0 && p < 1.6 && !document.hidden) { running = true; requestAnimationFrame(frame); } // keep swirling while visible
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', function () { layout(); kick(); });
    document.addEventListener('visibilitychange', kick);
    layout(); kick();
  })();

  // ---------- One shade: liquid fill + shade card scrolling along ----------
  (function () {
    var sec = document.querySelector('[data-fill]');
    if (!sec || reduce) return;
    var solid = sec.querySelector('[data-fill-solid]'), card = sec.querySelector('[data-card]');
    var screen = sec.querySelector('[data-card-screen]'), list = sec.querySelector('[data-card-list]');
    var visible = false, running = false;

    function frame(t) {
      running = false;
      var b = sec.getBoundingClientRect(), H = window.innerHeight;
      var p = clamp(-b.top / Math.max(1, sec.offsetHeight - H), 0, 1);

      // Wave edge, tilted so the right side fills first; level 0 = empty, 1 = full.
      var level = smooth(0.06, 0.82, p), A = 3.2, T = 14;
      var base = (100 + A + T / 2) + level * (-2 * A - T - 100);
      var pts = [];
      for (var i = 0; i <= 24; i++) {
        var x = i / 24;
        var y = base - T * (x - 0.5) + A * Math.sin(x * 9 + t * 0.0016) + A * 0.5 * Math.sin(x * 17 - t * 0.0011);
        pts.push((x * 110 - 5).toFixed(1) + '% ' + y.toFixed(2) + '%');
      }
      solid.style.clipPath = 'polygon(' + pts.join(',') + ',105% 130%,-5% 130%)';

      var enter = 1 - smooth(0, 0.3, p);
      card.style.transform = 'translateY(' + (enter * H * 0.85 - smooth(0.3, 1, p) * H * 0.05).toFixed(1) + 'px) rotate(' + (enter * -6).toFixed(2) + 'deg)';
      var travel = Math.max(0, list.offsetHeight - screen.clientHeight);
      list.style.transform = 'translateY(' + (-smooth(0.28, 0.95, p) * travel).toFixed(1) + 'px)';

      if (visible && !document.hidden) { running = true; requestAnimationFrame(frame); }
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[en.length - 1].isIntersecting; if (visible) kick(); }).observe(sec);
    } else { visible = true; }
    window.addEventListener('scroll', kick, { passive: true });
    document.addEventListener('visibilitychange', kick);
    kick();
  })();

  // ---------- CTA: headline wave, letter drop-in, parting mist ----------
  (function () {
    var join = document.querySelector('[data-join]');
    if (!join) return;

    // Split text into per-letter spans (words kept whole so lines still wrap naturally).
    function split(root, cls) {
      var idx = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
          if (ch.nodeType === 3) {
            var frag = document.createDocumentFragment();
            ch.textContent.split(/(\s+)/).forEach(function (word) {
              if (!word) return;
              if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(' ')); return; }
              var w = document.createElement('span'); w.className = 'w';
              for (var i = 0; i < word.length; i++) {
                var c = document.createElement('span'); c.className = cls; c.textContent = word[i];
                c.style.setProperty('--i', idx++); w.appendChild(c);
              }
              frag.appendChild(w);
            });
            node.replaceChild(frag, ch);
          } else if (ch.nodeType === 1) walk(ch);
        });
      })(root);
    }
    var wave = join.querySelector('[data-wave]'), type = join.querySelector('[data-type]');
    if (!reduce) {
      split(wave, 'wave-c');
      type.setAttribute('aria-label', type.textContent);
      split(type, 'type-c');
    }

    var cv = join.querySelector('[data-mist]'), ctx = cv.getContext('2d');
    var r = rng(11), sprites = makeSprites(['242,196,206', '200,184,224', '248,225,230', '184,160,216'], 5, r), clouds = [];
    for (var i = 0; i < 34; i++) {
      clouds.push({ side: i % 2 ? 1 : -1, x: r() * 0.26 - 0.06, y: r(), size: 0.5 + r() * 0.6, alpha: 0.3 + r() * 0.3,
        rot: r() * 6.28, spin: (r() - 0.5) * 0.4, w: 0.5 + r(), ph: r() * 6.28, img: sprites[(r() * sprites.length) | 0] });
    }
    var visible = false, running = false;

    function draw(t) {
      running = false;
      var b = join.getBoundingClientRect(), vh = window.innerHeight, W = b.width, H = b.height;
      sizeCanvas(cv, W, H);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      // Mist starts drawn across the middle and parts outward as the section rises into view.
      var reveal = reduce ? 1 : smooth(0.15, 0.85, clamp((vh - b.top) / vh, 0, 1));
      var R0 = clamp(W * 0.22, 120, Math.min(W, H) * 0.45);
      for (var i = 0; i < clouds.length; i++) {
        var c = clouds[i];
        var x = (c.side < 0 ? c.x * W : W - c.x * W) - c.side * (1 - reveal) * W * 0.3 + Math.sin(t * 0.00025 * c.w + c.ph) * 26;
        var y = c.y * H + Math.cos(t * 0.0002 * c.w + c.ph) * 18;
        drawSprite(ctx, c.img, x, y, R0 * c.size, c.rot + t * 0.00005 * c.spin, c.alpha);
      }
      ctx.globalAlpha = 1;
      if (visible && !reduce && !document.hidden) { running = true; requestAnimationFrame(draw); }
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(draw); } }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[en.length - 1].isIntersecting;
        join.classList.toggle('live', visible);
        if (visible) { type.classList.add('typed'); kick(); }
      }, { threshold: 0.15 }).observe(join);
    } else { visible = true; join.classList.add('live'); type.classList.add('typed'); }
    window.addEventListener('resize', kick);
    document.addEventListener('visibilitychange', kick);
    kick();
  })();
})();
