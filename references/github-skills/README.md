# AI 视频工作流参考资料

这些文件是 2026-08-24 从公开 GitHub 仓库下载的设计参考，不会被项目当作运行指令、插件或可执行代码加载。各目录保留原始许可证。

| 来源 | 本地文件 | 应用到星幕的设计 |
|---|---|---|
| [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | `moneyprinterturbo/SKILL.md` | 无密钥时明确缺失项；每个任务报告产物与下一步；剧本、配音、字幕、素材、剪辑形成完整交付链路 |
| [SeaArt Storyboard Prompt Assistant](https://github.com/seaartpublic/skills/tree/main/storyboard-prompt-assistant) | `seaart-storyboard/SKILL.md` | 单镜头默认 2–6 秒；全局风格锁；身份/场景/风格/首尾帧引用职责；声音、字幕和连续性字段 |
| [AI Video Skill](https://github.com/0xadvait/ai-video-skill) | `ai-video-skill/SKILL.md`、`reference/*.md` | 主体→动作→摄影机→风格→约束五段式提示；生成前检查；逐镜质检；失败原因与可复用经验回写 |

## 当前实现映射

- `server/prompts.mjs`：版本化任务、生成前检查、五段式视频提示、成片质检 JSON 契约。
- `src/main.jsx`：无 API 手动工作流、任务依赖、复制状态、文件/JSON 回收、下一任务解锁。
- `src/styles.css`：手动任务进度、阻塞/已复制/已回收状态，以及浅色主题适配。

引用这些思路不代表集成或代替上游工具本身；真实生成仍由用户选择的外部平台或本项目已配置的 API 完成。
