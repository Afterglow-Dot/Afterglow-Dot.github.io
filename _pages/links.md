---
layout: default
title: Links
subtitle: 记录学习，也记录生活
permalink: /links/
description: "常用网站和工具导航。"
nav: true
nav_order: 6
links_page: true
links_name: Afterglow-Dot
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

      {% assign links_name = page.links_name %}
      {% if links_name == nil or links_name == blank %}
        {% assign links_name = site.first_name | append: ' ' | append: site.last_name %}
      {% endif %}
      <h1 class="links-title" id="links-title">{{ links_name | strip }}</h1>

      <p class="links-tagline" aria-label="{{ page.subtitle | escape }}">
        <span class="links-tagline-text">{{ page.subtitle }}</span>
        <span class="links-tagline-dot" aria-hidden="true"></span>
      </p>

      {% include site-groups.liquid %}
    </section>
  </div>
</div>
