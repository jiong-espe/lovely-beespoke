// Scroll-reveal: elements fade and rise as they enter the viewport.
(function () {
  var sel = '.pill, #ritual .hero > div:first-child, #ritual .hero > div:last-child > div, #bea > div, #join .wrap > *, #foot';
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
