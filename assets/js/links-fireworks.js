/* /links/ 页面：点击烟花 + 桌面鼠标彩色拖尾。
   独立 2D canvas，不依赖 three.js；lite / 减少动态效果时自动关闭。 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (window.__LINKS_LITE || (reduceMotion && reduceMotion.matches)) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'links-fx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  var dpr = 1;
  var width = 0;
  var height = 0;
  var particles = [];
  var raf = 0;
  var destroyed = false;
  var hue = 0;
  var lastTrail = 0;
  var finePointer = window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px)');
  var palette = ['#f0abfc', '#c4b5fd', '#7dd3fc', '#f9a8d4', '#fde68a', '#86efac'];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function push(particle) {
    particles.push(particle);
    if (particles.length > 240) {
      particles.splice(0, particles.length - 240);
    }
  }

  function burst(x, y) {
    var count = 20;
    for (var i = 0; i < count; i += 1) {
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
      var speed = 2 + Math.random() * 4.2;
      push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.1,
        gravity: 0.055,
        drag: 0.985,
        life: 1,
        decay: 0.012 + Math.random() * 0.012,
        size: 1.8 + Math.random() * 2.2,
        color: palette[Math.floor(Math.random() * palette.length)],
        trail: false
      });
    }
    start();
  }

  function trail(x, y) {
    var now = Date.now();
    if (now - lastTrail < 18) return;
    lastTrail = now;
    hue = (hue + 3) % 360;
    push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      gravity: 0,
      drag: 0.965,
      life: 1,
      decay: 0.035,
      size: 3 + Math.random() * 2.5,
      color: 'hsl(' + hue + ' 92% 72%)',
      trail: true
    });
    start();
  }

  function loop() {
    raf = 0;
    if (destroyed) return;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (var i = particles.length - 1; i >= 0; i -= 1) {
      var particle = particles[i];
      particle.life -= particle.decay;
      if (particle.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      particle.vx *= particle.drag;
      particle.vy = particle.vy * particle.drag + particle.gravity;
      particle.x += particle.vx;
      particle.y += particle.vy;

      ctx.globalAlpha = Math.max(0, particle.life * (particle.trail ? 0.7 : 0.95));
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(
        particle.x,
        particle.y,
        particle.size * (0.5 + particle.life * 0.5),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (particles.length) {
      raf = window.requestAnimationFrame(loop);
    }
  }

  function start() {
    if (raf || destroyed) return;
    raf = window.requestAnimationFrame(loop);
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    burst(event.clientX, event.clientY);
  }

  function onPointerMove(event) {
    if (!finePointer || !finePointer.matches) return;
    trail(event.clientX, event.clientY);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('resize', resize);
    window.removeEventListener('links:lite', destroy);
    canvas.remove();
  }

  resize();
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('links:lite', destroy);
})();
