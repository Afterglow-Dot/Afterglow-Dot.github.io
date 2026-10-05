---
layout: page
title: 示例项目（把这个文件当模板）
description: 一句话说明这个项目做什么。这段文字会显示在项目卡片上。
img: assets/img/prof_pic.jpg
importance: 1
category: 科研项目
---

这是一个**模板文件**，演示项目页可以怎么写。内容确定后，请把标题、描述和图片改掉，
或者直接删掉这个文件，改名新建 `_projects/1_你的项目名.md`。

## 项目背景

说明项目要解决的问题。

## 我负责的部分

- 具体工作一
- 具体工作二

## 结果

写下结论、指标或者收获。

---

### 写项目卡片要用的 front matter

| 字段 | 作用 |
| --- | --- |
| `title` | 卡片标题 |
| `description` | 卡片上的一句话简介 |
| `img` | 卡片背景图，放在 `assets/img/` 下 |
| `importance` | 排序，数字越小越靠前 |
| `category` | 分类，需与 `_pages/projects.md` 里的 `display_categories` 一致 |
| `github` | 可选，填仓库链接会在卡片上生成代码按钮 |
| `redirect` | 可选，填了则点击卡片直接跳转到该网址 |

### 在正文里放图片

先把图片放到 `assets/img/posts/`（或 `assets/img/`）下，然后：

```liquid
{% raw %}{% include figure.liquid path="assets/img/prof_pic.jpg" title="图片说明" class="img-fluid rounded z-depth-1" %}{% endraw %}
```

多图并排用 Bootstrap 栅格：

```html
<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    {% raw %}{% include figure.liquid path="assets/img/prof_pic.jpg" class="img-fluid rounded z-depth-1" %}{% endraw %}
  </div>
  <div class="col-sm mt-3 mt-md-0">
    {% raw %}{% include figure.liquid path="assets/img/prof_pic.jpg" class="img-fluid rounded z-depth-1" %}{% endraw %}
  </div>
</div>
```
