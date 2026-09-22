# 星幕 AI 视频生产工作流研究与落地

更新时间：2026-08-24

## 结论

高质量 AI 短剧应使用“身份资产优先、首帧优先、逐镜生成、可撤销剪辑”的生产方式：

1. 创作简报：题材、受众、平台、画幅、时长、首秒钩子。
2. 剧本：故事圣经、人物弧光、场次目标/阻力/转折、对白与潜台词。
3. 角色与场景圣经：身份板、服装道具、空间拓扑、镜头轴线、光向和色板。
4. 分镜：一镜一动作，明确景别、角度、运镜、首尾帧与连续性锚点。
5. 镜头首帧：人物镜头先审核静态构图，再进入图生视频。
6. 视频：提示词主要描述主体运动、环境运动、摄影机运动、速度和时间顺序。
7. 声音：固定角色音色；对白、环境声、音乐分别管理。
8. 剪辑：首秒钩子、动作/视线匹配、J/L Cut、字幕、-14 LUFS、黑帧与静音检查。
9. 交付：按平台画幅、帧率和版权清单质检后导出。

## 来源与采用内容

- [YouTube Shorts 深度访谈](https://blog.youtube/creator-and-artist-stories/youtube-shorts-deep-dive/)：采用首秒钩子、短篇段落化叙事。
- [YouTube 观众留存说明](https://support.google.com/youtube/answer/9314415)：采用开场留存、峰值、重看点和流失点作为后续数据复盘指标。
- [Bilibili AI 动漫短剧进阶流程](https://www.bilibili.com/video/BV1PHyBBZEbt/)：采用角色库、场景库、分镜图、图生视频、声音克隆和导入剪辑台的分段生产思路。
- [Runway Image-to-Video Prompting Guide](https://help.runwayml.com/hc/en-us/articles/48324313115155-Image-to-Video-Prompting-Guide)：输入图负责构图、主体、光线和风格；文本提示主要描述运动。项目的 Runway 图生视频适配器已据此使用精简运动提示。
- [Google Veo 首尾帧 API](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-first-and-last-frames)：采用首帧/尾帧作为可检查的镜头边界。
- [ComfyUI](https://github.com/Comfy-Org/ComfyUI)：采用节点化工作流、工作流 JSON、队列与可恢复任务的工程思想；手动首帧任务已把 ComfyUI 列为目标平台。
- [StoryDiffusion](https://github.com/HVision-NKU/StoryDiffusion)：采用长序列角色一致性与条件图驱动的两阶段生成思路。
- [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)：采用脚本、TTS、字幕、素材、音乐和合成相互独立的服务阶段，以及批量生成后选择最佳结果的思路。

## 图生视频与文生视频

图生视频并非在所有情况下都更好，但对 AI 短剧的大多数人物镜头通常更稳定：

- 图生视频适合人物身份、服装、道具、构图、视线和场景位置需要延续的镜头。
- 文生视频适合创意探索、纯环境、抽象转场、特效和不要求固定人物的建立镜头。
- 输入图存在畸形手部、错误文字、错误透视或相互矛盾的运动暗示时，图生视频会放大问题；必须先审核首帧。
- 项目默认策略为人物镜头“先首帧后视频”，纯环境镜头允许文生视频预览。

## 已落地模块

- `server/pipeline.mjs`：九阶段流程体检、风险检测、生成模式建议。
- `server/prompts.mjs`：镜头首帧提示词任务与图生视频输入契约。
- `server/providers.mjs`：Runway 图生视频运动提示与首帧路由。
- `src/workflow.js`：首帧结果、视频结果、演示状态写回项目。
- `src/main.jsx`：工作流体检、首帧生成/导入、图生视频入口和无 API 首帧任务包。
