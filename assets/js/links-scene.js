/* /links/ 页面：飘动的 3D 线框几何体 + 粒子
 *
 * - three.js r170 从 CDN 动态加载，只在这个页面请求
 * - 低配 / 省流量 / prefers-reduced-motion 时跳过，保留 CSS 渐变背景
 * - 页面不可见或滚出视口时暂停渲染
 */
(function () {
  'use strict';

  var stage = document.querySelector('.links-stage');
  var holder = document.getElementById('links-canvas');
  if (!stage || !holder) return;

  var THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
  var THREE_CDN_FULL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  var THREE = null;
  var renderer = null;
  var scene = null;
  var camera = null;
  var group = null;
  var points = null;
  var clock = null;
  var raf = 0;
  var running = false;
  var destroyed = false;
  var booting = false;
  var visible = true;
  var io = null;
  var ro = null;
  var mouse = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };

  function isLite() {
    return window.__LINKS_LITE === true || document.documentElement.classList.contains('lite');
  }

  function skip() {
    return destroyed || isLite() || (reduce && reduce.matches);
  }

  function stop() {
    running = false;
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function onPointer(event) {
    var x = (event.clientX / window.innerWidth - 0.5) * 2;
    var y = (event.clientY / window.innerHeight - 0.5) * 2;
    target.x = Math.max(-1, Math.min(1, x));
    target.y = Math.max(-1, Math.min(1, y));
  }

  function onVisibility() {
    if (document.hidden) stop();
    else if (visible) play();
  }

  function renderFrame() {
    var t = clock.getElapsedTime();

    group.children.forEach(function (mesh) {
      var data = mesh.userData;
      mesh.rotation.x = data.rx + t * data.spin;
      mesh.rotation.y = data.ry + t * data.spin * 0.8;
      mesh.position.y = data.baseY + Math.sin(t * data.float + data.phase) * 0.16;
    });

    points.rotation.y = t * 0.02;
    points.rotation.x = Math.sin(t * 0.06) * 0.08;

    mouse.x += (target.x - mouse.x) * 0.045;
    mouse.y += (target.y - mouse.y) * 0.045;
    camera.position.x = mouse.x * 0.5;
    camera.position.y = -mouse.y * 0.32;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  function loop() {
    if (!running) return;
    renderFrame();
    raf = window.requestAnimationFrame(loop);
  }

  function play() {
    if (running || skip() || !renderer || !visible || document.hidden) return;
    running = true;
    raf = window.requestAnimationFrame(loop);
  }

  function resize() {
    if (!renderer || !camera) return;
    var width = holder.clientWidth;
    var height = holder.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function build() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      renderer = null;
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    holder.appendChild(renderer.domElement);

    group = new THREE.Group();
    scene.add(group);

    var palette = [0xc4b5fd, 0x7dd3fc, 0xf9a8d4];
    var geometries = [
      new THREE.IcosahedronGeometry(1.0, 1),
      new THREE.TorusKnotGeometry(0.46, 0.14, 80, 8),
      new THREE.OctahedronGeometry(0.56, 0),
    ];
    var placements = [
      { x: -1.85, y: 0.55, z: -1.3, float: 0.55, phase: 0.0, spin: 0.16 },
      { x: 1.95, y: -0.45, z: -1.9, float: 0.42, phase: 2.2, spin: 0.11 },
      { x: 0.95, y: 1.35, z: -2.5, float: 0.66, phase: 4.3, spin: 0.2 },
    ];

    geometries.forEach(function (geometry, index) {
      var material = new THREE.MeshBasicMaterial({
        color: palette[index],
        wireframe: true,
        transparent: true,
        opacity: index === 2 ? 0.3 : 0.42,
        depthWrite: false,
      });
      var mesh = new THREE.Mesh(geometry, material);
      var spot = placements[index];
      mesh.position.set(spot.x, spot.y, spot.z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      mesh.userData = {
        baseY: spot.y,
        float: spot.float,
        phase: spot.phase,
        spin: spot.spin,
        rx: mesh.rotation.x,
        ry: mesh.rotation.y,
      };
      group.add(mesh);
    });

    var count = 900;
    var positions = new Float32Array(count * 3);
    for (var i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 13;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 7;
    }

    var particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var particleMaterial = new THREE.PointsMaterial({
      color: 0xf9a8d4,
      size: 0.03,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    points = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(points);

    clock = new THREE.Clock();

    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('pointermove', onPointer, { passive: true });
    }

    if (window.ResizeObserver) {
      ro = new ResizeObserver(resize);
      ro.observe(holder);
    } else {
      window.addEventListener('resize', resize);
    }

    if (window.IntersectionObserver) {
      io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            visible = entry.isIntersecting;
            if (visible) play();
            else stop();
          });
        },
        { threshold: 0.02 }
      );
      io.observe(stage);
    }

    document.addEventListener('visibilitychange', onVisibility);
    resize();
    play();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stop();

    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('visibilitychange', onVisibility);

    if (io) {
      io.disconnect();
      io = null;
    }
    if (ro) {
      ro.disconnect();
      ro = null;
    }

    if (scene) {
      scene.traverse(function (object) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(function (material) {
              material.dispose();
            });
          } else {
            object.material.dispose();
          }
        }
      });
      scene = null;
    }

    if (renderer) {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer = null;
    }

    holder.innerHTML = '';
  }

  function boot() {
    if (booting || skip()) return;
    booting = true;

    import(THREE_CDN)
      .catch(function () {
        // 万一压缩版路径不可用，退回未压缩的 module 版本
        return import(THREE_CDN_FULL);
      })
      .then(function (module) {
        booting = false;
        THREE = module;
        if (skip() || destroyed) return;
        build();
      })
      .catch(function (err) {
        booting = false;
        if (window.console && console.warn) {
          console.warn('[links] three.js 加载失败，保留静态背景。', err);
        }
      });
  }

  window.addEventListener('links:lite', destroy);

  if (reduce) {
    if (reduce.addEventListener) {
      reduce.addEventListener('change', function () {
        if (reduce.matches) destroy();
      });
    } else if (reduce.addListener) {
      reduce.addListener(function () {
        if (reduce.matches) destroy();
      });
    }
  }

  boot();
})();
