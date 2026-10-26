---
# ============================================================================
# 论文列表页
# ============================================================================
# 【注意】这个页面会自动读取 `_bibliography/papers.bib` 里的内容。
# 目前还没有发表论文，所以这个页面暂时是空白的。
# 以后有了论文，只要在 papers.bib 里按格式添加，页面就会自动更新。
# ============================================================================
layout: page
permalink: /publications/
title: Publications
description: "我的论文列表。"
nav: true           #把页面加入导航栏
nav_order: 4        #导航栏中的位置
---

<!-- _pages/publications.md -->

<!-- Bibsearch Feature -->

{% include bib_search.liquid %}

<div class="Publications">

{% bibliography %}

</div>
