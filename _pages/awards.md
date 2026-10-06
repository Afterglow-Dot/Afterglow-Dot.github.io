---
# ============================================================================
# 获奖列表页
# ============================================================================
# 本页自动读取 `_awards/` 目录下的所有条目，按 level（奖项级别）分组展示。
# 以后新增获奖：只需在 _awards/ 里新建一个 .md 文件。
# 分组顺序由下面的 levels 控制，想调整顺序就改这一行。
# ============================================================================
layout: page
permalink: /awards/
title: Awards
description: 我的竞赛与荣誉记录。
nav: true
nav_order: 6
levels: [国家级, 省级, 校级, 院级]
---

<!-- _pages/awards.md -->

{% assign awards_sorted = site.awards | sort: "importance" %}

{% if awards_sorted.size > 0 %}

{% for level in page.levels %}
    {% assign level_awards = awards_sorted | where: "level", level %}
    {% if level_awards.size > 0 %}

      <h2 id="{{ level }}">{{ level }}</h2>

      <div class="row row-cols-1 row-cols-md-3">
        {% for award in level_awards %}
          <div class="col">
            <a href="{% if award.redirect %}{{ award.redirect }}{% else %}{{ award.url | relative_url }}{% endif %}">
              <div class="card h-100 hoverable">
                <div class="card-body">
                  <h3 class="card-title">{{ award.title }}</h3>
                  {% if award.description %}<p class="card-text">{{ award.description }}</p>{% endif %}
                  <p class="card-text">
                    {% if award.rank %}<span class="badge badge-primary">{{ award.rank }}</span>{% endif %}
                    <small class="text-muted">
                      {% if award.date %}{{ award.date | date: "%Y-%m-%d" }}{% endif %}
                    </small>
                  </p>
                  {% if award.issuer %}
                    <p class="card-text"><small class="text-muted">{{ award.issuer }}</small></p>
                  {% endif %}
                </div>
              </div>
            </a>
          </div>
        {% endfor %}
      </div>

    {% endif %}
{% endfor %}

{# 如果某条记录的 level 不在上面的 levels 列表中，这里兜底展示，避免它“消失” #}
{% assign known_total = 0 %}
{% for level in page.levels %}
    {% assign n = awards_sorted | where: "level", level | size %}
    {% assign known_total = known_total | plus: n %}
{% endfor %}
{% if known_total < awards_sorted.size %}
    <h2 id="other">其他</h2>
    <div class="row row-cols-1 row-cols-md-3">
      {% for award in awards_sorted %}
        {% unless page.levels contains award.level %}
          <div class="col">
            <a href="{% if award.redirect %}{{ award.redirect }}{% else %}{{ award.url | relative_url }}{% endif %}">
              <div class="card h-100 hoverable">
                <div class="card-body">
                  <h3 class="card-title">{{ award.title }}</h3>
                  {% if award.rank %}<p class="card-text"><span class="badge badge-primary">{{ award.rank }}</span></p>{% endif %}
                  <p class="card-text">
                    <small class="text-muted">
                      {% if award.date %}{{ award.date | date: "%Y-%m-%d" }}{% endif %}
                      {% if award.issuer %} &middot; {{ award.issuer }}{% endif %}
                    </small>
                  </p>
                </div>
              </div>
            </a>
          </div>
        {% endunless %}
      {% endfor %}
    </div>
{% endif %}

{% else %}

<p class="text-muted">暂时还没有获奖记录。在 <code>_awards/</code> 目录里新建一个 <code>.md</code> 文件即可添加。</p>

{% endif %}
