p = "README.md"
s = open(p, encoding="utf-8").read()
s = s.replace("""打开方式：**双击 `index.html`**（不需要构建、不需要服务器）。离线也能用，字体与图片都已本地化。""",
"""在线地址：**https://ablazed-gold.github.io/Golden/** （GitHub Pages，免费域名）
仓库：https://github.com/Ablazed-Gold/Golden

打开方式：**双击 `index.html`**（不需要构建、不需要服务器）。离线也能用，字体与图片都已本地化。""")
s = s.replace("""## 许可与来源""",
"""## 部署（GitHub Pages）

站点是纯静态的，不需要构建：仓库根目录就是站点根目录。

- 线上：`https://ablazed-gold.github.io/Golden/`
- Pages 源：`main` 分支 `/` 根目录，`.nojekyll` 让 GitHub 跳过 Jekyll
- 更新：本地改完 `git add -A && git commit -m "..." && git push`，Pages 会自动重新发布（约半分钟）
- 自定义域名（可选）：在仓库 Settings → Pages 填 Custom domain，并在域名服务商加一条 CNAME 指向 `ablazed-gold.github.io`；想要根域名就用 `Ablazed-Gold.github.io` 作为仓库名

## 许可与来源""")
open(p, "w", encoding="utf-8").write(s)
print("readme ok")
