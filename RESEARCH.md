# 星幕 AI 视频平台：产品调研摘要

本项目将公开课程与开源项目的方法落实为产品工作流，而非复制其代码或视觉资产。

## 创作方法

- Runway Prompting Guide：文生视频提示词拆为画面描述和运动描述；图生视频主要描述动作、环境运动、镜头运动、节奏与方向；从简单提示逐项迭代；使用正向、具体、无冲突的语言。https://academy.runwayml.com/guides/prompting-guide
- Google DeepMind Veo Prompt Guide：提示词需明确景别与运镜、视觉风格、光线、角色及声音；镜头语言直接决定叙事视角。https://deepmind.google/models/veo/prompt-guide/
- ElevenLabs Voice Design：角色声音描述应明确年龄、音色、节奏、口音/语调和质量；预览台词要与声音设定一致。https://elevenlabs.io/docs/eleven-creative/voices/voice-design/

## 参考架构

- TapNow Agent / Creative Canvas：把文本、图像、视频和音频作为可复用节点；允许在“分析、剧本、分镜、生成”之间设置审批边界；针对单个结果修订并保留已确认内容。https://docs.tapnow.ai/en/docs/agent/tapnow-agent
- TapNow Video Retake：原素材不覆盖，使用分段镜头计划、固定机位、切换视角、平滑运镜、首尾帧捕获生成相连版本。https://docs.tapnow.ai/en/docs/canvas/generate-and-edit-video
- MovieAgent：用导演、编剧、分镜师、场景经理等角色进行分层规划，重点解决长视频叙事、人物一致性、字幕和音频稳定。https://github.com/showlab/MovieAgent
- StoryMind：先产出带景别、运镜、光线和精确角色描述的逐镜头清单，再开始视频生成。https://github.com/LinHao-city/StoryMind
- cinema-director：九阶段制片管线，在剧本、角色圣经和分镜阶段加入 AI 评分、人工审核与重试门槛。https://github.com/noid-one/cinema-director

- AI Video Production Editor：采用 Script → Director pass → Concepts → Storyboard → AI filming → Continuity review → Re-film → Timeline → Export 的完整制片流程。https://github.com/LudwigKienle/ai-video-production-editor
- BlueFish：角色/场景参考复用、多模型适配、字幕/音效/音乐接入时间线，且支持无密钥 Mock 模式。https://github.com/bluefish2026/BlueFish
- OpenScene：本地优先项目存储、统一编辑命令层，以及 AI 与人工操作共用同一套时间线变更接口。https://github.com/Theorvane/openscene
- Timeline Studio：浏览器本地优先、多轨编辑、可移植时间线数据与 AI JSON 指令执行器。https://github.com/MartinDelophy/ai-video-editor
- OpenVideo React Editor：PixiJS / WebCodecs 多轨编辑与客户端渲染架构（商业采用前需检查双重许可）。https://github.com/openvideodev/react-video-editor
- CineGen：多轨时间线、节点生成流程、逐格重生成和元素引用。https://github.com/christopherjohnogden/CineGen
- MoneyPrinterTurbo：从主题自动生成文案、素材、字幕、配乐，支持横竖屏与多模型供应商。https://github.com/harry0703/MoneyPrinterTurbo
- Pireel：纯浏览器时间线、动效字幕和客户端导出思路。https://github.com/pireel/pireel

## 官方模型接口

- OpenAI Responses API：剧本、对白和剪辑决策。https://platform.openai.com/docs/api-reference/responses
- OpenAI Image API：环境背景与概念图。https://platform.openai.com/docs/api-reference/images
- Gemini Image：人物设定图与身份锚点。https://ai.google.dev/gemini-api/docs/image-generation
- ElevenLabs Text to Speech：角色声线与情绪化对白。https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- Runway API：镜头图生视频任务与任务状态轮询。https://docs.dev.runwayml.com/api/

## 2026-08 模型路由建议

### 小说、剧本和台词

- GPT-5.6：总编剧、复杂改编、结构化剧本和质量复核；1.05M 上下文，适合作为高质量默认路线。https://developers.openai.com/api/docs/guides/latest-model
- Claude Opus 5：人物关系、自然对白、叙事润色与长篇阅读。https://platform.claude.com/docs/en/about-claude/models/overview
- Qwen3.8-Max：中文长篇、结构化输出和国内 API 部署。https://help.aliyun.com/zh/model-studio/text-generation-model
- DeepSeek V4 Pro / Flash：百万上下文的剧情推理与高吞吐批量场次。https://api-docs.deepseek.com/quick_start/pricing/
- Gemini 3.1 Pro：超长原著拆解与多模态参考；批量任务可用稳定版 Gemini Flash。https://ai.google.dev/gemini-api/docs/models

### 视频生成

- Gemini Omni Flash：优先用于多输入、角色一致性和多轮对话式视频编辑。
- Seedance 2：文本、图像、视频参考，适合强运镜、参考控制与原生音频。
- Runway Gen-4.5：电影质感、文生/图生视频和专业母版。
- Veo 3.1：原生音频、首尾帧、最多三张参考图和镜头延展。
- Wan2.7：国内部署、文生/图生/参考生视频；首尾帧串联适合长叙事。

Runway 当前官方模型路由与接口：https://docs.dev.runwayml.com/guides/models/ ，Veo 3.1 参数：https://ai.google.dev/gemini-api/docs/video ，Wan2.7：https://help.aliyun.com/zh/model-studio/video-generate-edit-model

## 本项目的落地范围

三种创作模式、小说解析、六阶段编剧室、故事圣经、专用模型路由、导演画布、镜头 DNA、首尾帧、负面约束、角色/服装/道具/场景轴线连续性、多轨时间线、真实拆分/撤销/重做、素材入轨、AI 剪辑提案审批、字幕轨写入和项目包导出。无密钥时使用 Mock；真实密钥只放服务端。项目吸收的是架构方法，没有复制上述开源项目的代码或视觉资产。
