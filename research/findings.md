# 调研报告：参考站拆解 + 开源选型（E:\boke-ds）

> 调研日期 2026-11-15。方法：Invoke-WebRequest 抓 HTML/CSS/JS 原文 → node 正则统计 token → Playwright/Chromium 实地截图并执行实测（headless 下 WebGL2 可用，SwiftShader）。
> 所有"数字"都来自抓下来的原始文件（离线快照在 `research/refs/`），不是印象。
> 复现命令：`node research/scratch/shots.js`（截参考站）、`node research/scratch/serve.js 8099` + `node research/scratch/test-umd.js`（本地实测）。

---

## 0. 决策摘要（先看这张表）

| 模块 | 结论（一句话） | 体积 | 落地文件 |
|---|---|---|---|
| three.js | **继续用 r149 UMD（你已下载）或换 r160（最后一个 UMD 版）**；绝不用 ESM/importmap（双击 file:// 会 CORS 失败，已实测） | r149 608,081 B / r160 669,884 B | `research/vendor-candidates/three-0.160.0.min.js` |
| 平滑滚动 | Lenis 1.3.27 UMD，classic script，file:// 可用（已实测） | 18,815 B | `research/vendor-candidates/lenis_1.3.27.min.js` |
| 滚动揭示/文字错落 | **不引库**，手写 IntersectionObserver ≈45 行 | 0 B | `research/snippets/reveal.js` |
| 魔方 | **不 vendor，自写 ~400 行**（pivot 重挂载算法，参考 MIT 项目 60 行核心） | 0 B | `research/snippets/cube-core-sketch.js` |
| Loader 动画 | 自写：SVG 线描 + three 线框装配 + CSS 快门，已有可运行原型 | — | `research/snippets/loader-prototype.html` |
| 3D 打印区 | 程序化 three.js（无 GLB 就别用 model-viewer）；有 GLB 才考虑 `model-viewer`，且**必须 http 服务** | 1.07 MB（仅 GLB 方案） | `research/vendor-candidates/model-viewer_4.4.0.min.js` |
| 背景粒子/网格/等高线 | 自写 three `Points`/`InstancedMesh` + DPR 钳制；等高线直接复用 workspace 里已有的 contour SVG | — | 见 B.6 |
| 不要的 | GSAP/ScrollTrigger、AOS、ScrollReveal、locomotive-scroll、Swiper、anime.js、tween.js、Lottie、Shopify 的 html-in-canvas | — | 见 C.3 |

**一句话设计判断**：jiejoe 与 Shopify Editions 用两种完全不同的技术，但落到同一套手法 —— ①全站只有一个"全局单位变量"缩放所有字号；②每节一个主题色 + 滚动时整页背景过渡；③动画/图形优先、文字退为小号注脚；④全大写字 + 一个强强调色。这四条复制得起、也不侵权；WebGL 那层反而不用复制。

---

## A. 参考站拆解

### A.1 https://www.jiejoe.com （个人作品集站，最贴近"个人博客"）

**技术事实（抓包）**
- Vue 3 SPA：`#app` + `js/app.af23ac27.js`（1,543,620 B）+ `js/chunk-vendors.722787d9.js`（622,730 B）+ `css/app.7caea476.css`（59,529 B）。
- vendors 里含 **GSAP（32 处引用）、ScrollTrigger、Lenis（12 处）、Lottie（35 处）**；业务代码里 `IntersectionObserver` 出现 13 次；运行时 2 个 canvas（1440×900、540×360），`getContext` 仅 1 处 → 主体是 **DOM + GSAP + Lottie**，WebGL 只是点缀，不是全站渲染层。
- 字体：`@font-face{font-family:eng; src:woff2}`（MyFonts 商业授权，**不能拷**）+ `font-family:zh` 走 `local("思源黑体")/local("阿里巴巴普惠体-R")/local("Microsoft YaHei")`（系统字体栈，可学）。

**排版（可直接量化的部分）**
- 全局基准：`*{ font-size: 2vmin }` —— **1rem = 2vmin**，字号随视口抖动。
- 字阶全部是 `calc(var(--scale_nums) * N rem)`，N ∈ {.7, 1, 1.2, 3, 4.8, 6, 7.5, 9, 10} → 最大显示字 ≈ 20vmin（一屏字）。
- `--scale_nums` 响应式取 0.6/0.7/0.75/0.8/1/1.3/1.5/2；`--scale` 取 0.65/0.75/0.8/1（第二套缩放给图片/间距）。
- letter-spacing：`.05/.1/.2/.3rem`（即 vmin 的百分比），行高 ≈ 字号 ×1.1–1.2。
- 卡片圆角 1rem / 1.5rem / 2rem；首屏 100dvh。

**色彩**：`--theme_black:#171717`（body 背景，不是纯黑）、`--theme_white:#f7f7f7`、`--theme_green:#17f700`（唯一强调色，连 `meta theme-color` 都是它）。

**动效**：transition 时长分布 `.2s×2 / .3s×11 / .4s×10 / .5s×10 / .6s×2 / .8s×5 / 1s×2 / 1.2s×1`；19 个 @keyframes，长动画一律 `linear infinite`（`move_line 10s`、`hwv_circle 5s`、`vision_scrollline_mov 8s`）——**长循环用 linear，交互用 .3–.5s**。

**截图看到的东西**（`research/screenshots/jiejoe-top.png`）
- 首屏：巨号 condensed 全大写英文，**实心白 / 荧光绿填充 / 只有描边**三种字混排（"AND" 是描边字）；右侧一个线框三角体 + 彩色顶点小圆点；绿色径向渐变从左上角打进来。
- 底部一行双语小字：`- SCROLL CAREFULLY, IT'S SMOOTH -` / `小·心·地·滑`；右上胶囊 `CONTACT →`；左上圆形 Logo 章。
- 可复用的**不是** WebGL，是：vmin 基准 + 一套数字变量控全场字号；中英双语叠排的注脚；填充/描边混排标题；只有一个强色。

**不可复制**：MyFonts 授权字体文件、Lottie 作品动画、插画/头像/Logo（都是作者版权素材）。

### A.2 https://www.shopify.com/editions/fall2026 （本次最强参考：工业蓝 + 关系图 + 滚动换色）

**技术事实**
- Remix(RMX) + Tailwind 服务端渲染：HTML 1,173,468 B，外链资源只有 2 个（`entry.browser-*.js` 6,780 B + `tailwind-*.css` 174,660 B），其余全内联。
- 核心是自研渲染层：**`data-html-in-canvas-*` 出现 108 次**，DOM 节点被标记为 `-type` / `-solid` / `-flat`，上面盖一个全屏 `<canvas aria-hidden="true" class="pointer-events-none absolute left-0 top-0">`，由 canvas 重绘 DOM（`data-html-in-canvas-colour="#051DAA"` 指定每节底色）。
- 页面下左那个"3D 效果"开关：HTML 里**读不到按钮文案**（运行时由 JS 注入），但 `<html>` 上有状态位 `data-f26-canvas` / `data-f26-canvas-drawn` / `data-f26-canvas-settling` / `data-f26-canvas-game` 各 1 次 + `data-f26-hero-graph` 2 次 → 可以确定它是"DOM ⇄ Canvas 渲染"的切换，属 rmx 自研，**没有开源库可对标**。结论：别追这项技术。
- 字体：`"PP Neue Montreal"`（商业字体，不可用）+ Noto Sans JP 兜底。

**版式数字（这是最值钱的部分）**
- 章节标题：`.text-section-title{ font-size: clamp(2.4375rem, 13.8889vw - 5.44444px, 4rem); line-height:1; letter-spacing:-0.04em }`；桌面 `clamp(4rem, 11.2vw - 41.28px, 7.5rem)`。
- 章节节奏：`--f26-section-gap: max(160px, 60svh)`；`--f26-colour-lead: calc(.5 * var(--f26-section-gap) - 2.5svh)`。
- 容器 `max-w-1680`；圆角 `--radius-sm .25rem / lg .5rem / xl .75rem / 2xl 1rem`。
- 缓动：`--ease-out: cubic-bezier(0,0,.2,1)`、`--ease-in-out: cubic-bezier(.4,0,.2,1)`；跨节换色 `.6s cubic-bezier(.333,0,.667,1)`，换色距离 `40svh`。
- 另一个"全局单位"：内联样式里出现 `font-size: calc(var(--u) * 12 / 13 / 26)` —— `--u` 由 JS 写入（HTML 中无定义），一套单位驱动所有字号与图元尺寸。**注意：jiejoe 用 `--scale_nums`，Shopify 用 `--u`，两个站独立收敛到同一做法。**

**色彩系统（每节三色，直接可抄的"系统"）**
| 节 | base | surface(提亮) | button(压暗) |
|---|---|---|---|
| brand blue | `#051DAA` | `#0822B5` | `#071047` |
| pink | `#B2005B` | `#BE0062` | `#4B0128` |
| green | `#00632E` | `#007035` | `#002F17` |
| orange | `#B03400` | `#C13C00` | `#491903` |
| purple | `#7000A9` | `#7900B4` | `#310647` |
| slate | `#0F0F0F` | `#171717` | `#CECECE` |

配套：`[data-f26-section-color=blue]{--f26-section-background:var(--f26-color-brand)}` 这种"属性选择器切整套变量"的写法，外加每节的 `previous/next` 色（供按钮在色块交界处做对比反转）→ **这套模式在本站可直接用**（换成 Endfield 的黄/墨/薄荷）。

**滚动换色的实现（零 WebGL 也能做）**
`--f26-page-fill-0 … -10` 十一个变量被滚动驱动，body 背景是嵌套 11 层 `color-mix(in oklab, …)`。我们有更便宜的做法：给每节 `data-theme`，IO 切换 `<body>` 上的 `--bg` CSS 变量，`transition: background-color .6s cubic-bezier(.333,0,.667,1)`；`oklab` 可用 `color-mix(in oklab, …)` 给渐进增强。

**截图看到的东西**
- 首屏（`shopify-fall2026-top.png`）：左侧**竖排占满视口高度的巨号 "Exponential"**（tone-on-tone，蓝色比底色亮一档）；中左是蓝色小索引列 `Agentic 01 … Developer 11` + 3 张数据卡（含实物商品图）；右侧整块是**节点关系图**（每个板块一个节点、连线 + 编号 + 缩略卡片），背景近黑。
- 滚动到橙色节（`shopify-fall2026-s1.png`）：**整页背景变成该节主题橙 `#B03400`**，节点图变成同色系的浅色线作为固定背景层，正文缩成 14px 小块 + 虚线引线挂到节点上，左侧索引列常驻。
- 学到的是"**信息架构可视化成一张图**"——这张图本身就是导航（点节点跳节）。对个人博客 = 把 hero/about/skills/works/AI/training/cube/3D-print/contact 画成一张"站点拓扑图"，既当 loading 动画目标，又当 hero 背景与导航。

**不可复制**：rmx/html-in-canvas 实现、其品牌色整套照搬、PP Neue Montreal 字体、商品/插画/视频素材。

### A.3 https://www.nvidia.com/en-us/ （工业黑 + 单一品牌色）

**技术事实**：无 WebGL（首屏 canvas 数 = 0，Playwright 实测）；HTML 729,450 B，主 CSS 1,783,007 B；字体 `NVIDIA-NALA / NVIDIA-NALA Display`（品牌字体，不可用）；图标用 **Font Awesome 6 Pro**（商业授权，绝对不要拷）。

**数字**
- 字号走变量：`--text-12/14/16/18/20/24/36`（`--text-64` 极少）；字重 400 为主、`--font-weight-bold` 700、少量 900。
- 缓动只有一种主力：`cubic-bezier(.4,0,.2,1)`（38 处）；次要 `cubic-bezier(.4,0,.6,1)`。时长 `.2s ×142 / .1s ×53 / .25s ×22 / .3s ×16 / .4s ×14 / .5s ×80 / .6s ×8` → **工业感 = 极短**。
- 段落高度混用 `100vh ×64 / 90vh / 86vh / 80vh` 与 `100vw/50vw`；`clip-path` 12 处（切角/斜切）；圆角 `--radius-md 4px / lg 8px / xl`。
- 配色：`#000`、`#fff`、品牌绿 **`#76b900`（44 处）**、灰阶 `#898989/#757575/#666/#636363`、面板 `#1a1a1a`。

**可借**：黑底 + 唯一品牌绿 + 4–8px 小圆角 + `.2s` 动效 + 100vh 章节 + 少量 `clip-path` 切角。**工业感的配方其实是"暗底 + 高对比单一色 + 极短动效 + 大量等宽小标签"**，不是 WebGL。

### A.4 https://www.apple.com/apple-vision-pro/ （motion 参照）

- 字号阶梯：12 / 14 / 17 / 19 / 21 / 24 / 28 / 32 / 40 / 48 / 53px；font-weight 600 用得最多（51 次），400（21 次）。
- letter-spacing：大标题 `-0.022em / -0.01em`，正文 `+.011em`；颜色 `#1d1d1f` 墨 / `#86868b` 次 / `#f5f5f7` 浅底 / `#0071e3` 蓝。
- 章节 100vh / 200vh（滚动叙事）；圆角 980px（胶囊）、8/10/12/18px。
- 缓动 `cubic-bezier(0.47,0,0.75,0.72)`（遮罩）；时长 0.1s–1s；`@keyframes inline-media-spin .85s steps(8)` —— **`steps(8)` 是"机械步进"的廉价做法，很适合 Endfield 仪表盘**。
- 不可用：SF Pro 字体授权仅限 Apple 设备；版式、文案结构不要照搬。

### A.5 横向结论

| 值得借（可复制） | 绝不要复制 |
|---|---|
| 一个全局单位变量（`--u` / `--scale_nums`）统一缩放字号与图元 | 商业字体：MyFonts `eng`、PP Neue Montreal、SF Pro、NVIDIA-NALA、Endfield 官方字体 |
| 每节三色 `{base, surface, button}` + 属性选择器切变量 | 品牌色整套照抄（Shopify 蓝/粉/绿、NVIDIA 绿就是它们的身份） |
| 滚动驱动整页背景色过渡（CSS 变量即可，别上 WebGL） | html-in-canvas / rmx 这类自研 DOM→纹理渲染层 |
| `section-gap: max(160px, 60svh)` 的段落呼吸感 | Font Awesome **Pro** 图标（商业授权） |
| 竖排巨标题 + `01–11` 索引列 + 双语注脚 | 参考站的插画、商品图、视频、Lottie 动画 |
| 长循环 `linear infinite` + 交互 `.2–.5s` 的时长分层 | 其信息架构/文案结构（要写自己的真实内容，不要"AI 味"占位句） |

### A.6 可直接落地的设计参数（把上面三个站 + 你 workspace 里已有的 Endfield tokens 合成一套）

**色（来自 `vendor/endfield-ui-skill-main/assets/tokens.json`，与上方工业参考同源）**
- 墨底（暗主题，推荐默认）：`paper #191919` / `panel #222222` / `ink #EDEDED` / `ink2 #A3A3A3` / `rule #353535` / `chip #2E2E2E`
- 亮主题：`paper #F4F4F2` / `panel #FFFFFF` / `ink #161616` / `rule #D9D9D6`
- 唯一强调：`signal #FFFA00`（**只做填充/选中/线，不做大面积**）；三色细条常量：品红 `#FF00F0` / 黄 `#FFFA00` / 薄荷 `#00FFA2`（一屏最多一两处）
- 危险色 `#B3261E`（亮）/`#FF8A7A`（暗）

**字（注意：现有字体文件只有一个轴，见下方实测）**
- 实测：`assets/fonts/saira-latin-wght.woff2`（32,888 B）**只有 wght 轴，没有 wdth 轴** —— 用浏览器测同一段文字宽度：`font-stretch:100% / 125% / 75%` 三者宽度完全相同（440.73 / 440.73 / 440.73 px）。所以 `font-stretch:112%/125%` 在这份文件上**完全无效**（不会合成，也不会报错）。
- 两种解法：
  1. 换带 wdth 轴的 Saira：已下载 `research/vendor-candidates/saira-latin-wdth-wght.woff2`（98,912 B，v23 latin 子集，`font-weight:100 900; font-stretch:75% 125%`）。实测同样文字宽度 normal 440.73 / wide(125%) 521.28 / narrow(75%) 317.81 px → **轴确实生效**。代价：+66 KB（是 wdth 轴本身的开销）。
  2. 不换字体，用 `transform: scaleX(1.12)`（标签/字标）或 `letter-spacing` 假装宽体 —— 0 额外体积，但字形不会被真正拉宽变形正确（scaleX 会压笔画粗细），只适合短标签。
- 建议：正文/数字用现有 32,888 B 的 wght 版；只有需要"宽体字标"的 3–5 处元素用选项 2（scaleX），**不必为宽体引入 99 KB**。若整体视觉就靠宽体撑，再换 wdth 版。
- 之后：全大写 + `letter-spacing .14em` 才是 Endfield 那种"仪表标签"感的来源，不是靠字体宽度。
- 中文：系统黑体栈（思源黑体/阿里巴巴普惠体/微软雅黑/PingFang SC），不引入中文 webfont。
- 字阶建议（综合三站数字，落在 16px 基准 + clamp）：
  - display `clamp(3.2rem, 11.2vw - 41px, 7.5rem)` / lh 0.92 / tracking -0.04em（借 Shopify）
  - h2 `clamp(2rem, 5vw, 3.4rem)` / lh 1 / tracking -0.02em
  - 正文 15–16px / lh 1.6；小标签 11–12px / uppercase / tracking .14em；等宽数字 `font-variant-numeric: tabular-nums`（仪表读数感）
- 双语叠排：英文小字在上（uppercase, tracking .16em, 11px），中文粗体在下。
- 前缀 `//` 做段标题（来自 Endfield wiki 的共识做法）。

**节奏**：章节 `padding-block: max(120px, 22svh)`；模块间距用 `max(160px, 60svh)` 做"整屏段落"；容器 1440/1680 max-width，边距 `clamp(20px, 4vw, 64px)`。

**动效**：交互 `.2s / .3s` 标准缓动 `cubic-bezier(.4,0,.2,1)`；入场 `.5–.7s` `cubic-bezier(.2,.9,.1,1)`（慢起硬停）；换色 `.6s cubic-bezier(.333,0,.667,1)`；长循环 `linear infinite`。`prefers-reduced-motion` 全线降级为静态单帧。

---

## B. 开源清单（每个模块：真实项目 / 许可 / 体积 / CDN / 片段）

### B.1 three.js 版本 —— 只认 UMD，实测结论

**探测结果（`Invoke-WebRequest -Method Head` 实测 unpkg）**

| 版本 | `build/three.min.js` | 说明 |
|---|---|---|
| 0.149.0 | 200 | 你 `assets/vendor/three.min.js` 就是这版（608,081 B，MIT，无控制台告警） |
| 0.150.1 / 0.155.0 / 0.158.0 / 0.159.0 | 200 | 已开始打弃用警告 |
| **0.160.0** | **200（最后一个）** | 669,884 B；实测 `THREE.REVISION === "160"`；首行有 `console.warn` 弃用提示 |
| 0.161.0 / 0.170.0 / 0.180.0 | 404 | UMD 彻底移除；最新 0.187.0 仅 ESM |

**关键实测（决定架构的一条）**：`<script type="module">` 在 `file://` 下会被 CORS 拒绝（实测报 `Access to script at 'file:///…' from origin 'null' has been blocked by CORS policy`）。**如果最终是双击 `index.html` 打开，所有 ESM / importmap / addons（GLTFLoader 等）/ model-viewer 全部不可用**，只能用 classic script + 全局变量。这条比版本选择更重要。

**推荐**
1. 首选 **保持 r149 不动**（已在你 `assets/vendor/`，零风险、无告警；核心 API 全够用：`WebGLRenderer/Scene/PerspectiveCamera/Raycaster/EdgesGeometry/LineSegments/Points/ShaderMaterial/InstancedMesh`）。
2. 若想拿 r160：把 `research/vendor-candidates/three-0.160.0.min.js` 拷成 `assets/vendor/three.min.js` 即可（API 基本兼容，注意 r152+ 颜色管理默认开启 `ColorManagement.enabled`，同一个十六进制色会比 r149 更亮/更准，视觉要重调一次）。想消掉那一行告警，把文件第一行 `console.warn(...)` 删掉（不影响功能）。
3. 一律**不要**用 `GLTFLoader`/`OrbitControls` 等 addons —— r148 起 `examples/js` 已删除，只剩 ESM。

**加载片段**
```html
<script src="assets/vendor/three.min.js"></script>
<script>
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));   // 关键：钳制 DPR
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;              // r149 用 outputEncoding = THREE.sRGBEncoding
  renderer.setAnimationLoop(tick);                               // 比 rAF 更省心，停渲染好写
</script>
```

### B.2 平滑滚动：Lenis（唯一需要的外部库）

- 项目：https://github.com/darkroomengineering/lenis · **MIT** · v1.3.27（2026-10 更新）
- UMD：`https://unpkg.com/lenis@1.3.27/dist/lenis.min.js`（18,815 B，挂在 `globalThis.Lenis`，**classic script，file:// 下实测可用**）；jsDelivr 同路径 200。
- 你现有的 `assets/vendor/lenis.min.js` 是 1.1.20（14,242 B），也能跑；建议换 1.3.27（同样 10 行代码，更稳）。已下载：`research/vendor-candidates/lenis_1.3.27.min.js`。

```html
<script src="assets/vendor/lenis.min.js"></script>
<script>
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.4,
                            smoothWheel: !matchMedia('(prefers-reduced-motion: reduce)').matches });
  function raf(t){ lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
  lenis.on('scroll', ({ scroll }) => document.documentElement.style.setProperty('--sy', scroll)); // 给 CSS 做视差
  document.querySelectorAll('.scroll-inside').forEach(el => el.setAttribute('data-lenis-prevent', '')); // 内部滚动区
</script>
```
注意事项：Lenis 会接管 `wheel`，`position:fixed` 元素不受影响但要避免嵌套 `overflow:auto`；移动端 `touchMultiplier` 别调大（会飘）。

### B.3 滚动揭示 / 文字效果 —— 结论：**不要引库**（如实说明）

| 方案 | 许可/体积 | 判断 |
|---|---|---|
| AOS 2.3.4 | MIT / ~14 KB | 2019 年后停更，只能 opacity+translate，手写 40 行等效 |
| ScrollReveal 4.0.9 | MIT / ~8 KB | 2018 停更，同上 |
| locomotive-scroll 5 | MIT / ~20 KB | 停更、与 Lenis 功能重叠（它自己就是平滑滚动） |
| Motion One 13 | MIT / 18 KB | 好用，但 **ESM-only** → 双击 `file://` 直接失效 |
| GSAP 3.13+ + ScrollTrigger | 现全部免费（"no charge" license）/ UMD 71 KB + 42 KB | 只有需要**scroll pin / scrub 时间线**时才值；本站 Lenis+IO 已够 → 标"可选，不推荐" |
| 原生 `animation-timeline: view()/scroll()` | 0 B | Chrome 115+/Edge、Safari 26+ 可用；Shopify 自己就用 `@supports (animation-timeline:scroll())` 做增强。**建议作为渐进增强，主逻辑仍用 IO** |

可直接用的实现（完整版在 `research/snippets/reveal.js`）：
```js
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -12% 0px', threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
```
```css
.reveal{opacity:0;transform:translate3d(0,24px,0);
  transition:opacity .6s cubic-bezier(.4,0,.2,1) var(--d,0s),transform .6s cubic-bezier(.4,0,.2,1) var(--d,0s)}
.reveal.is-in{opacity:1;transform:none}
/* 标题逐字：拆 <span class="ch" style="--i:n">，delay:calc(var(--i)*26ms)，位移+微旋转 */
```
**唯一值得用原生 CSS 的地方**（0 依赖、性能最好，且参考站自己在用）：
```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .parallax img { animation: rise linear both; animation-timeline: view(); animation-range: entry 0% cover 60%; }
  }
}
```

### B.4 魔方（交互 three.js）—— 结论：**自写 ~400 行，不 vendor**

| 项目 | ★ | 许可 | 技术栈 / 最后提交 | 能否无构建直接用 | 评价 |
|---|---|---|---|---|---|
| [Aaron-Bird/rubiks-cube](https://github.com/Aaron-Bird/rubiks-cube) | 145 | MIT | TS + webpack，2025-08 | 否（TS+构建） | `src/layer-model.ts` 2.9 KB 就是 pivot 重挂载算法，**最值得抄的一页** |
| [taylorjg/rubiks-cube](https://github.com/taylorjg/rubiks-cube) | 29 | MIT | React + three，2026-11（最活跃） | 否（React+bundler） | `logic/notation.js` 9.7 KB 记谱法 + `three-app.js` 17.9 KB；含倒角 GLB |
| [joews/rubik-js](https://github.com/joews/rubik-js) | 99 | MIT | 纯 DOM/CSS，2020 停更 | 半 | 不是 three.js，方块是 DOM 面片 |
| [diervo/html5rubik](https://github.com/diervo/html5rubik) | 146 | MIT | CSS3D，2021 停更 | 半 | CSS 3D 转面，视觉不适合工业风 |
| [doodlewind/freecube](https://github.com/doodlewind/freecube) | 134 | MIT | 自写 WebGL，2019 停更 | 否 | 历史项目，代码不可复用 |
| [godlikemouse/jquery.cube.threejs.js](https://github.com/godlikemouse/jquery.cube.threejs.js) | 17 | **GPL-3.0** | 2020 停更 | 是 | **许可证传染，禁用** |

**为什么自写**：全部候选都要 TS/React/打包或已停更；而需求只有"27 个小方块 + 12 种层转动 + 拖拽"。核心 60 行（pivot 重挂载）+ 拖拽命中 80 行 + 打乱/还原 40 行 + Endfield 化外观（线框边、黄色高亮层、网格底座）100 行 ≈ 350–450 行，可控 60fps、颜色/材质完全统一，且不会引入构建步骤。

核心算法（已写成可移植草稿：`research/snippets/cube-core-sketch.js`，MIT 参考思路来自 Aaron-Bird 的 LayerModel）：
```js
// 转一层：把该层 cubie 临时挂到原点处的 pivot，转 90°，再还回 root 并烘焙世界变换
const layer = cubies.filter(c => Math.round(c.userData.home[axis]) === value);
layer.forEach(c => pivot.add(c));
pivot.rotation[axis] = THREE.MathUtils.damp(pivot.rotation[axis], target, 6, dt);
// 结束：getWorldPosition/Quaternion → 按 (CUBIE+GAP) 取整 snap → 写回 position/quaternion
//       ★ 必须同时更新 c.userData.home，否则下一次"选层"会错
```
三个必坑：①转动后用世界坐标**取整 snap**（否则浮点漂移，几次后选层失败）；②`home` 必须更新；③拖拽定轴时用射线命中的 **面法线** 而不是鼠标方向（`intersect.face.normal` → 取最大分量 → 另一个轴按拖动方向取正负）。

### B.5 3D + 2D 加载动画（Loader）—— 4 种模式，均可自写

1. **线框装配（three，已做可运行原型）** —— `research/snippets/loader-prototype.html`，截图 `research/screenshots/local-three-loader-test.png`。27 个 `LineSegments` 从 6 倍距离飞回晶格 + `easeOutQuart` + 每块 stagger（总 `.55`）+ 0.6 抛物线抬升，2.2s 完成；实测 r160 + WebGL2 通过。
   ```js
   const p = (now - t0) / 2200, e = 1 - Math.pow(1 - p, 4);
   const q = clamp((e - k/N*0.55) / (1 - k/N*0.55));       // 每块不同起点
   ln.position.lerpVectors(home.clone().multiplyScalar(6), home, 1-Math.pow(1-q,3));
   ln.scale.setScalar(0.01 + q*0.99);
   ```
2. **SVG 线描（0 依赖，最省）** —— `pathLength="1"` + `stroke-dashoffset:1→0`，按段 `animation-delay` 阶梯；Endfield 风直接用你 workspace 里现成的等高线：`vendor/endfield-ui-skill-main/assets/contours/contour-a.svg`（73,924 B）/ `contour-b.svg`（70,129 B）。
   ```html
   <svg viewBox="0 0 400 400"><path pathLength="1" d="…" class="draw"/></svg>
   <style>.draw{fill:none;stroke:#FFFA00;stroke-width:1.2;stroke-dasharray:1;stroke-dashoffset:1;
     animation:draw .9s cubic-bezier(.4,0,.2,1) forwards}
   @keyframes draw{to{stroke-dashoffset:0}}</style>
   ```
3. **Shader 斜切擦除（WebGL 版）** —— 全屏 quad + `uProgress`，`discard`/alpha 用 `smoothstep` 画一条斜线：
   ```glsl
   float edge = uv.y * 0.9 + uv.x * 0.1;
   float a = smoothstep(uProgress - 0.06, uProgress, edge); // 0→1 扫过
   gl_FragColor = vec4(uColor, a);
   ```
   离线等价物（更省，纯 CSS）：`mask-image: linear-gradient(105deg, #000 calc(var(--p) * 100% + 6%), transparent calc(var(--p) * 100% - 6%))`。
4. **快门 / 百叶（纯 CSS，结束帧）** —— 6–8 条竖板 `transform: scaleY(1→0)`，`delay` 每块 40ms，`cubic-bezier(.77,0,.175,1)`，总 ≈ 0.6s：
   ```css
   .shutter > i{display:block;height:100%;transform-origin:top;animation:bar .55s cubic-bezier(.77,0,.175,1) forwards;
     animation-delay:calc(var(--i)*40ms)}
   @keyframes bar{to{transform:scaleY(0)}}
   ```
5. **读数层**：等宽 `tabular-nums` 百分比 0→100（`countTo` 在 `reveal.js` 里）；参考 Endfield 官网加载页 = 深底 + 左侧一条随百分比变长的黄竖条 + 巨号黄色百分比 + 极淡等高线。
**建议时序**：0–1.2s 线框装配 / 0–1.4s 计数 0→100% → 1.45s 快门擦除 0.55s → hero 内容 stagger 入场（每行 60ms）。整段 ≤ 2.2s，且**必须可跳过**（点任意处/滚动即快进）。

### B.6 WebGL 粒子 / 网格 / 等高线背景 + 性能

**三种做法（按性价比排序）**
1. **点云**（最便宜）：`BufferGeometry` + `Points` + `PointsMaterial({size, sizeAttenuation:true, transparent, blending:THREE.AdditiveBlending, depthWrite:false})`，2 万–6 万点足够；颜色只用强调黄 + 少量薄荷，透明度当景深。
2. **实例化网格**（工业风最强）：`InstancedMesh(BoxGeometry(1,.06,1), mat, 60*60)`，每帧只改 `instanceMatrix`（或干脆在顶点着色器里按 uv 高度波动，CPU 0 开销）；每格高 0.02–0.2 之间，黄线只在 3–5 格上。
3. **等高线**：不要用 marching squares 实时算。直接拿现成 SVG/PNG 当背景层（workspace 已有 `contour-a/b.svg`），或用 `LineBasicMaterial` 画 8–12 条预计算折线，`opacity .12–.25`，`--f26` 那种"极淡、不闭合"的观感。

**性能清单（逐条都是实测/踩坑结论）**
- `setPixelRatio(Math.min(devicePixelRatio, 1.75))`；retina 手机上 3× 会直接掉一半帧。
- `alpha:false`（有纯色底时），`antialias:false` + 高 DPR 反而更划算。
- 用 `renderer.setAnimationLoop`，并用 `IntersectionObserver` 在 canvas 离开视口时 `setAnimationLoop(null)`；`document.addEventListener('visibilitychange')` 同步暂停。
- 每帧不要 `new THREE.Vector3()`（GC 抖动）；复用临时对象。
- 静态几何一次 `mergeGeometries` 或在 r149 用 `BufferGeometryUtils`（addons，不可用）→ 那就手写合并或减少 draw call。
- 大量小方块的描边不要用 `EdgesGeometry` × N（27 个 OK，1000 个不行）；用 `InstancedMesh` + 着色器画边。
- `renderer.info.render.calls` 盯在 < 30；`frustumCulled` 默认开着就够。
- `prefers-reduced-motion: reduce` → 只渲染一帧静态图（不启动 loop），这是无障碍硬要求也是省电。
- 移动端 `max-width: 768px` 直接关掉背景 WebGL，换纯 CSS 渐变/等高线（参考站也都这么降级）。

### B.7 3D 产品查看 / 爆炸图（用于 3D 打印区）

| 方案 | 许可 / 体积 | 结论 |
|---|---|---|
| [@google/model-viewer](https://github.com/google/model-viewer) 4.4.0 | Apache-2.0（内含 BSD-3 代码）/ `dist/model-viewer.min.js` **1,069,272 B** | 唯一像样的"开箱即用 3D 查看器"：`<model-viewer src="x.glb" camera-controls auto-rotate>` + `hotspot` + `ar`。**但 4.4.0 的 min 构建是 ESM**（classic script 实测报 `Unexpected token 'export'`），必须 `<script type="module">` + **http 服务**（实测 http 下 `customElements.get('model-viewer')` 为真、shadow canvas 存在、GLB 加载成功）。且它自带一份 three.js，页面会同时存在两份 three。 |
| three.js `GLTFLoader` | MIT | r148 起只有 ESM（`examples/jsm`），file:// + UMD 场景不可用 → 排除 |
| 爆炸图专用库 | — | **没有维护中的**。标准做法：读 GLB 的节点名/包围盒，按零件沿法线做偏移动画（≈20 行）；没有 GLB 时更简单——用多层 `BoxGeometry`/`CylinderGeometry` 沿 Y 轴分层展开。 |

**建议**：3D 打印区**先用程序化 three.js**（打印机龙门架：3 根方柱 + 横梁沿 X 往复 + 喷头下方一条 `LineSegments` 逐层堆叠），100% 可控、0 额外体积、颜色跟主题一致。**只有当你有真实 STL/GLB 模型**（比如自己打的作品）才上 model-viewer，且因为是模块脚本，需要以本地 http 方式打开（或把这个区块做成"点击后在 iframe 里加载"）。
另外 CSS `transform: perspective(1200px) rotateX/rotateY` + `transform-style: preserve-3d` 也能做分层爆炸（每层一个 div），对"3D 打印分层预览"这种正投影效果其实比 WebGL 更清楚——可作为 WebGL 的降级方案。

---

## C. 落地清单

### C.1 USE THIS（按优先级编号，含确切 URL / 体积 / 目标路径）

1. **three r149 UMD（保持现状）** — `assets/vendor/three.min.js`（608,081 B，MIT）。若升级：`research/vendor-candidates/three-0.160.0.min.js` → `assets/vendor/three.min.js`（669,884 B，最后一个 UMD）。
2. **Lenis 1.3.27 UMD** — `https://unpkg.com/lenis@1.3.27/dist/lenis.min.js`（18,815 B，MIT）→ `research/vendor-candidates/lenis_1.3.27.min.js`（18,815 B）→ `assets/vendor/lenis.min.js`。init 见 B.2。
3. **手写 reveal 系统** — `research/snippets/reveal.js`（2,534 B）→ 直接并进 `app.js` / `main.js`。
4. **Loader 原型** — `research/snippets/loader-prototype.html`（3,782 B，已实测 r160+WebGL2 可跑）→ 改写进 `index.html` 的 `#loader` 层。截图 `research/screenshots/local-three-loader-test.png`。
5. **魔方核心草稿** — `research/snippets/cube-core-sketch.js`（5,179 B）→ 移植成 `js/cube.js`（去掉 sketch 里的 TODO 注释、按最终坐标常量重算）。
6. **Endfield tokens** — `vendor/endfield-ui-skill-main/assets/tokens.json` + `assets/endfield.css`（已有，别重复造）；等高线素材 `vendor/endfield-ui-skill-main/assets/contours/contour-a.svg` / `contour-b.svg`。
7. **Saira 可变字体** — `assets/fonts/saira-latin-wght.woff2`（32,888 B，已有，**仅 wght 轴**）；`@font-face` 写 `font-weight:100 900`，**不要写 font-stretch**（无 wdth 轴，写了也没效果，见 A.6 实测）。要宽体字标时：短标签 `transform:scaleX(1.12)`，或换 `research/vendor-candidates/saira-latin-wdth-wght.woff2`（98,912 B，wdth+wght 双轴，实测有效）。
8. **截图与参考快照** — 见 D 节；Lead 可直接看 `research/screenshots/shopify-fall2026-top.png` 定首屏构图。
9. （可选）**model-viewer 4.4.0** — `research/vendor-candidates/model-viewer_4.4.0.min.js`（1,069,272 B，Apache-2.0）；仅当有 GLB 且能 http 打开时用。
10. （可选）**原生 scroll-driven animations** — 0 B，`@supports (animation-timeline: view())` 渐进增强，见 B.3。

### C.2 集成顺序（建议严格按此顺序，每步都能单独验收）

1. **token 层**：`:root` 定义色/字/间距/缓动变量 → 验收：改一个变量全站变色。
2. **字体**：Saira + 中文系统栈 + 双语标签模板 → 验收：h1/h2/正文/标签四档肉眼稳定。
3. **Loader 层**（独立 `#loader`，body 上 `data-loading`）：线框装配 + 计数 + 快门 → 验收：2.2s 内结束、可点击跳过、断开 JS 时 3s 超时自动移除。
4. **Lenis + IO reveal**：先接全局滚动与揭示 → 验收：滚动无抖动、reduced-motion 下全部静态。
5. **hero + 背景层**：点云/网格三选一（先做 CSS 渐变版，再叠 WebGL）→ 验收：1440×900 首屏截图与参考站同节奏。
6. **魔方**：IO 进入视口才 `init()`（离屏销毁 / 停 loop）→ 验收：拖拽转层、打乱、重置、60fps。
7. **3D 打印区**：程序化龙门架 → （有 GLB 再换 model-viewer）。
8. **滚动换色 + 章节索引**：Shopify 的"per-section 三色 + 背景过渡"换成 Endfield 色 → 验收：滚过 8 个章节背景色平滑过渡，索引列高亮跟随。

### C.3 DO NOT USE / 过度设计

| 不要 | 原因（一句话） |
|---|---|
| Shopify 的 `html-in-canvas` / `rmx` | 自研 DOM→texture 渲染层，无开源实现，不可维护，还有无障碍/版权风险 |
| ESM / importmap / `examples/jsm` addons | **file:// 下 CORS 直接失败**（已实测），本站要能双击打开 |
| GLTFLoader / OrbitControls | 同上，r148 起只剩 ESM |
| GSAP + ScrollTrigger | 71+42 KB 换来的只是 pin/scrub；Lenis + IO + CSS 已覆盖 95% |
| AOS / ScrollReveal / locomotive-scroll | 均停更且功能与手写 40 行重复；locomotive 与 Lenis 冲突 |
| Swiper / 任何轮播库 | 一个作品列表用 `scroll-snap` 十几行 CSS 就够 |
| anime.js / @tweenjs/tween.js | 层转动/计数/揭示用 10 行缓动函数即可，省 2 个依赖 |
| Lottie + lottie-web | 需要设计稿产出；Endfield 的机械感用 CSS/three 更准 |
| model-viewer（默认情况） | 1.07 MB + 需要 GLB + 必须 http，首页绝不要加载它 |
| 三个以上强调色同屏 / 大面积霓虹/发光/扫描线 | 参考站共同点：**只有一个强调色、一屏最多一两处三色细条**；发光=廉价科幻 |
| 从参考站拷字体/图标/插画/商品图 | MyFonts、PP Neue Montreal、SF Pro、NVIDIA-NALA、Font Awesome Pro 全是商业授权；Endfield 官方美术是版权素材 |
| "AI 味"填充文案（假技术词、条形码、十字准星、装饰小方点） | Endfield 官方设计里这些只是噪音；本站文案只用**真实**数据/编号/日期（这条与你 workspace 里 `references/research.md` §5 的结论一致） |

---

## D. 交付物 / 验证记录

### D.1 下载的 vendor 候选（可直接拷，全部实测不是 HTML 错误页）

| 文件 | 大小 | 校验/实测 |
|---|---|---|
| `research/vendor-candidates/three-0.160.0.min.js` | 669,884 B | SHA256 `170C6789F43217C96B3170F4B42FAFE135DE7F7CD48497A4218F9757EE1D49FA`；headless 实测 `THREE.REVISION="160"`、WebGL2=true |
| `research/vendor-candidates/lenis_1.3.27.min.js` | 18,815 B | SHA256 `80F53E77F1C13E379FC246D2B5E299188E20BCB2B2FE7EBB13E8E8C7563A6DA7`；`globalThis.Lenis`；file:// 实测可用 |
| `research/vendor-candidates/lenis_existing-assets.min.js` | 14,242 B | 你现有 `assets/vendor/lenis.min.js` 的副本（v1.1.20），留作对比 |
| `research/vendor-candidates/model-viewer_4.4.0.min.js` | 1,069,272 B | SHA256 `18B2E711035AA4705EE281530A55DC2338FF05EED3D70AE16D54105282A75ED5`；**ESM**，http 下实测可加载 GLB |
| `research/vendor-candidates/saira-latin-wdth-wght.woff2` | 98,912 B | SHA256 `D5F1EE1CE85A2F6611D76BCD98738132F4706B099DC167F02C2093A1EC5EB975`；v23 latin 子集，wght 100–900 + wdth 75%–125%；实测宽轴生效（440.73→521.28px @125%） |

### D.2 参考站离线快照（`research/refs/`）
`jiejoe.html` / `jiejoe_app.css`（59,529 B）/ `jiejoe_app.js`（1,543,620 B）/ `jiejoe_vendors.js`（622,730 B）· `shopify-fall2026.html`（1,173,468 B）/ `shopify_tailwind.css`（174,660 B）/ `shopify_entry.js`（6,780 B）· `nvidia_*.html`（729,450 B）/ `nvidia_site.css`（1,783,007 B）· `apple_vision.css`（324,749 B）· token 统计 `t_apple.json` / `t_nvidia.json` / `t_shopify.json`。

### D.3 截图（`research/screenshots/`）
`jiejoe-top.png` / `-s1` / `-s2`（1440×900）· `shopify-fall2026-top.png` / `-s1` / `-s2` · `nvidia-home-top.png` / `-s1` / `-s2` · `local-three-loader-test.png`（自建 three 线框装配原型，1280×800）· `local-modelviewer-test.png`（http 下 GLB 加载成功）。

### D.4 可复现脚本（`research/scratch/`）
`analyze.js`（CSS/JS token 统计）· `report.js` · `shots.js`（参考站截图）· `serve.js`（本地 http，端口 8099）· `test-umd.js` / `test-mv.js`（UMD/ESM 实测）。Playwright 1.49.1 + Chromium 已装在 `research/scratch/node_modules`（复用即可，别再下载）。
