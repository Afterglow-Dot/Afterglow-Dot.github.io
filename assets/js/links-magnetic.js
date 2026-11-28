/* /links/ 页面：链接按钮轻微磁吸（仅精细指针设备）。 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');
  if (window.__LINKS_LITE || (reduceMotion && reduceMotion.matches) || !finePointer || !finePointer.matches) {
    return;
  }

  var links = Array.prototype.slice.call(document.querySelectorAll('.site-link'));
  if (!links.length) return;

  var enabled = true;
  var strength = 0.12;
  var maxOffset = 6;

  function reset(link) {
    link.style.translate = '0px 0px';
  }

  function move(event) {
    if (!enabled) return;
    var link = event.currentTarget;
    var rect = link.getBoundingClientRect();
    var dx = (event.clientX - (rect.left + rect.width / 2)) * strength;
    var dy = (event.clientY - (rect.top + rect.height / 2)) * strength;
    dx = Math.max(-maxOffset, Math.min(maxOffset, dx));
    dy = Math.max(-maxOffset, Math.min(maxOffset, dy));
    link.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
  }

  links.forEach(function (link) {
    link.addEventListener('pointermove', move, { passive: true });
    link.addEventListener('pointerleave', function () {
      reset(link);
    }, { passive: true });
    link.addEventListener('blur', function () {
      reset(link);
    });
  });

  window.addEventListener('links:lite', function () {
    enabled = false;
    links.forEach(reset);
  });
})();
