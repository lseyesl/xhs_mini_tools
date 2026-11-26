# 小红书小工具工作区

## 工作区约定

- 本仓库使用 pnpm monorepo。新小工具放在 `apps/<tool-name>/`，包名使用 `@xhs-mini-tools/<tool-name>`，并在各自的 `package.json` 中声明依赖和脚本。多个小工具实际共用的代码可放在 `packages/`，使用方通过 `workspace:*` 声明依赖。
- 从仓库根目录运行 `pnpm install`，共用根目录的 `pnpm-lock.yaml`。开发或检查单个小工具时，用 `pnpm --filter <包名> run <脚本>`。需要检查整个工作区时，使用根目录的 `pnpm check`。
- 进入具体项目时，继续遵循该目录下的 `AGENTS.md`。新增项目时，把项目自己的开发、验证和交付约定写在项目目录下。

## 技能与交付

- 仓库级技能统一放在 `.agents/skills/`。开发或打包小红书小工具时，读取 `minitool-zip-builder/SKILL.md` 及相关引用文档，按容器规范校验、修复并打包。报告实际执行的校验和 ZIP 路径。
- 平台管理操作适用 `redapp-cli` 技能。登录、上传、生成平台预览、送审和修改平台信息需要用户明确授权。

## 规划文件

- 使用 `planning-with-files-zh` 时，优先遵循用户指定的路径。默认将 `task_plan.md`、`findings.md` 和 `progress.md` 统一放在仓库根目录的 `.planning/<task-folder>/`。
- 创建前先检查 `.planning/` 下是否已有相关任务目录，有则读取并复用。新任务目录使用简短、稳定的英文 kebab-case 名称。同一任务的后续工作沿用原目录。
