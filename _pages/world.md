---
# ============================================================================
# 3D 科研大厅（/world/）
# ============================================================================
# 【这是什么？】
# 一个用 Three.js 渲染的 3D 书架大厅。论文、专利、获奖、项目、博客
# 会各自变成一排书架上的“书”，可以拖动旋转、滚轮缩放、点击进入。
#
# 【重要设计原则】
# 1. 本页只使用 layout: page，不新建 _layouts/ 目录。
#    （本仓库的 test/style_contract.js 禁止 _layouts/_includes/_sass，
#      一旦创建会让 unit-tests.yml 失败。）
# 2. 所有样式都写在本页 <style> 里，因此只影响 /world/，其他页面零影响。
# 3. 下面 #world-fallback 是静态降级列表：JS 或 WebGL 不可用时，
#    访客仍能正常浏览全部内容。这是本页的“安全网”，不要删。
# 4. 书架数据来自 #world-data 里的 data-* 属性，构建时由 Liquid 生成，
#    运行时零网络请求。
#
# 【以后新增内容】
# 不用改这里，也不用改 world.js —— 在 _patents/ / _awards/ / _projects/
# / _posts/ 里加文件，或往 _bibliography/papers.bib 里加条目，书架会自动多一本。
# ============================================================================
layout: page
permalink: /world/
title: 科研大厅
description: 把论文、专利、获奖、项目与随笔摊开成一座 3D 书架。
nav: true
nav_order: 7
---

<!-- _pages/world.md -->

<div id="world-root" data-world-state="idle">

  <div class="world-layer" id="world-stage">
    <canvas id="world-canvas" aria-label="3D 科研书架" role="img"></canvas>
    <div class="world-hud" id="world-hud">
      <div class="world-title">科研大厅</div>
      <div class="world-hint">拖动旋转 · 滚轮缩放 · 点击书本进入 · <a href="#world-fallback" id="world-list-link">切换到列表</a></div>
    </div>
  </div>

  <noscript>
    <p class="text-muted">你的浏览器未启用 JavaScript，下面是可以直接浏览的列表版本。</p>
  </noscript>

  <div id="world-fallback">
    <h2>论文</h2>
    {% if site.data.citations and site.data.citations.size > 0 %}
      <ul>
        {% for paper in site.data.citations %}
          <li>{{ paper[0] }}</li>
        {% endfor %}
      </ul>
    {% else %}
      <p class="text-muted">论文列表请见 <a href="{{ '/publications/' | relative_url }}">Publications</a> 页面。</p>
    {% endif %}

    <h2>专利</h2>
    {% if site.patents.size > 0 %}
      <ul>
        {% for patent in site.patents %}
          <li>
            <a href="{{ patent.url | relative_url }}">{{ patent.title }}</a>
            {% if patent.category %}（{{ patent.category }}{% if patent.status %} · {{ patent.status }}{% endif %}）{% endif %}
          </li>
        {% endfor %}
      </ul>
    {% else %}
      <p class="text-muted">还没有专利记录。</p>
    {% endif %}

    <h2>获奖</h2>
    {% if site.awards.size > 0 %}
      <ul>
        {% for award in site.awards %}
          <li>
            <a href="{{ award.url | relative_url }}">{{ award.title }}</a>
            {% if award.level %}（{{ award.level }}{% if award.rank %} · {{ award.rank }}{% endif %}）{% endif %}
          </li>
        {% endfor %}
      </ul>
    {% else %}
      <p class="text-muted">还没有获奖记录。</p>
    {% endif %}

    <h2>项目</h2>
    {% if site.projects.size > 0 %}
      <ul>
        {% for project in site.projects %}
          <li><a href="{{ project.url | relative_url }}">{{ project.title }}</a></li>
        {% endfor %}
      </ul>
    {% else %}
      <p class="text-muted">还没有项目。</p>
    {% endif %}

    <h2>随笔与笔记</h2>
    {% if site.posts.size > 0 %}
      <ul>
        {% for post in site.posts limit: 30 %}
          <li>
            <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
            <small class="text-muted">{{ post.date | date: "%Y-%m-%d" }}</small>
          </li>
        {% endfor %}
      </ul>
    {% else %}
      <p class="text-muted">还没有文章。</p>
    {% endif %}

  </div>

  <!-- ======================================================================
       书架数据：构建时由 Liquid 生成，运行时被 world.js 读取。
       使用 data-* 属性而不是内联 JSON，原因：
       Liquid 4.0.4 没有 jsonify 滤波器，而手工拼 JSON 遇到标题里的
       引号或 </script> 会破坏整个页面。data-* + escape 是 HTML 语义上
       正确的转义方式。
       注意：本列表始终保留在 DOM 中（即使 3D 加载成功后也只是隐藏），
       因为点击书架的深度链接仍需要它。
       ====================================================================== -->
  <div id="world-data" style="display: none" aria-hidden="true">
    {% for patent in site.patents %}
      <span class="world-item"
            data-kind="patent"
            data-title="{{ patent.title | escape }}"
            data-url="{{ patent.url | relative_url }}"
            data-tag="{{ patent.category | default: '专利' | escape }}"
            data-meta="{{ patent.status | default: '' | escape }}"
            data-date="{{ patent.date | date: '%Y-%m-%d' }}"></span>
    {% endfor %}

    {% for award in site.awards %}
      <span class="world-item"
            data-kind="award"
            data-title="{{ award.title | escape }}"
            data-url="{{ award.url | relative_url }}"
            data-tag="{{ award.level | default: '获奖' | escape }}"
            data-meta="{{ award.rank | default: '' | escape }}"
            data-date="{{ award.date | date: '%Y-%m-%d' }}"></span>
    {% endfor %}

    {% for project in site.projects %}
      <span class="world-item"
            data-kind="project"
            data-title="{{ project.title | escape }}"
            data-url="{{ project.url | relative_url }}"
            data-tag="{{ project.category | default: '项目' | escape }}"
            data-meta=""
            data-date=""></span>
    {% endfor %}

    {% for post in site.posts limit: 60 %}
      <span class="world-item"
            data-kind="post"
            data-title="{{ post.title | escape }}"
            data-url="{{ post.url | relative_url }}"
            data-tag="{{ post.categories | first | default: '随笔' | escape }}"
            data-meta=""
            data-date="{{ post.date | date: '%Y-%m-%d' }}"></span>
    {% endfor %}

  </div>
</div>

<!-- ==========================================================================
     本页专属样式（内联，仅 /world/ 生效，不写入任何主题文件）
     ========================================================================== -->
<style>
  /* --- 1. 打破 layout: page 的 930px 容器宽度限制 -------------------------
     仅当本页存在时生效（:has 检测）。不支持 :has 的浏览器会退回到
     正常的 930px 容器布局，功能不受影响，只是舞台没那么宽。 */
  @supports selector(:has(*)) {
    body:has(#world-root) .container {
      max-width: none;
      padding-left: 0;
      padding-right: 0;
    }
    body:has(#world-root) .post,
    body:has(#world-root) article {
      margin: 0;
      max-width: none;
    }
  }

  /* --- 2. 舞台层 --------------------------------------------------------- */
  #world-root {
    position: relative;
  }

  .world-layer {
    position: relative;
    height: 78vh;
    min-height: 440px;
    margin: 0;
    border-radius: 12px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.45s ease;
    background: radial-gradient(ellipse at 50% 40%, #0b171f 0%, #04070d 70%, #01030a 100%);
  }

  #world-root[data-world-state="ready"] .world-layer {
    opacity: 1;
    pointer-events: auto;
  }

  #world-root[data-world-state="failed"] .world-layer {
    opacity: 1;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #world-canvas {
    display: block;
    width: 100%;
    height: 100%;
    outline: none;
    touch-action: none; /* 让 OrbitControls 接管触屏拖动，避免整页跟着滚 */
  }

  /* --- 3. HUD：必须浮在 canvas 之上，否则点不到书 ------------------------ */
  .world-hud {
    position: absolute;
    top: 14px;
    left: 16px;
    right: 16px;
    z-index: 10;
    pointer-events: none; /* 只有链接本身可点，其余穿透到 canvas */
    font-size: 0.85rem;
    color: #cfe8f5;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.85);
  }

  .world-hud a {
    pointer-events: auto;
    color: #4fc3f7;
    text-decoration: underline;
  }

  .world-title {
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: #eaf6ff;
    margin-bottom: 4px;
  }

  .world-hint {
    opacity: 0.8;
  }

  .world-legend {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .world-legend span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .world-legend i {
    width: 9px;
    height: 9px;
    border-radius: 2px;
    display: inline-block;
  }

  /* 悬停时浮出的标题卡 */
  #world-tip {
    position: absolute;
    z-index: 11;
    max-width: 320px;
    padding: 9px 12px;
    border-radius: 8px;
    background: rgba(6, 16, 24, 0.9);
    border: 1px solid rgba(79, 195, 247, 0.45);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.6);
    color: #eaf6ff;
    font-size: 0.82rem;
    line-height: 1.45;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  #world-tip.is-visible {
    opacity: 1;
  }

  #world-tip .tip-tag {
    display: block;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    opacity: 0.75;
    margin-bottom: 3px;
  }

  /* --- 4. 静态降级列表 --------------------------------------------------- */
  #world-fallback {
    padding-top: 6px;
  }

  #world-fallback h2 {
    font-size: 1.05rem;
    margin: 1.4rem 0 0.5rem;
    padding-bottom: 0.3rem;
    border-bottom: 1px solid rgba(128, 128, 128, 0.28);
  }

  #world-fallback ul {
    padding-left: 1.15rem;
    margin-bottom: 0.4rem;
  }

  #world-fallback li {
    margin-bottom: 0.3rem;
    line-height: 1.55;
  }

  #world-root[data-world-state="ready"] #world-fallback {
    display: none;
  }

  #world-root[data-world-state="loading"] #world-fallback::before {
    content: "正在搭建 3D 书架…若长时间无响应，可直接使用下方列表浏览。";
    display: block;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    opacity: 0.7;
  }

  /* --- 5. 无障碍与性能偏好 ---------------------------------------------- */
  @media (prefers-reduced-motion: reduce) {
    .world-layer {
      transition: none;
    }
    #world-tip {
      transition: none;
    }
  }

  /* 触屏设备：给舞台多一点高度，并提示用单指拖动 */
  @media (pointer: coarse) {
    .world-layer {
      height: 68vh;
    }
  }
</style>

<script type="module">
  // 3D 模块从 CDN 动态加载，且只在 /world/ 这一页发生，
  // 不会进入全站主包，因此其他页面的性能完全不受影响。
  const root = document.getElementById("world-root");
  const dataEl = document.getElementById("world-data");

  const fallback = (reason) => {
    if (root) root.setAttribute("data-world-state", "failed");
    const stage = document.getElementById("world-stage");
    if (stage && !stage.querySelector(".world-error")) {
      const note = document.createElement("p");
      note.className = "world-error";
      note.style.cssText = "color:#cfe8f5;padding:24px;text-align:center;margin:0";
      note.textContent = "3D 视图不可用（" + reason + "）。请使用下方列表浏览。";
      stage.appendChild(note);
    }
  };

  // 仅检查 window.WebGLRenderingContext 存在是不够的：显卡驱动被禁用、
  // 远程桌面、无头环境都可能拿到了构造函数却创建不出上下文。
  // 因此这里真的试建一次上下文，用完立刻丢弃，不占显存。
  const webglAvailable = () => {
    try {
      const probe = document.createElement("canvas");
      const gl =
        probe.getContext("webgl2") ||
        probe.getContext("webgl") ||
        probe.getContext("experimental-webgl");
      if (!gl) return false;
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext(); // 主动释放探测用的上下文
      return true;
    } catch (e) {
      return false;
    }
  };

  if (!root || !dataEl) {
    // 结构缺失时不应抛错，页面保持可用
  } else if (!webglAvailable()) {
    fallback("浏览器或设备不支持 WebGL");
  } else {
    root.setAttribute("data-world-state", "loading");
    try {
      const mod = await import("{{ '/assets/js/world/world.js' | relative_url }}");
      await mod.initWorld({ root: root, dataEl: dataEl });
      root.setAttribute("data-world-state", "ready");
    } catch (err) {
      // 任何一种失败都退化为列表，页面永远可用
      fallback((err && err.message) || "加载失败");
      if (window.console && console.warn) console.warn("[world] 初始化失败：", err);
    }
  }
</script>
