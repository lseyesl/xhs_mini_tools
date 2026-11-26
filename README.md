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

## 开发与交付

在 Codex 中使用 `$minitool-zip-builder` 开发或打包小工具，由该 Skill 指引核对当前容器规范、修复问题、审计产物并生成 ZIP。ZIP 根目录必须包含 `index.html`。本地打包后，在创服平台模拟器以及 Android、iOS 真机上验证同一份 ZIP。
