/* /links/ 页面：网站分组标签切换
 * 逻辑参考 caocong-homepage-main/sites-render.js：
 * - 胶囊滑块跟随当前标签
 * - 手机端把面板容器高度设为当前面板高度
 * - 支持方向键 / Home / End 切换
 */
(function () {
  var box = document.getElementById('links-sites');
  if (!box) return;

  var seg = box.querySelector('.sites-seg');
  var thumb = box.querySelector('.sites-seg-thumb');
  var panelsWrap = box.querySelector('.sites-panels');
  var tabs = Array.prototype.slice.call(box.querySelectorAll('.sites-tab'));
  var panels = Array.prototype.slice.call(box.querySelectorAll('.sites-panel'));

  if (!seg || !tabs.length || !panels.length) return;

  var tints = thumb ? Array.prototype.slice.call(thumb.querySelectorAll('i')) : [];
  var current = 0;
  var mobile = window.matchMedia('(max-width: 575.98px)');

  function placeThumb() {
    if (!thumb) return;
    var active = tabs[current];
    if (!active) return;
    thumb.style.width = active.offsetWidth + 'px';
    thumb.style.transform = 'translateX(' + active.offsetLeft + 'px)';
  }

  function fitPanels() {
    if (!panelsWrap) return;
    if (!mobile.matches) {
      panelsWrap.style.height = '';
      return;
    }
    var active = panels[current];
    panelsWrap.style.height = active ? active.offsetHeight + 'px' : '';
  }

  function select(index, focus) {
    if (index < 0) index = 0;
    if (index > tabs.length - 1) index = tabs.length - 1;
    current = index;

    tabs.forEach(function (tab, i) {
      var on = i === index;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });

    panels.forEach(function (panel, i) {
      panel.classList.toggle('is-active', i === index);
    });

    tints.forEach(function (tint, i) {
      tint.classList.toggle('is-active', i === index);
    });

    placeThumb();
    fitPanels();

    if (focus) tabs[index].focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      select(i, false);
    });
  });

  seg.addEventListener('keydown', function (event) {
    var next;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(next, true);
  });

  function refresh() {
    placeThumb();
    fitPanels();
  }

  select(0, false);
  window.requestAnimationFrame(function () {
    seg.classList.add('is-ready');
  });

  window.addEventListener('load', refresh);
  window.addEventListener('resize', refresh);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refresh).catch(function () {});
  }
  if (mobile.addEventListener) {
    mobile.addEventListener('change', refresh);
  } else if (mobile.addListener) {
    mobile.addListener(refresh);
  }
})();
