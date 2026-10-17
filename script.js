// Scroll-reveal: elements fade and rise as they enter the viewport.
(function () {
  var sel = '.pill, #ritual .hero > div:first-child, #ritual .hive-stack > *, #bea > div, #join .join-h, #join .join-form, #foot';
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
  var gusts = pin.querySelectorAll('[data-gust]');
  var n = slides.length, cur = -1, ticking = false;
  function range() { return Math.max(1, pin.offsetHeight - window.innerHeight); }
  function update() {
    ticking = false;
    var p = Math.min(1, Math.max(0, -pin.getBoundingClientRect().top / range()));
    var i = Math.min(n - 1, Math.floor(p * n));
    pin.style.setProperty('--p', p.toFixed(3));
    hex.style.setProperty('--p', p.toFixed(3));
    // Wind: gusts slide along their paths, trees lean on two gust peaks per slide.
    hex.style.setProperty('--w', Math.pow(Math.sin(p * Math.PI * n * 2), 2).toFixed(3));
    gusts.forEach(function (g) { g.setAttribute('stroke-dashoffset', (-p * 3 * g.dataset.gust).toFixed(3)); });
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

// Immersive layer: perfume-puff hero, growing plant, misted CTA. Everything is scroll-scrubbed,
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
    var cue = scene.querySelector('[data-cue]'), ctx = cv.getContext('2d');
    var next = document.querySelector('[data-grow] .grow-stage');
    var r = rng(7), light = makeSprites(LIGHT, 5, r), deep = makeSprites(DEEP, 3, r);
    // Static grain knocked out of the smoke's alpha: dithers gradient banding and reads as fine mist.
    var gc = document.createElement('canvas'); gc.width = gc.height = 128;
    var gx = gc.getContext('2d'), gd = gx.createImageData(128, 128);
    for (var k = 3; k < gd.data.length; k += 4) gd.data[k] = r() * 22;
    gx.putImageData(gd, 0, 0);
    var grain = ctx.createPattern(gc, 'repeat');
    var W = 0, H = 0, running = false;

    var N = window.innerWidth < 700 ? 80 : 120, puffs = [], drops = [];
    for (var i = 0; i < N; i++) {
      var u = i / N;
      puffs.push({
        t0: 0.02 + 0.3 * Math.pow(u, 1.5), // burst: most of the spray leaves early
        ang: r() * 6.283, dist: 0.25 + r() * 0.8, rise: r(), size: 0.55 + r() * 0.75,
        alpha: 0.2 + r() * 0.22, rot: r() * 6.28, spin: (r() - 0.5) * 1.2,
        w: 0.6 + r() * 0.8, ph1: r() * 6.28, ph2: r() * 6.28,
        img: u < 0.3 && r() < 0.6 ? deep[(r() * deep.length) | 0] : light[(r() * light.length) | 0]
      });
    }
    for (i = 0; i < 46; i++) drops.push({ t0: 0.015 + r() * 0.16, ang: r() * 6.283, dist: 0.25 + r() * 0.6, s: 0.6 + r() * 1.6 });

    function layout() {
      W = window.innerWidth; H = window.innerHeight;
      sizeCanvas(cv, W, H);
      stage.style.setProperty('--stick', Math.min(0, H - stage.offsetHeight) + 'px');
    }
    function progress() {
      return -scene.getBoundingClientRect().top / Math.max(1, scene.offsetHeight - H);
    }

    function draw(p, t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      var fade = 1 - smooth(0.85, 1.6, p);
      if (p <= 0 || fade <= 0) return;

      // Mist veil over the whole screen while the cloud hangs in the air.
      var haze = 0.4 * smooth(0.15, 0.7, p) * fade;
      if (haze > 0.003) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(248,240,246,' + haze.toFixed(3) + ')'; ctx.fillRect(0, 0, cv.width, cv.height); }

      // Puff blooms outward from the centre of the screen in every direction.
      var cx = W / 2, cy = H / 2, minD = Math.min(W, H), L = Math.hypot(W, H) * 0.42, R0 = minD * 0.24;

      for (var i = 0; i < puffs.length; i++) {
        var q = puffs[i], age = p - q.t0;
        if (age <= 0) continue;
        var e = 1 - Math.exp(-age * 6);
        var along = q.dist * L * (e + age * 0.08); // fast jet, then a slow drift
        var vx = Math.cos(q.ang + q.spin * 0.4 * e), vy = Math.sin(q.ang + q.spin * 0.4 * e); // slight swirl as it spreads
        var rad = R0 * q.size * (0.1 + 1.5 * (1 - Math.exp(-age * 3.5)));
        var x = cx + vx * along + Math.sin(t * 0.00035 * q.w + q.ph1) * rad * 0.18 * e;
        var y = cy + vy * along - q.rise * H * 0.14 * age + Math.cos(t * 0.0003 * q.w + q.ph2) * rad * 0.14 * e;
        var a = q.alpha * smooth(0, 0.03, age) * fade / (1 + age * 0.9);
        drawSprite(ctx, q.img, x, y, rad, q.rot + age * q.spin + t * 0.00004 * q.spin, a);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = grain; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'source-over';

      // A fine glittering mist right at the centre in the first instant of the spray.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#D38FA5';
      for (i = 0; i < drops.length; i++) {
        var d = drops[i], da = p - d.t0;
        if (da <= 0 || da > 0.22) continue;
        var de = 1 - Math.exp(-da * 14);
        var px = cx + Math.cos(d.ang) * d.dist * L * de, py = cy + Math.sin(d.ang) * d.dist * L * de;
        ctx.globalAlpha = 0.7 * (1 - da / 0.22);
        ctx.beginPath(); ctx.arc(px * RES, py * RES, d.s * RES, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      running = false;
      var p = progress();

      var blur = 16 * smooth(0.04, 0.7, p), op = 1 - smooth(0.3, 0.92, p), sc = 1 + 0.07 * smooth(0, 1, p);
      fx.style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px)' : '';
      fx.style.opacity = op < 1 ? op.toFixed(3) : '';
      fx.style.transform = sc > 1.0005 ? 'scale(' + sc.toFixed(4) + ')' : '';
      fx.style.visibility = op <= 0.002 ? 'hidden' : '';
      cue.style.opacity = (1 - smooth(0, 0.05, p)).toFixed(3);
      if (next) { // the services scene emerges from the cloud as it clears
        var em = smooth(0.85, 1.35, p);
        next.style.opacity = em < 1 ? em.toFixed(3) : '';
        next.style.filter = em < 1 ? 'blur(' + (14 * (1 - em)).toFixed(2) + 'px)' : '';
        next.style.transform = em < 1 ? 'scale(' + (1.05 - 0.05 * em).toFixed(4) + ')' : '';
      }

      draw(p, t);
      if (p > 0 && p < 1.6 && !document.hidden) { running = true; requestAnimationFrame(frame); } // keep swirling while visible
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', function () { layout(); kick(); });
    document.addEventListener('visibilitychange', kick);
    layout(); kick();
  })();

  // ---------- Services: the plant between the couple grows; each service appears as it passes ----------
  (function () {
    var sec = document.querySelector('[data-grow]');
    if (!sec || reduce) return;
    var parts = sec.querySelectorAll('[data-y]'), items = sec.querySelectorAll('[data-at]'), ticking = false;
    function update() {
      ticking = false;
      var g = clamp(-sec.getBoundingClientRect().top / Math.max(1, sec.offsetHeight - window.innerHeight), 0, 1);
      for (var i = 0; i < parts.length; i++) {
        var el = parts[i], at = (452 - el.dataset.y) / 406 * 0.8; // stem tip climbs y 452 to 46 over the first 80% of the scroll
        var k = smooth(at, at + +(el.dataset.span || 0.1), g);
        if ('draw' in el.dataset) el.setAttribute('stroke-dashoffset', (1 - k).toFixed(3));
        else el.style.transform = 'scale(' + k.toFixed(3) + ')';
      }
      items.forEach(function (it) { it.classList.toggle('on', g >= +it.dataset.at); });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
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
