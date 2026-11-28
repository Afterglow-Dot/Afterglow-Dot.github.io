/* /links/ 页面：日期、姓名、签名依次逐字出现。
   时钟不参与打字，保持每秒实时走秒。 */
(function () {
  'use strict';

  var SPEED = 90; // 每个字的间隔，与原来的签名打字保持一致
  var GAP = 180; // 两行之间的停顿
  var START_DELAY = 260; // 等卡片入场动画走完一段再开始

  var targets = [
    document.getElementById('links-date'),
    document.getElementById('links-title'),
    document.querySelector('.links-tagline-text')
  ].filter(Boolean);
  if (!targets.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (window.__LINKS_LITE || (reduceMotion && reduceMotion.matches)) return;

  // 先量高度：清空文字后靠 min-height 占位，卡片不会因为内容变空而回缩跳动
  var items = targets
    .map(function (el) {
      return {
        el: el,
        full: (el.getAttribute('data-full') || el.textContent || '').trim(),
        height: el.offsetHeight
      };
    })
    .filter(function (item) {
      return item.full.length > 1;
    });
  if (!items.length) return;

  var timers = [];
  var index = 0;

  items.forEach(function (item) {
    if (item.height) item.el.style.minHeight = item.height + 'px';
    item.el.textContent = '';
    // 打字过程中给读屏一个稳定的完整标签，打完再撤掉
    item.el.setAttribute('aria-label', item.full);
  });

  function later(fn, delay) {
    timers.push(window.setTimeout(fn, delay));
  }

  function settle(item) {
    item.el.textContent = item.full;
    item.el.classList.remove('is-typing');
    item.el.removeAttribute('aria-label');
  }

  function typeNext() {
    var item = items[index];
    if (!item) return;

    var count = 0;
    item.el.classList.add('is-typing');

    function step() {
      count += 1;
      item.el.textContent = item.full.slice(0, count);

      if (count < item.full.length) {
        later(step, SPEED);
        return;
      }

      settle(item);
      index += 1;
      if (index < items.length) later(typeNext, GAP);
    }

    later(step, SPEED);
  }

  // 低配降级：直接补全所有文字，不再逐字
  function finishAll() {
    timers.forEach(function (timer) {
      window.clearTimeout(timer);
    });
    timers = [];
    items.forEach(settle);
  }

  window.addEventListener('links:lite', finishAll);

  later(typeNext, START_DELAY);
})();
