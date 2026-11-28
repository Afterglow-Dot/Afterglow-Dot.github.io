/* /links/ 页面：低配 / 省流量时自动关闭 3D 背景
 * 逻辑参考 caocong-homepage-main/lite.js：
 * - ?lite=1 / ?lite=0 强制开关
 * - saveData、内存 <= 2GB、CPU 核心 <= 2 直接进入 lite
 * - 页面加载后测量 3 秒帧率，低于 20fps 进入 lite
 */
(function () {
  var root = document.documentElement;
  var params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (err) {
    params = null;
  }

  function enter() {
    if (window.__LINKS_LITE) return;
    window.__LINKS_LITE = true;
    root.classList.add('lite');
    try {
      window.dispatchEvent(new Event('links:lite'));
    } catch (err) {
      /* 老浏览器不支持 Event 构造器时忽略 */
    }
  }

  var forced = params ? params.get('lite') : null;
  if (forced === '1') {
    enter();
    return;
  }
  if (forced === '0') return;

  var nav = window.navigator || {};
  var connection = nav.connection || nav.mozConnection || nav.webkitConnection || {};
  if (
    connection.saveData ||
    (nav.deviceMemory && nav.deviceMemory <= 2) ||
    (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2)
  ) {
    enter();
    return;
  }

  function measure() {
    if (!window.requestAnimationFrame || !window.performance) return;

    var frames = 0;
    var start = 0;
    var interrupted = document.hidden;

    function onVisibility() {
      if (document.hidden) interrupted = true;
    }

    function tick(now) {
      if (!start) start = now;
      frames += 1;

      if (now - start < 3000) {
        window.requestAnimationFrame(tick);
        return;
      }

      document.removeEventListener('visibilitychange', onVisibility);
      var fps = frames / ((now - start) / 1000);
      if (!interrupted && !document.hidden && fps < 20) enter();
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.requestAnimationFrame(tick);
  }

  function schedule() {
    window.setTimeout(measure, 2500);
  }

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
})();
