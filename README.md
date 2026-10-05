# 我的的个人网站

这是我的个人网站仓库，基于 [al-folio](https://github.com/alshedivat/al-folio) 主题搭建。  
网站用于记录研究生期间的学习、科研与生活，也会分享课程笔记、代码实践和日常思考。

- 🌐 网站地址：<https://afterglow-dot.github.io>
- 📝 定位：研究生在读，通信工程，记录学习与生活。

---

## 📁 项目结构

| 目录 / 文件 | 作用 |
| :--- | :--- |
| `_config.yml` | 网站全局配置：标题、作者、URL、社交链接、插件等 |
| `_data/` | 数据文件：社交链接、简历、期刊缩写、共同作者等 |
| `_pages/` | 固定页面：关于我、博客、简历、项目、论文等 |
| `_posts/` | 博客文章和首页短动态 |
| `_projects/` | 项目展示页面的内容 |
| `_bibliography/` | 论文 BibTeX 文件（`papers.bib`） |
| `_news/` | 首页新闻动态（备选，也可以用 `_posts` 的 `inline: true`） |
| `assets/` | 图片、CSS、JS、PDF 等静态资源 |
| `.github/workflows/` | GitHub Actions 自动部署配置 |

---

## 🚀 部署方式

每次向 `main` 分支推送代码，GitHub Actions 都会自动构建网站并部署到 `gh-pages` 分支。不需要手动操作。

- 查看部署状态：进入 GitHub 仓库的 **Actions** 页面。
- 部署成功后，网站会在 1-3 分钟内更新。
- 如果 Actions 显示红色叉号，点进去查看报错日志。

---

## 🎨 自定义外观

- **主题色**：al-folio 内置多套配色方案。编辑 `_sass/_themes.scss`，取消注释你想要的主题。
- **字体**：编辑 `_sass/_base.scss` 中的 CSS 变量。
- **网站图标**：修改 `_config.yml` 中的 `icon` 字段（支持 emoji）。
- **首页布局**：编辑 `_pages/about.md` 的 YAML 头部，可以开关“代表性论文”“新闻动态”“最新文章”等模块。

---

## 📄 许可证与致谢

- 主题：[al-folio](https://github.com/alshedivat/al-folio)，遵循 MIT 许可证。
- 本站内容（博客文章、图片等）版权归Dajie Li所有，未经允许请勿转载。

---

© 2026 Dajie Li. 保留所有权利。
