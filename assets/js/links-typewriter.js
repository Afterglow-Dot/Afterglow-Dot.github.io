/* /links/ 页面：签名逐字出现。 */
(function () {
  'use strict';

  var el = document.querySelector('.links-tagline-text');
  if (!el) return;

  var full = el.textContent;
  if (!full || !full.trim()) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (window.__LINKS_LITE || (reduceMotion && reduceMotion.matches)) return;

  var index = 0;
  var timer = 0;

  function finish() {
    el.textContent = full;
    el.classList.remove('is-typing');
  }

  function step() {
    index += 1;
    el.textContent = full.slice(0, index);
    if (index < full.length) {
      timer = window.setTimeout(step, 90);
    } else {
      finish();
    }
  }

  el.textContent = '';
  el.classList.add('is-typing');
  timer = window.setTimeout(step, 850);

  window.addEventListener('links:lite', function () {
    if (timer) window.clearTimeout(timer);
    finish();
  });
})();
