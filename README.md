# 小红书小工具工作区

这是一个 pnpm monorepo。每个小工具拥有独立的依赖、开发命令和 ZIP 产物。可复用的代码放进共享包，所有包共用根目录的 `pnpm-lock.yaml`。

| 路径 | 用途 |
| --- | --- |
| `apps/<tool-name>/` | 单个小工具及其 `package.json`。建议将静态构建产物放在该工具的 `dist/`，ZIP 放在 `artifacts/` |
| `packages/<package-name>/` | 多个小工具共用的组件、函数或配置 |
| `.agents/skills/` | 项目级 Codex 技能，包含小工具开发打包规范和管理 CLI |

## 新建小工具

在 `apps/<tool-name>/` 创建 `package.json`，包名使用 `@xhs-mini-tools/<tool-name>`，并设置 `"private": true`。在该目录声明工具自己的依赖，并根据所选构建方式定义所需脚本。

| 脚本 | 约定 |
| --- | --- |
| `dev` | 启动当前小工具的开发环境 |
| `build` | 生成离线 H5 静态文件 |
| `check` | 执行当前包的代码或产物检查 |
| `package:zip` | 构建、校验并打包当前工具，输出校验摘要和 ZIP 路径 |

在仓库根目录安装依赖，再按包名运行脚本。下面以已创建并定义了这些脚本的 `timer` 为例。

```sh
pnpm install
pnpm --filter @xhs-mini-tools/timer run dev
pnpm --filter @xhs-mini-tools/timer run build
pnpm --filter @xhs-mini-tools/timer run check
pnpm --filter @xhs-mini-tools/timer run package:zip
```

根目录的 `pnpm build`、`pnpm check` 和 `pnpm package:zip` 会在定义了对应脚本的工作区包中执行。需要引用共享包时，在使用方的 `package.json` 中声明，例如 `"@xhs-mini-tools/shared": "workspace:*"`。交付 ZIP 内的运行时资源应随产物一起打包。

## GitHub Pages 项目首页

站点首页会列出 `apps/` 中已配置 `pages` 的子项目，点击卡片进入该项目。当前已加入《红楼拾章》，访问路径为 `<仓库名>/red-chamber-choices/`。

1. 在 GitHub 仓库打开 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
2. 将配置推送到 `main` 后，打开 **Actions** 查看 **Deploy GitHub Pages**。之后每次推送到 `main` 都会重新部署，也可以在此手动运行。部署成功后，可从 **Settings → Pages** 查看站点地址。参考 [GitHub Pages 发布源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

新增子项目时，在其 `package.json` 里填写 `pages.title` 和 `pages.description`。可选的 `pages.cover` 是相对该子项目 `dist/` 的封面路径。子项目的 `build` 脚本须生成 `dist/index.html`。工作流将各项目发布到以目录名命名的子路径，主页链接会自动生成。

Pages 构建按子项目复用 `dist/pages-cache/` 中的静态产物。子项目或其工作区依赖发生变化时，重建受影响的项目。锁文件和共用构建配置变更会使所有缓存失效。Actions 会跨部署恢复这个缓存，找不到缓存的项目会自动构建。每次上传的 `dist/pages/` 都包含当次启用发布的完整项目列表。

在本地预览主页和子项目时，从仓库根目录运行下面的命令，然后打开 `http://127.0.0.1:4174/`。

```sh
pnpm pages:build
python3 -m http.server 4174 --bind 127.0.0.1 --directory dist/pages
```

## 开发与交付

在 Codex 中使用 `$minitool-zip-builder` 开发或打包小工具，由该 Skill 指引核对当前容器规范、修复问题、审计产物并生成 ZIP。ZIP 根目录必须包含 `index.html`。本地打包后，在创服平台模拟器以及 Android、iOS 真机上验证同一份 ZIP。
