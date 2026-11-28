---
layout: default
title: 导航
subtitle: 记录学习，也记录生活
permalink: /links/
description: "常用网站与工具导航：学习、科研、工具与友链。"
nav: true
nav_order: 6
links_page: true
---

<div class="links-stage">
  <div class="links-canvas" id="links-canvas" aria-hidden="true"></div>

  <noscript>
    <style>
      .sites-tabs { display: none; }
      .sites-panels { display: block; }
      .sites-panel { visibility: visible; opacity: 1; transform: none; }
      .sites-panel + .sites-panel { margin-top: 1.4rem; }
    </style>
  </noscript>

  <div class="links-inner">
    <section class="links-card" aria-labelledby="links-title">
      <div class="links-clock" id="links-clock" role="timer" aria-label="当前时间">
        <span data-clock="hours">--</span>
        <span class="links-clock-sep" aria-hidden="true">:</span>
        <span data-clock="minutes">--</span>
        <span class="links-clock-sep" aria-hidden="true">:</span>
        <span data-clock="seconds">--</span>
      </div>

      <p class="links-date" id="links-date">&nbsp;</p>

      <h1 class="links-title" id="links-title">{{ site.first_name }} {{ site.last_name }}</h1>

      <p class="links-tagline">
        <span class="links-tagline-text">{{ page.subtitle }}</span>
        <span class="links-tagline-dot" aria-hidden="true"></span>
      </p>

      {% include site-groups.liquid %}
    </section>
  </div>
</div>
