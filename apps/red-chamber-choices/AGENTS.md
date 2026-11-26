# 红楼拾章

## 女性视角与细节体验

- 《红楼拾章》的特色在于细节带来的代入感。新增或修改 UI、交互、动效和文案时，从女性玩家的实际体验和场景中女性角色的处境出发，考虑她会先注意到什么、如何理解人物关系、能否按自己的节奏作出选择。以人物、情境和可获得的玩家反馈为依据，尊重女性玩家的审美与游玩偏好的多样性。
- 把体验落实到具体细节。检查文字层级与手机端可读性、按钮措辞与触控范围、对话停顿、地图与场景的切换，以及选择后的反馈。让纸艺、环境动效与界面反馈服务于当下的情绪和叙事，给阅读和决定留出空间。
- 从女性角色的立场呈现她的观察、欲望与取舍。用对话和情境让玩家理解各个选项的理由与后果。结算和徽章体现不同选择的含义与角色走过的经历，避免用单一的性格标准评判角色或玩家。
- 评审 UI 或交互改动时，在手机尺寸下走完涉及的流程。按实际点击顺序核对玩家能否看清状态、理解下一步、顺畅返回，以及关键反馈是否符合角色处境与场景情绪。

## 剧情和流程

- 当前原型围绕林黛玉展开，依次解锁荣国府、花冢、潇湘馆、凹晶馆。上一站的选择影响下一站的开场对话，四站结束后按累计选择结算并授予徽章。
- 保留地图与场景之间的完整切换。每站完成选择后可返回地图，也可点击「进入下一站」。进入下一站时先切回地图，让林黛玉沿路线移动，再打开目标场景。保留减少动态效果设置下的可用流程。
- 在 `src/story-data.js` 维护剧情、选项和徽章文案，在 `src/story.js` 维护解锁和计分逻辑。修改选项、计分或徽章时，核对 `scripts/story.test.mjs` 覆盖的分支和徽章可达性。进度通过 `src/app.js` 使用 `xhs.miniTool` Storage 保存在 `red-chamber-choices.v1`，调整数据结构时保留已保存进度的读取兼容性。

## 画面和资源

- 使用 `.agents/skills/papercraft/` 的纸艺风格。地图采用有厚度的纸艺建筑，场景和界面保持统一。徽章的主体图案与展示动效要能体现其各自的含义，并适配 `prefers-reduced-motion`。
- `src/paper-world.js` 管理 Canvas 场景、地图节点与行走路径。调整地图构图时，同步核对其 `mapPlates` 与 `scripts/render_map.py` 的 `LAYOUTS`，确保横竖版的建筑、站点和路线对齐。
- 随包资源存放在 `src/assets/papercraft/`。新增或更换资源时，同步核对 `scripts/artifact.py` 的打包清单。保持离线可运行，沿用 `src/index.html` 的本地经典脚本加载方式，兼容 ES2017 和 Chrome 61。

## 运行和验证

从仓库根目录执行以下命令。

```sh
pnpm --filter @xhs-mini-tools/red-chamber-choices run dev
pnpm --filter @xhs-mini-tools/red-chamber-choices run check
pnpm --filter @xhs-mini-tools/red-chamber-choices run build
pnpm --filter @xhs-mini-tools/red-chamber-choices run package:zip
```

开发服务地址为 `http://127.0.0.1:4173`。改动交互或画面时，在浏览器核对涉及的流程和布局。ZIP 产物位于 `apps/red-chamber-choices/artifacts/red-chamber-choices.zip`。
