# 星幕 · AI 影像创作工作台

面向 AI 短剧、AI 视频和 AI 漫剧的全流程创作平台。当前版本已经把小说导入、剧本改编、角色与声音、分镜设计、素材生成、可撤销剪辑和项目导出串成同一份项目数据。

## 已实现闭环

1. 导入 TXT / Markdown / JSON 小说，并设置集数、时长、题材、改编强度、视觉风格和画幅。
2. 采用“原著分析 → 故事圣经 → 单集节拍 → 对白医生 → 分镜导演 → 连续性审查”的分阶段管线，生成世界规则、人物弧光、开场钩子、集尾悬念和可拍摄场次。
3. 建立角色圣经，并分别路由人物形象、环境背景和角色声音模型。
4. 自动设计镜头 DNA：景别、机位、运镜、构图、主体/环境动作、光线、首尾帧、负面约束和连续性锚点。
5. 把分镜转换为多轨时间线；支持选择片段、拆分、素材入轨、轨道锁定、缩放、撤销与重做。
6. AI 剪辑先生成可审查提案，用户确认后再以可撤销操作写入字幕轨。
7. 导出包含完整项目与时间线决策的 `.json` 项目包。

导入小说后可点击生产链路右侧的“一键推进”，平台会按顺序完成角色图、角色声音、环境、全部镜头和 AI 初剪，并在剪辑台等待用户确认提案。每一步结果都会写回浏览器和 `server/data/`，刷新后仍可恢复。

服务默认启用真实生成严格模式：没有密钥、模型无权限或供应商请求失败时会明确报错，不再返回伪造的成功结果。页面右上角“模型与 API 接入中心”可以直接配置 API Key、验证连接、选择任务路由并查看版本化规范提示词；密钥只保存在本机服务端配置中，浏览器接口只会读取连接状态与掩码。

真实视频闭环为：提交 Runway 任务 → 服务端保存任务 ID → 前端轮询 → 成功后将远程 MP4 下载到 `server/data/assets/<project-id>` → 视频 URL 写回分镜、时间线和项目 JSON。浏览器关闭后，再次打开项目会从服务端任务记录恢复已完成的视频。人物图、环境图和声音同样落盘到项目素材目录，不会把大段 Base64 写入项目 JSON。

文本侧接入 OpenAI、Anthropic、Qwen、DeepSeek、Gemini；图像侧接入 GPT Image 2 与 Gemini Image；声音侧接入 ElevenLabs；视频侧通过 Runway API 接入 Gemini Omni Flash、Seedance 2、Gen-4.5、Veo 3.1 和 Gen-4 Turbo。开发者仍可显式关闭严格模式体验确定性演示结果，但页面会清楚标记其并非真实 AI 产物。

## 运行

```bash
pnpm install
pnpm run doctor
pnpm build
pnpm start
```

打开 `http://127.0.0.1:4174`。`pnpm start` 会同时提供生产前端和 `/api/*` 编排接口。

前端开发：

```bash
pnpm dev
```

`pnpm run doctor` 会检查 Node/pnpm、FFmpeg/FFprobe、`libx264`、字幕滤镜、端口、数据目录权限、磁盘空间和可选 TTS 状态。TTS 未安装或未启动不会阻断编辑；FFmpeg/FFprobe 缺失时服务仍可启动，但“导出真实 MP4”会在导出前显示安装或路径配置原因并阻止提交。

项目设置支持 `16:9`、`9:16`、`1:1` 和 `24/25/30fps`；渲染会保留时间线空隙、源入点与播放速度，重叠或不支持的输出规格会在成片前明确拒绝。

### 无云密钥的本地闭环

云端 API Key 不是编辑和真实成片的前置条件。复制 `.env.example` 为 `.env` 后，保持所有云端密钥为空、`LOCAL_TTS_AUTOSTART=false`，导入自己拥有使用权的本地视频、音频和 SRT，即可完成时间线编辑、真实预览、音画字幕混合和 MP4 导出。没有 TTS 时，声音生成仅显示手动回收路径；没有 FFmpeg 时，项目包仍可导出，MP4 按导出预检提示安装或设置 `FFMPEG_PATH` / `FFPROBE_PATH`。

### 数据目录与升级回退

默认数据目录为 `server/data/`；生产使用建议在 `.env` 设置独立的绝对 `DATA_DIR`，这样移动或替换代码目录不会覆盖项目、媒体、任务和备份。升级前先运行项目备份入口或复制该数据目录；升级失败时停止服务、恢复旧代码并保留同一 `DATA_DIR`，再运行 `pnpm run doctor` 和 `pnpm start` 验证回退。

需要 SQLite 生产存储时使用 Node 22.5+，先在服务停止状态执行一次干运行和迁移：

```bash
pnpm migrate:sqlite
pnpm migrate:sqlite -- --apply
```

迁移会把项目/任务 JSON 原文件复制到 `DATA_DIR/.sqlite-migration-backup/`，不删除源文件；确认报告后在 `.env` 设置 `STORAGE_BACKEND=sqlite`，可选用 `SQLITE_DATABASE` 指定同一本机数据盘上的数据库路径。SQLite 使用 WAL、事务 revision 冲突和任务唯一幂等键；Node 不具备 `node:sqlite` 时继续使用默认原子 JSON 存储并给出明确诊断。

模型接入：

```bash
copy .env.example .env
pnpm start
```

密钥只由 `server/` 读取；`.env` 已被 Git 忽略，不会进入单文件前端。

配置并验证 OpenAI、Gemini、ElevenLabs 与 Runway 后，可执行一次只生成单镜头、控制费用的真实闭环验收：

```bash
pnpm test:e2e:live
```

测试会真实生成剧本、人物图、环境图、角色声音、一个视频镜头与 AI 剪辑方案，并把所有产物保存为一个可从首页重新打开的项目。缺少任一路线的密钥时会以退出码 2 停止，不会回退到 Mock。

## 交付方式

- `dist/`：正式构建输出为带 hash 的外部 JavaScript/CSS/媒体资源；真实生成必须通过 `pnpm start` 访问本地编排接口。需要单文件演示包时使用 `pnpm build:demo`，输出到 `dist-demo/`。
- `server/index.mjs`：Node 原生 HTTP 服务，提供小说解析、项目存储、模型路由和生产前端静态托管。
- `server/data/`：本地项目 JSON、供应商配置、异步任务和生成媒体存储。

### 生成可分享源码发布包

```bash
pnpm release:package -- --output C:\\path\\to\\xingmu-release
```

发布包生成器拒绝覆盖已有目录，并排除 `node_modules`、构建产物、`.env`（保留 `.env.example`）、`server/data`、历史基线、缓存、日志、临时文件和本地工具产物；生成 `release-manifest.json` 记录文件数量、字节数和 SHA-256。需要将已构建的 `dist/` 一并带出时追加 `--include-dist`。发布包接收方按上面的安装、`doctor`、`build`、`start` 步骤验证，不携带用户项目或供应商凭据。

真实 MP4 合成使用项目中已通过真实性探测的本地媒体和 FFmpeg；不需要云端模型授权，也不会把模拟进度伪装成 MP4。没有可验证的本地画面、FFmpeg/FFprobe 或字幕滤镜时，服务端和导出界面都会返回结构化阻断原因。Runway 实时适配器已同时支持文生视频和图生视频，不再强制要求首帧 URL。

当前发布验收见 [docs/RELEASE_ACCEPTANCE_2026-09-08.md](./docs/RELEASE_ACCEPTANCE_2026-09-08.md)；历史验证结果见 [QA_REPORT.md](./QA_REPORT.md)，调研依据见 [RESEARCH.md](./RESEARCH.md)。

可直接导入的验收案例位于 [examples/雾港来信.txt](./examples/雾港来信.txt)，界面中的“填入案例小说”使用相同内容。
