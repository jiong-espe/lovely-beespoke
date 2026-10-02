// Scroll-reveal: elements fade and rise as they enter the viewport.
(function () {
  var sel = '#shop h2, #shop > p, .grid4 .card, .pill, #ritual .hero > div:first-child, #ritual .hero > div:last-child > div, #bea > div, #join .wrap > *, #foot';
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
