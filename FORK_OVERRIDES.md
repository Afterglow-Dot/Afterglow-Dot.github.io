# 主题覆盖与本地新增清单（FORK_OVERRIDES）

本文件用于记录"我们从主题 gem 手里接管了哪些文件"，以及"我们在主题之外新增了哪些文件"。
主题（`al_folio_core` 及兄弟 gem）升级时，先看这份清单，能快速判断哪些地方需要人工比对。

当前基线：`al_folio_core 1.0.15` / Jekyll `4.4.1` / Liquid `4.0.4`（见 `Gemfile.lock`）。

---

## 一、覆盖的主题文件（shadow）

**当前：0 个。**

这是刻意的设计选择。本仓库作为用户站点虽然技术上可以 shadow 主题文件
（见 `docs/ARCHITECTURE.md` 关于 "local overrides are fully supported" 的说明），
但本仓库**保留了上游的 CI 工作流**，其中：

- `.github/workflows/unit-tests.yml` 第 70 行会执行 `npm run lint:style-contract`
- `test/style_contract.js` 第 68-72 行把以下路径列为**禁止存在**，存在即 `process.exit(1)`：
  - `_includes/`
  - `_layouts/`
  - `_sass/`
  - `_scripts/`
  - `assets/tailwind/`
  - `tailwind.config.js`
  - `assets/webfonts/`

因此本仓库的硬性约定是：

> **不要在根目录创建 `_layouts/`、`_includes/`、`_sass/`、`_scripts/`、`assets/tailwind/`、`tailwind.config.js`、`assets/webfonts/`。**

3D 大厅因此改用 `layout: page` + 页面内联 `<style>` 实现，而不是新建布局文件。
这样既绕开了禁令，又让所有样式天然只作用于 `/world/` 一页。

---

## 二、新增的站点文件（纯新增，不受主题升级影响）

| 文件                            | 作用                               | 主题升级风险             |
| ------------------------------- | ---------------------------------- | ------------------------ |
| `_patents/1_patent-template.md` | 专利条目模板                       | 无（纯内容）             |
| `_awards/1_award-template.md`   | 获奖条目模板                       | 无（纯内容）             |
| `_pages/patents.md`             | 专利列表页，`nav_order: 5`         | 低（依赖主题通用 class） |
| `_pages/awards.md`              | 获奖列表页，`nav_order: 6`         | 低（依赖主题通用 class） |
| `_pages/world.md`               | 3D 大厅页，`nav_order: 7`          | 低（自带全部样式，内联） |
| `assets/js/world/world.js`      | Three.js 场景（仅 `/world/` 加载） | 无（零耦合）             |
| `FORK_OVERRIDES.md`             | 本文件                             | 无                       |

### 依赖的主题能力（升级时重点回归）

这几个页面**复用**了主题的通用 class 与机制，主题大版本升级时需要目视确认：

1. **卡片样式 class**：`row row-cols-1 row-cols-md-3`、`card h-100 hoverable`、
   `card-body`、`card-title`、`card-text`。
   来源：主题的 `_includes/projects.liquid`（1.0.15 版本）。
   若主题更换卡片标记，`_pages/patents.md` 与 `_pages/awards.md` 的观感会退化，
   但**不会报错**（这是 `docs/ARCHITECTURE.md` 所述"静默失败"之一）。
2. **collection 机制**：`_config.yml` 的 `collections:` 中新增了 `patents` 与 `awards`，
   通过 `site.patents` / `site.awards` 访问。这是 Jekyll 原生能力，最稳。
3. **`nav` / `nav_order` front matter**：由主题的导航 include 消费。
   现有页面占用 1-4，新增页使用 5、6、7。
4. **`max_width: 930px` 容器**：`/world/` 用 `@supports selector(:has(*))` +
   `body:has(#world-root) .container` 打破宽度限制。
   如果主题改了容器 class 名（`.container`），该规则会失效 —— 表现是 3D 舞台
   只占 930px 宽，**功能不受影响**。

---

## 三、构建链上的三个已知陷阱

记录在此，避免以后重复踩坑。

1. **Liquid 4.0.4 没有 `jsonify` 滤波器。**
   `| jsonify` 会报 `Liquid::UndefinedFilter` 或静默输出空值。
   本项目的做法：在 `_pages/world.md` 中用 `data-*` 属性传递结构化数据，
   由 JS 读 `dataset`。不依赖任何 JSON 滤波器。

2. **purgecss 会扫描 `\_site/**/_.html`与`\_site/\*\*/_.js`，只输出压缩 `\_site/assets/css/\*.css`。\*\*
   因此：
   - 写在页面内联 `<style>` 里的规则**安全**（不在 `assets/css/` 内，不是 purgecss 的 `css` 输入）。
   - 仅由 JS 动态添加、且在 HTML/JS 中不是字符串字面量的 class 名**有被剪的风险**
     （`purgecss.config.js` 的 `safelist` 里 `medium-zoom-overlay` 就是为此存在的）。
   - 约定：`world.js` 中所有 class 名都以字符串字面量书写，不拼接。

3. **`jekyll-terser` 配置了 `compress.drop_console: true`。**
   生产构建会删掉 `console.log`。所以 `world.js` 把运行状态挂在
   `window.__worldState` 上，而不是只打日志。

---

## 四、本地开发提示

本机（Windows）**没有安装 Ruby / Jekyll / Node 全局环境**，
无法用 `bundle exec jekyll serve` 本地预览。推荐走 Docker：

```bash
docker compose up          # 然后访问 http://localhost:8080
```

注意端口是 **8080**（`docker-compose.yml` 映射 8080:8080），
不是 `docs/INSTALL.md` 另一处提到的 4000（那是非 Docker 的 `jekyll serve` 默认端口）。

首次拉镜像约 400MB。
