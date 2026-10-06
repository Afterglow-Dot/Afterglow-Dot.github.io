/**
 * ============================================================================
 * /world/ 3D 科研大厅
 * ============================================================================
 * 这是一个 ES module，由 _pages/world.md 通过动态 import() 加载。
 * 只有访问 /world/ 时才会下载 three.js，因此不影响其他页面的性能。
 *
 * 设计约束（改动前请先读）：
 * 1. 本文件不得 import 任何站点内部模块，只依赖 three（CDN + importmap）。
 * 2. 任何失败都必须抛错或返回，由 world.md 捕获后退化为静态列表。
 *    绝不允许把页面卡死或留白。
 * 3. 类名以字符串字面量书写（如 "is-hovered"），不要拼接，
 *    否则 purgecss 可能把这些类的样式剪掉。
 *
 * 数据来源：#world-data 里的 .world-item，每个元素带
 *   data-kind / data-title / data-url / data-tag / data-meta / data-date
 * ============================================================================
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ---------------------------------------------------------------------------
 * 分类配色：与 HUD 图例、书脊高亮使用同一张表，改这里即可整体换色。
 * ------------------------------------------------------------------------- */
const KINDS = {
  paper: { label: "论文", color: 0x4fc3f7 },
  patent: { label: "专利", color: 0xffd54f },
  award: { label: "获奖", color: 0x81c784 },
  project: { label: "项目", color: 0xb388ff },
  post: { label: "随笔", color: 0xff8a80 },
};

const SHELF_RADIUS = 14; // 书架环绕半径
const SHELF_HEIGHT = 7.2; // 书架总高
const SHELF_DEPTH = 1.6; // 书架进深
const TIER_COUNT = 4; // 层板数量
const CAMERA_START = new THREE.Vector3(0, 4.2, 23);

/* ---------------------------------------------------------------------------
 * 工具函数
 * ------------------------------------------------------------------------- */

/** 固定种子的伪随机数，保证每次刷新书架布局一致（便于调试和截图对比）。 */
function makeRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 读取 #world-data 里的条目。 */
function readItems(dataEl) {
  return Array.from(dataEl.querySelectorAll(".world-item"))
    .map((el) => ({
      kind: el.dataset.kind || "post",
      title: el.dataset.title || "",
      url: el.dataset.url || "",
      tag: el.dataset.tag || "",
      meta: el.dataset.meta || "",
      date: el.dataset.date || "",
    }))
    .filter((it) => it.url && it.title);
}

/**
 * 贪心装箱：把宽度不一的“书”逐层填满书架。
 * 返回 [tierIndex][bookIndex] 的二维数组。
 */
function packIntoTiers(books, usableWidth) {
  const tiers = Array.from({ length: TIER_COUNT }, () => []);
  let tier = 0;
  let cursor = -usableWidth / 2;
  let remainingWidth = usableWidth;

  for (const book of books) {
    // 本层放不下就换下一层；层用完了就停止（超出部分不再排布）
    if (book.w > remainingWidth) {
      if (tier >= TIER_COUNT - 1) break;
      tier += 1;
      cursor = -usableWidth / 2;
      remainingWidth = usableWidth;
    }
    book.x = cursor + book.w / 2;
    book.tier = tier;
    tiers[tier].push(book);
    cursor += book.w;
    remainingWidth -= book.w;
  }
  return tiers;
}

/** 用 canvas 实时绘制书脊：竖排标题 + 日期。 */
function makeSpineTexture(book, color) {
  const W = 128;
  const H = Math.max(64, Math.round((book.h / book.w) * W));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // 底色 + 顶部一条高亮边，模拟书脊的立体感
  ctx.fillStyle = book.spineColor;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(0, 0, 10, H);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(W - 8, 0, 8, H);

  // 标题：中文竖排，从上往下排
  const clean = (book.title || "未命名").replace(/\s+/g, " ").trim();
  ctx.fillStyle = "#f4fbff";
  ctx.font =
    "600 17px system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  let y = 14;
  for (const ch of clean) {
    if (y > H - 40) {
      ctx.fillText("…", W / 2, y);
      break;
    }
    ctx.fillText(ch, W / 2, y);
    y += 20;
  }

  // 日期：横排放在底部（canvas 旋转 90°，让文字沿书脊方向）
  if (book.date) {
    ctx.save();
    ctx.translate(W / 2, H - 12);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "500 12px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(244,251,255,0.72)";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(book.date, 0, 0);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** 把十六进制色按比例调亮/调暗，用于生成同色系的书脊色。 */
function shadeColor(hex, factor) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  c.r = Math.min(1, c.r);
  c.g = Math.min(1, c.g);
  c.b = Math.min(1, c.b);
  return "#" + c.getHexString();
}

/* ---------------------------------------------------------------------------
 * 场景构建
 * ------------------------------------------------------------------------- */

function buildShelfFrame(group, width, color) {
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x16323f,
    metalness: 0.35,
    roughness: 0.55,
  });
  const glowMat = new THREE.MeshBasicMaterial({ color: color });

  // 左右两块侧板
  for (const sx of [-width / 2, width / 2]) {
    const side = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, SHELF_HEIGHT, SHELF_DEPTH),
      frameMat,
    );
    side.position.set(sx, SHELF_HEIGHT / 2, 0);
    group.add(side);
  }

  // 层板 + 每层的发光灯带
  const tierGap = SHELF_HEIGHT / TIER_COUNT;
  for (let i = 0; i <= TIER_COUNT; i += 1) {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.14, SHELF_DEPTH),
      frameMat,
    );
    shelf.position.set(0, i * tierGap, 0);
    group.add(shelf);

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.98, 0.04, 0.06),
      glowMat,
    );
    strip.position.set(0, i * tierGap + 0.1, SHELF_DEPTH / 2 - 0.03);
    group.add(strip);
  }

  // 顶部的分类名牌
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(width, 3.2), 0.5, 0.1),
    new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
    }),
  );
  plate.position.set(0, SHELF_HEIGHT + 0.45, 0);
  group.add(plate);

  return tierGap;
}

function buildShelf(books, kind) {
  const cfg = KINDS[kind] || KINDS.post;
  const rng = makeRng(1337 + kind.length * 97);

  // 书架宽度按书量伸缩，最少也能放 3 本
  const usableWidth = Math.max(4.2, Math.min(9, books.length * 0.85));
  const group = new THREE.Group();
  const tierGap = buildShelfFrame(group, usableWidth, cfg.color);

  // 为每本书生成随机宽高（固定种子 → 布局稳定）
  const prepared = books.map((b) => {
    const w = 0.16 + rng() * 0.28; // 书脊厚度
    const h = Math.min(tierGap - 0.42, 1.0 + rng() * 0.85); // 书高
    return Object.assign({}, b, {
      w,
      h,
      spineColor: shadeColor(cfg.color, 0.55 + rng() * 0.5),
    });
  });

  const tiers = packIntoTiers(prepared, usableWidth - 0.5);
  const bookMeshes = [];

  tiers.forEach((tierBooks, tierIndex) => {
    for (const b of tierBooks) {
      const depth = Math.min(SHELF_DEPTH - 0.35, 0.85 + rng() * 0.35);
      const geo = new THREE.BoxGeometry(b.w, b.h, depth);
      const spineTex = makeSpineTexture(b, cfg.color);
      const plainMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(b.spineColor),
        roughness: 0.72,
        metalness: 0.08,
        emissive: new THREE.Color(cfg.color).multiplyScalar(0.06),
      });
      const spineMat = new THREE.MeshStandardMaterial({
        map: spineTex,
        roughness: 0.6,
        metalness: 0.05,
        emissive: new THREE.Color(cfg.color).multiplyScalar(0.08),
      });
      // BoxGeometry 材质顺序：+X, -X, +Y, -Y, +Z, -Z
      // 书脊朝 +X（书架面向圆心时即为外侧），封面朝 +Z
      const mats = [spineMat, plainMat, plainMat, plainMat, plainMat, plainMat];
      const mesh = new THREE.Mesh(geo, mats);

      mesh.position.set(b.x, tierIndex * tierGap + b.h / 2 + 0.09, 0.05);
      mesh.userData = {
        item: b,
        baseX: b.x,
        baseY: mesh.position.y,
        baseZ: 0.05,
        kind,
        hovered: false,
        // 悬停高亮的颜色插值端点（避免在事件回调里硬改材质导致闪烁）
        baseEmissive: new THREE.Color(cfg.color).multiplyScalar(0.08),
        hoverEmissive: new THREE.Color(cfg.color).multiplyScalar(0.85),
      };
      group.add(mesh);
      bookMeshes.push(mesh);
    }
  });

  group.userData = { kind, width: usableWidth, bookMeshes, cfg };
  return group;
}

function buildFloor(radius) {
  const group = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(radius + 6, 72),
    new THREE.MeshStandardMaterial({
      color: 0x061019,
      roughness: 0.9,
      metalness: 0.25,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.05;
  group.add(floor);

  // 发光环，增强“环形大厅”的空间感
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 2.4, radius - 2.25, 96),
    new THREE.MeshBasicMaterial({
      color: 0x2a6f8f,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  group.add(ring);

  // 中央纪念碑
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 3.4, 6),
    new THREE.MeshStandardMaterial({
      color: 0x123040,
      metalness: 0.6,
      roughness: 0.35,
    }),
  );
  pillar.position.y = 1.7;
  group.add(pillar);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.035, 12, 64),
    new THREE.MeshBasicMaterial({ color: 0x4fc3f7 }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 3.1;
  group.add(halo);

  return group;
}

function buildStars(count) {
  const positions = new Float32Array(count * 3);
  const rng = makeRng(20261001);
  for (let i = 0; i < count; i += 1) {
    // 球壳内随机分布
    const r = 40 + rng() * 60;
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6 + 4;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xbfe6ff,
      size: 0.35,
      transparent: true,
      opacity: 0.85,
    }),
  );
}

/* ---------------------------------------------------------------------------
 * 交互
 * ------------------------------------------------------------------------- */

function createTip(stage) {
  const tip = document.createElement("div");
  tip.id = "world-tip";
  stage.appendChild(tip);
  return tip;
}

function attachInteraction({
  canvas,
  camera,
  raycaster,
  pointer,
  pickables,
  group,
  tip,
  reducedMotion,
}) {
  const clock = { t: 0 };
  const childCount = group.children.length; // 循环外取一次，避免每帧重复读取
  let hovered = null;
  let downAt = null;

  const setHovered = (mesh) => {
    if (hovered === mesh) return;
    if (hovered) {
      hovered.userData.hovered = false;
      tip.classList.remove("is-visible");
    }
    hovered = mesh;
    if (hovered) {
      hovered.userData.hovered = true;
      const it = hovered.userData.item;
      tip.innerHTML =
        '<span class="tip-tag">' +
        escapeHtml(
          it.tag || (KINDS[hovered.userData.kind] || KINDS.post).label,
        ) +
        "</span>" +
        escapeHtml(it.title) +
        (it.date
          ? '<div style="opacity:.65;font-size:.75rem;margin-top:3px">' +
            escapeHtml(it.date) +
            "</div>"
          : "");
      tip.classList.add("is-visible");
    }
    canvas.style.cursor = hovered ? "pointer" : "grab";
  };

  const updatePointer = (ev) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  };

  canvas.addEventListener("pointermove", (ev) => {
    updatePointer(ev);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    setHovered(hits.length > 0 ? hits[0].object : null);
    if (hovered) {
      const rect = canvas.getBoundingClientRect();
      tip.style.left =
        Math.min(ev.clientX - rect.left + 14, rect.width - 330) + "px";
      tip.style.top = ev.clientY - rect.top + 14 + "px";
    }
  });

  // 用按下/抬起的位移阈值区分“拖动旋转”和“点击进入”，避免误跳转
  canvas.addEventListener("pointerdown", (ev) => {
    downAt = { x: ev.clientX, y: ev.clientY };
  });

  canvas.addEventListener("pointerup", (ev) => {
    if (!downAt) return;
    const dist = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y);
    downAt = null;
    if (dist > 6) return; // 判定为拖拽

    updatePointer(ev);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (hits.length > 0) {
      const url = hits[0].object.userData.item.url;
      if (url) window.location.href = url;
    }
  });

  canvas.addEventListener("pointerleave", () => setHovered(null));

  /**
   * 每帧更新：悬停的书滑出发光，其余归位。
   * 这里刻意不做“跟随鼠标的持续倾斜”——参考站作者的实测结论是：
   * 持续运动的动效是阅读时的注意力税，一次性/入场即停的才值得留。
   */
  const tick = (dt) => {
    clock.t += dt;
    const k = Math.min(1, dt * 9); // 位置插值系数
    const ke = Math.min(1, dt * 8); // 自发光插值系数

    for (const mesh of pickables) {
      const ud = mesh.userData;
      const active = ud.hovered && !reducedMotion;

      // 沿书架法线（局部 +Z，即朝向圆心/相机）滑出并轻微抬起
      const targetZ = active ? ud.baseZ + 0.95 : ud.baseZ;
      const targetY = active ? ud.baseY + 0.16 : ud.baseY;

      mesh.position.z += (targetZ - mesh.position.z) * k;
      mesh.position.y += (targetY - mesh.position.y) * k;

      // 悬停时自发光颜色与强度都向高亮值收敛，离开时回到基色。
      // 不做“跟随鼠标的持续倾斜”——持续运动的动效是阅读时的注意力税。
      const breathe =
        !active && childCount > 0
          ? 1 + Math.sin(clock.t * 1.2 + ud.baseX) * 0.06
          : 1;
      const targetColor = active ? ud.hoverEmissive : ud.baseEmissive;
      const targetIntensity = active ? 1.35 : breathe;

      mesh.material[0].emissive.lerp(targetColor, ke);
      mesh.material[0].emissiveIntensity +=
        (targetIntensity - mesh.material[0].emissiveIntensity) * ke;
    }
  };

  return { tick };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------------------------------------------------------------------
 * 入口
 * ------------------------------------------------------------------------- */

export async function initWorld({ root, dataEl }) {
  const canvas = document.getElementById("world-canvas");
  const stage = document.getElementById("world-stage");
  if (!canvas || !stage) throw new Error("缺少 canvas 或舞台容器");

  const items = readItems(dataEl);
  if (items.length === 0) throw new Error("没有可展示的内容");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // --- 渲染器 -------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03070e);
  scene.fog = new THREE.Fog(0x03070e, 26, 62);

  const camera = new THREE.PerspectiveCamera(
    46,
    canvas.clientWidth / Math.max(1, canvas.clientHeight),
    0.1,
    400,
  );
  camera.position.copy(CAMERA_START);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 3.2, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 6;
  controls.maxDistance = 46;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.enablePan = false;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.35;
  controls.update();

  // --- 灯光 ---------------------------------------------------------------
  scene.add(new THREE.AmbientLight(0x9fd8ff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(6, 16, 10);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4fc3f7, 0.5);
  rim.position.set(-10, 6, -12);
  scene.add(rim);

  // --- 内容分组 -----------------------------------------------------------
  const groups = new Map();
  for (const it of items) {
    const kind = KINDS[it.kind] ? it.kind : "post";
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(it);
  }
  // 保持固定顺序，避免每次刷新书架位置变化
  const order = ["paper", "patent", "award", "project", "post"].filter((k) =>
    groups.has(k),
  );
  if (groups.has("post")) {
    // 随笔通常最多，按每座书架容量切片，排成多座
    order.splice(order.indexOf("post"), 1);
    order.push("post");
  }

  const world = new THREE.Group();
  scene.add(world);
  scene.add(buildStars(900));
  scene.add(buildFloor(SHELF_RADIUS));

  const pickables = [];
  const total = order.length;
  const legends = [];

  order.forEach((kind, index) => {
    const angle = (index / Math.max(1, total)) * Math.PI * 2;
    const books = groups.get(kind);
    // 每个分类最多一本书架放 26 本，超出的折成多座
    const chunkSize = 26;
    const chunks = [];
    for (let i = 0; i < books.length; i += chunkSize)
      chunks.push(books.slice(i, i + chunkSize));

    chunks.forEach((chunk, ci) => {
      const shelf = buildShelf(chunk, kind);
      // 沿圆周摆放，弧面朝内，让位于圆心的相机看到书脊
      const a = angle + ci * 0.18;
      shelf.position.set(
        Math.sin(a) * SHELF_RADIUS,
        0,
        Math.cos(a) * SHELF_RADIUS,
      );
      shelf.rotation.y = a + Math.PI; // 面向圆心（相机方向）
      world.add(shelf);
      pickables.push(...shelf.userData.bookMeshes);
    });

    legends.push({ kind, count: books.length });
  });

  // --- HUD 图例 -----------------------------------------------------------
  const hud = document.getElementById("world-hud");
  if (hud && legends.length > 0) {
    const legend = document.createElement("div");
    legend.className = "world-legend";
    legend.innerHTML = legends
      .map(({ kind, count }) => {
        const cfg = KINDS[kind] || KINDS.post;
        const hex = "#" + new THREE.Color(cfg.color).getHexString();
        return (
          '<span><i style="background:' +
          hex +
          '"></i>' +
          cfg.label +
          " " +
          count +
          "</span>"
        );
      })
      .join("");
    hud.appendChild(legend);
  }

  const listLink = document.getElementById("world-list-link");
  if (listLink) {
    listLink.addEventListener("click", (ev) => {
      ev.preventDefault();
      root.setAttribute("data-world-state", "idle");
      const fb = document.getElementById("world-fallback");
      if (fb)
        fb.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "start",
        });
    });
  }

  // --- 交互 ---------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);
  const tip = createTip(stage);
  const interaction = attachInteraction({
    canvas,
    camera,
    raycaster,
    pointer,
    pickables,
    group: world,
    tip,
    reducedMotion,
  });

  // --- 尺寸自适应 ---------------------------------------------------------
  const resize = () => {
    const w = canvas.clientWidth;
    const h = Math.max(1, canvas.clientHeight);
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);

  // --- 渲染循环：页面不可见时自动停帧，避免后台耗电 ----------------------
  let running = true;
  let last = performance.now();
  const loop = (now) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    interaction.tick(dt);
    // enableDamping 与 autoRotate 都要求每帧调用 update()
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
    } else if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  });

  // 供调试使用（构建时 terser 会移除 console，所以把状态挂到 window 上）
  window.__worldState = {
    items: items.length,
    shelves: order.length,
    books: pickables.length,
    reducedMotion,
  };

  return window.__worldState;
}
