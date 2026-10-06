---
# ============================================================================
# 专利列表页
# ============================================================================
# 本页自动读取 `_patents/` 目录下的所有条目，按 importance 排序（数字小的靠前）。
# 以后新增专利：只需在 _patents/ 里新建一个 .md 文件，本页与 /world/ 都会自动更新。
# ============================================================================
layout: page
permalink: /patents/
title: Patents
description: 我的专利与软件著作权。
nav: true
nav_order: 5
---

<!-- _pages/patents.md -->

{% assign patents_sorted = site.patents | sort: "importance" %}

{% if patents_sorted.size > 0 %}

<div class="row row-cols-1 row-cols-md-3">
  {% for patent in patents_sorted %}
    <div class="col">
      <a href="{% if patent.redirect %}{{ patent.redirect }}{% else %}{{ patent.url | relative_url }}{% endif %}">
        <div class="card h-100 hoverable">
          <div class="card-body">
            <h2 class="card-title">{{ patent.title }}</h2>
            <p class="card-text">
              {% if patent.category %}<span class="badge badge-primary">{{ patent.category }}</span>{% endif %}
              {% if patent.status %}<span class="badge badge-success">{{ patent.status }}</span>{% endif %}
            </p>
            {% if patent.description %}<p class="card-text">{{ patent.description }}</p>{% endif %}
            <p class="card-text">
              <small class="text-muted">
                {% if patent.date %}{{ patent.date | date: "%Y-%m-%d" }}{% endif %}
                {% if patent.number %} &middot; {{ patent.number }}{% endif %}
              </small>
            </p>
            {% if patent.inventors.size > 0 %}
              <p class="card-text">
                <small class="text-muted">发明人：{{ patent.inventors | join: "、" }}</small>
              </p>
            {% endif %}
          </div>
        </div>
      </a>
    </div>
  {% endfor %}
</div>

{% else %}

<p class="text-muted">暂时还没有专利记录。在 <code>_patents/</code> 目录里新建一个 <code>.md</code> 文件即可添加。</p>

{% endif %}
