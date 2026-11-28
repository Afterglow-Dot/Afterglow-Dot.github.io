/* /links/ 页面：实时时钟 + 中文日期 */
(function () {
  var clock = document.getElementById('links-clock');
  var dateEl = document.getElementById('links-date');
  if (!clock && !dateEl) return;

  var hoursEl = clock ? clock.querySelector('[data-clock="hours"]') : null;
  var minutesEl = clock ? clock.querySelector('[data-clock="minutes"]') : null;
  var secondsEl = clock ? clock.querySelector('[data-clock="seconds"]') : null;
  var timer = 0;

  function pad(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function render() {
    var now = new Date();

    if (hoursEl) hoursEl.textContent = pad(now.getHours());
    if (minutesEl) minutesEl.textContent = pad(now.getMinutes());

    if (secondsEl) {
      var next = pad(now.getSeconds());
      if (next !== secondsEl.textContent) {
        secondsEl.textContent = next;
        secondsEl.classList.remove('is-tick');
        // 强制重排，让秒数的跳动动画每秒都能重新触发
        void secondsEl.offsetWidth;
        secondsEl.classList.add('is-tick');
      }
    }

    if (dateEl) {
      try {
        dateEl.textContent = now.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        });
      } catch (err) {
        dateEl.textContent =
          now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
      }
    }
  }

  function start() {
    if (timer) return;
    render();
    timer = window.setInterval(render, 1000);
  }

  function stop() {
    if (!timer) return;
    window.clearInterval(timer);
    timer = 0;
  }

  start();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });
})();
