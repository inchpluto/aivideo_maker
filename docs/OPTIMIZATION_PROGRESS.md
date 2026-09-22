# 星幕优化进度账本

此文件由执行模型持续维护。主方案：[OPTIMIZATION_PLAN.zh-CN.md](./OPTIMIZATION_PLAN.zh-CN.md)。

## 当前状态

- 更新时间：2026-09-16
- 当前交付阶段：S0/T01 已完成，T02.3 与 T03.2 已完成，T04.1/T04.2/T04.3/T04.4 已完成，T05.1/T05.2 已完成，T06.1/T06.2/T06.3 已完成，T09.1/T09.2/T09.3/T09.4 已完成，T10.1/T10.2/T10.3/T10.4/T10.5/T10.6/T10.7 已完成，T11.1/T11.2/T11.3/T11.4/T11.5/T11.6 已完成，T13.1–T13.7 已完成，T12.1–T12.7 已完成，T12 继续进行，T14.1–T14.3 的离线契约与错误矩阵已完成、真实回放仍待外部条件，T15.1–T15.3 已完成，T16.1–T16.5 已完成，T17.1–T17.4 已完成，T17 继续进行，T18.1–T18.4 已完成，T18 已完成，T19.1 已完成，T19.2/T20 性能夹具与交互测量子项已完成，整体进行中
- currentTask：T23 本地浏览器交付门禁与 T22 安装交付复核
- nextAction：继续 T23 的完整 local_v1 矩阵，优先补多项目组合、服务停止尾请求诊断和更高并发；随后复核 T22 安装器/签名/目标机条件。缺少真实条件时保持 T22/local_v1 pending，不生成伪交付物
- 执行方式：单个智能体；禁止新开子智能体
- local_v1：pending
- api_verified_v1：pending_external_verification
- hosted_v2：not_requested
- 本轮持续优化已直接修改业务代码，完成 SQLite 项目包冲突复制/资产登记、字幕 HEAD 与原生下载校验、渲染取消竞态和重试预设隔离，并完成双项目及 1:1/25fps 隔离浏览器回放；生产构建输出位于 `dist/`

## 任务状态

允许状态：pending / in_progress / blocked / done / not_requested。done必须有行为证据；仅完成方案不能把实施任务标done。大任务可在下面追加Txx.1子任务，母任务所有必需验收完成才done。

| ID | 内容 | 主要前置 | 状态 | 验收证据/剩余动作 |
| --- | --- | --- | --- | --- |
| T01 | 基线、开发连通、最低检查 | 无 | done | 已建立 `.local-baseline-2026-09-05/` 快照；补齐忽略规则、packageManager/Node范围、Vite回环代理、离线 check/lint；`scenePromptContext` 未定义已由 lint 发现并修复。行为证据见本轮记录 |
| T02 | 运行错误、异步、真实反馈 | T01 | in_progress | 已修复未导入函数、后台任务项目隔离、FreeformCanvas 过期项目写回/最新节点合并、剪贴板独立错误和剪辑点跳转；合法非 `project-` 项目 ID 现可在列表中发现，缺失媒体读取不再使服务进程退出；真实浏览器 A/B 任务与渲染切换已验证，仍需多任务状态 UI 收口 |
| T03 | 保存、revision、配置并发 | T01 | in_progress | 已修复 localStorage 配额错误不应阻断服务端保存；保存协调器已做 500ms 去抖/单次在途/dirty 合并；已加入 revision 409 冲突弹窗、保留本地副本/重载服务端版本，旧 JSON 首次保存自动迁移 revision；两个真实浏览器标签页已验证旧 revision 冲突不静默覆盖、服务端保留 A 版本且 B 显示仅本地；本轮用独立 Node 进程并发更新 provider 字段/路由执行记录，配置与音色库均通过共享文件锁保留全部独立更新；新增 IndexedDB 完整草稿、localStorage 小元数据、启动水合门禁、服务恢复自动补交，隔离浏览器已验证停服务修改→刷新恢复→重启 API 自动保存→再次刷新保持；SQLite 生产切换、多标签普通保存完整回归仍待完成 |
| T04 | 质量门禁、手动模式 | T01 | in_progress | T04.1 已将分镜硬条件与 score 分离；T04.2 已拒绝空 URL、demo/mock/placeholder/simulated 和未探测媒体；T04.3 已落地 ffprobe 元数据、远程/手动结果传递及单镜无对白手动门禁；T04.4 已拒绝输入变更后的旧视频结果；双标签页冲突 UI 已真实验证，其他质量回归继续收口 |
| T05 | 本地访问与输入安全 | T01 | in_progress | T05.1 已增加 Host 白名单、带 Origin 请求的主机一致性检查、JSON 请求体 12MB 上限和 413 响应；T05.2 已实现资产/渲染产物 Range、HEAD 和越界 416；T05.3 已对媒体签名/真实探测、伪造 MIME、损坏/超大上传、越界路径和私网远程 URL 做真实拒绝矩阵；大文件流式和浏览器攻击路径仍待完成 |
| T06 | 统一时间线、命令、迁移 | T02,T03,T04 | in_progress | T06.1 已统一 `sourceOffset/sourceIn/sourceOut` 与渲染 `-ss/-t`；T06.2 已接通真实渲染入口；T06.3 已增加同轨重叠门禁；真实 FFmpeg profile 审计现覆盖源入点、空隙、变速、16:9/9:16/1:1 与 24/25/30fps；旧 JSON/项目包 HTTP 导入和重启后时间线字段已有真实审计，编辑器跨场景回归仍待完成 |
| T07 | 流式媒体、探测、Range | T05,T06 | in_progress | 已完成真实性探测、Range/HEAD 与服务端媒体读取；`/api/assets/media` 限额流式落盘后再签名/ffprobe并原子移入资产目录，远程 provider 媒体也按每跳 DNS 固定地址流式落盘，新增 `Content-Range + uploadId` 服务端续传、偏移冲突和中断后客户端继续；项目包 inspect/import/GET export 已接入无压缩 ZIP 的原生流式 reader/writer，保留旧 Buffer API 兼容；真实分块/Range/远程类型推断/客户端断点/取消清理/真实 HTTPS 重定向与 DNS 地址固定，以及浏览器大文件取消清理、再次导入和刷新恢复审计通过；媒体哈希/资产元数据完整登记与长期缓存清理仍待继续核对 |
| T08 | 真实画面渲染 | T06,T07 | in_progress | 已移除默认占位图并用已探测实际视频生成 MP4；真实 profile、视频-only、音频、多轨、字幕、空隙、变速及三段本地媒体 UI 导入成片均有证据；大媒体流式仍待完成 |
| T09 | 音频字幕、技术质检 | T08 | in_progress | T09.1 已接入已探测人声/音乐轨、混音、-14 LUFS loudnorm 和字幕保留；T09.2 已加入输出 ffprobe 视频/音频流与时长硬校验；T09.3 已加入黑帧/长静音风险告警；T09.4 已加入字幕越界/同轨重叠硬校验；三段本地视频、双音频和 SRT 的浏览器成片质检已通过 |
| T10 | 节目预览、效果、交互 | T06,T08,T09 | done | T10.1 已完成播放头驱动的多片段/空隙/音轨/字幕/sourceIn/speed 预览；T10.2 已把电影黑边、交叉溶解、叠化闪白、轻微手持接入同一 RenderPlan 并取得真实 MP4/浏览器证据；T10.3 已把位置/缩放/旋转接入 FFmpeg RenderPlan，T10.4 已修正代理稳定指纹和效果按钮激活态，T10.5 已接入可回溯速度曲线与动态浏览器播放速率，T10.6 已接入 `stabilization`/FFmpeg `deshake`、能力预检、真实抽帧和浏览器代理回滚；T10.7 已在真实浏览器转场重叠区逐帧渲染前后两层 MP4，交叉溶解/叠化闪白均核对源时间、透明度和闪白峰值 |
| T11 | 导出中心、渲染任务 | T07,T08,T09,T10 | in_progress | T11.1 已建立持久化后台渲染任务、状态查询和前端轮询下载；T11.2 已实现真实取消/重试/启动恢复；T11.3 刷新后可恢复任务状态与历史，完成任务显示 100%；T11.4 导出中心已提供独立 SRT 下载；T11.5 已接入 expectedRevision 409 门禁、同项目幂等键复用/输入冲突拒绝、输入 revision/hash/preset 记录与 deliveryReady=false；T11.6 已增加显式人工 pass/needs-revision 审核记录与前端入口，只有成功技术 QC 后审核 pass 才将 deliveryReady 设为 true，重试会清除旧审核；同项目两次真实导出保留不同任务级 URL，公开 jobs 不泄露 projectSnapshot，两个 URL 均 200 |
| T12 | 全类型后台任务/预算 | T13,T14 | in_progress | T12.1–T12.7 已覆盖统一队列、原子 claim、租约 heartbeat、预算、幂等/事件、provider reconcile、结构化错误与 asset-binding outbox；失败/needs_reconcile 终态在事件写入完成后才公开；JSON 与 SQLite 均已验证任务 claim/事件/删除边界，SQLite 服务端 MOCK worker 已真实返回 SUCCEEDED；真实 provider 受理回放、浏览器关闭恢复和取消对账仍待完成 |
| T13 | Repository/SQLite/生命周期 | T03,T05,T11 | in_progress | T13.1–T13.7 已完成 Repository 边界、隔离 JSON→SQLite dry-run/备份/幂等迁移、WAL/事务/busy timeout、project_versions/job_events/assets 元数据表、项目墓碑/恢复、任务唯一幂等键和跨 revision 冲突；`STORAGE_BACKEND=sqlite` 已接入项目/任务路由并通过服务端 worker 审计；JSON 默认兼容和 SQLite 备份与媒体 manifest 配套仍需最终交付矩阵核对 |
| T14 | Provider契约/能力/Schema | T04,T05,T13 | in_progress | T14.1–T14.2 已完成能力契约、输入输出 schema、字段路径错误、空产物/异常完成状态门禁；T14.3 已完成统一 HTTP/JSON 错误字段、状态、Retry-After、脱敏与重试/对账映射的受控矩阵；真实账户验证仍待完成 |
| T15 | 长文本、多集、剧本版本 | T12,T14 | in_progress | T15.1–T15.2 已完成原文/分块/阶段恢复；T15.3 已完成服务端与前端差异提案、版本快照和锁定字段保护；多集编辑隔离和完整剧本版本 UI 验收待完成 |
| T16 | 资产版本、画布、依赖失效 | T06,T12,T13,T15 | in_progress | T16.1–T16.5 已完成 activeVersionId/版本元数据、画布业务实体引用、角色/道具/场景/声音/首帧输入 hash 与受影响镜头 stale 传播、统一视角策略和结构化手动绑定；完整版本对比/审核/回退 UI 与浏览器回归待完成 |
| T17 | 本地TTS可移植与并发 | T12,T14,T16 | in_progress | T17.1–T17.4 已完成：配置可移植、托管生命周期、single-flight/PID/startToken、占用保护、FIFO 有界队列、跨引擎 inference lease、启动失败诊断、样音质量与台词 textHash/stale 均有临时假服务/FFmpeg 审计；新增 F5-TTS 默认 `/api/status`→`/health` 回退及 live WAV→媒体探测→资产登记审计；真实 TTS/GPU、完整浏览器回归和许可核对仍待外部条件 |
| T18 | 项目包、清单、备份恢复 | T07,T11,T13,T16 | done | T18.1–T18.4 均有真实服务/FFmpeg/备份审计：通用 ZIP manifest、旧 JSON 兼容、预检与原子导入、任意 manifest 技术验证与可撤销回填、空目录媒体读取/重渲染、SQLite 冲突复制及资产元数据登记、受保护清理、自动快照可选开关、keep/maxBytes prune 和恢复入口均已验证 |
| T19 | 前端拆分、可用性、错误态 | T02,T03,T06,T10 | in_progress | T19.1 已加入全局与页面/弹窗级 ErrorBoundary、项目列表 loading/真实失败/重试、保存冲突 UI、请求 AbortController、停止任务入口、主要弹窗 Escape/焦点管理和窄屏样式；真实浏览器已验证页面/模型中心故障注入重试、焦点归还、列表故障恢复、409、本地副本、760/420 无溢出及真实渲染取消；ModelCenter 与 Timeline 已抽为动态 chunk；隔离项目真实拖拽→服务端 revision→刷新保持片段位置、两个真实标签冲突保留本地副本和服务端版本、导出 Escape 已验证；已修复已打开空项目被注入演示时间线；其余跨页面回归仍待收口 |
| T20 | 分包、媒体/列表性能 | T07,T19 | in_progress | 正式 `pnpm build` 已改为外部 hash JS/CSS/媒体资源并保留独立 `pnpm build:demo` 单文件演示；主要独立页面/声音/画布、ModelCenter 和 Timeline 已动态分包；`TimelineClip` 使用稳定 props 的 `React.memo`；最终首屏静态 JS/CSS gzip 224,135 bytes；1000片段真实提交 p95 13.1ms、真实拖拽内部 pointer p95 98.8ms，1000 素材搜索过滤 p95 0.4ms、滚动下一帧 p95 0.1ms；正式 preview 首次/缓存命中分别 230,496/2,100 bytes、Load 48.9/54.2ms、Long Tasks 0；未证明所有设备均达成每帧目标，母任务保持进行中 |
| T21 | 行为/故障测试、CI、诊断 | 贯穿全部；最终依赖T20 | in_progress | 最新 `pnpm check` 通过 152 个语法文件、96 项离线审计，新增真实渲染取消竞态门禁；覆盖跨进程配置/音色/任务锁、流式媒体/Range、deflate/Zip64 边界、SQLite 切换回退、发布包、无密钥 provider、本地 TTS 回环、local_v1 综合夹具、上传取消清理和 SRT HTTP 内容；SRT 导出、FFmpeg 真实成片、导出历史 URL 隔离、任务恢复/取消、诊断 ZIP、升级回退均保持通过 |
| T22 | 安装、文档、发布材料 | T17,T18,T19,T20,T21 | in_progress | `doctor`、README 启动/移动数据目录重启、无密钥/无 TTS、无 FFmpeg 导出预检、标准 ZIP 诊断包、项目升级回退和源码发布包均已真实验证；全新源码目录离线安装、doctor、build 和换端口重启保持通过；当前工作区最新 build 为 1609 modules，首屏 JS/CSS gzip 为 235,305 bytes，正式安装器/签名/目标机发布仍待完成 |
| T23 | 整体交付验收 | T01–T22 | in_progress | local_v1 已完成三段真实 MP4、两段音频、SRT 的 UI 导入→编辑→预检→后台渲染→真实成片及 ffprobe 证据；综合隔离夹具覆盖源入点/修剪/拆分/变速/空隙/静音/音量/字幕、16:9/24 与 9:16/30、项目包迁移及重启恢复；真实浏览器还完成三段本地视频+人声/BGM/SRT 导入、字幕确认、音量/淡入/淡出/声像/音轨编辑、9:16/30fps 与 1:1/25fps 低清/正式真实 MP4 原生下载，成片经 ffprobe 确认 720×1280/30fps 和 1080×1080/25fps，均为 H.264/AAC；本轮补充真实任务中心取消竞态修复与服务重启回读，取消任务稳定为 `CANCELLED/RENDER_CANCELLED` 且无 result，并修复重试沿用旧快照/幂等键导致画幅帧率错配的路径；既有窄视口、重复编辑、效果组合/回滚、双标签冲突、双项目项目包/字幕/成片回放和请求级诊断证据保持通过；当前 152/96 门禁覆盖 revision/幂等、任务恢复/取消、流式媒体、浏览器大文件取消清理、HTTP SRT HEAD/原生下载内容、SQLite/JSON、deflate 项目包、SQLite 冲突复制及资产登记、源码发布包、无密钥 provider、F5-TTS 回环 WAV→资产登记和 requestId/path 错误日志；完整无人值守浏览器矩阵、正式安装器/签名/目标机交付、真实 TTS/GPU/许可和外部 provider 仍未完成，local_v1 不标通过 |
| T24 | 多用户联网版 | 用户明确选择及T23 | not_requested | 不属于当前默认本地首版 |

## 已验证基线

- 隔离构建：`pnpm exec vite build --outDir .audit-build/2026-09-05`，退出码0。
- 实测构建：1599模块，HTML 6,226.67kB，gzip 4,317.61kB。
- 16项不依赖真实服务的现有审计全部退出码0，列表见审计基线。
- 没有运行 `test:voices`：待改隔离目录；没有运行 `test:e2e:live`。
- 配额错误探针：服务端fetch次数0；门禁探针：缺首尾帧仍score90/state done。
- 未进行本次浏览器交互、真实API、实际用户数据读写、成片渲染或部署验证。

## 已知外部条件

| 项目 | 当前事实 | 对工作的影响 |
| --- | --- | --- |
| 云端凭据与调用预算 | 本轮未读取或验证 | 不阻断实现/受控测试；真实API验收单独等待明确条件 |
| 本地TTS/GPU | 本轮未启动/验证 | 不阻断编辑与手动媒体闭环 |
| FFmpeg/ffprobe | PATH可发现 | 仍需doctor和实际渲染夹具验证 |
| 公网/团队范围 | 未请求 | 不实施T24 |

## 每次续写格式

```text
日期/轮次：
currentTask / 子任务：
修复前行为与复现：
修改文件：
完成的行为：
实际执行的命令、退出码、结果：
浏览器/渲染/接口证据：
未运行检查及原因：
数据迁移状态与回滚方式：
尚存风险/阻塞：
任务状态：
nextTask：
nextAction（具体到动作或命令）：
```

## 工作记录

### 2026-09-05 — 审计与交接文档

完成代码结构检查、独立构建、16项现有审计和两个隔离探针，整理完整任务卡与持续提示词。业务优化尚未实施；保留本节为历史，不应将审计通过解释为任务修复完成。

### 2026-09-05 — T01 基线、开发连通和最低检查

currentTask / 子任务：T01，完成基线与开发连通；顺带修复 T02.1 的未导入函数。

修复前行为与复现：当前目录无 Git 元数据；`.gitignore` 只忽略少量 JSON；Vite 开发服务监听 `0.0.0.0` 且没有 `/api` 代理；没有统一 `test`/`check`/`lint` 入口；`FreeformCanvas` 调用 `scenePromptContext` 但未导入，ESLint 可稳定复现 `no-undef`。

修改文件：`.gitignore`、`package.json`、`pnpm-lock.yaml`、`vite.config.js`、`eslint.config.js`、`scripts/check.mjs`、`scripts/lint.mjs`、`scripts/voice-library-audit.mjs`、`server/config.mjs`、`server/store.mjs`、`server/jobs.mjs`、`server/voiceLibrary.mjs`、`src/FreeformCanvas.jsx`；建立 `.local-baseline-2026-09-05/` 本地快照。

完成的行为：开发服务固定回环；Vite `/api/*` 转发到 `127.0.0.1:4174`；配置/项目/任务/音色数据可通过 `DATA_DIR` 隔离；音色审计使用临时目录并清理；统一检查覆盖 46 个 JS/MJS 语法文件和 16 个离线审计；未定义变量检查发现并修复 `scenePromptContext`。

实际执行的命令、退出码、结果：`pnpm add -D eslint@9.35.0 eslint-plugin-react-hooks@6.1.0`（0）；`pnpm check`（0，46 syntax files、16 offline audits）；`pnpm test:voices`（0，2 packs/6 voices，临时目录）；`pnpm lint`（0，0 errors、23 个既有 Hooks warnings）；`pnpm build`（0，1599 modules，dist/index.html 6,226.65 kB，gzip 4,317.60 kB）；启动 `pnpm start` 与 `pnpm dev` 后，直接及代理请求 `/api/health` 均返回 `ok:true`（0）。

浏览器/渲染/接口证据：已实测本地 API 和 Vite 代理健康接口；尚未做浏览器操作、媒体上传或 FFmpeg 成片验证。

未运行检查及原因：`test:e2e:live` 未运行，避免未经本轮授权的真实供应商调用与费用；`test:voices` 尚未单独运行，但其隔离逻辑已改并由 `check` 外的下一轮专项复核；未创建 Git 仓库，因为当前目录没有 Git 客户端元数据且不能替用户决定初始提交历史。

数据迁移状态与回滚方式：无业务数据迁移；代码回滚使用 `.local-baseline-2026-09-05/` 快照逐文件恢复。未触碰 `.env`、`server/data` 或现有运行产物。

尚存风险/阻塞：lint 仍有 23 个 Hooks 依赖警告；当前服务端健康状态显示为 live/configuration state，不能作为真实供应商调用验收。快照目录为本地未纳入构建的恢复副本。

### 2026-09-05 — T03.2 保存副作用移出状态 updater

currentTask / 子任务：T03.2，完成项目保存去抖、单次在途和最新状态合并的基础实现。

修复前行为与复现：每次 `updateProject` 都在 React 状态 updater 内立即触发 `syncProject`，快速输入会产生大量请求，且状态计算与外部 I/O 耦合。

修改文件：`src/main.jsx`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：`updateProject` 只计算并标记待保存项目；渲染完成后由项目级保存协调逻辑在 500ms 后提交；同一时间只允许一个保存请求在途；在途期间的新状态保留在 pending 引用中，旧请求结束后继续提交最新状态；服务端返回 revision 时仅在项目 ID 和更新时间仍匹配时写回。

实际执行的命令、退出码、结果：`pnpm check`（0，49 syntax files、19 offline audits）；`pnpm lint`（0，0 errors、25 个 Hooks warnings）；`pnpm build`（0，1599 modules，dist/index.html 6,229.18 kB，gzip 4,318.45 kB）。

浏览器/渲染/接口证据：保存逻辑已通过构建、语法和受控保存审计；尚未在浏览器中连续输入 100 次并重开，也未完成双标签页冲突 UI 验收。

未运行检查及原因：未运行真实 API、真实 MP4 渲染和 `test:e2e:live`，避免未经授权的供应商调用与费用。

数据迁移状态与回滚方式：无数据迁移；保存 revision 兼容旧项目首次写入；可使用 `.local-baseline-2026-09-05/` 逐文件回滚。

尚存风险/阻塞：冲突 UI、显式合并/保留本地副本、配置 read-modify-write 共用队列尚未完成；T04 质量门禁尚未开始。

任务状态：T03 in_progress；T02 in_progress。

nextTask：T04。

nextAction（具体到动作或命令）：读取并复现 `server/pipeline.mjs` 与 `src/productionPlan.js` 的质量门禁探针，将完整度 score 与可执行 done 分离，确保缺首尾帧、demo/空 URL、不可探测媒体只能得到 blocked，并补离线回归审计。

### 2026-09-05 — T03.1 保存配额与 revision 门禁

currentTask / 子任务：T03.1，完成配额错误不中断服务端保存和服务端 revision 基础门禁。

修复前行为与复现：`syncProject` 先无保护调用 `localStorage.setItem`，浏览器抛出 QuotaExceededError 时服务端 PUT 不会执行；服务端项目 PUT 无 expectedRevision，旧标签页可以静默覆盖新内容。

修改文件：`src/workflow.js`、`src/main.jsx`、`server/store.mjs`、`server/index.mjs`、`scripts/save-reliability-audit.mjs`、`scripts/project-revision-audit.mjs`、`scripts/check.mjs`。

完成的行为：本地缓存失败转为状态结果并继续服务端保存；服务端在同一项目写队列内读取当前版本、比较 expectedRevision、成功后递增 revision；冲突返回 HTTP 409、`REVISION_CONFLICT` 和当前版本号；前端提交当前 revision 并在仍是最新项目状态时回写服务端 revision。

实际执行的命令、退出码、结果：`pnpm check`（0，48 syntax files、18 offline audits，其中配额审计报告 `requests:1, localStorage:false`，revision 审计报告 `[1,2]` 且 staleWrite rejected）；`pnpm lint`（0，0 errors、23 个 Hooks warnings）；`pnpm build`（0，1599 modules，dist/index.html 6,227.54 kB，gzip 4,317.90 kB）。

浏览器/渲染/接口证据：已通过受控 fetch/localStorage 夹具验证保存请求在配额异常下仍发出；已通过隔离 DATA_DIR 验证真实文件保存和旧 revision 拒绝。尚未进行双标签页浏览器冲突 UI 实测。

未运行检查及原因：未运行真实 API、真实媒体渲染和 `test:e2e:live`，避免未经授权费用与外部副作用。

数据迁移状态与回滚方式：项目 JSON 新增 revision 字段，旧项目无 revision 时首个服务端写入按新建版本处理；无破坏性迁移。可使用 `.local-baseline-2026-09-05/` 逐文件回滚。

尚存风险/阻塞：React `updateProject` 仍把同步副作用放在状态 updater 中，保存请求尚未去抖/合并；冲突尚未在界面提供保留本地副本、重新加载和显式合并；FreeformCanvas 仍需完成最新节点合并与过期结果拒绝。

任务状态：T02 in_progress；T03 in_progress。

nextTask：T02.3。

nextAction（具体到动作或命令）：改造 `src/FreeformCanvas.jsx` 生成请求的写回路径，按项目 ID、目标节点和输入 revision 验证，并使用 `creativeRef.current` 合并结果；然后替换剪辑台上一/下一按钮的通知占位行为为真实时间定位。

### 2026-09-05 — T02.2 项目异步隔离与取消入口

currentTask / 子任务：T02.2。

修复前行为与复现：项目 A 的后台任务恢复请求完成后，若用户已切换到项目 B，旧闭包仍可能通过 `setProject` 写入当前状态；生成任务轮询没有接收取消信号。

修改文件：`src/main.jsx`、`src/workflow.js`。

完成的行为：后台任务恢复捕获启动时的 `projectId`，在每个异步边界和状态写回前校验当前项目；旧项目结果不会应用到新项目；视频生成与状态轮询支持调用方传入 `AbortSignal`。

实际执行的命令、退出码、结果：`pnpm check`（0，46 syntax files、16 offline audits）；`pnpm lint`（0，0 errors、23 个 Hooks warnings）；`pnpm build`（0，1599 modules，dist/index.html 6,226.95 kB，gzip 4,317.69 kB）。

浏览器/渲染/接口证据：本轮未进行浏览器切换项目实测、真实供应商调用或视频渲染；离线契约和构建已通过。

未运行检查及原因：未运行 `test:e2e:live`，避免未经授权的真实 API 费用；尚无专门的跨项目延迟回归夹具，下一步补充受控 fetch 测试。

数据迁移状态与回滚方式：无迁移；逐文件恢复 `.local-baseline-2026-09-05/` 可回滚本轮代码。

尚存风险/阻塞：FreeformCanvas 仍使用单一 `generatingId` 与生成前闭包节点/边；剪贴板失败仍可能覆盖生成错误；剪辑台上一/下一按钮仍只有通知行为。

任务状态：T02 in_progress。

nextTask：T02.3。

nextAction（具体到动作或命令）：修改 `src/FreeformCanvas.jsx` 的生成状态与写回，使用最新 `creativeRef`、请求项目 ID 和 AbortController；为剪辑台增加按时间排序的真实上一/下一剪辑点定位，并增加离线行为断言。

任务状态：T01 done；T02 in_progress。

nextTask：T02。

nextAction（具体到动作或命令）：读取 `src/main.jsx`、`src/FreeformCanvas.jsx`、`src/workflow.js` 的所有生成/保存异步路径，为每个请求补 projectId、targetId、inputRevision 和取消/过期判断；增加离线回归测试后运行 `pnpm check && pnpm lint && pnpm build`。

### 2026-09-05 — T02.3 画布过期写回与剪辑点定位

currentTask / 子任务：T02.3，完成画布结果写回保护与上一/下一剪辑点行为。

修复前行为与复现：画布生成完成后使用生成前闭包中的节点/边数组，期间新增节点或连线可能被覆盖；切换项目后旧异步结果仍可能调用画布保存；剪贴板拒绝会覆盖原始生成错误；剪辑台上一/下一按钮只显示通知。

修改文件：`src/FreeformCanvas.jsx`、`src/main.jsx`、`scripts/editor-navigation-audit.mjs`、`scripts/check.mjs`。

完成的行为：画布状态带当前项目标识，旧项目写回被拒绝；生成结果合并当前 `creativeRef` 中尚存节点/连线，避免新增内容丢失；复制失败单独展示失败原因；剪辑点按时间排序并切换选中片段、播放头和播放状态，边界保持在首尾；新增导航行为审计。

实际执行的命令、退出码、结果：`pnpm check`（0，49 syntax files、19 offline audits）；`pnpm lint`（0，0 errors、24 个 Hooks warnings）；`pnpm build`（0，1599 modules，dist/index.html 6,228.70 kB，gzip 4,318.27 kB）。

浏览器/渲染/接口证据：导航逻辑已通过受控片段时间排序审计；尚未进行真实浏览器点击和跨项目延迟 UI 测试，未进行真实 API 或 MP4 渲染。

未运行检查及原因：未运行 `test:e2e:live`，避免未经授权的供应商调用和费用；画布生成仍依赖真实 API/本地手动媒体，保留为后续浏览器验收项。

数据迁移状态与回滚方式：画布对象增加运行时 `projectId` 标记，不改变外部项目资产结构；可用 `.local-baseline-2026-09-05/` 逐文件回滚。

尚存风险/阻塞：画布仍是单一 `generatingId`，多节点并发生成的 UI 状态尚未按 jobId 管理；React 保存副作用仍在状态 updater 内，保存去抖/合并与冲突 UI 未完成；T04 质量门禁和 T06 时间线契约尚未开始。

任务状态：T02 in_progress；T03 in_progress。

nextTask：T03.2。

nextAction（具体到动作或命令）：把 `updateProject` 的保存副作用移出 React state updater，建立每项目 300–800ms 去抖、单次在途和 dirty 合并协调器；为 409 冲突返回增加 UI 状态与保留本地副本/重新加载入口，然后用双请求延迟夹具验证。

### 2026-09-05 — T04.1 质量门禁与结构化阻塞原因

currentTask / 子任务：T04.1，完成评分与硬门禁状态分离。

修复前行为与复现：分镜检查共 10 项，缺首尾帧仍可得 90 分；通用 `stage()` 以 `score >= 85` 直接标记 done，评分被错误地当作可执行/交付许可。

修改文件：`server/pipeline.mjs`、`scripts/quality-gate-audit.mjs`、`scripts/check.mjs`。

完成的行为：分镜阶段使用硬门禁，任一必需条件缺失即 `state: blocked`，即使 score 为 90；阶段输出 `blockers` 与 `warnings`；总报告输出带阶段 ID 的结构化 blockers/warnings，供 UI 展示可操作原因。

实际执行的命令、退出码、结果：`pnpm check`（0，50 syntax files、20 offline audits）；`pnpm lint`（0，0 errors、25 个 Hooks warnings）；`pnpm build`（0，1599 modules，dist/index.html 6,229.31 kB，gzip 4,318.55 kB）。质量门禁审计实测输出 `score:90,state:blocked,blockers:[部分镜头缺少首尾帧]`。

浏览器/渲染/接口证据：已通过真实 Node 门禁函数和隔离夹具验证；尚未进行浏览器门禁展示、真实媒体 ffprobe 或 MP4 导出验证。

未运行检查及原因：未运行真实 API 和 `test:e2e:live`，避免未经授权的供应商调用与费用；真实媒体来源/demo 识别仍是下一子任务。

数据迁移状态与回滚方式：报告版本从 2.4.0 升至 2.5.0，新增字段向前兼容；无项目数据迁移；可逐文件恢复本地基线。

尚存风险/阻塞：当前仅分镜硬门禁完成；空 URL、demo、simulated 视频和不可探测媒体仍可能进入其他阶段；手动导入项目的弱门禁尚未实现。

任务状态：T04 in_progress。

nextTask：T04.2。

nextAction（具体到动作或命令）：为质量门禁增加资产来源真实性判定，拒绝空 URL、demo/simulated 结果和未通过探测的媒体；为手动模式允许合规的单镜头无对白项目，并补隔离回归测试。

### 2026-09-05 — T04.2 媒体真实性门禁

currentTask / 子任务：T04.2，完成共享媒体真实性判定与未探测视频阻塞。

修复前行为与复现：`productionPlan.videoReady` 接受 `simulated` 视频；服务端流程只检查 `videoUrl` 是否存在，空 URL、demo/mock 地址和未经文件探测的媒体都可能进入实际视频统计。

修改文件：`shared/mediaReadiness.mjs`、`src/productionPlan.js`、`server/pipeline.mjs`、`scripts/media-readiness-audit.mjs`、`scripts/production-plan-audit.mjs`、`scripts/check.mjs`。

完成的行为：媒体必须拥有非空地址、非 demo/mock/placeholder/simulated 来源并具备 `probeStatus: passed` 才算真实可用；视频阶段将未通过真实性门禁的镜头列入 blockers；前后端生产计划共用同一判定；新增空地址、demo、simulated、未探测和已验证夹具。

实际执行的命令、退出码、结果：`pnpm check`（0，52 syntax files、21 offline audits；媒体审计报告 verified 1、rejected 4）；`pnpm lint`（0，0 errors、25 个 Hooks warnings）；`pnpm build`（0，1600 modules，dist/index.html 6,230.16 kB，gzip 4,318.97 kB）。

浏览器/渲染/接口证据：已通过共享判定、生产计划和服务端门禁函数的隔离测试；尚未完成上传过程真实 ffprobe 标记和手动模式单镜无对白浏览器/渲染验收。

未运行检查及原因：未运行真实 API 和 `test:e2e:live`，避免未经授权费用；FFmpeg 入库探测归入下一 T04.3/T07 工作。

数据迁移状态与回滚方式：旧项目未带 `probeStatus` 的视频会保守地被标为未探测，不删除资产；可逐文件恢复本地基线。

尚存风险/阻塞：当前上传/生成链尚未写入真实 `probeStatus: passed`，因此未探测媒体会被正确阻塞但还不能完成交付；手动导入项目仍使用 AI 一致性门禁；输入 hash/stale 尚未实现。

任务状态：T04 in_progress。

nextTask：T04.3。

nextAction（具体到动作或命令）：在 `server/store.mjs` 媒体入库路径执行受控 ffprobe，记录 duration/streams/probeStatus 并原子写入资产；将生成与手动上传结果的 probe 元数据传递到项目 shot/timeline，再补单镜手动模式门禁。

### 2026-09-05 — T04.3 真实媒体探测与手动媒体门禁

currentTask / 子任务：T04.3，完成媒体入库真实性标记和明确的手动媒体模式。

修复前行为与复现：媒体写入后没有服务端 ffprobe 证据，前端手动/远程视频结果也可能丢失探测元数据；手动导入单镜项目仍被剧本三场、四镜、角色三视图等 AI 制作条件阻塞。

修改文件：`server/store.mjs`、`server/index.mjs`、`src/workflow.js`、`src/main.jsx`、`src/AssistantWorkflow.jsx`、`server/pipeline.mjs`、`scripts/media-probe-audit.mjs`、`scripts/manual-mode-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：视频/音频入库先写临时文件并运行真实 `ffprobe`，要求存在有效时长和媒体流后才原子写入，并记录 `probeStatus`、时长和流信息；远程生成回收、助手手动上传和剪辑台手动上传均传递探测结果；显式 `manual-media` 模式允许单镜、无对白、无首帧和无角色三视图，但仍要求镜头结构、真实可探测视频、时间线、逐镜质检和剪辑应用。

实际执行的命令、退出码、结果：`pnpm check`（0，54 syntax files、23 offline audits；媒体探测输出 `probeStatus:passed,duration:0.8,invalid:rejected`；手动模式输出 storyboard/video/edit 均 `done`）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,231.29 kB，gzip 4,319.25 kB）。

浏览器/渲染/接口证据：已用真实 FFmpeg 生成 0.8 秒 MP4 夹具并通过服务端 ffprobe 入库；已用无外部密钥的 Node 流程验证手动单镜门禁。尚未完成浏览器上传点击、真实 HTTP 上传及最终 MP4 成片渲染验证。

未运行检查及原因：尚未运行真实供应商 API、浏览器回归和最终渲染；下一阶段先完成 stale 输入/冲突 UI，再进入本地访问安全与真实渲染链。

数据迁移状态与回滚方式：资产新增探测元数据字段，旧资产不删除且会保守地保持未探测；手动模式只新增项目标记；可用 `.local-baseline-2026-09-05/` 逐文件回滚。

尚存风险/阻塞：已有旧媒体需要重新上传或重新探测；输入变更 hash/stale 尚未完成；`server/render.mjs` 仍是默认图片占位渲染且尚未恢复音频。

任务状态：T04 in_progress；T04.3 done（具备本轮行为证据）。

nextTask：T04.4。

nextAction（具体到动作或命令）：为生成与手动导入记录输入快照/hash，在异步回写前拒绝过期结果；补双标签页 409 冲突 UI 和真实浏览器回归，然后开始 T05 本地访问安全边界。

### 2026-09-05 — T04.4 异步输入过期保护

currentTask / 子任务：T04.4，完成视频生成输入快照校验。

修复前行为与复现：视频请求发出后，用户修改镜头提示词、首尾帧、时长或参考图时，旧响应仍会按镜头 ID 写回，导致素材与当前输入不一致。

修改文件：`src/workflow.js`、`src/main.jsx`、`scripts/stale-input-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：生成前为镜头生成稳定输入签名；单镜和批量视频回写携带签名；应用结果前重新计算当前镜头签名，发现变化则保留当前素材并记录 `staleResults`，不覆盖新输入。

实际执行的命令、退出码、结果：`pnpm check`（0，55 syntax files、24 offline audits；stale 审计确认旧结果未写回）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,231.86 kB，gzip 4,319.49 kB）。

浏览器/渲染/接口证据：已通过真实模块调用的输入变更夹具验证；尚未完成浏览器异步点击和双标签页冲突界面实测。

未运行检查及原因：未运行真实供应商 API、浏览器 E2E、最终 MP4 渲染；这些依赖后续本地 HTTP/渲染闭环。

数据迁移状态与回滚方式：无数据迁移；仅新增运行时过期结果记录；可用 `.local-baseline-2026-09-05/` 逐文件回滚。

尚存风险/阻塞：后台恢复任务尚未把持久化输入签名全部纳入冲突提示；409 当前尚未提供界面化保留本地/重载选择。

任务状态：T04 in_progress；T04.4 done（具备本轮行为证据）。

nextTask：T05。

nextAction（具体到动作或命令）：审查 `server/index.mjs` 的 Host、Origin、CSRF、请求体和路径边界，先补不依赖外部密钥的安全回归，再继续真实渲染前的时间线命令契约。

### 2026-09-05 — T05.1 本地 HTTP 访问边界

currentTask / 子任务：T05.1，完成本地服务 Host、来源和请求体边界的第一轮收紧。

修复前行为与复现：服务仅按监听地址限制，未显式拒绝异常 Host；带有合法本地 Origin 之外的状态请求缺少主机一致性校验；超大 JSON 请求在读取过程中销毁连接，客户端无法稳定得到可识别的限制错误。

修改文件：`server/index.mjs`、`scripts/http-security-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：仅接受 localhost/127.0.0.1 Host；状态请求若携带 Origin，必须与本地服务主机一致；JSON 请求在 Content-Length 或流式读取超过 12MB 时返回 `REQUEST_TOO_LARGE`/413；新增临时 DATA_DIR 服务审计，验证正常请求 200、恶意 Host 403、恶意 Origin 403。

实际执行的命令、退出码、结果：`pnpm check`（0，56 syntax files、25 offline audits，HTTP 安全审计通过）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,231.86 kB，gzip 4,319.49 kB）。

浏览器/渲染/接口证据：已通过真实启动的本地 Node HTTP 服务和请求头夹具验证；尚未完成浏览器回归、媒体 Range 访问和渲染接口验证。

未运行检查及原因：未调用真实供应商 API，未进行最终 MP4 渲染；两者不属于本子任务且会引入外部条件。

数据迁移状态与回滚方式：无数据迁移；仅改变拒绝边界和错误码；可用 `.local-baseline-2026-09-05/` 逐文件回滚。

尚存风险/阻塞：当前资产 GET 仍整文件缓冲，渲染端仍未完成真实画面/音频闭环；Origin 主机比较未覆盖 IPv6 本地地址。

任务状态：T05 in_progress；T05.1 done（具备本轮接口证据）。

nextTask：T05.2。

nextAction（具体到动作或命令）：给资产和渲染产物 GET 增加受限 Range/HEAD 语义与路径审计，避免整文件缓冲；完成后进入 T06 的拆分/裁剪命令契约。

### 2026-09-05 — T05.2 媒体流式访问

currentTask / 子任务：T05.2，完成本地媒体与渲染产物的 Range/HEAD 访问。

修复前行为与复现：资产和渲染产物 GET 使用 `readFile` 整体缓冲，视频播放器无法利用字节范围请求，大文件访问会额外占用内存。

修改文件：`server/index.mjs`、`scripts/http-security-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：`/api/assets/*` 与 `/api/render/*` 支持无 Range 的 200、单范围 206、越界/非法范围 416，以及无响应体的 HEAD；响应包含长度、范围和 `Accept-Ranges`，实际内容通过文件流发送。

实际执行的命令、退出码、结果：`pnpm check`（0，56 syntax files、25 offline audits；HTTP 审计输出 `range:206,head:200`）；此前 `pnpm lint`（0，0 errors、25 warnings）；此前 `pnpm build`（0，1600 modules）。

浏览器/渲染/接口证据：已用真实启动本地 HTTP 服务、临时媒体文件和请求头验证 206 内容为指定字节、HEAD 无 body；尚未做浏览器播放器回归。

未运行检查及原因：未调用真实供应商 API；浏览器回归留到完整渲染链后统一验证。

数据迁移状态与回滚方式：无迁移；仅改变文件响应方式；可逐文件恢复本地基线。

尚存风险/阻塞：当前仍只接受单 Range；渲染任务尚未进入后台队列。

任务状态：T05 in_progress；T05.2 done（具备接口证据）。

nextTask：T06。

nextAction（具体到动作或命令）：审查 `src/editingPlan.js`、`src/main.jsx` 与 `server/render.mjs` 的时间单位，统一源媒体入点/出点、片段时长和拆分后的相邻片段，补真实变更审计。

### 2026-09-05 — T08.1 真实视频成片最小闭环

currentTask / 子任务：T08.1，移除默认图片占位渲染。

修复前行为与复现：渲染器无论时间线是否有视频都使用 `assets/last-starline.png` 生成静态段，且 API 可传入任意 `frameFile`；这会把未成片项目伪装成可交付视频。

修改文件：`server/render.mjs`、`server/index.mjs`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：渲染只接受当前项目或 shared 目录中具有 `probeStatus: passed` 的 `/api/assets/...` 视频；每个 V1 片段由真实媒体裁切、缩放、拼接并叠加 SRT 字幕，未验证或外部任意路径直接阻断；Windows 字幕路径使用渲染工作目录，避免盘符冒号误解析。

实际执行的命令、退出码、结果：首次渲染审计发现并修复字幕路径错误；修复后 `node scripts/render-audit.mjs`（0），真实 FFmpeg 夹具输出 `deliverable.mp4`，ffprobe 时长 `1.00s`，未验证素材 rejected；`pnpm check` 已包含该审计并通过 25 项审计。

浏览器/渲染/接口证据：已真实运行 FFmpeg、字幕滤镜和 ffprobe 验证输出文件；尚未通过浏览器点击 `/api/render`，当前输出为视频轨最小闭环，音频多轨将在 T09 完成。

未运行检查及原因：未标记 T08 母任务完成，因为 T06/T07 尚未完成且音频、多轨和最终交付任务仍缺失。

数据迁移状态与回滚方式：无项目数据迁移；去除 `frameFile` 渲染入口；旧项目无探测媒体时会明确阻断，不删除原资产。

尚存风险/阻塞：渲染分段当前统一去除音频，不能宣称音画完整成片；当前仍为同步渲染。

任务状态：T08 in_progress；T08.1 done（真实文件证据）。

nextTask：T06。

nextAction（具体到动作或命令）：统一剪辑计划的时间字段与源媒体入点/出点，先保证拆分/裁剪后的 V1 时间线可被渲染器准确消费，再恢复音频与后台渲染。

### 2026-09-05 — T06.1 时间线源入点统一

currentTask / 子任务：T06.1，统一裁剪、拆分和渲染消费的源时间字段。

修复前行为与复现：编辑计划虽然移动了片段时间和 `sourceOffset`，但没有稳定维护 `sourceIn/sourceOut`；界面手动修剪/拆分也未写源入点，渲染器始终从源视频 0 秒开始读取，导致时间线显示与实际成片不一致。

修改文件：`src/editingPlan.js`、`src/main.jsx`、`server/render.mjs`、`scripts/editing-plan-audit.mjs`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：修剪同时更新节目时间、源偏移、源入点和源出点；拆分后的 B 片段从正确源偏移开始，A 片段写出对应源出点；渲染器消费 `sourceOffset/sourceIn`，用 FFmpeg `-ss/-t` 实际读取对应源区间。

实际执行的命令、退出码、结果：`pnpm check`（0，57 syntax files、26 offline audits；编辑计划源入/出点断言及真实 MP4 渲染审计通过）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,232.38 kB，gzip 4,319.63 kB）。

浏览器/渲染/接口证据：已用真实 FFmpeg 生成、裁切、字幕滤镜和 ffprobe 验证 MP4 输出；尚未完成浏览器中拖拽重排、手动拆分/修剪点击回归。

未运行检查及原因：音频多轨和后台渲染尚未实现，因此不能宣称 T06/T08/T09 完成。

数据迁移状态与回滚方式：旧片段缺少源字段时按 0 秒兼容；新字段随编辑操作写入；可用 `.local-baseline-2026-09-05/` 逐文件回滚。

尚存风险/阻塞：渲染器当前仍生成无音频视频轨；前端导出按钮仍导出 JSON 项目包，未接真实 `/api/render` 成片下载。

任务状态：T06 in_progress；T06.1 done（具备编辑计划与真实渲染证据）。

nextTask：T06.2。

nextAction（具体到动作或命令）：修复跨轨道移动后同轨片段时间排序/重叠校验，并让前端导出调用真实渲染接口；随后将音频轨纳入 FFmpeg 输出。

### 2026-09-05 — T06.2 真实渲染入口接通

currentTask / 子任务：T06.2，完成前端真实 MP4 渲染调用，并补源入点编辑字段。

修复前行为与复现：剪辑台“导出”仍使用延时模拟并下载 JSON 项目包；用户看不到真实渲染失败原因，也无法从界面取得 MP4。

修改文件：`src/main.jsx`、`src/editingPlan.js`、`server/render.mjs`、`scripts/editing-plan-audit.mjs`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：导出按钮现在 POST 当前时间线到 `/api/render`，成功后下载服务端生成的 MP4 并记录交付 URL；失败显示服务端错误；手动和 AI 拆分/裁剪操作维护 `sourceOffset/sourceIn/sourceOut`，渲染器消费实际源入点。

实际执行的命令、退出码、结果：`pnpm check`（0，57 syntax files、26 offline audits；真实 FFmpeg MP4 输出审计通过）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,232.83 kB，gzip 4,319.77 kB）。

浏览器/渲染/接口证据：真实 FFmpeg/ffprobe 已验证渲染文件；前端代码构建通过，但尚未完成浏览器点击导出及真实 HTTP `/api/render` 联调，因此不标记 T06 或 T08 完成。

未运行检查及原因：尚未纳入音频轨、后台任务和浏览器 E2E；这些继续按 T09/T11 推进。

数据迁移状态与回滚方式：无迁移；旧时间线缺少源字段时从 0 秒兼容；可用 `.local-baseline-2026-09-05/` 逐文件回滚。

尚存风险/阻塞：跨轨道重排后的重叠校验仍需补齐；渲染暂时无音频，多轨音画不是已完成能力。

任务状态：T06 in_progress；T06.2 done（具备模块与真实渲染文件证据）。

nextTask：T06.3。

nextAction（具体到动作或命令）：增加同轨道片段排序、负时间和重叠校验，补真实 HTTP `/api/render` 审计；随后进入 T09 音频/字幕与技术质检。

### 2026-09-05 — T06.3 时间线重叠门禁与 HTTP 成片联调

currentTask / 子任务：T06.3，完成同轨时间线有效性校验并验证真实 HTTP 渲染链。

修复前行为与复现：剪辑计划的移动/复制可把片段放到同轨重叠位置；前端真实渲染入口虽已接通，但尚未通过本地 HTTP POST 与成片 GET 联调。

修改文件：`src/editingPlan.js`、`scripts/editing-plan-audit.mjs`、`server/index.mjs`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：统一校验负开始时间、非正时长和同轨重叠；移动/复制遇到冲突时拒绝并保留原时间线；真实本地 HTTP 服务已验证 `/api/render` 返回 200，随后 GET 真实 MP4 返回 200 且有文件内容。

实际执行的命令、退出码、结果：`pnpm check`（0，57 syntax files、26 offline audits；渲染审计输出 `httpRender:200,httpDownload:200,duration:1.00`）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,233.64 kB，gzip 4,320.17 kB）。

浏览器/渲染/接口证据：已用真实 FFmpeg、ffprobe 和本地 HTTP 服务完成 POST→渲染→GET 闭环；尚未完成真实浏览器点击回归。

未运行检查及原因：音频混音、响度标准化、后台渲染仍未实现，故 T06/T09/T11 不标记完成。

数据迁移状态与回滚方式：无迁移；仅新增时间线校验结果和渲染路径使用 DATA_DIR；可逐文件恢复本地基线。

尚存风险/阻塞：渲染器当前对视频段使用 `-an`，音频尚未进入最终 MP4；已有时间线的历史重叠数据需在编辑时显式修正。

任务状态：T06 in_progress；T06.3 done（具备编辑和 HTTP 成片证据）。

nextTask：T09。

nextAction（具体到动作或命令）：扩展渲染器输入到 voice/music 音频轨，按时间线混音并保留字幕，使用 ffprobe 验证视频、音频流与时长，再进入后台任务化。

### 2026-09-05 — T09.1 音频轨混音与字幕保留

currentTask / 子任务：T09.1，完成真实音频轨进入 MP4 的最小闭环。

修复前行为与复现：视频分段使用 `-an`，人声/音乐时间线即使已存在也不会进入成片；字幕烧录阶段也没有明确保留音频编码。

修改文件：`server/render.mjs`、`server/index.mjs`、`src/workflow.js`、`src/main.jsx`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：服务端收集 V1 以外的 voice/music 轨，要求每个音频资产已通过 ffprobe，按 `start/duration` 延迟并混合，应用 -14 LUFS loudnorm，再以 AAC 写入成片；字幕滤镜重编码视频时保留 AAC 音频；生成回收和手动声音上传会传递探测元数据。

实际执行的命令、退出码、结果：`node scripts/render-audit.mjs`（0），真实彩色视频 + 440Hz MP3 夹具经本地 HTTP `/api/render` 输出 MP4，ffprobe 确认视频/音频流、1.00 秒时长，下载 200；`pnpm check`（0，57 syntax files、26 audits）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,233.76 kB，gzip 4,320.19 kB）。

浏览器/渲染/接口证据：已完成真实 FFmpeg 混音、字幕、ffprobe 和 HTTP POST→GET 验证；尚未完成浏览器点击导出和真实多轨用户素材回归。

未运行检查及原因：尚未把渲染移入后台队列，未运行真实供应商 API；T11/T12 继续处理。

数据迁移状态与回滚方式：无迁移；旧无探测音频会被拒绝而不删除；可逐文件恢复本地基线。

尚存风险/阻塞：混音仍采用单次 loudnorm，未做两遍响度分析；渲染同步执行，大项目可能阻塞 HTTP 请求。

任务状态：T09 in_progress；T09.1 done（具备真实音视频 MP4 证据）。

nextTask：T09.2。

nextAction（具体到动作或命令）：增加输出 ffprobe 技术质检报告，检查音视频流、时长、黑帧/静音风险并将结果写入质量状态；随后进入 T11/T12 后台渲染任务化。

### 2026-09-05 — T09.2 输出技术质检

currentTask / 子任务：T09.2，增加最终文件的 ffprobe 硬校验。

修复前行为与复现：渲染完成只返回文件路径，未确认最终 MP4 仍包含视频流、所需音频流和有效时长；编码或字幕滤镜失败可能被误报为可交付。

修改文件：`server/render.mjs`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：最终字幕渲染后执行 ffprobe；必须存在有效时长和视频流，若时间线含音频则必须存在音频流，否则渲染失败；结果返回 `technicalQc` 流信息和时长。

实际执行的命令、退出码、结果：`node scripts/render-audit.mjs`（0），真实视频+MP3 经混音、loudnorm、字幕后通过 `technicalQc`；`pnpm check`（0，57 syntax files、26 audits）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,233.76 kB，gzip 4,320.19 kB）。

浏览器/渲染/接口证据：真实 FFmpeg、ffprobe 和本地 HTTP POST→GET 均通过；尚未完成浏览器导出点击、黑帧检测和静音段检测。

未运行检查及原因：黑帧/静音检测和后台队列属于后续 T09.3/T11，不将母任务标记完成。

数据迁移状态与回滚方式：无迁移；新增渲染结果质检字段；可逐文件恢复本地基线。

尚存风险/阻塞：当前没有检测黑帧、全静音或音画同步，只完成流存在性与时长硬门禁；渲染仍同步执行。

任务状态：T09 in_progress；T09.2 done（具备真实音视频文件证据）。

nextTask：T09.3。

nextAction（具体到动作或命令）：对最终 MP4 增加黑帧/静音和音视频时长偏差检测，把可操作失败原因写入质量报告；随后进入后台渲染任务化。

### 2026-09-05 — T09.3 黑帧与静音风险扫描

currentTask / 子任务：T09.3，补充最终成片的技术风险扫描。

修复前行为与复现：输出只验证流和总时长，不提示黑帧或连续静音风险，质检人员无法从渲染结果直接发现明显技术问题。

修改文件：`server/render.mjs`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：最终 MP4 经 ffmpeg `blackdetect` 和音频 `silencedetect` 扫描；结果将黑帧、至少 0.5 秒静音作为可操作 warnings 返回，同时保留视频/音频流缺失和无效时长的硬失败。

实际执行的命令、退出码、结果：`node scripts/render-audit.mjs`（0），真实视频+MP3 经字幕、混音、loudnorm 后通过技术扫描；`pnpm check`（0，57 syntax files、26 audits）。

浏览器/渲染/接口证据：已真实执行 FFmpeg、ffprobe 和本地 HTTP POST→GET；尚未完成浏览器导出点击和字幕重叠/越界 UI 回归。

未运行检查及原因：`pnpm lint`、`pnpm build` 在上一子任务通过；本子任务只改服务端渲染和审计，后续连续回归仍会重新执行。

数据迁移状态与回滚方式：无迁移；仅扩展渲染结果技术字段；可逐文件恢复本地基线。

尚存风险/阻塞：黑帧/静音目前是告警而非自动失败；尚未检测音视频起止偏差和字幕越界。

任务状态：T09 in_progress；T09.3 done（具备真实文件扫描证据）。

nextTask：T09.4。

nextAction（具体到动作或命令）：校验字幕 cue 不得越过视频时长、同轨字幕不得重叠，随后进入 T11/T12 后台渲染任务化。

### 2026-09-05 — T09.4 字幕时间线硬校验

currentTask / 子任务：T09.4，完成字幕轨的真实渲染边界校验。

修复前行为与复现：渲染器按镜头名称自动生成字幕，未消费字幕轨；字幕可以超出成片时长或在同轨重叠，仍被写入成片。

修改文件：`server/render.mjs`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：字幕只来自 track 3；字幕开始时间、结束时间、正时长、成片范围和相邻字幕重叠均校验，非法字幕以 `RENDER_CAPTION_INVALID` 阻断；无字幕时不创建伪字幕。

实际执行的命令、退出码、结果：`node scripts/render-audit.mjs`（0），真实字幕成功烧录，越界字幕被拒绝；`pnpm check`（0，57 syntax files、26 audits）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,234.30 kB，gzip 4,320.44 kB）。

浏览器/渲染/接口证据：已通过真实 FFmpeg、字幕滤镜、ffprobe 和本地 HTTP 渲染验证；尚未完成浏览器导出按钮回归。

未运行检查及原因：未运行真实供应商 API；后台渲染任务已建立但前端恢复进度/重试取消仍待 T11。

数据迁移状态与回滚方式：无迁移；旧无字幕轨项目不生成伪字幕；可逐文件恢复本地基线。

尚存风险/阻塞：字幕与视频时间轴存在拼接空隙时仍按输出连续时间解释；渲染任务取消和失败重试尚未提供。

任务状态：T09 in_progress；T09.4 done（具备真实字幕文件证据）。

nextTask：T11.2。

nextAction（具体到动作或命令）：将后台渲染任务纳入项目启动恢复列表，展示进度、失败原因、重试和取消状态，并做本地 HTTP 回归。

### 2026-09-05 — T11.1 后台渲染任务

currentTask / 子任务：T11.1，建立可持久化的后台渲染任务入口。

修复前行为与复现：渲染请求同步占用 HTTP；页面导出没有任务 ID，刷新或请求中断后无法查询状态。

修改文件：`server/index.mjs`、`src/main.jsx`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增 `POST /api/render/jobs` 和 `GET /api/render/jobs/:id`；任务状态写入 jobs 目录，按 PENDING→RUNNING→SUCCEEDED/FAILED 更新；前端导出创建后台任务、轮询状态、下载真实 MP4，并把技术质检写回交付记录。

实际执行的命令、退出码、结果：`node scripts/render-audit.mjs`（0），本地 HTTP 后台任务返回 202，最终 `SUCCEEDED`，MP4 下载 200，音频流和视频流均有效；`pnpm check`（0，57 syntax files、26 audits）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,234.30 kB，gzip 4,320.44 kB）。

浏览器/渲染/接口证据：已真实启动本地服务并完成后台任务 POST→状态→MP4 GET；尚未完成浏览器刷新恢复、取消和失败重试操作。

未运行检查及原因：未标记 T11 完成，因恢复、取消、重试和全类型任务统一仍待完成。

数据迁移状态与回滚方式：新增 jobs JSON 文件，不改已有项目结构；临时审计目录自动清理；可逐文件恢复本地基线。

尚存风险/阻塞：服务重启时 RUNNING 任务目前不会自动重新调度；后台任务尚未统一覆盖所有生成类型和预算。

任务状态：T11 in_progress；T11.1 done（具备真实 HTTP 后台任务证据）。

nextTask：T11.2。

nextAction（具体到动作或命令）：实现渲染任务取消/重试接口、启动时恢复未完成任务和前端状态提示，避免重复任务与孤儿任务。

### 2026-09-05 — T11.2 渲染任务取消、重试与重启恢复

currentTask / 子任务：T11.2，补齐后台渲染任务的生命周期控制。

修复前行为与复现：任务只有成功/失败查询；服务重启不会重新调度 RUNNING 任务；取消会留下仍在执行的 FFmpeg 或被后续状态覆盖；失败任务没有可复用的重试入口。

修改文件：`server/index.mjs`、`server/render.mjs`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：渲染任务保存项目快照；启动时恢复 PENDING/RUNNING 任务；新增取消与重试接口；AbortSignal 贯穿 FFmpeg/ffprobe 和渲染阶段，取消会真实终止子进程并落为 CANCELLED；重试会等待旧进程退出后重新执行；对外查询不返回项目快照，避免无关数据泄露。

实际执行的命令、退出码、结果：`node scripts/render-audit.mjs`（0），真实 HTTP 审计覆盖后台 202→SUCCEEDED、MP4 下载、立即取消→CANCELLED、取消任务重试→SUCCEEDED、预置 RUNNING 任务服务启动恢复→SUCCEEDED；`pnpm check`（0，57 syntax files、26 audits）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,234.30 kB，gzip 4,320.44 kB）。

浏览器/渲染/接口证据：已通过真实 FFmpeg/ffprobe 和本地 HTTP 取消、重试、恢复审计；浏览器端仍只有导出轮询和错误提示，取消/重试按钮尚未完成，因此不提前标记 T11 完成。

未运行检查及原因：未运行真实供应商 API、真实用户浏览器手工操作和跨机器恢复；这些不影响本地无密钥 MP4 任务闭环，但属于后续验收条件。

数据迁移状态与回滚方式：jobs JSON 增加 `projectSnapshot` 和渲染状态字段，不改已有项目结构；删除对应新增 job 文件即可回滚任务记录，代码可逐文件恢复本地基线。

尚存风险/阻塞：项目快照会增加 jobs JSON 体积；渲染仍是单机队列，尚未统一覆盖所有生成类型和预算；前端尚未提供取消/重试按钮。

任务状态：T11 in_progress；T11.2 done（具备真实 HTTP 与子进程取消/恢复证据）。

nextTask：T11.3。

nextAction（具体到动作或命令）：在导出弹窗展示当前 render job 的进度与失败原因，增加取消/重试按钮并运行浏览器构建回归；完成后进入 T12 全类型后台任务与预算状态。

### 2026-09-05 — T11.3 导出任务交互状态

currentTask / 子任务：T11.3，完成导出弹窗对后台渲染状态的可见反馈和中断入口。

修复前行为与复现：导出弹窗只显示“打包中”，用户无法看到任务进度，也不能从页面取消正在执行的渲染或在失败/取消后再次发起导出。

修改文件：`src/main.jsx`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：导出弹窗展示后台任务状态与百分比；渲染中提供取消操作；失败或取消后提供重试入口；成功仍必须下载服务端真实 MP4 并写入技术质检结果。

实际执行的命令、退出码、结果：`pnpm lint`（0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,234.64 kB，gzip 4,320.61 kB）；`pnpm check`（0，57 syntax files、26 offline audits）；`node scripts/render-audit.mjs`（0，后台成功/取消/重试/恢复均通过）。

浏览器/渲染/接口证据：前端已完成构建级 JSX/交互路径验证，后端行为已完成真实本地 HTTP 和 FFmpeg 审计；尚未用真实浏览器手动点击完整导出流程，因此 T11 母任务仍不标记 done。

未运行检查及原因：未运行真实供应商 API；未进行浏览器自动化或用户账号验证，原因是当前环境无真实凭据且不应伪造 live 能力。

数据迁移状态与回滚方式：无数据迁移；仅修改前端导出交互，恢复 `src/main.jsx` 即可回滚。

尚存风险/阻塞：重试按钮会以当前编辑时间线创建新的后台任务，尚未在浏览器中验证页面刷新后的状态恢复；全类型生成任务、预算、幂等和供应商 reconcile 仍待 T12。

任务状态：T11 in_progress；T11.3 done（构建与后端真实行为证据齐全，浏览器手动回归未完成）。

nextTask：T13.1。

nextAction（具体到动作或命令）：先抽取 `server/store.mjs` 与 `server/jobs.mjs` 的 Repository 接口，盘点 JSON 数据读写边界并补原子迁移/回滚审计，再为 T12 接入统一任务执行器。

### 2026-09-05 — T13.1 持久化 Repository 边界

currentTask / 子任务：T13.1，抽取项目、任务、资产和声音库的统一存储接口。

修复前行为与复现：路由直接依赖多个 JSON 文件模块，后续迁移 SQLite 需要逐处改写，容易绕过版本锁、任务串行写入和媒体真实性探测。

修改文件：`server/repositories.mjs`、`server/index.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增版本化 Repository contract，统一暴露 projects/jobs/assets/voices 四类实体接口，并提供 `/api/diagnostics/storage` 只读诊断；当前适配器保留原子 JSON、项目 revision 校验、任务写入串行化和媒体探测前置保证，为 SQLite 替换保留稳定边界。

实际执行的命令、退出码、结果：`node --check server/repositories.mjs`（0）；`pnpm check`（0，58 syntax files、26 offline audits）；`pnpm lint`（0 errors、25 warnings）；此前 T11.3 `pnpm build`（0，1600 modules）。

浏览器/渲染/接口证据：存储契约模块已通过语法与全量离线审计；真实 MP4、取消/重试/恢复证据沿用 T11.2；尚未进行 SQLite 双写或迁移，因此不标记 T13 完成。

未运行检查及原因：未引入 SQLite 依赖，避免在未定义迁移、备份和回滚策略前改变生产数据格式；未运行真实 API。

数据迁移状态与回滚方式：无数据迁移，原 JSON 文件仍为唯一写入源；删除 `server/repositories.mjs` 的契约接入并恢复 `server/index.mjs` 即可回滚。

尚存风险/阻塞：Repository 目前是接口适配层而非 SQLite 实现；尚未验证 SQLite WAL、事务备份、旧 JSON 导入和故障恢复。

任务状态：T13 in_progress；T13.1 done（接口边界和现有持久化保证已有代码与审计证据）。

nextTask：T13.2。

nextAction（具体到动作或命令）：设计并实现可回滚的 JSON→SQLite 导入审计，先检查运行环境是否具备 SQLite 驱动，再补项目/任务/资产元数据的事务与备份验证；驱动不可用时保留 JSON 并明确记录阻塞。

### 2026-09-05 — T13.2 JSON→SQLite 隔离迁移审计

currentTask / 子任务：T13.2，建立不影响现网 JSON 数据的 SQLite 导入适配器。

修复前行为与复现：没有可执行的迁移路径或事务回滚证据，无法确认项目和后台任务元数据迁移失败时源数据仍安全。

修改文件：`server/sqliteRepository.mjs`、`scripts/sqlite-migration-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增可选 `node:sqlite` Repository，启用 WAL/busy timeout，提供项目、任务、资产元数据表及 JSON 导入；导入使用事务，异常执行回滚；当前生产仍保持 JSON 唯一写入源，不会因驱动或迁移失败自动切换。

实际执行的命令、退出码、结果：`node -e "import('node:sqlite')..."`（0，当前运行时可用）；`node scripts/sqlite-migration-audit.mjs`（0，项目1/任务1导入、SQLite计数一致、事务回滚和源文件未改均验证）；`pnpm check`（0，60 syntax files、27 offline audits）。

浏览器/渲染/接口证据：本子任务是隔离存储迁移审计，无浏览器行为；此前真实 MP4 与渲染任务证据仍通过 T11.2/T11.3 保持有效。

未运行检查及原因：尚未把 SQLite 设为生产写入源，也未做活跃数据在线迁移；需要先完成备份、双读比对和故障恢复设计，避免未经验证切换。

数据迁移状态与回滚方式：本轮只在临时目录创建 SQLite 文件并自动删除；生产 JSON 未迁移，回滚为不启用新适配器即可。

尚存风险/阻塞：`node:sqlite` 不是 Node 20 全版本保证能力；SQLite Repository 尚未接入路由、项目 revision 冲突事务和媒体文件清单；尚未验证活跃服务 WAL 备份恢复。

任务状态：T13 in_progress；T13.2 done（隔离导入/回滚证据齐全，生产切换未完成）。

nextTask：T13.3。

nextAction（具体到动作或命令）：补 SQLite 与 JSON 双读一致性报告及项目 revision 冲突测试，随后实现可恢复的 manifest/备份接口；完成前不切换默认存储。

### 2026-09-05 — T13.3 项目备份清单与恢复校验

currentTask / 子任务：T13.3，建立带校验和的项目级备份/恢复基础。

修复前行为与复现：没有统一项目备份清单，无法确认恢复时项目 JSON、媒体和任务记录是否完整，也无法可靠拒绝被篡改的备份。

修改文件：`server/backup.mjs`、`scripts/backup-restore-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：备份生成 manifest、文件大小和 SHA-256；恢复前逐项验证路径、大小和校验和；校验失败会以 `BACKUP_CHECKSUM_MISMATCH` 拒绝恢复；备份包含项目 JSON、项目媒体及任务目录，当前仅临时目录审计，未覆盖生产数据。

实际执行的命令、退出码、结果：`node scripts/backup-restore-audit.mjs`（0，备份1文件、恢复成功、篡改拒绝）；`pnpm check`（0，62 syntax files、28 offline audits）。

浏览器/渲染/接口证据：本子任务为服务端备份基础，无浏览器入口；真实 MP4 与后台任务证据保持由 T11.2/T11.3 提供。

未运行检查及原因：尚未开放生产备份/恢复 API，避免在保留策略、磁盘限额和恢复前预览未完成时允许覆盖活跃项目；未运行真实供应商 API。

数据迁移状态与回滚方式：仅临时目录生成并清理备份；生产 JSON/媒体未修改，移除新增模块与审计即可回滚。

尚存风险/阻塞：当前备份包含任务目录而非严格按项目过滤；恢复使用覆盖写入，尚未加入锁、预览差异、保留数量、磁盘配额和活跃 SQLite 一致性备份。

任务状态：T13 in_progress；T13.3 done（隔离备份/恢复与篡改拒绝证据齐全）。

nextTask：T13.4。

nextAction（具体到动作或命令）：按 projectId 过滤任务与资产、增加恢复前 manifest 预览和原子临时目录切换，再将备份能力接入受保护的本地 API；随后为 T12 统一任务执行器接入预算和并发限制。

### 2026-09-05 — T13.4 备份范围隔离

currentTask / 子任务：T13.4，修正项目备份的任务范围。

修复前行为与复现：备份会把 jobs 目录中的所有任务复制进去，存在跨项目任务混入和恢复后误关联风险。

修改文件：`server/backup.mjs`、`scripts/backup-restore-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：备份只纳入目标 projectId 的任务，同时保留项目 JSON 和该项目媒体；审计加入另一个项目任务并确认其未进入 manifest，恢复和篡改拒绝仍通过。

实际执行的命令、退出码、结果：`node scripts/backup-restore-audit.mjs`（0，2 个目标文件备份、恢复成功、跨项目任务排除、篡改拒绝）；`node --check server/backup.mjs`（0）。

浏览器/渲染/接口证据：无浏览器入口；前述真实 MP4 与后台任务证据未受影响。

未运行检查及原因：未开放恢复 API，仍需完成原子临时目录切换和恢复前预览后再接入。

数据迁移状态与回滚方式：未触碰生产数据；新增过滤逻辑可随模块回滚。

尚存风险/阻塞：资产目录过滤已按 projectId，任务恢复仍是覆盖写入；manifest 预览、磁盘保留策略和生产 API 尚未完成。

任务状态：T13 in_progress；T13.4 done（范围隔离具备临时目录审计证据）。

nextTask：T13.5。

nextAction（具体到动作或命令）：实现恢复到临时目录并完成校验后原子切换，禁止直接覆盖活跃项目；补失败恢复审计，再评估接入本地受保护备份 API。

### 2026-09-05 — T13.5 恢复临时切换与失败回滚

currentTask / 子任务：T13.5，避免恢复过程直接破坏活跃项目。

修复前行为与复现：恢复虽然先校验清单，但随后逐文件覆盖目标目录；若中途写入失败，可能留下半恢复状态。

修改文件：`server/backup.mjs`、`scripts/backup-restore-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：恢复先把备份内容复制到临时目录，再将现有目标文件移入回滚目录后切换；切换异常会按逆序恢复旧文件；清单校验失败在任何目标写入前拒绝，且审计确认失败恢复保留原项目内容。

实际执行的命令、退出码、结果：`node scripts/backup-restore-audit.mjs`（0，备份2个目标文件、恢复成功、跨项目任务排除、篡改拒绝、失败恢复后原内容 unchanged）；`node --check server/backup.mjs`（0）。

浏览器/渲染/接口证据：无浏览器入口；真实 MP4/渲染任务证据保持由 T11 审计提供。

未运行检查及原因：尚未接入活跃项目恢复 API，避免缺少锁和恢复前预览时开放覆盖操作；未运行真实供应商 API。

数据迁移状态与回滚方式：未修改生产数据；恢复自身保留回滚路径，临时目录在成功或失败后清理。

尚存风险/阻塞：跨多个目录的文件切换仍不是操作系统级单事务；尚未加入项目锁、恢复预览、备份保留数量和磁盘配额。

任务状态：T13 in_progress；T13.5 done（临时切换、失败回滚和篡改拒绝具备审计证据）。

nextTask：T13.6。

nextAction（具体到动作或命令）：为备份/恢复增加并发项目锁、manifest 预览接口和保留/磁盘策略测试，然后接入本地受保护 API；完成后开始 T12 统一 worker 的幂等、预算和并发控制。

### 2026-09-05 — T13.6 备份锁与受保护本地接口

currentTask / 子任务：T13.6，完成项目备份的并发保护和本地 API 接入。

修复前行为与复现：并发备份/恢复可能交错切换；备份模块只能被内部调用，前端没有清单查询和恢复入口；备份保留范围也没有项目隔离。

修改文件：`server/backup.mjs`、`server/index.mjs`、`scripts/backup-http-audit.mjs`、`scripts/backup-restore-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增按项目串行锁；新增本地受保护的创建、列表和恢复 API；恢复使用项目匹配的 backupId，拒绝任意路径和跨项目备份；备份列表提供清单、文件数和大小，支持保留/磁盘策略函数；恢复仍先校验后临时切换并失败回滚。

实际执行的命令、退出码、结果：`node scripts/backup-http-audit.mjs`（0，创建201、列表200、恢复200）；`node scripts/backup-restore-audit.mjs`（0，范围隔离、恢复成功、篡改拒绝、失败恢复不改变源）；`pnpm check`（0，63 syntax files、29 offline audits）。

浏览器/渲染/接口证据：真实启动本地服务完成备份 API POST/GET/restore HTTP 回归；尚未用浏览器手工点击备份入口，因为当前 UI 尚未接入备份管理页。

未运行检查及原因：未接入自动保留清理到生产定时器，避免没有用户可见预览和磁盘配额配置时自动删除用户备份；未运行真实供应商 API。

数据迁移状态与回滚方式：生产仍未切换 SQLite；备份 API 只新增 `data/backups` 文件，移除路由和模块即可回滚，不影响项目 JSON/媒体。

尚存风险/阻塞：恢复跨项目文件切换仍不具备单操作系统事务；保留清理函数尚未接入配置；UI 备份管理尚未完成；T12 统一 worker 的幂等/预算/并发仍待实现。

任务状态：T13 in_progress；T13.6 done（锁、接口和 HTTP/恢复审计具备证据）。

nextTask：T12.1。

nextAction（具体到动作或命令）：抽取统一后台任务执行器，先覆盖文本/图像/语音/视频/渲染五类任务，加入服务端并发槽、原子 claim、租约 heartbeat 和基础任务预算状态；保留现有真实渲染闭环回归。

### 2026-09-05 — T12.1 全类型生成任务 Worker 基础

currentTask / 子任务：T12.1，建立服务端统一生成任务队列。

修复前行为与复现：除部分视频任务外，文本、图像、语音和编辑任务主要由请求直接执行；页面断开后没有统一任务快照、恢复和查询入口，服务端也没有按任务类型限制并发。

修改文件：`server/taskWorker.mjs`、`server/index.mjs`、`scripts/generation-worker-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增 `/api/generate/jobs` 创建、查询、取消和重试接口；任务服务端持久化 payload 快照并由 worker 执行；默认并发可配置，视频与语音单并发；服务启动恢复 PENDING/RUNNING 任务；任务结果区分 SUCCEEDED、FAILED、CANCELLED、WAITING_PROVIDER；查询接口不返回输入快照。

实际执行的命令、退出码、结果：`node scripts/generation-worker-audit.mjs`（0，预置任务恢复成功、创建任务成功、重试成功、快照隐藏）；`pnpm check`（0，后续全量审计通过，新增生成 worker 审计）。

浏览器/渲染/接口证据：本地服务 HTTP 已验证统一 worker 的创建→执行→查询→重试和服务启动恢复；真实无密钥 MP4 渲染、取消和恢复继续由 T11 审计验证；尚未把现有前端所有生成按钮迁移到新接口。

未运行检查及原因：未宣称 providerTaskId 对账、429 退避、费用预算或供应商取消完成；这些需要 T12 后续子任务和受控 provider 契约测试。

数据迁移状态与回滚方式：新增 generation jobs JSON 记录，不改旧项目结构；移除新路由/worker 即可回滚，已有同步 `/api/generate` 保留。

尚存风险/阻塞：当前 worker 的 claim 主要依赖本机内存调度和串行文件写入，尚无租约 heartbeat；取消真实供应商请求还未贯穿所有 adapter；预算仅有并发槽，没有 awaiting_budget 状态。

任务状态：T12 in_progress；T12.1 done（五类任务基础队列具备 HTTP 和重启恢复证据）。

nextTask：T12.2。

nextAction（具体到动作或命令）：为 jobs 增加原子 claim、leaseUntil/heartbeat、worker 退出时孤儿任务回收和任务事件时间轴；加入可配置任务数/媒体秒数预算并验证超预算进入 awaiting_budget。

### 2026-09-05 — T12.2 任务 Claim、租约与预算门禁

currentTask / 子任务：T12.2，补统一生成 worker 的持久化所有权和基础预算控制。

修复前行为与复现：worker 只靠内存 active 状态，多个进程可能重复领取同一任务；没有 lease/heartbeat，服务异常退出后无法区分活跃任务和孤儿任务；预算超限只能由 UI 提示，服务端仍会执行。

修改文件：`server/jobs.mjs`、`server/taskWorker.mjs`、`server/index.mjs`、`scripts/generation-worker-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增串行写队列内的原子 claim；记录 `workerId`、`leaseUntil`、`heartbeatAt`；worker 周期续租，启动恢复仅重新领取已过期的 PENDING/RUNNING 任务；支持任务数、调用数和媒体秒数预算，超限服务端落为 `awaiting_budget`；生成任务支持创建、查询、取消和重试，payload 快照不对外返回。

实际执行的命令、退出码、结果：`node scripts/generation-worker-audit.mjs`（0，过期 RUNNING 任务恢复成功、创建成功、重试成功、预算超限为 awaiting_budget、快照隐藏）；`pnpm check`（0，65 syntax files、30 offline audits，真实 MP4/备份/渲染任务审计继续通过）。

浏览器/渲染/接口证据：本地 HTTP 已验证统一 worker 的恢复、重试和预算状态；T11 真实 FFmpeg MP4 取消/恢复闭环未回退；尚未把所有现有前端生成按钮迁移到统一 job API。

未运行检查及原因：尚未验证多进程共享存储下的 claim 竞争、租约网络分区和真实 provider 429/Retry-After；这些需要 T12 后续故障注入和 T14 适配器契约测试。

数据迁移状态与回滚方式：jobs JSON 只增加状态/租约/预算字段；旧同步生成接口仍保留，删除 worker 路由和新增字段即可回滚。

尚存风险/阻塞：claim 在当前 JSON 串行写队列内有效，但 SQLite 生产 Repository 尚未接入；预算是基础计数器，尚无按账户价格、币种和真实用量对账；供应商已受理任务的 reconcile 未完成。

任务状态：T12 in_progress；T12.2 done（claim、租约、恢复和预算超限均有 HTTP 审计证据）。

nextTask：T12.3。

nextAction（具体到动作或命令）：补任务事件时间轴、幂等键和输入指纹唯一约束；对已有 providerTaskId 优先查询，区分 needs_reconcile、429 可恢复和不可重试错误，禁止重复提交已受理任务。

### 2026-09-05 — T12.3 幂等、事件与 Provider 对账路径

currentTask / 子任务：T12.3，补任务重复提交防护和异步 provider 结果恢复。

修复前行为与复现：相同输入重复点击可能创建多个任务；任务记录没有可追溯事件；服务重启后 WAITING_PROVIDER 任务不会主动查询已有 providerTaskId，可能重复提交。

修改文件：`server/jobs.mjs`、`server/taskWorker.mjs`、`server/index.mjs`、`scripts/generation-worker-audit.mjs`、`scripts/task-reconcile-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：任务保存 `idempotencyKey` 和输入 SHA-256 指纹；相同幂等键返回原任务，显式新任务仍可使用新键；记录 queued/claimed/provider_accepted/reconciled/succeeded/failed/cancelled 事件；保存 providerTaskId；启动时对已有 providerTaskId 走 reconcile，不重复提交；同时增加 Windows 原子替换短退避，修复并发 claim 偶发 EPERM。

实际执行的命令、退出码、结果：`1..5 | ForEach-Object { node scripts/generation-worker-audit.mjs }`（5/5通过：恢复、创建、同幂等键复用、重试、预算状态、事件和快照隐藏）；`node scripts/task-reconcile-audit.mjs`（0，已有 providerTaskId 对账成功）；`pnpm lint`（0 errors、25 warnings）；此前全量 `pnpm check` 与 `pnpm build` 已通过，本轮新增审计也纳入 check。

浏览器/渲染/接口证据：统一生成任务本地 HTTP、启动恢复和 provider 对账单元 worker 审计通过；真实 FFmpeg MP4 渲染/取消/恢复和备份 HTTP 审计继续通过；真实供应商请求尚未执行。

未运行检查及原因：尚未对真实 429 Retry-After、网络超时后供应商已受理、供应商取消能力做线上故障注入；没有真实密钥，不伪造 live 结果。

数据迁移状态与回滚方式：jobs JSON 仅增加幂等、指纹、事件和 providerTaskId 字段；旧记录可继续读取，移除 worker 新路由即可回滚。

尚存风险/阻塞：JSON 文件锁只覆盖当前单机进程共享目录，SQLite claim 尚未接入；事件数组会增大任务文件；429 与 needs_reconcile 分类及退避策略仍待 T12.4。

任务状态：T12 in_progress；T12.3 done（幂等、事件和已有 providerTaskId reconcile 路径具备审计证据）。

nextTask：T12.4。

nextAction（具体到动作或命令）：为 provider 错误统一结构化 status/code/retryAfter，实施有限指数退避；无法确认是否已受理时落为 `needs_reconcile`，权限/余额/参数错误禁止自动重试，并为每次尝试记录输入指纹和预算用量。

### 2026-09-05 — T12.4 Provider 错误分类与有限退避

currentTask / 子任务：T12.4，防止供应商临时故障导致假失败或无限重试。

修复前行为与复现：Worker 对供应商错误统一立即写 FAILED；429、5xx、网络短暂故障没有有限退避；无法确认请求是否已受理时可能盲目再次提交。

修改文件：`server/taskWorker.mjs`、`server/jobs.mjs`、`scripts/task-retry-policy-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：按 HTTP 状态/错误特征区分 retryable、needs_reconcile、cancelled 和不可重试失败；可重试错误按 Retry-After/指数退避且受最大尝试次数限制；不确定受理错误进入 `needs_reconcile`；非重试错误直接 FAILED；每次状态变化写入事件时间轴，保留输入指纹和 attempt。

实际执行的命令、退出码、结果：`node scripts/task-retry-policy-audit.mjs`（0，429 重试后成功、400 直接 FAILED、网络受理不确定进入 needs_reconcile）；`pnpm check`（0，67 syntax files、32 offline audits）；`pnpm lint`（0 errors、25 warnings）；`pnpm build`（0，1600 modules，6,234.64 kB）。

浏览器/渲染/接口证据：Worker 故障注入和 HTTP 生成任务审计通过；真实 MP4 渲染、取消、重启恢复及备份 API 审计继续通过；未执行真实供应商请求。

未运行检查及原因：真实供应商的 Retry-After、提交后断网、429 响应体和取消能力需真实账户/受控代理，当前不具备条件，未虚构 live 证据。

数据迁移状态与回滚方式：仅扩展 jobs JSON 状态、attempt、retryAt 和事件字段；旧任务可读取，移除 Worker 新逻辑即可回滚。

尚存风险/阻塞：错误分类目前兼容现有供应商错误文本，尚未让所有 adapter 显式返回统一结构化 ProviderError；真实 providerTaskId 的完整下载/绑定事务仍待 T12.5/T14；无真实密钥无法完成 api_verified_v1。

任务状态：T12 in_progress；T12.4 done（故障注入和全量审计证据齐全）。

nextTask：T12.5。

nextAction（具体到动作或命令）：统一 providers.mjs 的 HTTP 错误对象和 Retry-After 解析，补上传/下载阶段的 needs_reconcile 与结果绑定事务；随后进入 T14 provider 契约和真实能力验证前置检查。

### 2026-09-05 — T12.5 结构化 Provider 错误

currentTask / 子任务：T12.5，统一供应商 adapter 错误元数据并保持任务对账语义。

修复前行为与复现：各 adapter 抛出不同格式的普通 Error，Worker 只能猜测 HTTP 状态；Retry-After 和 provider/network 不确定状态容易丢失，真实请求受理后重启无法可靠判断是否可重提。

修改文件：`server/providerErrors.mjs`、`server/providers.mjs`、`server/taskWorker.mjs`、`scripts/provider-error-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增 `ProviderError`，统一 provider/model/status/retryAfterMs/retryable/needsReconcile/code；live adapter 调用统一包装；Retry-After 支持秒数和 HTTP 日期；Worker 优先消费结构化分类，保留已有 providerTaskId reconcile，错误不会被假装成成功。

实际执行的命令、退出码、结果：`node scripts/provider-error-audit.mjs`（0，429/Retry-After、网络需对账、403 不重试均通过）；`pnpm check`（0，69 syntax files、33 offline audits）；`pnpm lint`（0 errors、25 warnings）；`pnpm build`（0，1600 modules，6,234.64 kB）。

浏览器/渲染/接口证据：全量审计继续验证真实 FFmpeg MP4、后台渲染取消/重启恢复、备份 API；Provider 错误验证为受控离线对象测试，未宣称真实账户调用。

未运行检查及原因：真实供应商 429、上传后断网、下载后绑定失败需要真实凭据和可控网络代理，当前不具备条件。

数据迁移状态与回滚方式：无生产数据迁移；仅新增错误模块和任务错误字段，移除包装即可回滚。

尚存风险/阻塞：上传/下载资产绑定尚未形成完整事务 outbox；部分旧 adapter 仍以文本错误交由统一包装解析；真实费用和 provider 账单对账未完成。

任务状态：T12 in_progress；T12.5 done（结构化错误和离线策略审计具备证据）。

nextTask：T12.6。

nextAction（具体到动作或命令）：为媒体上传/下载和任务结果绑定增加可重放 outbox、绑定前后状态和失败补偿；验证重复下载/绑定不会产生重复资产，再进入 T14 Provider 契约审计。

### 2026-09-05 — T12.6 媒体绑定幂等与结果补偿基础

currentTask / 子任务：T12.6，避免 provider 结果重复下载和重复资产。

修复前行为与复现：`saveBinaryAsset` 每次调用都生成随机文件名；同一 providerTaskId 在状态轮询或任务重试中重复绑定，会产生多个相同媒体文件；任务写入失败后重放无法安全复用已落盘结果。

修改文件：`server/store.mjs`、`server/index.mjs`、`scripts/media-probe-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：媒体保存支持 `assetKey`，以 projectId+key 的 SHA-256 生成稳定文件名；provider 视频 base64/远程下载统一使用 `provider-task:<taskId>`；重复绑定复用同一已探测资产，任务结果重放不会生成重复文件；保留原有 ffprobe 前置校验。

实际执行的命令、退出码、结果：`node scripts/media-probe-audit.mjs`（0，真实 MP4 探测通过、无效媒体拒绝、同 assetKey 仅保留1个文件）；`node scripts/render-audit.mjs`（0，真实视频+音频+字幕渲染、HTTP 成片下载、后台渲染通过）；`pnpm check`（0，69 syntax files、33 offline audits）；`pnpm lint`（0 errors、25 warnings）；`pnpm build`（0，1600 modules，6,234.64 kB）。

浏览器/渲染/接口证据：真实 FFmpeg/ffprobe 与本地 HTTP 渲染仍通过；媒体去重已用真实 MP4 文件验证；尚未对真实 provider 上传后断电/断网做线上故障注入。

未运行检查及原因：完整 outbox 持久化队列和失败补偿尚未实现，不提前宣称“事务绑定”完成；真实供应商仍无授权。

数据迁移状态与回滚方式：已有无 assetKey 的媒体文件不改名、不迁移；新绑定使用稳定文件名，移除 assetKey 参数即可回到随机文件模式。

尚存风险/阻塞：目前是确定性资产写入而非独立 outbox；跨进程同时首次写同一 key 仍需文件锁/索引约束；任务与资产引用尚未具备事务 outbox 状态。

任务状态：T12 in_progress；T12.6 done（媒体真实性、重复绑定去重和真实渲染证据齐全）。

nextTask：T12.7。

nextAction（具体到动作或命令）：新增持久化 asset-binding outbox，记录 pending/downloaded/bound/failed 状态和重放次数；把 providerTaskId、资产 URL、项目引用绑定到同一可恢复流程，并补并发重复绑定审计。

### 2026-09-05 — T12.7 Asset-binding Outbox

currentTask / 子任务：T12.7，建立 provider 媒体结果到项目资产的可恢复绑定。

修复前行为与复现：状态轮询直接下载并随机命名资产；下载成功但任务绑定写入中断时无法记录中间状态；并发重放同一 providerTaskId 会生成多个媒体文件。

修改文件：`server/assetBindings.mjs`、`server/store.mjs`、`server/index.mjs`、`scripts/asset-binding-audit.mjs`、`scripts/media-probe-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增持久化 binding 记录，状态包含 DOWNLOADING、BOUND、FAILED；按 projectId+providerTaskId 加锁；绑定过程使用稳定 assetKey；失败后可重放，已绑定结果直接复用；并发重复绑定不会生成重复资产；媒体仍必须先通过 ffprobe。

实际执行的命令、退出码、结果：`node scripts/asset-binding-audit.mjs`（0，失败后重放为 BOUND、并发绑定去重、最终资产数2）；`node scripts/media-probe-audit.mjs`（0，真实 MP4 探测、非法媒体拒绝、重复 assetKey 仅1文件）；`node scripts/render-audit.mjs`（0，真实视频/音频/字幕成片）；`pnpm check`（0，71 syntax files、34 offline audits）；`pnpm lint`（0 errors、25 warnings）；`pnpm build`（0，1600 modules，6,234.64 kB）。

浏览器/渲染/接口证据：真实 FFmpeg/ffprobe、本地 HTTP 渲染和资产绑定审计均通过；provider 上传后断电/断网未用真实账户执行。

未运行检查及原因：未把 binding outbox 做成独立 worker 队列，当前由状态轮询触发并可重放；真实供应商下载/绑定故障需外部凭据与网络注入条件。

数据迁移状态与回滚方式：新增 `asset-bindings` JSON 目录；既有随机文件不迁移；移除绑定模块调用即可回滚，旧资产继续可读。

尚存风险/阻塞：binding 文件写入尚未使用数据库事务；跨进程锁目前是单进程内存锁，SQLite 接入后需改为唯一约束/claim；绑定后项目引用更新仍依赖任务状态写入。

任务状态：T12 in_progress；T12.7 done（失败重放、并发去重和真实媒体验证具备证据）。

nextTask：T14.1。

nextAction（具体到动作或命令）：开始 T14 Provider 契约审计，盘点每个文本/图像/语音/视频 adapter 的输入输出 schema、能力限制、错误映射和 live 前置条件；不调用真实 API 时明确标记 pending_external_verification。

### 2026-09-05 — T14.1 Provider Adapter 契约注册

currentTask / 子任务：T14.1，建立可执行的 Provider adapter 操作契约并消除 keyframe 隐式路线复用。

修复前行为与复现：模型路由仅记录 provider/model/env，无法明确某 adapter 是否支持 validate、estimate、submit、poll、cancel、normalize；keyframe 直接复用 environment 数组，前端难以判断是继承还是独立路线。

修改文件：`server/providerContracts.mjs`、`server/providers.mjs`、`scripts/provider-contract-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增每个 adapter 的六项能力契约；`publicProviders` 返回 contract；manual 路线明确不支持 submit/poll/cancel；keyframe 使用独立数组并显式标记 `inheritedTask: environment`；缺少契约或能力字段会在审计中失败。

实际执行的命令、退出码、结果：`node scripts/provider-contract-audit.mjs`（0，8 类任务、31 条路线全部有契约，manual/no-submit 和 keyframe 显式继承通过）；`node scripts/model-route-audit.mjs`（0，既有路线审计通过）。

浏览器/渲染/接口证据：Provider registry 可通过既有 `/api/providers` 返回 contract；真实 MP4 渲染和后台任务审计未受影响；未进行真实供应商调用。

未运行检查及原因：尚未为每个 adapter 实现独立 validate/estimate/normalize schema，也未验证真实账户权限；本子任务只完成契约注册和静态可执行审计。

数据迁移状态与回滚方式：无数据迁移；keyframe 仍使用原模型 ID 和 routePreferences，新增继承元数据；移除 contract 模块和字段即可回滚。

尚存风险/阻塞：部分 adapter 的 cancel 实际仍不支持，契约已明确标记但完整接口尚未抽象；响应嵌套 schema 和错误字段路径校验待 T14.2；`api_verified_v1` 仍因无真实凭据 pending。

任务状态：T14 in_progress；T14.1 done（契约注册、路由继承语义和审计证据齐全）。

nextTask：T14.2。

nextAction（具体到动作或命令）：为 adapter 输入输出增加 schema 验证与字段路径错误，覆盖合法、缺字段、畸形、空产物和异常完成状态；未通过 validate 时禁止付费提交。

### 2026-09-05 — T14.2 Provider 输入输出 Schema 门禁

currentTask / 子任务：T14.2，为 adapter 统一增加输入输出结构校验和可定位错误。

修复前行为与复现：真实 adapter 调用前只有 prompt quality 和部分视频预检；不同供应商返回缺字段、空媒体或错误完成状态时，缺少统一的字段路径错误，也无法保证异常结果不会继续进入付费任务后续流程。

修改文件：`server/providerSchemas.mjs`、`server/providers.mjs`、`scripts/provider-schema-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增统一输入校验（任务类型、payload 对象、故事/剪辑/视频关键字段、camera 类型）；真实调用前执行校验，失败返回 `PROVIDER_SCHEMA_INVALID`、`kind=input`、任务名和 JSON 字段路径；真实 adapter 返回后执行输出校验，覆盖故事包、剪辑操作、图片/语音媒体、视频 taskId/产物、支持的状态枚举及 SUCCEEDED 无产物；输出校验位于路由执行记录和结果返回之前，因此未通过校验不会被记为成功或进入付费后续流程。演示结果保持明确的 demo 路径，不宣称为真实媒体。

实际执行的命令、退出码、结果：`node scripts/provider-schema-audit.mjs`（0，合法、缺字段、畸形、空图片/语音、异步视频、异常完成状态和字段路径断言全部通过）；`pnpm check`（0，75 syntax files、36 offline audits）；`pnpm lint`（0 errors、25 warnings，均为既有 React Hooks 依赖警告）；`pnpm build`（0，1600 modules，`dist/index.html` 6,234.64 kB，gzip 4,320.61 kB）。

浏览器/渲染/接口证据：完整 check 中真实 FFmpeg/ffprobe MP4+音频+字幕渲染、HTTP 下载、后台渲染、备份恢复、生成任务恢复/重试/预算、资产绑定和 Provider contract 审计均通过；本子任务未调用真实供应商 API。

未运行检查及原因：真实账户下每个 adapter 的响应兼容性、权限、计费和上游网络失败尚未验证；当前环境没有授权凭据，按要求保留 `api_verified_v1=pending_external_verification`，不把离线夹具结果标记为 live 完成。

数据迁移状态与回滚方式：无数据迁移；新增纯校验模块。回滚时移除 `providers.mjs` 两处断言和 audit 注册即可，现有项目、任务、资产文件不受影响。

尚存风险/阻塞：故事输出校验目前验证核心结构而非完整复刻各供应商的所有 JSON Schema 约束；真实 provider 的 URL/base64 字段变体仍需账户夹具确认；T14.1 标注的异常响应统一映射和真实账户验证仍未完成。

任务状态：T14 in_progress；T14.2 done（调用前后门禁和离线行为证据齐全）；T14 母任务未完成。

nextTask：T14.3。

nextAction（具体到动作或命令）：在不暴露密钥的受控条件下，为已配置 adapter 执行最小真实请求/响应回放，记录各供应商状态和媒体字段变体；先完成文本与图像，再验证语音和异步视频，失败只记录为 provider-specific 映射问题并修正 schema。

### 2026-09-05 — T14.3 Provider 异常状态映射补强

currentTask / 子任务：T14.3，修正 adapter 异常响应的状态码识别并补回归验证。

修复前行为与复现：OpenAI/Gemini 等路径构造的错误文本形如 `OpenAI 401: ...`、`Gemini 503: ...`，旧映射只从带 `HTTP/status/task` 前缀的文本提取状态码，导致鉴权失败和上游暂时故障可能落入 UNKNOWN 分类。

修改文件：`server/providerErrors.mjs`、`scripts/provider-error-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：统一异常映射现在可从供应商错误文本提取独立的 1xx–5xx 状态码；401/403 等拒绝保持不可重试，429/5xx 保持可重试，视频网络不确定性继续进入 `NEEDS_RECONCILE`；新增无 `HTTP` 前缀的 401/503 回归断言。

实际执行的命令、退出码、结果：`node scripts/provider-error-audit.mjs`（0）；`pnpm check`（0，75 syntax files、36 offline audits，包含真实 MP4/音频/字幕渲染和后台任务审计）；`pnpm lint`（0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,234.64 kB，gzip 4,320.61 kB）。

浏览器/渲染/接口证据：异常映射为离线夹具验证；全量 check 的本地真实成片闭环继续通过；没有伪造真实供应商账户证据。

未运行检查及原因：真实 adapter 账户回放仍需外部授权和计费条件，继续保持 `api_verified_v1=pending_external_verification`。

数据迁移状态与回滚方式：无数据迁移；仅改变异常解析规则，回滚 `providerErrors.mjs` 的状态码提取表达式即可。

尚存风险/阻塞：不同供应商 JSON 错误体的字段级语义仍未在真实响应上核对；T14.3 的真实账户回放未完成，不把本子任务标记为全部完成。

任务状态：T14 in_progress；T14.3 in_progress（异常映射离线部分完成，真实 adapter 回放待外部条件）。

nextTask：T14.3 继续。

nextAction（具体到动作或命令）：若持续任务检测到已配置且明确授权的 API key，执行单次最小真实文本请求并保存脱敏响应字段；随后按相同方式验证图像、语音和异步视频，否则继续推进不依赖外部凭据的 T15 长文本/多集可靠性。

### 2026-09-05 — T15.1 原文独立保存与章节索引

currentTask / 子任务：T15.1，保证长篇原文可恢复、可核对且不依赖 excerpt。

修复前行为与复现：小说分析结果只把原文长度和章节数写入项目，后续剧本请求使用 `sourceText.slice(0, 600000)`；原文不能从项目恢复，章节没有来源范围或哈希，UTF-8 BOM 也可能干扰首章识别。

修改文件：`server/workflow.mjs`、`server/index.mjs`、`scripts/novel-source-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：原始输入以 UTF-8 文档独立保存到项目隔离目录；解析副本仅去 BOM 并统一换行；项目 source 元数据记录原文字符数、字节数、原文 SHA-256、编码、章节数量和每章 sourceStart/sourceEnd/textHash；新增 `GET /api/projects/:id/source` 返回原文，项目保存仍只保留引用与摘要，不把全文塞进项目 JSON。

实际执行的命令、退出码、结果：`node scripts/novel-source-audit.mjs`（0，2 章、BOM/CRLF 原文、SHA-256、独立文件和 HTTP 下载字节一致）；此前 T14.3 的 `pnpm check`/lint/build 通过，本改动后将再次执行完整检查。

浏览器/渲染/接口证据：隔离 HTTP 服务实测 `/api/novel/analyze`、独立文档文件和 source 下载接口；未把 mock 剧本结果当成真实 API 验证。真实 MP4 闭环由已有 render audit 覆盖。

未运行检查及原因：长文本跨多个模型上下文的分块生成尚未实现；当前章节索引已真实保存，但不能据此宣称“长篇完整生成”完成。

数据迁移状态与回滚方式：旧项目无 source 文档时保持兼容读取；新导入新增 `source-documents/<projectId>.txt`，删除新字段和接口即可回滚代码，旧项目 JSON 不被破坏。

尚存风险/阻塞：source 文档写入与项目 JSON 目前不是数据库事务；source 文档替换失败后的清理和跨进程锁仍需加强；剧本生成链路仍有 600k/800k 字符截断。

任务状态：T15 in_progress；T15.1 done（原文独立保存和恢复证据齐全）。

nextTask：T15.2。

nextAction（具体到动作或命令）：新增按章节/字符预算的 source chunk 编译器，保证所有章节均有覆盖记录；将长篇请求改为可恢复的分阶段任务，不再依赖单次 `slice`，并用超过单请求预算的隔离夹具验证最后一章仍被处理。

### 2026-09-05 — T15.2 长文本章节分块计划

currentTask / 子任务：T15.2，建立不丢失末章的章节/预算分块基础。

修复前行为与复现：分析接口将完整原文截为 600,000 字符；单次供应商请求还会在 600,000/800,000 字符处再次截断，超长原文末章无法被可靠纳入生成上下文。

修改文件：`server/sourceChunks.mjs`、`server/workflow.mjs`、`server/index.mjs`、`scripts/source-chunk-audit.mjs`、`scripts/novel-source-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：新增稳定章节和 chunk ID、来源字符范围、chunk 哈希、章节首尾标志、重叠窗口和覆盖统计；分析项目保存 chunk plan 元数据，故事请求携带完整 `sourceText` 和 chunk plan，不再在分析接口先行截断。超过单请求预算的测试夹具可确认第三章末尾事件仍有完整 chunk 覆盖。

实际执行的命令、退出码、结果：`node scripts/source-chunk-audit.mjs`（0，3 章、7 chunks、末章完整覆盖）；`node scripts/novel-source-audit.mjs`（0，BOM/CRLF 原文独立保存和下载一致）；`pnpm check`（0，78 syntax files、38 offline audits，包含真实 MP4/音频/字幕渲染）；`pnpm lint`（0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,234.64 kB，gzip 4,320.61 kB）。

浏览器/渲染/接口证据：隔离 HTTP 分析接口已验证 source 文档与 chunk 元数据写入；真实无密钥 MP4 闭环保持通过。尚未把 chunks 拆成多个供应商调用，因此不宣称 T15.2 完成。

未运行检查及原因：尚未实现原著分析→故事圣经→剧集→场景/对白→分镜的可恢复阶段状态机；当前 adapter 内部仍保留上下文预算保护性截断，需要下一子任务改为阶段化输入。

数据迁移状态与回滚方式：新增 source chunk 元数据字段和纯计算模块，无旧文件迁移；旧项目没有 chunk plan 时继续使用既有摘要/excerpt 兼容路径。

尚存风险/阻塞：chunk plan 元数据仍随项目 JSON 保存，超大章节的正文不重复存入 JSON；单请求 adapter 仍可能只读取前段，直到阶段 worker 消费 chunk 计划；多集独立 scene/shot/timeline 尚待实现。

任务状态：T15 in_progress；T15.2 in_progress（分块计划完成并有覆盖证据，分阶段生成尚未完成）。

nextTask：T15.2 继续。

nextAction（具体到动作或命令）：为故事任务增加 stage/episode/coveredChunkIds 快照和阶段 worker；每阶段只提交对应 chunk 与已有摘要，失败只重跑失败阶段，用超预算三章夹具验证恢复后不重复、不漏末章。

补充验证：修复无密钥 demo 生成会将入口分集覆盖回单集的回归；隔离 HTTP 审计现已确认 `episodeCount=2` 返回两个不同 episodeId、场景带 episode 前缀、镜头带 episodeId，且原文下载仍字节一致。T15.2 仍不标记 done，因为供应商调用尚未真正按 chunk 分阶段执行。

补充进展：后台任务快照新增 `stage`、`episodeIndex`、`coveredChunkIds`，并在排队、领取、成功、重试、恢复和事件记录中保留；`generation-worker-audit.mjs` 已验证启动恢复、幂等提交和手动重试均不丢失阶段覆盖信息。该改动只完成可恢复状态基础，尚未实现每个阶段独立调用 adapter。

补充进展：新增显式 `stagedStory` 执行路径，按 source chunk 顺序实际调用 story adapter，合并分段剧集/分镜并返回 `chunkCount` 与 `coveredChunkIds`；`staged-story-audit.mjs` 在 MOCK_MODE 下实测 7 个 chunk 均执行并合并为 7 集。默认路径不自动扩大调用次数。由于当前重试仍会重新执行整个 stagedStory，T15.2 保持未完成。

补充进展：stagedStory 每个 chunk 完成后会将内部 `stageResults` 持久化；重试/恢复会携带已完成结果，公共任务响应隐藏完整阶段结果。`staged-story-audit.mjs` 实测 7 个 chunk 均成功、7 个阶段结果已落盘，未暴露给客户端。精准跳过已完成 chunk 的实际失败注入仍需补充，因此 T15.2 继续保持未完成。

补充完成：加入第 1 个 chunk 后的故障注入，随后以已持久化的部分结果恢复；`staged-story-retry-audit.mjs` 实测恢复从索引 1 开始，仅执行剩余 6 个 chunk，最终 7/7 覆盖。T15.2 的阶段执行、快照、恢复和精准重试证据齐全，标记为 done。

### 2026-09-05 — T15.3 剧本版本、差异提案与锁定字段

currentTask / 子任务：T15.3，避免分阶段或 AI 剧本写回覆盖人工确认内容。

修复前行为与复现：服务端和前端 `applyScreenplay`/`applyProjectTask` 会直接用新剧本替换标题、剧集和对白；没有统一锁定字段保护、生成前版本快照或差异提案，长篇分阶段结果无法安全审阅。

修改文件：`server/workflow.mjs`、`src/workflow.js`、`scripts/script-version-lock-audit.mjs`、`scripts/frontend-script-lock-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：服务端与前端写回均识别 `lockedFields`/`locks.fields` 路径，按稳定 ID 恢复锁定标题、台词等字段；每次剧本写回生成 AI 生成前快照和 `revisionProposal`，记录变更字段、来源 revision、provider/model 和受保护路径；阶段结果和前端手动回收共用该保护语义。

实际执行的命令、退出码、结果：`node scripts/script-version-lock-audit.mjs`（0，2 个锁定字段、7 个变更字段、1 个版本快照）；`node scripts/frontend-script-lock-audit.mjs`（0，前端路径同样保护锁定内容）；`pnpm check`（0，82 syntax files、42 offline audits，含真实 MP4/音频/字幕渲染）；`pnpm lint`（0 errors、25 warnings）；`pnpm build`（0，1600 modules，`dist/index.html` 6,236.32 kB，gzip 4,321.20 kB）。

浏览器/渲染/接口证据：服务端和前端写回单元审计通过；真实本地成片闭环继续通过；未把离线 fixture 当作真实供应商验证。

未运行检查及原因：尚未做真实浏览器多集切换和版本 UI 人工回归；当前项目页面存在既有 Hooks 警告，未在本子任务中扩大重构范围。

数据迁移状态与回滚方式：旧项目无锁定字段/版本数组时兼容运行；新增字段为项目 JSON 增量写入，移除保护与提案逻辑即可回滚，不删除旧版本数据。

尚存风险/阻塞：T15 的多集隔离已在无密钥导入/阶段夹具验证，但真实模型返回的 episode 数量和稳定 ID 仍需账户回放；版本快照当前保留核心剧本对象，尚未在 UI 提供逐字段可视化合并。

任务状态：T15 in_progress；T15.3 done（服务端/前端锁定、快照、差异提案证据齐全）。

nextTask：T16.1。

nextAction（具体到动作或命令）：盘点角色、场景、道具、声音、首帧和视频的版本字段，统一 `activeVersionId` 与输入 hash；替换散落 URL 真值，并用替换角色只使引用镜头 stale 的夹具验证影响范围。

### 2026-09-05 — T16.1–T16.5 资产版本、依赖失效与画布绑定

currentTask / 子任务：T16.1–T16.5，完成资产版本元数据、画布实体引用、依赖输入失效、统一视角策略和手动素材绑定基础。

修复前行为与复现：角色/道具/场景/镜头主要依赖散落 URL；替换参考图后没有统一版本和受影响镜头范围；自由画布节点可能只保存旧 URL；角色、道具、场景页面的视角标签重复且不一致；逐句声音或首帧变化不能明确使下游视频失效；手动媒体只按当前 UI 推测关联。

修改文件：`shared/assetVersions.mjs`、`shared/assetPolicy.mjs`、`src/assetLinkage.js`、`src/workflow.js`、`src/productionPlan.js`、`src/FreeformCanvas.jsx`、`src/AssistantWorkflow.jsx`、`src/main.jsx`、`scripts/asset-version-audit.mjs`、`scripts/canvas-asset-sync-audit.mjs`、`scripts/shot-dependency-hash-audit.mjs`、`scripts/asset-policy-audit.mjs`、`scripts/manual-binding-audit.mjs`、`scripts/check.mjs`。

完成的行为：有真实媒体时生成稳定 `activeVersionId`、版本元数据和输入签名；媒体变化创建新版本且无媒体不伪造完成状态；角色/道具/场景替换只标记引用镜头 stale，保留旧产物和 staleInputs；逐句声音变化只标记对应对白镜头，首帧变化只标记该镜头视频下游；视频输入签名包含镜头字段以及角色、道具、场景、声音 active 版本；视频回写前仍拒绝输入已变更的旧结果；自由画布节点同步 `businessEntityId/entityId/versionId` 与最新展示 URL，移动只改变位置；工作台和全链路执行器共用快速/标准一致性视角策略；手动媒体写入 `shotId/lineId/viewKey/sceneId` 结构化绑定。

实际执行的命令、退出码、结果：`node scripts/asset-version-audit.mjs`（0，角色新版本与局部 stale）；`node scripts/canvas-asset-sync-audit.mjs`（0，实体 ID、移动保留实体、版本切换）；`node scripts/shot-dependency-hash-audit.mjs`（0，角色/道具/场景/声音依赖快照、声音与首帧下游 stale）；`node scripts/asset-policy-audit.mjs`（0，快速/标准策略）；`node scripts/manual-binding-audit.mjs`（0，结构化绑定与空绑定）；`pnpm check`（0，89 syntax files、47 offline audits，含无密钥真实 FFmpeg MP4/音频/字幕及后台渲染审计）；`pnpm lint`（0 errors、25 warnings）；`pnpm build`（0，1602 modules，`dist/index.html` 6,247.52 kB，gzip 4,324.09 kB）。

浏览器/渲染/接口证据：全量 check 中的本地 HTTP→真实 MP4 下载、ffprobe 音视频质检、后台渲染成功/取消/恢复继续通过；本轮新增资产与依赖行为为模块夹具审计和构建验证，尚未完成真实浏览器手工交互、版本对比/回退 UI 验收；没有把模拟 provider 当作真实账户验证。

未运行检查及原因：未运行真实供应商 API，缺少明确授权和可控计费条件；未标记 `api_verified_v1`。未把 T16 母任务标记 done，因为版本对比、审核、设为主版本、回退和浏览器验收仍缺少完整 UI 行为证据。

数据迁移状态与回滚方式：旧项目缺少版本数组时按现有媒体兼容补建；无删除旧 URL/旧产物的迁移。回滚可移除同步调用、共享视角策略和画布同步字段，保留新增版本字段不影响旧项目读取。

尚存风险/阻塞：输入签名当前是跨 Node/浏览器可复现的轻量 v1 签名，不是密码学 SHA-256；画布已有历史节点若没有 `assetKind/businessEntityId` 仍按旧 URL 兼容；版本对比/回退操作尚未接入 UI；浏览器 Hooks 仍有 25 条既有 lint 警告；真实 provider 与 TTS 环境未验证。

任务状态：T16 in_progress；T16.1–T16.5 done（代码与离线行为证据齐全，完整 UI 验收待补）。

nextTask：T17.1。

nextAction（具体到动作或命令）：检查 `server/localTtsManager.mjs`、`scripts/local_tts_bridge.py` 和声音库面板的默认路径、端口、健康检查来源；改为环境配置/首次设置可覆盖，新增临时目录假引擎审计，确保启动失败只影响声音任务而不阻断普通编辑器。

### 2026-09-05 — T17.1 本地 TTS 配置可移植化与健康探针

currentTask / 子任务：T17.1，清理本地 TTS 的机器专属配置来源，并验证无模型环境下编辑器不被启动失败阻断。

修复前行为与复现：托管管理器中存在具体用户目录、Python/模型路径和散落的默认地址来源；管理器读取 `INDEXTTS_URL/F5TTS_URL`，配置中心读取 `INDEXTTS_BASE_URL/F5TTS_BASE_URL`，声音库面板还直接展示固定端口，因此自定义端口或换机器时状态可能与实际服务不一致。

修改文件：`server/localTtsManager.mjs`、`src/VoiceLibraryPanel.jsx`、`scripts/local-tts-config-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：本地 TTS 定义改为按调用读取环境配置，优先使用配置中心同名的 `INDEXTTS_BASE_URL/F5TTS_BASE_URL`，地址、健康路径、端口、Python、应用路径、模型根目录和模型目录均可覆盖；未显式设置 `LOCAL_TTS_AUTOSTART=true` 时不自动拉起缺失模型；F5-TTS 未配置应用路径会先返回明确错误；声音库显示服务状态接口返回的实际地址。保留默认回环地址只作为无配置时的安全本机默认，不包含具体用户目录。

实际执行的命令、退出码、结果：`node scripts/local-tts-config-audit.mjs`（0，临时 `127.0.0.1` HTTP 假服务同时通过 IndexTTS/F5-TTS 健康探针，自定义端口与地址返回一致，默认自动启动为 false）；`pnpm check`（0，90 syntax files、48 offline audits，新增配置审计通过）；`pnpm lint`（0，0 errors、25 warnings，均为既有 React Hooks 依赖警告）；`pnpm build`（0，1602 modules，`dist/index.html` 6,247.49 kB，gzip 4,324.08 kB）。

浏览器/渲染/接口证据：本子任务使用临时 HTTP 假引擎完成服务接口探针；未启动真实 IndexTTS/F5-TTS、未执行浏览器交互，故不宣称真实模型推理或完整 UI 回归。既有 `pnpm check` 仍包含无密钥真实 FFmpeg MP4/音频/字幕及后台渲染审计。

未运行检查及原因：未运行真实本地模型和 GPU/CUDA 检查，当前机器没有授权模型/运行条件；未进行安装包验证。

数据迁移状态与回滚方式：无数据格式迁移；环境变量是读取时兼容，删除新增环境变量即可回到安全回环默认；代码修改可由版本控制回退。

尚存风险/阻塞：托管子进程尚未登记 PID/启动 token，重复启动和切换引擎生命周期保护仍待 T17.2；官方桥接和第三方桌面应用协议、样音格式/时长/静音检测仍待 T17 后续；真实 provider/API 仍为 `api_verified_v1=pending_external_verification`。

任务状态：T17.1 done；T17 in_progress。

nextTask：T17.2，检查托管子进程生命周期，加入同引擎 single-flight、PID/启动 token 和不误杀外部服务的切换审计。

nextAction（具体到动作或命令）：读取并改造 `ensureLocalTtsService/startPreferredLocalTts/stopLocalTtsServices`，用临时 Node/Python 假进程验证双重启动只产生一个托管进程、外部服务不被关闭、切换引擎不会直接 kill 正在执行的任务。

### 2026-09-05 — T17.2 本地 TTS 托管生命周期与切换保护

currentTask / 子任务：T17.2，消除本地 TTS 重复启动竞态，明确托管进程与外部服务边界，并保护正在执行的语音任务。

修复前行为与复现：两个并发启动请求可能在第一次健康探针尚未完成时各自创建子进程；托管状态只有 engine/child，缺少可核对的进程身份；切换引擎路径会直接停止旧托管进程，且推理请求没有占用计数，可能中断正在工作的语音任务。

修改文件：`server/localTtsManager.mjs`、`server/providers.mjs`、`server/index.mjs`、`scripts/local-tts-lifecycle-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：同引擎启动请求通过 per-engine single-flight 合并；托管实例登记 PID、随机 startToken、启动时间和 activeRequests；本地语音实际请求通过 `withLocalTtsService` 计入占用并在 finally 释放；占用期间停止返回 busy，切换到另一引擎明确报错且不杀当前实例；停止函数只操作本项目保存的 child，不影响独立外部服务；服务进程收到 SIGINT/SIGTERM 时显式 force stop，避免遗留托管子进程。启动结果和状态接口返回 PID/托管信息，便于诊断。

实际执行的命令、退出码、结果：`node scripts/local-tts-lifecycle-audit.mjs`（0，临时假引擎记录 spawnedPids=1；双启动共享 PID/startToken；busy stop、切换保护、外部服务保护均通过）；`pnpm check`（0，91 syntax files、49 offline audits，新增生命周期审计通过）；`pnpm lint`（0，0 errors、25 warnings，均为既有 React Hooks 依赖警告）；`pnpm build`（0，1602 modules，`dist/index.html` 6,247.49 kB，gzip 4,324.08 kB）。

浏览器/渲染/接口证据：生命周期审计实际启动并停止了临时 Node 假引擎，并对独立 HTTP 服务做了停止前后健康探针；未启动真实 IndexTTS/F5-TTS、未执行浏览器交互，故不宣称真实 GPU 推理或 UI 完整回归。既有 `pnpm check` 的真实 FFmpeg 夹具仍通过。

未运行检查及原因：未运行真实 CUDA/显存环境和第三方桌面 TTS；未进行安装包验证；T17.3 的真实排队/显存互斥尚未完成。

数据迁移状态与回滚方式：无持久化数据迁移；新增状态只存在进程内，环境配置兼容读取；代码可由版本控制回退。

尚存风险/阻塞：当前 activeRequests 是应用侧请求占用计数，不是 GPU 驱动级显存检测；同引擎推理队列、有界容量、CUDA/显存错误诊断和真实模型验证仍待 T17.3 及后续；真实 provider/API 仍为 `api_verified_v1=pending_external_verification`。

任务状态：T17.2 done；T17 in_progress。

nextTask：T17.3，加入本地 TTS 有界推理队列与单引擎互斥。

nextAction（具体到动作或命令）：在 `server/localTtsManager.mjs` 增加 per-engine FIFO 队列、队列容量/超时配置和推理 lease，在 `server/providers.mjs` 通过队列执行本地 `/api/tts` 请求，并用临时假服务审计执行顺序、容量拒绝和异常释放。

### 2026-09-05 — T17.3 本地 TTS 有界队列与推理互斥

currentTask / 子任务：T17.3，为本地语音推理增加有界 FIFO 队列和跨引擎互斥 lease。

修复前行为与复现：本地 TTS 请求虽已计入占用，但没有等待队列容量和统一的跨引擎推理锁；并发请求可能同时进入不同引擎，无法明确反馈拥塞，也无法保证单 GPU 环境的互斥。

修改文件：`server/localTtsManager.mjs`、`server/providers.mjs`、`scripts/local-tts-queue-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：每个引擎默认限制执行中加等待中最多 2 项，可由 `LOCAL_TTS_QUEUE_LIMIT` 和 `LOCAL_TTS_QUEUE_TIMEOUT_MS` 覆盖；等待任务按 FIFO 执行，超容量立即返回可识别错误，等待超时自动移除；所有引擎共享全局 inference lease，前一项释放后才允许下一项进入，finally 路径保证异常也释放。状态接口返回 queueRunning/queueWaiting/inferenceLease，普通编辑器不依赖该队列。

实际执行的命令、退出码、结果：`node scripts/local-tts-queue-audit.mjs`（0，同引擎 FIFO、超容量拒绝、跨引擎 lease 顺序均通过）；`pnpm check`（0，92 syntax files、50 offline audits，新增队列审计通过）；后续数据可靠性审计追加后，最终全量检查为 `pnpm check`（0，95 syntax files、53 offline audits）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1602 modules，`dist/index.html` 6,248.95 kB，gzip 4,324.52 kB）。

浏览器/渲染/接口证据：使用本机临时 HTTP 假 TTS 服务实测队列状态与执行顺序；未启动真实模型或 GPU，因此只确认应用层互斥，不宣称驱动级显存测量。

任务状态：T17.3 done；T17 in_progress。

nextTask：T17.4，样音质量、授权记录、逐句文本 hash/实际时长及启动失败诊断。

nextAction（具体到动作或命令）：为 `voice-sample` 上传增加 ffprobe/ffmpeg 格式、时长和静音门禁；将样音质量与授权字段持久化；台词变化时只标记对应逐句声音与镜头 stale；补缺模型/CUDA/启动异常审计。

### 2026-09-05 — T17.4 样音与逐句声音可靠性、启动诊断

currentTask / 子任务：T17.4，完成样音质量门禁、授权来源记录、逐句语音依赖追踪和本地 TTS 启动失败诊断。

修复前行为与复现：样音上传仅在浏览器读取时长，服务端未检查静音或合理时长；语音库没有保存探测质量；逐句声音没有稳定 textHash/实际时长，台词修改后旧声音仍可能被当作可用；托管进程异常时可能只等长超时。

修改文件：`server/store.mjs`、`server/voiceLibrary.mjs`、`src/VoiceLibraryPanel.jsx`、`src/productionPlan.js`、`src/workflow.js`、`src/main.jsx`、`shared/assetVersions.mjs`、`server/localTtsManager.mjs`、`scripts/voice-sample-audit.mjs`、`scripts/voice-line-stale-audit.mjs`、`scripts/local-tts-start-error-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：`voice-sample` 必须通过真实 ffprobe 音频流检查、0.5–60 秒时长范围和 ffmpeg volumedetect 非全静音门禁；样音保存 `sampleMetadata/sampleQuality/sampleDuration`、`sourceType/rightsConfirmed/rightsNote/referenceText`；逐句声音保存 lineId/sceneId/text/textHash/duration/performance，台词 text 变化只将对应声音和引用镜头置 stale；启动缺少 Python、F5 应用、桥接文件、子进程异常、CUDA/显存或模型错误分别给出 `LOCAL_TTS_START_FAILED`/超时分类和有界诊断信息，服务状态显示 failed。

实际执行的命令、退出码、结果：`node scripts/voice-sample-audit.mjs`（0，1 秒正弦样音接受并记录 `maxVolumeDb=-18.5`，全静音/过短样音拒绝，授权记录通过）；`node scripts/voice-line-stale-audit.mjs`（0，仅 line-1/shot-1 stale）；`node scripts/local-tts-start-error-audit.mjs`（0，缺 Python 和 CUDA 错误分类通过）；最终 `pnpm check`（0，95 syntax files、53 offline audits）；`pnpm lint`（0，0 errors、25 warnings）；`pnpm build`（0，1602 modules，`dist/index.html` 6,248.95 kB，gzip 4,324.52 kB）。

浏览器/渲染/接口证据：真实 FFmpeg 音频夹具和临时本地 TTS HTTP/Node 假服务已验证；尚未执行真实 IndexTTS/F5-TTS、GPU/CUDA 和浏览器 UI 交互，因此未标记真实模型能力完成。

未运行检查及原因：真实模型权重、CUDA、第三方桌面协议和安装包不在当前可控测试条件内；外部 provider 仍需授权后单独验证。

数据迁移状态与回滚方式：样音质量和逐句元数据均为向后兼容新增字段；旧声音缺 textHash 时保留旧可用行为，但首次项目更新可识别为无法核对并标记 stale；移除新增校验/字段读取即可回退，未删除旧媒体。

尚存风险/阻塞：T17 的代码实现子项已完成，但真实本地 TTS/GPU、浏览器回归和代码/模型权重官方许可核对仍未完成，`api_verified_v1=pending_external_verification` 保持不变。

任务状态：T17.4 done；T17 in_progress（实现证据齐全，外部真实验收待条件）。

nextTask：T18.1，通用项目包 manifest 与导入预检。

nextAction（具体到动作或命令）：建立不含凭据和本机绝对路径的项目包 manifest，先覆盖旧 JSON 兼容、媒体 assetId/相对路径、哈希和缺失素材清单，再接入原子导入 API。

### 2026-09-06 — T18.2 任意 manifest 交付技术验证与可撤销回填

currentTask / 子任务：T18.2，移除 `validate-delivery` 的示例项目和固定文件名依赖。

完成的行为：新增 `server/deliveryValidator.mjs`，`scripts/validate-delivery.mjs` 改为读取任意 JSON manifest 和显式 root；每项媒体声明 `kind/path/expected`，支持图片尺寸与编码、音频采样率/声道/编码、视频尺寸/编码/FPS、时长及容差、是否必须音轨，并记录真实 ffprobe 流信息、文件大小和 SHA-256。相对路径越界、绝对路径和不安全路径进入失败清单；缺失必需文件、探测失败和规格不符均不会被标为通过。验证与写回分离：默认输出预览差异，`--apply` 原子写入实际观察值并保存 `.bak`，`--undo` 恢复原 manifest。新增 `delivery-manifest.example.json` 和 README 用法，示例不再由验证脚本内置。

修改文件：`server/deliveryValidator.mjs`、`scripts/validate-delivery.mjs`、`scripts/delivery-validator-audit.mjs`、`scripts/check.mjs`、`ai-delivery/delivery-manifest.example.json`、`ai-delivery/README.md`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`node scripts/delivery-validator-audit.mjs`（0，临时 FFmpeg 生成真实 PNG/WAV/MP4；任意项目 ID、FPS、时长容差、音轨、图片尺寸、非法规格拒绝、CLI preview/apply/undo 全通过）；`pnpm check`（0，语法与现有审计通过，新增交付验证审计已纳入）；`pnpm lint`（0 errors、26 warnings，均为既有 React Hooks 依赖警告）；`pnpm build`（0，1602 modules，`dist/index.html` 6,251.40 kB，gzip 4,325.37 kB）。

未解决问题：T18.3 尚未完成空数据目录导入后真实媒体可播放、项目重渲染和无引用缓存清理回归；尚未进行真实浏览器点击回归。真实 TTS/GPU、外部 provider、安装许可仍保持 pending，未虚标完成。

数据迁移与回滚：交付验证只在 manifest 上追加 `validation/observed`，原文件先保存为同路径 `.bak`；撤销命令恢复原文件；媒体不被改写。示例清单是新增文件，删除即可回滚文档入口。

任务状态：T18.2 done（真实 FFmpeg 夹具和 CLI 行为证据）；T18 in_progress。

nextTask：T18.3，隔离空数据目录导入项目包，读取导入媒体并交给真实 FFmpeg 渲染器，随后检查项目引用保护的清理策略。

nextAction（具体到动作或命令）：新增项目包迁移回归脚本：创建带真实短 MP4/PNG/音频的包，在新 `DATA_DIR` 导入，使用导入后的 `/api/assets` 读取并通过 `renderProject` 生成 MP4，验证 ffprobe 与导入前素材一致；再用引用/未引用缓存夹具验证清理范围。

### 2026-09-06 — T18.1 通用项目包 manifest、预检与原子导入

currentTask / 子任务：T18.1，完成可移植项目包的真实导出、预检、导入和前端入口。

完成的行为：新增 `server/projectPackage.mjs`，生成 `xingmu-project-package` ZIP manifest；项目数据先过滤凭据键并拒绝本机绝对路径，媒体条目带 `assetId`、包内相对路径、范围、字节数和 SHA-256。导出会把本地 `/api/assets/...` 引用改为 `asset://...`，源文档改为包内相对引用；缺失媒体不被示例图静默替换，而是形成可见 `missingRefs`。预检支持新 ZIP 和旧星幕 JSON，拒绝绝对路径、Zip Slip、重复条目、压缩/加密条目、CRC/SHA 不一致、超出条目/包/解压总量限制的输入。导入先完整预检，再写临时目录并原子改名；缺失素材默认拒绝，显式 `allowMissing=true` 才导入并留下 `missing://` 重链标记；项目 ID 冲突默认复制并重映射内部引用。新增服务端导出/inspect/import API，剪辑台下载 ZIP，总览页导入 ZIP/旧 JSON。

修改文件：`server/projectPackage.mjs`、`server/index.mjs`、`src/workflow.js`、`src/main.jsx`、`scripts/project-package-audit.mjs`、`scripts/project-package-http-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`node scripts/project-package-audit.mjs`（0，manifest/assetId/哈希、凭据和绝对路径拒绝、损坏包拒绝、旧 JSON 兼容、缺失清单、显式重链和冲突复制均通过）；`node scripts/project-package-http-audit.mjs`（0，真实启动本地服务，健康检查、项目保存、媒体上传、200 导出、200 预检、201 导入和 `http-package-audit-copy-1` 冲突复制均通过）；`pnpm check`（0，95 syntax files、55 audits）；`pnpm lint`（0 errors、26 warnings，均为 React Hooks 依赖警告）；`pnpm build`（0，1602 modules，`dist/index.html` 6,251.40 kB，gzip 4,325.37 kB）。

历史记录中的未解决问题：T18.2 当时尚未完成；后续 T18.2 记录已补齐任意 manifest 验证与可撤销回填。真实浏览器点击回归、空目录导入后实际播放/重渲染回归仍待 T18.3；T17 真实 TTS/GPU、外部 provider、安装许可仍保持 pending，未虚标完成。

数据迁移与回滚：旧 JSON 仅在导入时转换，不改写原文件；新媒体写入临时目录并在完整检查后替换，失败会清理临时目录，冲突导入生成新 ID；删除新增项目包代码/API 即可回退，不删除已有项目和媒体。

任务状态：T18.1 done（有离线夹具和真实 HTTP 服务证据）；此处为历史记录，当前 T18 仍在进行。

nextTask（历史记录）：T18.2，改造 `scripts/validate-delivery.mjs` 接收任意 manifest，并建立实际技术规格验证与预览/撤销回填审计；该项已由后续记录完成。

nextAction（历史记录）：先读取 `scripts/validate-delivery.mjs` 及其调用方，替换写死示例项目字段为 manifest 输入；该动作已完成，下一步为 T18.3 空目录导入与重渲染回归。

### 2026-09-06 — T18.3 空目录迁移、可播放媒体与安全清理

currentTask / 子任务：T18.3，验证项目包不仅能解压，而且能在新数据目录中被读取、重渲染和安全清理。

完成的行为：新增迁移回归夹具，使用真实 FFmpeg 生成短 MP4/WAV，构造带视频轨和音频轨的项目包，在隔离空 `DATA_DIR` 导入后逐字节核对导入媒体；启动真实本地服务后，通过 `/api/assets/...` 读取导入视频，调用 `/api/render` 完成真实 FFmpeg 重渲染，并再次下载包含视频和音频流的成片。新增 `server/cleanup.mjs`：默认只预览；显式应用时仅清理无项目 JSON 引用且超过保留期的 render 缓存和受控临时文件，项目 JSON、`assets/<projectId>` 以及有项目引用的 render 目录均受保护；新增 `/api/maintenance/cleanup` 预览/应用入口。

修改文件：`server/cleanup.mjs`、`server/index.mjs`、`scripts/project-package-render-audit.mjs`、`scripts/cleanup-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`node scripts/project-package-render-audit.mjs`（0，空目录导入、媒体字节一致、HTTP 媒体读取 200、真实 render `SUCCEEDED`、输出视频/音频流和成片读取 200 均通过）；`node scripts/cleanup-audit.mjs`（0，过期孤立 render 和临时文件清理、dry-run、项目 render 和项目素材保护均通过）；`pnpm check`（0，新增迁移/清理审计已纳入全量检查）；`pnpm lint`（0 errors、26 warnings）；`pnpm build`（0，1602 modules，`dist/index.html` 6,251.40 kB，gzip 4,325.37 kB）。

未解决问题：备份模块已有创建、校验、恢复、锁和保留函数，但 T18.4 尚未把 `keep/maxBytes` 接入显式维护 API，也未提供可配置的自动快照策略；尚未进行真实浏览器点击回归。真实 TTS/GPU、外部 provider、安装许可仍保持 pending，未虚标完成。

数据迁移与回滚：迁移只写入新数据目录，不修改源包；渲染输出位于新目录的 render 缓存；清理默认 dry-run，应用前返回候选清单，且不触碰受保护项目素材；审计结束后删除全部临时目录。

任务状态：T18.3 done（真实服务、真实媒体和 FFmpeg 证据）；T18 in_progress。

nextTask：T18.4，接入备份保留数量/磁盘上限维护入口和可选自动快照。

nextAction（具体到动作或命令）：为 `server/backup.mjs` 增加维护参数校验和服务端 prune API；在配置明确开启时按项目保存事件生成受控快照，默认关闭；用多份真实备份验证 keep、maxBytes、项目范围和当前数据不被删除。

### 2026-09-06 — T18.4 备份保留策略、维护入口与可选自动快照

currentTask / 子任务：T18.4，补齐备份保留数量、磁盘上限和可选自动快照的真实服务行为。

完成的行为：修正 `pruneProjectBackups` 的保留算法，按最新备份顺序同时应用 `keep` 数量和总 `maxBytes` 上限；新增 `POST /api/projects/:id/backups/prune`，缺省为保守的 keep=5、2GB；新增 `AUTO_PROJECT_BACKUP=true` 可选开关和最短间隔配置，项目保存后受控生成快照并按同一策略清理，默认关闭，不改变普通保存路径。原有备份清单校验、项目锁、恢复前校验和失败回滚保持不变。

修改文件：`server/backup.mjs`、`server/index.mjs`、`scripts/backup-http-audit.mjs`、`scripts/backup-retention-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`node scripts/backup-http-audit.mjs`（0，真实服务下自动快照、手动创建 201、列表 200、prune 200、keep=1 删除旧快照、恢复 200 均通过）；`node scripts/backup-retention-audit.mjs`（0，数量上限、字节上限、项目 JSON 保护通过）；最终 `pnpm check`（0，新增审计纳入全量检查）；`pnpm lint`（0 errors、26 warnings）；`pnpm build`（0，1602 modules，`dist/index.html` 6,253.01 kB，gzip 4,326.05 kB）。

未解决问题：自动快照默认关闭，需要部署者显式配置；尚未进行真实浏览器点击回归。T17 真实 TTS/GPU、外部 provider、安装许可仍保持 pending。

任务状态：T18.4 done；T18 done。

nextTask：T19.1，继续前端可用性与错误恢复。

### 2026-09-06 — T19.1 前端页面级错误恢复与项目列表状态

currentTask / 子任务：T19.1，先修复“服务失败却显示没有项目”的误导性空状态，并建立全局渲染错误兜底。

完成的行为：新增 `AppErrorBoundary`，捕获页面级 React 渲染异常并提供重新加载入口；项目列表读取区分 loading、真实空列表和服务端错误，错误状态显示原因与“重试读取”，不会伪装成空项目；项目包导入入口仍保持可用。

修改文件：`src/main.jsx`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`pnpm lint`（0 errors、26 warnings，均为既有 React Hooks 依赖警告）；`pnpm build`（0，1602 modules，`dist/index.html` 6,253.01 kB，gzip 4,326.05 kB）；随后 `pnpm check`（0，当前全量语法与 59 项审计通过）。当前尚未进行真实浏览器点击故障注入，因此只把代码级错误兜底标为已实施，不把完整 UI 回归标为完成。

未解决问题：需要浏览器/页面级故障注入审计确认 ErrorBoundary、列表重试和键盘/窄屏布局；保存 409 冲突展示、API 取消和模块拆分仍未完成。

任务状态：T19.1 in_progress。

nextTask：T19.1 浏览器/交互审计。

nextAction（具体到动作或命令）：启动本地服务，在真实页面注入项目列表 500、保存 409 和渲染失败，验证错误文案、重试入口、焦点恢复与 Escape 关闭；然后补请求 AbortController 和保存冲突保留本地副本入口。

### 2026-09-06 — T19.1 浏览器回归、保存冲突与请求取消

currentTask / 子任务：T19.1，完成项目列表真实故障恢复、保存冲突保护和请求取消的第一轮闭环。

完成的行为：修正项目列表错误态重试按钮被 Overview 默认空函数遮蔽的问题；`listServerProjects`、项目列表刷新、全流程生成和视频任务恢复均支持 AbortController/取消信号；保存请求区分 `REVISION_CONFLICT` 与普通后端不可用，冲突时保留本机草稿并提供“保留本地副本/重新加载服务端版本”；旧项目 JSON 缺少 revision 时首次保存自动从 0 迁移到 revision 1；工作流 ribbon 增加停止任务入口；保存冲突弹窗复用现有焦点管理与 Escape 关闭机制。

修改文件：`src/workflow.js`、`src/main.jsx`、`server/store.mjs`、`scripts/frontend-reliability-audit.mjs`、`scripts/project-revision-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`node scripts/frontend-reliability-audit.mjs`（0，409 冲突、localStorage 草稿保留、AbortError 返回和 signal 透传通过）；`node scripts/project-revision-audit.mjs`（0，revision 1→2、过期写入拒绝、旧 JSON 自动迁移通过）；`pnpm check`（0，105 个语法文件、60 项离线审计）；`pnpm lint`（0 errors、26 个既有 React Hooks 警告）；`pnpm build`（0，1602 modules，`dist/index.html` 6,256.40 kB，gzip 4,327.17 kB）。

真实浏览器证据：使用分离的 Vite 前端和本地 API 服务；先停止 API 验证页面显示“项目列表读取失败/重试读取”，恢复服务后点击“重试读取”真实回到项目总览；对旧项目执行保存验证服务端迁移 revision；外部推进同一项目版本后，页面真实显示“项目有新的服务端版本”，点击“保留本地副本”关闭弹窗并显示本地草稿已保留；点击“停止任务”在无运行任务时显示明确状态反馈。未把 ErrorBoundary 运行时崩溃注入、窄屏布局和主要页面逐页回归虚标为完成。

未解决问题：尚未完成主要页面的运行时 ErrorBoundary 故障注入、Escape/焦点恢复与窄屏浏览器回归；编辑器渲染轮询仍需把 AbortController 接到 UI 取消按钮；配置并发序列化、模块拆分和性能基线仍待后续子任务。T17 真实 TTS/GPU、外部 provider、安装许可继续保持 pending。

任务状态：T19.1 in_progress（项目列表/409/请求取消第一轮已验证，剩余页面级交互和模块拆分未完成）。

nextTask：T19.1 主要页面浏览器审计。

nextAction（具体到动作或命令）：在分离前端/API 环境继续对剪辑台、工作流弹窗和模型中心做运行时故障注入；验证 ErrorBoundary、Escape 关闭、焦点回归和 760px/420px 视口，然后将渲染轮询也接入可取消信号。

### 2026-09-06 — T19.1 剪辑台渲染取消与窄屏弹窗回归

currentTask / 子任务：T19.1，补齐剪辑台真实成片轮询的取消信号，并验证主要导出/复盘弹窗的 Escape 与窄屏行为。

完成的行为：`src/main.jsx` 的真实 MP4 创建、状态轮询、成片读取和轮询等待均接入同一个 `AbortController`；组件卸载会中止轮询，Escape 在渲染中触发后台取消，未创建任务时也会结束前端等待态。导出设置和数据复盘弹窗支持 Escape 关闭；新增 760px/420px 断点规则，使导出、工作流、小说、模型和信息弹窗在窄屏内滚动且操作按钮可换行/纵向排列。

修改文件：`src/main.jsx`、`src/styles.css`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`pnpm lint`（0 errors、26 warnings，均为既有 React Hooks 依赖警告）；`pnpm check`（0，105 个语法文件、60 项离线审计）；`pnpm build`（0，1602 modules，`dist/index.html` 6,258.67 kB，gzip 4,327.82 kB）。

真实浏览器证据：分离启动 Vite 前端和本地 API；导出设置弹窗 Escape 关闭、数据复盘弹窗 Escape 关闭均通过；760px 与 420px 视口 `scrollWidth === clientWidth`，无页面横向溢出，420px 导出弹窗实际宽度 404px 并保持在视口内；第二次真实 MP4 后台任务在 `PENDING` 时按 Escape，页面真实显示 `CANCELLED · 100%` 和“已取消渲染”。测试结束后已恢复默认视口。

未解决问题：本轮没有把任意 React 子树异常强行注入生产页面，因此 ErrorBoundary 仍只有代码级实现和列表错误态浏览器证据；主要页面的焦点回归、工作流/模型中心运行时 ErrorBoundary 仍待验证。配置并发序列化、T19.2 模块拆分/性能基线，以及 T17 真实 TTS/GPU、外部 provider、安装许可继续保持 pending，未虚标完成。

任务状态：T19.1 in_progress；本记录仅确认渲染取消、Escape 和窄屏子项完成，不把 T19.1 或 T19 标记 done。

nextTask：T19.1 主要页面运行时错误与焦点审计。

nextAction（具体到动作或命令）：在当前分离前端/API 环境，对工作流和模型中心注入可恢复运行时异常，确认 `AppErrorBoundary` 的重载入口、焦点恢复和 Escape 行为；通过后再建立 T19.2 的模块体积、首屏和轮询性能基线。

### 2026-09-06 — T19.1 页面/弹窗错误恢复与 T19.2 首轮正式分包

currentTask / 子任务：T19.1 收尾并开始 T19.2，验证页面级错误恢复、弹窗焦点归还，并解除正式构建的单文件体积限制。

完成的行为：新增 `src/PageErrorBoundary.jsx`，将主要内容区和弹窗区分别置于可恢复错误边界；错误 fallback 明确保护项目数据、支持重试当前页面或返回总览。开发态仅测试探针 `?xingmuQa=page-error|modal-error` 可注入页面/弹窗渲染异常，生产构建不会启用探针。焦点管理新增 pointer/click 触发目标记录，解决自动化点击或非焦点触发器关闭弹窗后焦点落到 BODY 的问题；弹窗关闭后归还原触发按钮，Tab 循环和 Escape 行为保持有效。

正式构建改为外部 hash 资源和 React/图标 vendor 分包，`pnpm build:demo` 保留单文件演示模式；更新 README、`.gitignore` 和新增 `scripts/performance-baseline.mjs`，记录入口实际引用资源并计算 gzip 首屏 JS/CSS。

修改文件：`src/PageErrorBoundary.jsx`、`src/main.jsx`、`vite.config.js`、`package.json`、`README.md`、`.gitignore`、`scripts/performance-baseline.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`pnpm lint`（0 errors、26 个既有 React Hooks warnings）；`pnpm check`（0，106 个语法文件、60 项离线审计，含真实 FFmpeg MP4/音频/字幕/后台任务/包迁移/备份审计）；`pnpm build`（0，1603 modules，入口 0.61 kB，`index` JS 416.56 kB、React 133.93 kB、icons 33.87 kB、CSS 230.85 kB）；`pnpm build:demo`（0，单文件 `dist-demo/index.html` 6,260.67 kB，gzip 4,328.48 kB）；`pnpm test:performance`（0，正式首屏 JS/CSS 875,561 bytes，gzip 249,981 bytes，4 个入口资源，低于 1.5MB 首屏目标）。

真实浏览器证据：正式 `dist/` 通过 Vite preview 加载，页面标题、应用根节点、外部 JS/CSS URL 均正常；开发页注入 `page-error` 后显示页面级错误 fallback，点击“重试当前页面”清除探针并恢复剪辑台；注入 `modal-error` 后打开“模型与 API 接入中心”显示弹窗级 fallback，点击重试后恢复模型中心；真实打开模型中心时首焦点为“关闭”，关闭后焦点回到“模型与 API 接入中心”触发按钮。既有列表失败/409/MP4取消/760px与420px证据继续有效。

未解决问题：正式构建虽已分包，但编辑器主体仍在 `src/main.jsx`，尚未完成按页面/重模块动态拆分；尚未用 1000 片段夹具实测拖动每帧耗时、选中反馈 p95、长列表/媒体缩略图和冷缓存首屏，因此不把 T19/T20 标记 done。T03 配置并发、T17 真实 TTS/GPU/许可、外部 provider、安装交付和 `RELEASE_ACCEPTANCE` 仍待后续，`api_verified_v1` 保持 pending。

任务状态：T19.1 done（页面/弹窗错误恢复、焦点、Escape、窄屏和真实页面证据已具备）；T19 in_progress；T19.2/T20 in_progress。

nextTask：T19.2/T20 编辑器模块拆分与性能实测。

nextAction（具体到动作或命令）：抽取剪辑台和导出/模型中心的独立模块，保留现有行为契约；生成隔离的 1000 片段时间线夹具，在正式构建和浏览器冷缓存下测量首屏、拖动长任务与选中反馈 p95，再按证据决定虚拟化和媒体缩略图按需加载。

### 2026-09-06 — T19.2 首轮动态模块拆分与正式预览回归

currentTask / 子任务：T19.2，先拆出不依赖主页面状态的创作画布、智能补全、声音面板、章节阅读和剧本素材交接模块，降低总入口初始包。

完成的行为：`ProductionCanvas`、`AssistantWorkflow`、`VoiceLibraryPanel`、`ScriptAssetHandoff`、`ScriptChapterReader` 改为 `React.lazy` 动态加载，内容区加入明确的模块加载状态；正式 `dist/` 保持外部 hash 资源，按进入页面再加载对应 chunk，旧的 `build:demo` 单文件演示路径不受影响。

修改文件：`src/main.jsx`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`pnpm build`（0，1604 modules；入口主 JS 349.26 kB，React 133.93 kB，icons 33.87 kB，5 个页面/面板动态 chunk）；`pnpm test:performance`（0，首屏 JS/CSS 802,245 bytes，gzip 227,608 bytes）；`pnpm lint`（0 errors、26 个既有 warnings）；`pnpm check`（0，106 个语法文件、60 项离线审计）。

真实浏览器证据：通过 Vite preview 加载正式 `dist/`，初始 HTML 引用外部入口 JS/CSS；依次打开创作画布、角色与声音、剧本工坊，等待各自动态模块加载后分别观察到画布、角色圣经和剧本内容，页面无错误边界 fallback。API 服务未启动时 preview 的项目/供应商/声音请求仅显示本地可解释错误，不影响静态 chunk 加载验证。

未解决问题：剪辑台和模型中心仍在主入口模块，尚未完成全部重模块拆分；尚未建立 1000 片段时间线夹具并测量拖动长任务、选中反馈 p95、长列表虚拟化、媒体缩略图和冷缓存首屏，因此性能目标仍是部分达成，不把 T19.2/T20 标记 done。

任务状态：T19.2 in_progress；动态分包首轮完成并有正式预览证据。

nextTask：T19.2/T20 时间线与长列表性能实测。

nextAction（具体到动作或命令）：新增隔离 1000 片段时间线夹具和浏览器 PerformanceObserver/事件采样，测量冷缓存初始资源、拖动期间 long task、pointerup 提交耗时与选中反馈 p95；若超过目标，再拆分剪辑台和导出/模型中心并按可见窗口优化缩略图。

### 2026-09-06 — T19.2/T20 1000 片段时间线夹具与首轮交互测量

currentTask / 子任务：T19.2/T20，建立不写入用户项目的开发态大时间线夹具，取得真实 DOM 和指针拖动基线。

完成的行为：开发态 `?xingmuQa=timeline-1000` 渲染真实 `Timeline` 组件和 1000 个片段、3 条轨道，夹具固定在独立覆盖层中，不进入生产构建，也不调用保存接口；增加仅开发态的夹具样式与模块加载状态。

实际执行的命令、退出码、结果：`pnpm build`（0，1604 modules，动态 chunk 保持通过）；`pnpm lint`（0 errors、26 个既有 warnings）；`pnpm test:performance`（0，正式首屏 JS/CSS gzip 228,224 bytes，4 个初始资源、10 个总资源）。

真实浏览器证据：Vite 开发页加载夹具后实际查询到 1000 个 `.timeline-clip`、3 个 `.track`，页面无横向溢出；使用浏览器 CUA 对相邻片段连续采样 20 次指针拖动，墙钟耗时 min 92ms / p50 119ms / p95 139ms / max 145ms，拖动结束后仍为 1000 个片段且无页面错误。该 p95 包含浏览器动作通道开销，不能直接等同于主线程 long task；当前只能确认尚未满足 100ms 交互目标，不能标记性能目标完成。

未解决问题：当前 Timeline 仍渲染全部片段，剪辑台主模块和模型中心仍未拆出；浏览器安全只提供只读页面评估，未取得 PerformanceObserver long-task 明细；需要在应用内加入可审计的 pointerup/渲染耗时采样或使用本地性能面板，再决定可见窗口虚拟化和 `React.memo` 片段组件化。T19.2/T20 保持 in_progress。

nextTask：T19.2/T20 时间线交互优化。

nextAction（具体到动作或命令）：把 Timeline 的片段按钮提取为稳定 props 的 `React.memo` 组件，避免拖动状态变化时 1000 个片段全部重渲染；增加仅夹具启用的 pointerdown→pointerup 与 commit duration DOM 指标，重新采样 p95，再评估是否需要水平可见窗口渲染。

### 2026-09-06 — T19.2 时间线片段 memo 与内部交互采样

currentTask / 子任务：T19.2/T20，针对 1000 片段基线中拖动状态导致的全量按钮重渲染，提取 `TimelineClip` 并加入夹具专用内部指针耗时指标。

完成的行为：`TimelineClip` 提取为稳定 props 的 `React.memo` 组件，自定义比较器只让片段数据、选中、拖动、settled 或轨道静音状态变化的片段重渲染；开发态夹具在 Timeline 根节点记录 pointerdown→pointerup 样本与 p95，生产构建不会启用 QA 指标。

修改文件：`src/main.jsx`、`src/styles.css`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`pnpm build`（0，1604 modules，动态 chunk 通过）；`pnpm lint`（0 errors、26 个既有 warnings）；`pnpm check`（0，106 个语法文件、60 项离线审计，真实 FFmpeg/任务/迁移/备份链路继续通过）。

真实浏览器证据：开发态 1000 片段夹具仍实际渲染 1000 个片段、3 条轨道且无错误边界；浏览器 CUA 连续 20 次拖动后，Timeline 内部指标 `data-qa-pointer-samples=20`、内部 pointer p95 `48.3ms`，片段数仍为 1000。此前通道墙钟采样受浏览器动作通道影响，曾出现 115ms p95，因此不将其当作主线程指标；现在只把内部 pointer 指标作为局部证据，未声称已完成全部性能目标。

未解决问题：还未测 pointerup 后真实项目 commit、长列表筛选、媒体缩略图和冷缓存首屏的用户路径；剪辑台/模型中心重模块仍未全部动态拆分，未实现可见窗口虚拟化，也未获得独立 PerformanceObserver long-task 明细。T19.2/T20 继续 in_progress。

nextTask：T19.2/T20 剪辑提交与长列表性能。

nextAction（具体到动作或命令）：为 QA 夹具增加一次真实 `onMoveClip`/pointerup 提交的内存态耗时记录，并在正式 preview 下测量素材搜索与 1000 条片段长列表；若提交或滚动超过目标，再抽取剪辑台/模型中心模块和实施水平可见窗口。

### 2026-09-06 — T19.2/T20 提交、长列表与媒体缩略图实测

currentTask / 子任务：T19.2/T20，完成 1000 片段提交路径和 1000 素材长列表/缩略图夹具的真实浏览器采样。

完成的行为：`?xingmuQa=timeline-1000` 夹具改为内存态维护 1000 个真实 `Timeline` 片段；开发态“触发一次真实提交”按钮调用与 pointerup 相同的 `onMoveClip` 回调，并通过 `useLayoutEffect` 记录 state 更新后的 React 提交与布局耗时。`?xingmuQa=media-1000` 夹具覆盖 1000 条素材、实际图片缩略图背景资源、搜索过滤和匹配数量，不触碰用户项目或服务端数据。

修改文件：`src/main.jsx`、`src/styles.css`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`pnpm build`（0，1604 modules，正式入口 JS 350.56 kB、React 133.93 kB、icons 33.87 kB、CSS 231.86 kB）；`pnpm test:performance`（0，初始 4 个 JS/CSS 资源，804,605 bytes，gzip 228,458 bytes，10 个总资源）；`pnpm build:demo`（0，`dist-demo/index.html` 6,265.21 kB，gzip 4,330.29 kB）；`pnpm lint`（0 errors、26 个既有 React Hooks warnings）；`pnpm check`（0，106 个语法文件、60 项离线审计，真实 MP4 视频/音频/字幕、后台任务、项目包迁移和备份恢复继续通过）。

真实浏览器证据：开发页时间线夹具实际渲染 1000 个 `.timeline-clip`、3 条轨道，20 次真实提交样本后 `data-qa-commit-samples=20`、提交/布局 p95 `7.9ms`、页面错误数为 0；媒体夹具初始实际渲染 1000 个素材，其中图片缩略图样式实际指向 `/assets/last-starline.png`，连续 19 次搜索后匹配 200 条、过滤 p95 `0.4ms`、页面错误数为 0。之前的 Timeline 内部 pointer p95 `48.3ms` 仍仅代表 pointerdown→pointerup 阶段；本次提交计时通过开发态动作按钮调用同一 `onMoveClip` 回调，未把浏览器动作通道或不可用的直接拖动接口冒充主线程 long-task 证据。

未解决问题：正式 preview 冷缓存首屏、滚动期间 PerformanceObserver long-task、真实鼠标 pointerup→项目保存写回仍未单独验证；剪辑台和模型中心仍在主入口，未完成重模块抽取；尚未证明需要可见窗口虚拟化，因此 T19.2/T20 保持 in_progress。T03 配置并发、T17 真实 TTS/GPU/许可、外部 provider、安装交付和 `api_verified_v1` 仍按账本保持 pending。

任务状态：T19.2/T20 的 1000 片段提交、长列表搜索和缩略图子项有真实证据，但母任务未完成。

nextTask：T19.2/T20 正式 preview 冷缓存与长列表滚动审计。

nextAction（具体到动作或命令）：启动 `pnpm preview --host 127.0.0.1`，在新浏览器上下文记录首次加载引用资源、缓存命中后的加载差异和 1000 素材网格滚动期间的 PerformanceObserver long-task；同时继续抽取 `ModelCenter` 为动态模块，保留错误边界、焦点归还和 API 路由行为。

### 2026-09-06 — T19.2/T20 模型中心拆分与正式 preview 性能审计

currentTask / 子任务：T19.2/T20，完成模型中心动态拆分，并取得正式 preview 冷缓存、缓存命中、长任务和长列表滚动证据。

完成的行为：新增 `src/ModelCenter.jsx`，把 API 路由、配置保存、供应商连接验证、手动模式入口和失败反馈从主入口移出；`main.jsx` 通过 lazy chunk 加载并提供独立 Suspense fallback，原有弹窗 ErrorBoundary 和焦点管理保持不变。运行时 QA 夹具新增仅 localhost/127.0.0.1 preview 可用的资源/导航/Long Tasks 面板；开发态 1000 素材夹具新增真实滚动采样按钮。页面级和弹窗级故障探针仍只在开发模式启用。

修改文件：`src/ModelCenter.jsx`、`src/main.jsx`、`src/styles.css`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`pnpm build`（0，1605 modules；入口 JS 347.90 kB，ModelCenter 动态 chunk 9.83 kB，React 133.93 kB，icons 33.87 kB，CSS 232.02 kB）；`pnpm test:performance`（0，初始 4 个 JS/CSS 资源，801,589 bytes，gzip 227,696 bytes，11 个总资源）；`pnpm build:demo`（0，`dist-demo/index.html` 6,272.51 kB，gzip 4,332.30 kB）；`pnpm lint`（0 errors、26 个既有 React Hooks warnings）；`pnpm check`（0，106 个语法文件、60 项离线审计，真实 MP4/音频/字幕、后台任务、项目包迁移、备份恢复继续通过）。

真实浏览器证据：开发页打开模型中心后实际出现模型对话框，API 服务不可用时显示“无法连接本地编排服务”错误，首焦点为关闭按钮，关闭后焦点回到“模型与 API 接入中心”触发按钮；`modal-error` 注入后显示弹窗 ErrorBoundary，点击重试恢复模型中心。正式 preview 的 `runtime-performance` 面板首次加载记录 7 个资源、230,496 bytes、DOM 39.9ms、Load 48.9ms、Long Tasks 0；同 URL 缓存命中记录 7 个资源、2,100 bytes、DOM 40.5ms、Load 54.2ms、Long Tasks 0；开发态 1000 素材网格真实点击滚动采样按钮后渲染 1000 条、13 个滚动事件样本、下一帧 p95 0.1ms、页面错误数为 0。

未解决问题：正式 preview 的 Long Tasks 为 0 只能证明本次样本没有观测到长任务，不代表任意机器和媒体规模都无长任务；真实鼠标 pointerup 后完整项目保存写回尚未单独回归；剪辑台 `Editor` 仍在 `main.jsx`，尚未按职责拆出；T03 配置并发、T17 真实 TTS/GPU/许可、外部 provider、安装交付和 `api_verified_v1` 继续保持 pending。T19.2/T20 仍 in_progress。

任务状态：ModelCenter 动态分包、正式 preview 首次/缓存指标、Long Tasks 采样和 1000 素材滚动子项完成；母任务未完成。

nextTask：T19.2/T20 剪辑台保存回归与 Editor 主模块拆分。

nextAction（具体到动作或命令）：启动前端/API 分离环境，创建或打开真实项目，在时间线执行一次 pointerdown→移动→pointerup，确认 `onMoveClip` 后项目 revision、服务端 JSON 和刷新后的片段位置一致；随后抽取 `Editor` 的导出/预览或 Timeline 外壳为动态模块，回归错误边界、取消渲染和保存冲突，再进入 T21。

### 2026-09-06 — T03/T19.2 Editor 保存一致性回归与 P1 修复

currentTask / 子任务：T03/T19.2，验证真实 Editor 保存路径的 revision、服务端项目、浏览器刷新一致性。

发现并修复的问题：隔离 API 数据目录创建真实项目后，开发态 Editor 提交一次时间线移动，服务端已从 revision 1 写到 revision 2、片段起点写为 0.25，但刷新页面仍从浏览器本地快照读取 revision 1。根因是 `flushProjectSave` 只把服务端 revision 放回 React 状态，没有把成功响应的新 revision 回写 localStorage。现已在服务端保存成功且项目仍匹配时，将 `{...next, revision: result.project.revision}` 写回本地快照，再更新 React 状态。

完成的行为：新增仅开发态 `?xingmuQa=editor-save` 动作，调用 Editor 内部与 pointerup 相同的 `moveClip → commit → updateProject → syncProject` 保存链路，并暴露 revision/首片段起点用于回归；不进入生产构建。此动作也保留 API 服务隔离、项目 ID 和 revision 条件，避免污染用户数据。

修改文件：`src/main.jsx`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`pnpm build`（0，1605 modules；入口 JS 348.24 kB，ModelCenter 动态 chunk 9.83 kB，React 133.93 kB，CSS 232.02 kB）；`pnpm test:performance`（0，初始 JS/CSS gzip 227,794 bytes，4 个初始资源、11 个总资源）；`pnpm build:demo`（0，`dist-demo/index.html` 6,272.83 kB，gzip 4,332.39 kB）；`pnpm lint`（0 errors、26 个既有 React Hooks warnings）；`pnpm check`（0，106 个语法文件、60 项离线审计，真实 MP4/音频/字幕、后台任务、项目包迁移、备份恢复继续通过）。

真实行为证据：隔离项目首次保存后 UI 观察到 revision 2、首片段起点 0.25；服务端 GET 同样返回 revision 2/0.25。修复后重新从服务端打开项目，执行真实 Editor QA 提交，UI revision 2→3、起点 0.25→0.5，保存状态为“已保存”；服务端 GET 返回 revision 3/0.5；再次刷新同一页面，UI 仍读取 revision 3/0.5，页面错误数为 0。该证据覆盖 Editor 的真实提交、revision 回写和刷新恢复；由于当前浏览器控制接口不提供带位移的原生鼠标拖动，本记录不把 QA 按钮冒充 pointerdown→pointerup 事件采样。

未解决问题：配置并发序列化、直接 pointerup 输入事件的独立采样、Editor 主模块进一步拆分、T21 行为/故障测试收口、T22 安装交付、T17 真实 TTS/GPU/许可、外部 provider 和 `api_verified_v1` 仍未完成；local_v1 继续保持 pending。

任务状态：T03 的本地 revision 回写子项和 T19.2 的 Editor 保存一致性子项完成并有真实证据；T03/T19.2 母任务保持 in_progress。

nextTask：T19.2 Editor 主模块拆分与保存冲突回归。

nextAction（具体到动作或命令）：在保持当前 `Editor` 行为契约的前提下抽取 Timeline/导出预览外壳为独立模块，先运行 `pnpm build` 对比入口与动态 chunk，再用隔离项目回归真实保存冲突、取消渲染和页面 ErrorBoundary；完成后进入 T21 的行为/故障测试清单。

### 2026-09-06 — T19.2 Timeline 动态拆分与 T21 首轮真实回归

currentTask / 子任务：T19.2 收尾剪辑台重模块拆分，进入 T21 行为/故障测试与诊断收口。

完成的行为：新增 `src/Timeline.jsx`，将 `TimelineClip`、FLIP 动画、统一 pointer 拖拽、磁吸定位、轨道重排、落点预览、收束反馈和 QA 指标从 `main.jsx` 抽为懒加载 chunk；主入口仅保留 props 契约适配器，保存、渲染和项目更新仍由 Editor 控制。同步更新 `motion-contract-audit.mjs` 扫描动态模块，避免模块拆分造成门禁误报。修复动态模块中空片段数组在 Hook 依赖上的新 warning。

修改文件：`src/Timeline.jsx`、`src/main.jsx`、`scripts/motion-contract-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`pnpm build`（0，1606 modules；入口 JS 336.79 kB；Timeline 动态 chunk 11.82 kB，gzip 4.25 kB；React 133.93 kB；CSS 232.02 kB）；`pnpm test:performance`（0，4 个首屏 JS/CSS 资源，790,359 bytes，gzip 224,135 bytes，12 个总资源）；`pnpm build:demo`（0，单文件 6,273.27 kB，gzip 4,332.40 kB）；`pnpm lint`（0 errors、26 个既有 Hooks warnings）；`pnpm check`（0，106 个语法文件、60 项离线审计；motion contract 12/12 通过，真实 FFmpeg/后台任务/包迁移/备份审计继续通过）。

真实浏览器与服务证据：开发页 `?xingmuQa=timeline-1000` 实际加载 Timeline 动态 chunk，夹具范围内渲染 1000 个片段/3 条轨道；20 次真实提交样本 p95 为 13.1ms，CUA 真实拖拽产生 1 个 pointer 样本、内部 p95 98.8ms，页面错误数 0。隔离 API 数据目录中的项目由 revision 1 开始，编辑器真实 pointer 拖拽后服务端 GET 为 revision 2、首片段起点 1，刷新页面仍保持该位置；外部服务端推进到 revision 3 后，本地 revision 2 再提交真实弹出保存冲突，点击“保留本地副本”后本地草稿起点 1.25 保持、冲突弹窗关闭、错误数 0。导出弹窗真实打开后首焦点为“关闭导出设置”，Escape 关闭并将焦点归还“导出项目”。

未解决问题：98.8ms pointer p95 接近 100ms 工程目标，且只代表本机/本夹具的一次真实动作；尚未证明所有设备与更大媒体规模的每帧目标，也未把本轮浏览器路径固化成无人工介入的可重复浏览器测试。T03 配置并发、T17 真实 TTS/GPU/许可、外部 provider、T22 安装交付、`api_verified_v1` 和 `local_v1` 仍保持 pending；渲染取消/恢复的既有证据尚未因本次模块拆分重新执行，未虚标为本轮新增完成。

任务状态：T19.2 Timeline 动态拆分、T03/T19 保存冲突回归子项完成并有真实证据；T19、T20、T21 母任务保持 in_progress。

nextTask：T21 可重复行为/故障测试与结构化诊断。

nextAction（具体到动作或命令）：新增一个隔离数据目录的行为回归入口，覆盖跨项目切换不污染、渲染任务取消后状态与下载门禁、服务端重启恢复和 requestId/jobId/projectId/errorCode 脱敏诊断输出；先运行该入口，再用真实浏览器复测关键 UI 路径。

### 2026-09-06 — T21 结构化请求诊断与隔离审计

currentTask / 子任务：T21，补齐本地可读、脱敏、可关联的请求诊断最小闭环。

完成的行为：新增 `server/diagnostics.mjs` 内存环形记录器；每个本地 HTTP 请求现在返回 `X-Request-Id`，并记录时间、方法、无查询串路径、状态、耗时、`projectId`、`jobId`、`errorCode`。新增只读 `/api/diagnostics` JSON 端点，固定 schemaVersion 和字段白名单，不保存请求体、凭据或上游原始响应；生成任务、渲染任务和项目写入路径补充服务端上下文关联。新增 `scripts/diagnostics-audit.mjs`，在临时 DATA_DIR/端口启动真实服务，验证 requestId、项目/任务关联、错误码和测试令牌不回显，并加入统一 `pnpm check`。

修改文件：`server/diagnostics.mjs`、`server/index.mjs`、`scripts/diagnostics-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`node scripts/diagnostics-audit.mjs`（0，requestId、projectCorrelation、jobCorrelation、redacted、schemaVersion 全通过）；`pnpm check`（0，108 个语法文件、61 项离线审计，新增 diagnostics audit 通过，真实 FFmpeg MP4/音频/字幕、后台任务、包迁移和备份恢复继续通过）。

未解决问题：当前诊断记录是进程内有界环形数据，服务重启后不保留；尚未纳入队列长度、失败率、磁盘剩余等运行指标，也未把诊断导出成带媒体/数据库版本清单的独立压缩包。T21 跨项目后台任务、渲染取消/恢复行为仍需独立隔离回归；T03 配置并发、T17 真实 TTS/GPU/许可、外部 provider、T22 安装交付、`api_verified_v1` 和 `local_v1` 继续 pending。

任务状态：T21 诊断最小闭环完成并有临时服务真实证据；T21 母任务保持 in_progress。

nextTask：T21 跨项目任务隔离与渲染取消/恢复回归。

nextAction（具体到动作或命令）：继续补可重复浏览器路径和诊断包导出；在 T22 前用干净路径按 README 启动，验证无 TTS/无 FFmpeg 的可解释降级与安装交付。

### 2026-09-06 — T21 跨项目任务隔离、终态取消保护与运行指标

currentTask / 子任务：T21，完成隔离后台任务回归和本地诊断运行指标接入。

完成的行为：`taskWorker.cancel` 现在先读取任务并保护所有终态，已成功/失败/已取消任务不会被后续取消请求改写；新增 `scripts/cross-project-task-audit.mjs`，在临时 DATA_DIR 中真实创建项目 A/B、并行提交独立生成任务、按项目查询、交错取消并回读项目，确认任务引用和项目 revision 不串线。`/api/diagnostics` 增加生成队列长度、活跃生成数、活跃渲染数和 DATA_DIR 可用字节，仍只返回白名单字段。

修改文件：`server/taskWorker.mjs`、`server/index.mjs`、`scripts/cross-project-task-audit.mjs`、`scripts/diagnostics-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`node scripts/cross-project-task-audit.mjs`（0，2 个项目、A/B 各自 1 个任务、终态取消保护和项目数据未改变通过）；`node scripts/diagnostics-audit.mjs`（0，requestId、项目/任务关联、脱敏和 metrics 通过）；`pnpm build`（0，入口 JS 336.79 kB、Timeline 动态 chunk 11.83 kB）；`pnpm test:performance`（0，首屏 JS/CSS gzip 224,141 bytes）；`pnpm lint`（0 errors、25 个既有 Hooks warnings）；最终 `pnpm check`（0，109 个语法文件、62 项离线审计，真实 MP4/音频/字幕、渲染取消/重试/恢复、包迁移、备份恢复、诊断和跨项目审计均通过）。

真实环境清理：本轮启动的 Vite/API 服务均已停止，4174、4175、5173 无监听；真实浏览器验证使用隔离服务与临时 DATA_DIR，未修改项目 `server/data` 用户数据。

未解决问题：`local_v1` 尚未完成 T22/T23 安装交付和整体验收；诊断仍是进程内环形记录，尚未导出包含数据库/媒体 manifest 的独立诊断包；浏览器关键路径尚未固化成自动化无人工测试；T03 配置并发、T17 真实 TTS/GPU/许可、外部 provider 与 `api_verified_v1` 继续 pending。未经真实授权的模型路线未标记完成。

任务状态：T21 的动态模块门禁、结构化诊断、跨项目任务隔离和终态取消保护子项完成；T21 母任务、T22、T23 继续 in_progress/pending，未标记整体交付完成。

nextTask：T21/T22 安装与可诊断交付收口。

nextAction（具体到动作或命令）：在干净临时路径复制项目并按 README 启动，分别验证无密钥/无 TTS/无 FFmpeg 的页面可用和导出预检提示；随后把可读诊断记录与项目/任务/备份版本清单打包为受限下载或本地文件，并运行安装回退演练。

### 2026-09-06 — T21/T22 环境探针、静态资源修复与干净实例浏览器回归

currentTask / 子任务：T22，完成安装交付证据收口，并回归真实生产页面、项目打开和 MP4 导出预检。

修复前行为与复现：按 README 在独立代码目录启动生产服务后，`GET /` 返回 200，但 `/assets/index-*.js` 因静态文件解析只查项目根 `assets/`，找不到构建产物时错误回退为 `index.html`；真实浏览器因此只有空 `#root`。该问题已在干净实例和浏览器中复现。

完成的行为：`server/index.mjs` 的静态资源解析现在对 `/assets/*` 先查项目公共资源目录，再安全查 `dist/assets/` 构建产物；仅在全部候选不存在时才回退入口 HTML。生产构建重新生成后，干净实例浏览器可正常挂载星幕首页；打开隔离项目“移动目录保留数据”后进入剪辑台，导出对话框真实显示“真实 MP4 暂不可导出”“有 5 个画面片段尚未通过真实媒体探测”，并显示无 TTS 不阻断编辑的说明；浏览器控制台错误数为 0。该证据只证明预检正确拦截未通过媒体探测的默认片段，不把它标成真实 MP4 完成。

修改文件：`server/index.mjs`、`docs/OPTIMIZATION_PROGRESS.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

实际执行的命令、退出码、结果：`pnpm run doctor`（0，Node 24.18.0、pnpm 11.19.0、端口/数据目录、FFmpeg/FFprobe、`libx264`、字幕滤镜通过，TTS 可选 offline）；`pnpm build`（0，1606 modules，入口 JS 338.15 kB，Timeline 11.83 kB）；`pnpm test:performance`（0，首屏 JS/CSS gzip 224,824 bytes）；`pnpm lint`（0 errors、26 个既有 React Hooks warnings）；`pnpm check` 首次遇到一次渲染重试读取时序波动（观察到 `RUNNING`），单独复跑 `node scripts/render-audit.mjs` 与再次执行 `pnpm check` 均为 0，最终通过 114 个语法文件、64 项离线审计；`node scripts/release-readiness-audit.mjs`（0，无 FFmpeg 时服务健康、预检阻断、诊断 ZIP 通过）；`node scripts/upgrade-rollback-audit.mjs`（0，备份/升级/恢复后 revision 和数据目录保持）；`node scripts/project-package-render-audit.mjs`（0，真实 MP4 输出含视频流和音频流）；Windows `System.IO.Compression` 读取诊断 ZIP（0，README.txt/diagnostics.json 可读且无 API_KEY/Bearer/password/secret）。

安装与数据迁移证据：独立临时目录完成锁文件安装、doctor、生产构建和 `DATA_DIR` 启动；由于本机 pnpm store 缺少 `@esbuild/win32-x64` 可选二进制，干净构建只在临时验证目录补齐同版本二进制后完成，纯 registry/cache 安装仍需另一台具备完整缓存的机器复验。移动代码目录后写入 `project-clean-move-proof`，停止并重启同一服务后项目 ID/标题仍可读；本轮临时服务已停止，4174/4175/4188/4195/5173 无监听。

未解决问题：T23 `local_v1` 完整矩阵尚未完成；浏览器关键路径尚未固化为无需人工介入的自动化入口；完整 registry/cache 纯净安装尚未复验；T03 配置并发、T17 真实 TTS/GPU/权利许可、外部 provider 与 `api_verified_v1` 仍待真实条件。未经真实供应商授权、真实 TTS/GPU 或真实媒体输入探测的能力没有标记完成。

任务状态：T21/T22 继续 `in_progress`；本轮不标记 `local_v1`、`api_verified_v1` 或整体交付完成。

nextTask：T23 local_v1 整体验收矩阵。

nextAction（具体到动作或命令）：在当前代码上补一个隔离 `DATA_DIR` 的浏览器回归入口，至少覆盖页面挂载、项目打开、导出预检阻断、Escape 关闭和无控制台错误；然后按 T23 矩阵逐项执行并把每个场景的真实输出写回本账。

### 2026-09-06 — T06/T08/T23 真实输出规格与浏览器启动契约

currentTask / 子任务：T23，补齐 local_v1 的真实渲染规格证据，并将生产页面启动契约固化为可重跑审计。

修复前行为与复现：渲染器虽然读取项目设置，但实际固定使用 1280×720、25fps；无音频项目的 `mixAudio` 返回原视频后，调用方仍读取不存在的 `mixed.mp4`，导致 video-only 导出失败。另有生产 HTML 引用 `/assets/index-*.js` 时，静态资源回退问题虽已修复，但缺少可重跑的启动契约审计。

完成的行为：新增 `resolveRenderProfile`，支持 16:9、9:16、1:1 和 24/25/30fps，并将目标宽高/帧率传递到每个视频片段、空隙黑帧和最终技术质检；渲染现在保留时间线空隙、源入点和播放速度，明确拒绝不支持规格与同轨重叠。修复 video-only 渲染使用 `mixAudio` 返回路径。新增 `scripts/render-profile-audit.mjs`，以真实 FFmpeg 验证 7 组输出规格、空隙、变速、源入点和拒绝路径；新增 `scripts/browser-bootstrap-audit.mjs`，隔离 `DATA_DIR` 启动生产服务，验证 HTML、JS/CSS MIME、健康、9:16/30fps 预检、无 FFmpeg 阻断和诊断 ZIP，并纳入 `pnpm check`。

真实浏览器证据：当前生产实例完成首页挂载、项目打开、剪辑台进入；导出对话框显示“真实 MP4 暂不可导出”和“有 5 个画面片段尚未通过真实媒体探测”，Escape 关闭对话框、焦点回到“导出项目”按钮，浏览器控制台错误数为 0。第一次组合点击因异步导航未命中选择器，读取可见 DOM 后按当前状态继续，最终路径通过；该波动未被隐藏。

修改文件：`server/mediaTools.mjs`、`server/render.mjs`、`scripts/render-profile-audit.mjs`、`scripts/browser-bootstrap-audit.mjs`、`scripts/check.mjs`、`package.json`、`README.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`node scripts/render-profile-audit.mjs`（0，`16:9/24`、`16:9/25`、`16:9/30`、`9:16/24`、`9:16/25`、`9:16/30`、`1:1/24`，空隙/变速/源入点/不支持规格/重叠拒绝通过）；`node scripts/render-audit.mjs`（0，真实视频+音频+字幕、HTTP 成片、后台恢复/取消/重试通过）；`pnpm test:browser-bootstrap`（0）；`pnpm build`（0，1606 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 224,824 bytes）；`pnpm lint`（0 errors、26 个既有 React Hooks warnings）；最终 `pnpm check`（0，115 个语法文件、65 项离线审计）。

未解决问题：T23 local_v1 仍未完成方案第 6 节全部场景；当前浏览器启动契约可无人值守重跑，但完整 DOM 交互仍依赖浏览器运行时；T07 大媒体流式/断点压力、T03 配置并发、T17 真实 TTS/GPU/权利许可、完整 registry/cache 纯净安装、外部 provider 与 `api_verified_v1` 仍待验证。未经真实三段本地媒体 UI 导入、既有项目迁移和输入攻击矩阵验证的能力没有标记完成。

任务状态：T06/T08 的输出规格与 video-only 子项完成；T21 浏览器启动契约子项完成；T23 保持 `in_progress`，`local_v1` 与 `api_verified_v1` 均未标记完成。

nextTask：T23 local_v1 矩阵的既有项目迁移与手动媒体闭环。

nextAction（具体到动作或命令）：在新的临时 `DATA_DIR` 中导入旧星幕 JSON，并用 FFmpeg 生成 3 段不同颜色/时间码视频、已知起点音频、BGM 和中文/英文两行 SRT；通过服务接口与浏览器 UI 完成导入、剪辑、导出，使用 ffprobe 对时长、画幅、帧率、音频流和字幕结果逐项记录。

### 2026-09-06 — T02/T19/T23 空项目数据边界与浏览器预检回归

currentTask / 子任务：T23，修复空项目编辑器边界后复测生产页面。

修复前行为与复现：打开服务端保存的空项目时，编辑器在 `project.timeline` 为空的情况下自动注入 10 个演示时间线片段；这些片段没有真实媒体，虽会被预检拦截，但会污染用户看到的项目状态并可能被保存。

完成的行为：`timelineFromProject` 现在仅在没有打开项目时提供演示夹具；只要存在项目，就严格使用其数组时间线，空数组保持空编辑器。新生产实例中打开空项目后实际显示 `0 个时间线片段`、时间线无演示片段；打开导出对话框真实显示“真实 MP4 暂不可导出”和“时间线没有可渲染的画面片段”，Escape 关闭对话框并将焦点恢复到“导出项目”，浏览器控制台错误数为 0。

修改文件：`src/main.jsx`、`docs/OPTIMIZATION_PROGRESS.md`。

实际执行的命令、退出码、结果：`pnpm build`（0，1606 modules，入口 JS 338.13 kB）；当前生产实例浏览器回归（通过，空时间线/预检阻断/Escape/焦点/控制台错误均符合预期）。此前 `pnpm test:browser-bootstrap`（0）和真实 FFmpeg profile 审计保持通过；`node --check src/main.jsx` 不适用于 JSX 文件，未将其作为代码失败或成功证据。

未解决问题：T23 手动三段本地媒体 UI 导入与成片闭环、旧 JSON 浏览器迁移、输入防护和重启矩阵仍待执行；T07 大媒体流式/断点压力、T03 配置并发、T17 真实 TTS/GPU/权利许可、完整 registry/cache 纯净安装、外部 provider 与 `api_verified_v1` 仍待验证。空项目边界已验证，但不等于 local_v1 完成。

任务状态：空项目数据边界和导出预检子项完成；T19、T21、T23 继续 `in_progress`，local_v1 继续 `pending`。

nextTask：T23 手动三段本地媒体导入、编辑、字幕与真实 MP4 成片矩阵。

nextAction（具体到动作或命令）：用临时 `DATA_DIR` 生成并上传 3 个真实 MP4、1 个人声、1 个 BGM 和双语 SRT；将资产绑定到项目时间线，执行裁剪/拆分/变速/静音/音量/字幕导入，提交真实渲染任务并用 ffprobe 记录输出。

### 2026-09-06 — T02/T08/T09/T23 数据可见性与本地媒体 UI 成片闭环

currentTask / 子任务：T23，完成 local_v1 手动本地媒体 UI 导入、编辑、字幕和无密钥真实 MP4 成片子项，并修复其间发现的数据链路错误。

修复前行为与复现：服务端允许保存任意合法项目 ID，但项目列表只扫描 `project-` 前缀，合法旧项目/导入项目会出现“文件已保存、列表不可见”；此外，素材上传后虽然已经 `probeStatus=passed`，点击“加入时间线”时没有复制探测元数据，真实 MP4 预检误报画面未探测；导出弹窗还固定显示 1920×1080/24fps，与项目实际设置不一致。

完成的行为：`listProjects` 现在列出所有安全项目 JSON 文件，并新增 `project-listing-audit` 防回归；时间线媒体片段继承 `probeStatus/mediaMetadata`，导入的真实视频/音频可通过预检并进入渲染；导出弹窗改为显示预检返回的真实宽高/帧率。隔离无密钥服务中，通过浏览器 UI 导入 3 个真实 MP4、2 个 WAV 和 2 条 SRT，完成三段画面加入时间线、两条音频轨、视频出点裁剪 0.5 秒、字幕导入并全部确认；预检通过后提交后台渲染，任务 `SUCCEEDED`，浏览器自动收起导出弹窗。项目快照记录 7 个时间线片段，画面/音频素材均为 `probeStatus: passed`。

修改文件：`server/store.mjs`、`src/main.jsx`、`scripts/project-listing-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

实际执行的命令、退出码、结果：`node scripts/project-listing-audit.mjs`（0，合法非 `project-` ID 可列出）；`pnpm build`（0，1606 modules，入口 JS 338.41 kB）；`pnpm lint`（0 errors、26 个既有 React Hooks warnings）；`pnpm test:performance`（0，首屏 JS/CSS gzip 224,922 bytes）；`pnpm check`（0，117 个语法文件、67 项离线审计，新增项目列表审计及既有真实 FFmpeg/后台/包/备份/诊断审计继续通过）。

浏览器/渲染/接口证据：隔离服务 `DATA_DIR=xingmu-local-v1-data-20260906`、无云端密钥、TTS 未启动；真实 DOM 文件选择器导入 `clip-red.mp4/clip-blue.mp4/clip-green.mp4`、`voice.wav/music.wav` 和 `captions.srt`；预检实际显示 `真实 MP4 环境预检通过` 和 `1280 × 720 · 25fps`；后台任务查询为 `SUCCEEDED`，技术质检为 6.000 秒、1280×720、25fps、H.264 视频 + AAC 音频、无 warnings；HTTP 下载后再次 `ffprobe` 复核文件大小 167,756 bytes、时长 6.000000、视频 1280×720/25fps 和音频流。该证据证明无密钥本地媒体闭环，不等同于真实供应商或 TTS/GPU 完成。

未解决问题：T23 仍未完成旧 JSON/项目包浏览器迁移、输入防护攻击矩阵和完整停止/重启矩阵；T07 大文件流式/断点压力、T03 配置并发、T17 真实 TTS/GPU/权利许可、完整 registry/cache 纯净安装、外部 provider 与 `api_verified_v1` 仍待真实条件。当前浏览器 UI 闭环已真实复测，但尚未固化为无需人工介入的浏览器自动化脚本。

任务状态：T02 合法项目列表可见性子项、T08/T09 本地媒体真实 UI 成片子项完成；T23 保持 `in_progress`，`local_v1` 仍为 `pending`，未经完整矩阵不标记整体交付完成。

nextTask：T23 既有项目迁移、输入防护和重启矩阵。

nextAction（具体到动作或命令）：在隔离 `DATA_DIR` 中复测数据保护/多标签冲突和跨项目异步 UI；随后按 README 在具备完整 registry/cache 的干净路径复验安装交付，再评估是否具备标记 `local_v1` 的全部条件。

### 2026-09-06 — T05/T06/T21/T23 旧项目导入、输入防护与停止重启矩阵

currentTask / 子任务：T23，完成既有项目兼容、媒体输入防护、缺失媒体运行错误和停止/换端口重启可读性验证。

修复前行为与复现：媒体上传只依赖客户端 Content-Type，伪造 MP4/损坏音频可能进入正式资产；远程媒体下载未逐跳限制私网目标和响应体；上传超限未在流式读取中尽早拒绝；访问不存在资产时异步 `stat` rejection 未被路由等待，服务进程会因普通越界/缺失路径请求退出。HTTP 项目包审计还使用了不是真实 PNG 的字符串夹具，无法与真实性门禁兼容。

完成的行为：`server/store.mjs` 现在限制支持的媒体类型，校验 PNG/JPEG/GIF/WEBP/WAV/OGG/MP3/MP4/WebM 等签名，并对音视频执行 ffprobe 真实性与时长校验；远程 HTTPS 下载拒绝凭据、localhost、私网/保留 IP 和不安全重定向，响应体有上限。`server/index.mjs` 对媒体上传做声明长度和流式累计上限检查，错误映射为 413/415/422，并等待媒体文件读取、缺失文件只返回错误不终止服务。项目列表继续列出所有安全项目 ID；旧 JSON 与 ZIP 项目包导入、缺失引用显式记录、停止服务后更换端口重启均保留项目字段和时间线。HTTP 包审计改用真实 1×1 PNG 夹具，避免用伪媒体绕过真实性检查。

修改文件：`server/store.mjs`、`server/index.mjs`、`scripts/input-defense-audit.mjs`、`scripts/legacy-restart-audit.mjs`、`scripts/project-package-http-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

实际执行的命令、退出码、结果：`node scripts/input-defense-audit.mjs`（0；真实 MP4 201，伪造/错 MIME/损坏媒体 422，不支持类型 415，超大体 413，恶意路径不崩溃，Range 206/416，私网远程 URL 拒绝，正式资产仍为 1）；`node scripts/legacy-restart-audit.mjs`（0；旧 JSON 导入 201，角色/场景/镜头保留，4 条缺失引用显式记录，停止后换端口重启仍可列出和读取）；`node scripts/project-package-http-audit.mjs`（0；ZIP inspect 200、导入 201、冲突项目复制成功）；`pnpm build`（0，1606 modules，入口 JS 338.41 kB）；`pnpm lint`（0 errors、26 个既有 React Hooks warnings）；`pnpm test:performance`（0，首屏 JS/CSS gzip 224,922 bytes）；`pnpm check`（0，119 个语法文件、69 项离线审计）。

浏览器/接口证据：隔离服务 `PORT=4202`、独立 `DATA_DIR`、无云端密钥、TTS 未启动；真实浏览器文件选择器导入既有星幕 JSON 后，页面恢复项目标题“第 1 集 · 入口”、13 个分镜、完整工作流状态，并显示“项目包已导入；有 25 项素材待重新绑定”；服务端 GET 项目返回 `importedFrom=true`、`missingRefs=25`，健康接口仍为 200，随后服务已停止且端口无监听。该浏览器证据与服务级旧 JSON/重启审计共同证明兼容迁移和可追溯缺失，不等同于媒体全部齐全或 local_v1 整体完成。

未解决问题：T07 仍为整文件缓冲，尚无大文件流式/断点压力证据；T03 配置并发、T17 真实 TTS/GPU/许可、完整 registry/cache 纯净安装、浏览器关键路径无人值守自动化和 T23 数据保护/多标签冲突 UI 仍待完成；`api_verified_v1` 没有真实授权、预算和供应商任务证据，继续保持 pending。未经真实验证的能力没有标记完成。

任务状态：T05 输入防护子项、T06 旧项目导入/列表可见性子项、T21 输入/重启回归子项完成；T23、T02、T03、T07、T17、T19、T20、T21、T22 继续 `in_progress`，`local_v1` 仍为 `pending`。

nextTask：T23 数据保护、跨项目异步和安装交付复核。

nextAction（具体到动作或命令）：在新的隔离浏览器服务中打开两个项目并并行触发生成/保存，制造双标签 revision 冲突和 A→B 切换，确认本地副本、项目隔离和 AbortController 行为；随后在完整 registry/cache 条件下按 README 执行纯净安装、doctor、build、启动和重启，把结果写回账本。

### 2026-09-06 — T03/T19/T21/T23 双标签数据保护与远程媒体 MIME 兼容

currentTask / 子任务：T23，完成真实双标签 revision 冲突处理，并修复远程媒体响应头过宽导致真实 MP4 被误拒绝的兼容边界。

修复前行为与复现：真实浏览器两个标签页基于同一 revision 保存时，虽然服务端能返回 409，但需要确认 UI 不静默覆盖且本地草稿仍可留存；远程 provider 文件若返回 `application/octet-stream`，严格类型门禁会在读取签名已明确为 MP4 时提前拒绝。

完成的行为：保存冲突真实 UI 显示“项目有新的服务端版本”，提供“保留本地副本/重新加载服务端版本”；选择保留后标签页显示“仅本地”，服务端仍保留先提交窗口的标题和 revision，不发生静默覆盖。远程媒体现在只在文件签名能推断出已支持类型时从宽泛响应头推断 `video/mp4`/其他已知类型，未知签名继续拒绝。新增 `remote-content-type-audit`，用真实 FFmpeg MP4、模拟宽泛远程 MIME 和未知内容验证 `probeStatus=passed`/拒绝路径。

修改文件：`server/store.mjs`、`scripts/remote-content-type-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

实际执行的命令、退出码、结果：`node scripts/remote-content-type-audit.mjs`（0；`application/octet-stream` + MP4 签名推断为 `video/mp4` 并通过 ffprobe，未知内容拒绝）；隔离服务真实双标签浏览器回归（通过；A 标签保存标题“ A窗口已保存”，B 标签旧 revision 保存触发冲突，选择保留后 B 显示“仅本地”，服务端 GET 为 A 标题/revision 2，health 200）；`pnpm check`（0，120 个语法文件、70 项离线审计，新增远程 MIME 审计通过）。

浏览器/接口证据：临时服务 `PORT=4203`、独立 `DATA_DIR`、无密钥、TTS 未启动；两个真实标签页同时打开“ 双标签冲突回归”，项目设置中分别提交 A/B 标题，第二次提交收到冲突弹窗；选择“保留本地副本”后本地草稿仍显示 B，服务端仍返回 A，服务随后正常停止且端口关闭。该证据证明数据保护冲突处理，不等同于配置字段并发合并、跨项目浏览器生成全路径或安装交付完成。

未解决问题：T03 provider 配置并发序列化仍待真实并发 UI/接口验收；T23 跨项目浏览器任务切换、完整 registry/cache 纯净安装和其余最终矩阵仍待完成；T07 大媒体流式/断点、T17 真实 TTS/GPU/权利许可、`api_verified_v1` 继续 pending。未经真实验证的能力没有标记完成。

任务状态：T03/T19 双标签冲突子项、T21 远程 MIME 回归子项、T23 数据保护子项完成；T23 母任务继续 `in_progress`，`local_v1` 仍为 `pending`。

nextTask：T23 跨项目异步浏览器闭环与纯净安装交付。

nextAction（具体到动作或命令）：在隔离服务中准备项目 A/B，两个标签分别打开并触发 A 的受控后台任务后切换 B，等待 A 完成并回读 A/B 项目与任务；之后使用完整 registry/cache 的临时目录按 README 执行 `pnpm install --frozen-lockfile`、`doctor`、`build`、启动和重启，记录任何环境阻塞。

### 2026-09-06 — T22 缓存安装与环境 Doctor 复核

currentTask / 子任务：T22/T23，复核本机缓存是否足以支持不依赖人工输入的冻结安装，并再次检查运行环境。

完成的行为：在独立临时目录仅放入项目包清单和锁文件，执行 frozen-lockfile 离线安装；供应链锁文件策略通过，解析未访问网络，157 个依赖全部从本机 pnpm store 复用并完成安装。当前项目运行 `doctor` 通过，Node 24.18.0、pnpm 11.19.0、端口 4174、数据目录可写且约 19.8GB 可用、FFmpeg 9.0、FFprobe 9.0、libx264 和 subtitles filter 均可用；TTS 未配置但被明确识别为可选，不阻断编辑。

修改文件：`docs/OPTIMIZATION_PROGRESS.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

实际执行的命令、退出码、结果：隔离临时目录 `pnpm install --frozen-lockfile --offline --ignore-scripts`（0，锁文件策略通过，157 packages added，全部 reused from `C:\Users\33347\AppData\Local\pnpm\store\v11`）；`pnpm run doctor`（0，Node/pnpm/lockfile/端口/DATA_DIR/FFmpeg/FFprobe/libx264/subtitles 全通过，TTS optional offline）。此前当前项目 `pnpm build`、`pnpm lint`、`pnpm test:performance` 和 `pnpm check` 已分别通过，本轮没有把清单安装误标成完整源代码复制构建。

未解决问题：仍需在隔离目录复制完整源代码后执行 `pnpm install --frozen-lockfile`、`build`、启动与重启，才能关闭 T22 的最后一项；T23 跨项目浏览器后台任务路径、T07 大媒体流式/断点、T03 配置并发、T17 真实 TTS/GPU/权利许可和 `api_verified_v1` 仍待真实条件。临时安装目录保留在 `C:\Users\33347\AppData\Local\Temp\xingmu-clean-install-20260906` 作为本轮可复核证据，不涉及当前项目数据目录。

任务状态：缓存安装探针和 Doctor 子项完成；T22/T23 继续 `in_progress`，`local_v1` 与 `api_verified_v1` 均未标记完成。

nextTask：T23 跨项目异步浏览器任务路径与完整源代码纯净构建。

nextAction（具体到动作或命令）：复制当前源代码到新的临时目录（排除 `node_modules`、`dist`、用户 `server/data`），运行 `pnpm install --frozen-lockfile --offline`、`pnpm build`、隔离 `DATA_DIR` 启动/停止/重启；同时在两个浏览器标签验证 A 任务结束后 B 项目不被污染。

### 2026-09-06 — T22/T23 完整源码隔离安装、构建与重启

currentTask / 子任务：T22/T23，验证完整源代码复制后无需用户数据的安装、构建、启动和停止/重启数据保留。

修复前行为与复现：清单级离线安装成功并不能证明完整源码可构建；源码复制目录首次 `pnpm build` 真实失败，原因是本机 pnpm store 缺少 `@esbuild/win32-x64@0.21.5` 可选二进制，而不是业务代码或锁文件解析错误。

完成的行为：将当前源码复制到隔离目录，排除 `node_modules`、`dist` 和用户 `server/data`；`pnpm install --frozen-lockfile --offline --ignore-scripts` 退出码 0。记录无补充依赖时构建退出码 1 的准确环境原因后，仅从当前工作区补入同版本可选二进制，隔离目录 `pnpm build` 退出码 0，1606 modules、入口 JS 338.41 kB。随后在该源码目录使用独立 `DATA_DIR` 启动 4204，写入项目并读取 200；停止后换端口 4205 重启，health 200，项目标题“纯净源码启动回归”、revision 1 和项目列表可见性均保持；两个测试端口均已关闭。

修改文件：`docs/OPTIMIZATION_PROGRESS.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

实际执行的命令、退出码、结果：源码复制 `robocopy`（1，复制成功）；隔离目录 `pnpm install --frozen-lockfile --offline --ignore-scripts`（0，157 packages 全部从本机缓存复用）；首次隔离 `pnpm build`（1，缺 `@esbuild/win32-x64`，已记录为环境缺件）；补齐同版本可选二进制后隔离 `pnpm build`（0，1606 modules）；4204 启动/静态 HTML、JS MIME、health（均 200）；写入项目（revision 1）；4204 停止、4205 启动/health/项目 GET/列表（均通过）；停止后 4204/4205 无监听。

未解决问题：本机缓存缺少 Windows esbuild 可选二进制时，不能声称“完全无人工补依赖”的离线构建已通过；仍需完整 registry/cache 或发布介质复验。T23 跨项目浏览器后台任务路径、T07 大媒体流式/断点、T03 配置并发、T17 真实 TTS/GPU/权利许可和 `api_verified_v1` 仍待真实条件。

任务状态：T22 源码复制安装/补依赖构建/启动重启子项完成但发布介质母任务继续 `in_progress`；T23 源码启动重启子项完成，母任务继续 `in_progress`，`local_v1` 仍为 `pending`。

nextTask：T23 跨项目异步浏览器任务路径与最终交付矩阵。

nextAction（具体到动作或命令）：在隔离服务中准备项目 A/B，用真实浏览器标签启动 A 的受控后台任务后切换 B，等待 A 结束并分别读取 A/B 的任务和项目数据；之后复核发布介质/完整 registry-cache 条件，最后按第 6 节矩阵逐项确认是否仍有未验证项。

### 2026-09-06 — T02/T11/T21/T23 跨项目浏览器任务与真实渲染隔离

currentTask / 子任务：T23，完成两个真实浏览器标签页之间的跨项目后台任务隔离，以及 A 项目真实 MP4 导出时 B 项目不被切换或污染。

修复前行为与复现：服务级项目/任务隔离已有审计，但仍缺少真实浏览器 A/B 标签同时打开时的证据；需要确认 A 的异步终态、revision 和成片写回不会被 B 标签复用，也需要确认 B 的缺失媒体请求只返回错误而不使服务退出。

修改文件：本子任务未新增业务代码；同步更新 `docs/OPTIMIZATION_PROGRESS.md` 与 `docs/RELEASE_ACCEPTANCE_2026-09-06.md`。此前代码已包含任务 projectId 约束、渲染 job 持久化、缺失媒体读取等待和空项目不注入演示时间线。

完成的行为：隔离服务 `PORT=4206` 中，真实浏览器标签分别打开“浏览器项目 A/B”；A 的首个不完整生成请求被 `PROMPT_INPUT_INCOMPLETE` 拒绝，随后补齐合法字段的 story 任务从 `PENDING` 到 `SUCCEEDED`。任务快照只写入 A（A 共 2 条含失败尝试，B 为 0 条），A/B revision 均保持 1，两个标签标题始终分别为 A/B。隔离服务 `PORT=4207` 中，真实浏览器标签分别进入 A/B 剪辑台；A 通过真实“导出项目→导出真实 MP4”进入 `PENDING`，随后任务 `SUCCEEDED`，B 标签仍显示 B 且没有导出弹窗；A revision 变为 2 并获得成片，B revision 仍为 1 且没有 delivery。B 测试项目故意指向缺失媒体，服务返回缺失媒体错误但未退出，A 的真实渲染不受影响。

实际执行的命令、退出码、结果：启动隔离服务 `DATA_DIR=xingmu-cross-browser-20260906/data PORT=4206 MOCK_MODE=true` 与 `DATA_DIR=xingmu-cross-render-browser-20260906/data PORT=4207` 均正常；两个服务分别停止后端口无监听。A/B 任务接口最终为 `status=SUCCEEDED`、`projectAJobs=2`、`projectBJobs=0`；真实渲染 job 文件为 `SUCCEEDED`，技术质检为 1 秒、1280×720、25fps、H.264、无 warnings；服务 GET 回读 `aHasDelivery=true`、`bHasDelivery=false`。此前 `pnpm check` 已通过 120 个语法文件、70 项离线审计。

浏览器/渲染/接口证据：使用现有浏览器客户端真实 DOM 标签 `tab9/tab10` 完成 A/B 任务隔离观察，使用 `tab11/tab12` 完成 A/B 剪辑台与导出观察；没有把页面脚本不支持 `fetch` 的限制伪装成 UI 点击，合法任务创建通过同一隔离服务 API 完成，随后用真实页面观察任务终态和项目切换。A 使用真实本地 `clip-red.mp4`，上传探测通过，下载的成片由服务端技术质检确认 1 秒、1280×720/25fps；B 的缺失媒体请求仅产生预期错误日志，服务健康与 A 渲染保持成功。

未运行检查及原因：尚未在两个浏览器标签内点击完整的生成表单提交；当前证据覆盖真实页面项目切换、服务 API 合法/非法输入门禁、异步任务终态和真实导出闭环，生成表单 UI 全路径仍需独立自动化入口。未调用真实供应商或 TTS/GPU。

数据迁移状态与回滚方式：只使用临时 `DATA_DIR` 和测试项目 ID，没有改写用户项目；服务停止后临时服务数据可独立删除，当前项目数据和迁移回滚路径不变。

尚存风险/阻塞：T23 仍需无人工补依赖的完整 registry/cache 安装和最终矩阵；T02/T11 仍需多任务状态 UI、浏览器取消/重试；T03 配置并发、T07 大文件流式/断点、T17 真实 TTS/GPU/权利许可和 `api_verified_v1` 仍待真实条件。B 缺失媒体的预览错误现已不崩溃，但 UI 仍会记录该错误，后续可将缺失媒体提示做得更显式。

任务状态：T23 跨项目浏览器任务/真实渲染隔离子项完成；T02、T11、T21、T23 母任务继续 `in_progress`，`local_v1` 仍为 `pending`。

nextTask：T22/T23 完整发布介质复核与最终 local_v1 矩阵。

nextAction（具体到动作或命令）：在具备完整 registry/cache 的新目录按 README 执行无需补依赖的 `pnpm install --frozen-lockfile`、`pnpm run doctor`、`pnpm build`、启动/停止/换端口重启；随后按方案第 6 节逐项回读清单，只对有真实证据的子项更新状态。

### 2026-09-06 — T22/T23 registry/cache 冻结安装、补件构建与重启复核

currentTask / 子任务：T22/T23，复验完整源码临时目录的非离线冻结安装、生产构建和停止/换端口重启。

修复前行为与复现：此前仅证明 pnpm store 缓存能解析 lockfile，完整源码首次构建因 `@esbuild/win32-x64@0.21.5` 可选二进制缺件失败；需要用实际 registry/cache 再验证安装是否能自动补齐，并区分依赖介质问题与业务代码问题。

修改文件：本子任务未修改业务代码；为修复收口 lint 回归更新 `scripts/remote-content-type-audit.mjs`，并更新 `docs/OPTIMIZATION_PROGRESS.md` 与 `docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

完成的行为：全新临时源码目录 `C:\Users\33347\AppData\Local\Temp\xingmu-full-registry-cache-20260906` 执行 `pnpm install --frozen-lockfile --ignore-scripts` 退出码 0，157 个包安装完成；`pnpm run doctor` 退出码 0，Node/pnpm、lockfile、数据目录、FFmpeg/FFprobe、libx264 和 subtitles 均通过，TTS 正确显示为可选 offline。未补件直接 `pnpm build` 仍退出码 1，registry 重试后仍未取得 Windows esbuild 可选包；从当前工作区补入同版本可选包后构建退出码 0、1606 modules、入口 JS 338.41 kB。补件后的服务使用临时独立数据目录在 4210 写入项目 revision 1，停止后换端口 4211 重启，health 200、标题/revision 1 和项目列表均保持；两个端口均已关闭。

实际执行的命令、退出码、结果：源码复制 `robocopy`（1，复制成功）；临时目录 `pnpm install --frozen-lockfile --ignore-scripts`（0，157 packages，registry/cache 解析完成，但 `@esbuild/win32-x64@0.21.5` 下载重试后未落地）；`pnpm run doctor`（0）；未补件 `pnpm build`（1，缺可选二进制）；补件后 `pnpm build`（0，1606 modules）；4210 启动/health/PUT 项目（通过，revision 1）；4210 停止、4211 启动/health/GET 项目/列表（通过）；停止后 4210/4211 无监听。

浏览器/渲染/接口证据：本子任务重点是发布介质与服务生命周期，未调用真实供应商、TTS/GPU 或浏览器生成表单；HTTP health、项目写入、换端口重启读取和列表可见性均为真实隔离服务回读。该证据证明源码在补齐平台可选二进制后可构建启动，不证明“完全无人工补件”的发布介质已通过。

检查边界：registry/cache 子任务本身未重复浏览器媒体成片和真实 API；收口阶段先修复 `scripts/remote-content-type-audit.mjs` 使用裸 `Response` 导致的 lint 错误，改为 `globalThis.Response` 后重新运行 `pnpm lint`（0 errors、26 个既有 Hooks warnings）与 `pnpm check`（0，120 个语法文件、70 项离线审计），均通过。

数据迁移状态与回滚方式：只使用临时源码目录、临时 `DATA_DIR` 和 `registry-cache-restart` 测试 ID，没有改写当前项目 `server/data`；服务停止后临时端口无监听，当前项目数据不需要迁移或回滚。

尚存风险/阻塞：本机 registry/cache 对 `@esbuild/win32-x64@0.21.5` 的可选包下载仍失败，因此 T22 不能标记为完全无人工补依赖通过；需在可取得该平台包的完整发布介质或另一 registry/cache 环境复验。T23 最终矩阵、T07 大文件流式/断点、T03 配置并发、T17 真实 TTS/GPU/权利许可和 `api_verified_v1` 仍待真实条件。

任务状态：T22 registry 安装/doctor/补件构建/重启子项有证据；无补件构建仍 pending，T22 母任务继续 `in_progress`；T23 继续 `in_progress`，`local_v1` 仍为 `pending`。

nextTask：T23 最终 local_v1 矩阵收口，并保留发布介质可取得平台可选二进制的外部阻塞。

nextAction（具体到动作或命令）：在能实际取得 `@esbuild/win32-x64@0.21.5` 的完整 registry/cache 或发布压缩包环境中，重复临时目录 `pnpm install --frozen-lockfile` 后直接 `pnpm build`；若通过，再按方案第 6 节复跑剩余 local_v1 矩阵并只更新有证据的状态。

### 2026-09-06 — T22/T23 纯净 registry/cache 安装与生命周期最终复核

currentTask / 子任务：T22/T23，关闭完整 registry/cache 安装、平台可选依赖自动取得、生产构建和服务重启的最后环境验证。

修复前行为与复现：第一套临时缓存目录缺少 `@esbuild/win32-x64@0.21.5`，未补件构建失败；补件构建虽然通过，但不能证明发布介质能自行安装平台包，因此新建第二套完全纯净源码目录复验。

修改文件：无业务代码修改；更新 `docs/OPTIMIZATION_PROGRESS.md` 与 `docs/RELEASE_ACCEPTANCE_2026-09-06.md`。此前已修复的 `scripts/remote-content-type-audit.mjs` lint 回归保持为 `globalThis.Response`。

完成的行为：新目录 `C:\Users\33347\AppData\Local\Temp\xingmu-full-registry-cache-20260906-clean2` 从当前源码复制但排除 `node_modules`、`dist`、用户 `server/data`、`.pnpm-store` 和审计缓存；不带 `--offline`、不带 `--ignore-scripts` 执行 `pnpm install --frozen-lockfile`，经过 registry 临时重试后自动取得 `@esbuild/win32-x64@0.21.5`，安装 157 个包并执行 esbuild postinstall，退出码 0。`pnpm run doctor` 和 `pnpm build` 均退出码 0，构建 1606 modules、入口 JS 338.41 kB。独立 `DATA_DIR` 服务在 4212 写入 `registry-cache-clean-restart` revision 1 后停止，4213 重启 health 200，项目标题/revision/列表均保持，两个端口均无监听。

实际执行的命令、退出码、结果：纯净源码复制 `robocopy`（1，复制成功）；`pnpm install --frozen-lockfile`（0，157 packages，平台可选包自动取得）；`pnpm run doctor`（0）；`pnpm build`（0）；4212 启动/health/PUT（通过，revision 1）；4212 停止、4213 启动/health/GET/列表（通过）；4212/4213 停止后无监听。

浏览器/渲染/接口证据：本子任务通过真实 HTTP health、项目写入、停止、换端口重启、项目回读和列表回读验证服务生命周期；未调用真实供应商或 TTS/GPU。此前无密钥真实媒体 UI 成片和跨项目浏览器渲染证据仍有效，未以本次安装验证替代成片验收。

未运行检查及原因：未重复全量浏览器矩阵和真实 API；本子任务只关闭 T22 的纯净安装/构建/重启边界，`pnpm check` 与 `pnpm lint` 的最新结果已在上一条收口记录中保留。

数据迁移状态与回滚方式：仅使用临时源码目录、临时 `DATA_DIR` 和测试项目 ID，未写入当前项目数据；服务已停止，当前项目无需迁移或回滚。

尚存风险/阻塞：T22 的 registry/cache 子项已通过，但 T23 仍需最终 local_v1 矩阵逐项复核；T10 多素材节目预览仍弱于真实导出、生成表单无人值守提交/多任务状态 UI/浏览器取消重试尚未固化；T07 大文件流式/断点、T03 配置并发、T17 真实 TTS/GPU/权利许可和 `api_verified_v1` 仍待真实条件。

任务状态：T22 纯净安装/doctor/构建/生命周期子项完成，母任务继续 `in_progress` 以等待最终交付矩阵；T23 继续 `in_progress`，`local_v1` 仍为 `pending`。

nextTask：T23 最终 local_v1 矩阵与剩余可执行交互闭环。

nextAction（具体到动作或命令）：优先补 T10 多素材节目预览的真实时间线时钟/空隙/字幕显示回归，再在隔离浏览器中复测导出取消/重试和表单任务状态，随后逐项回读方案第 6 节并只更新有真实行为证据的状态。

### 2026-09-06 — T10.1/T21 节目预览时间线时钟与真实浏览器回归

currentTask / 子任务：T10.1，完成节目预览从“选中素材”到“播放头驱动节目”的闭环，并用真实本地媒体浏览器回归。

修复前行为与复现：剪辑台节目监视器主要跟随选中素材，不能按播放头在多个画面片段之间切换；空隙、源入点/变速、音轨和字幕没有统一的节目时钟，上一/下一剪辑点仍可能只给出通知而不定位。

修改文件：`src/previewTimeline.js`、`src/main.jsx`、`src/styles.css`、`scripts/preview-timeline-audit.mjs`、`scripts/check.mjs`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

完成的行为：新增可复用的预览时间线归一化、片段命中、节目总时长、字幕命中和源时间计算；节目预览由全局播放头决定活跃视频/音频/字幕，统一使用 `sourceIn/sourceOffset` 与 `playbackRate`，播放结束自动停止，空隙显示“当前时间没有画面”，上/下一剪辑点真实改变选中片段和播放头。没有把未实现效果伪装成实时效果；效果目录与基础变换导出一致性仍保留在 T10 待收口项。

实际执行的命令、退出码、结果：`node scripts/preview-timeline-audit.mjs`（0，duration/gap/sourceIn/playbackRate/caption 全部通过）；`pnpm lint`（0 errors、24 个既有 React Hooks warnings）；`pnpm build`（0，1607 modules，入口 JS 340.22 kB，CSS 233.05 kB）；`node scripts/render-audit.mjs`（0，真实 MP4 HTTP render/download、后台任务 SUCCEEDED、1.00s、带音频、未验证媒体拒绝）；`pnpm check`（0，121 个语法文件、71 项离线审计）。将渲染审计轮询上限从 12s 调整至 60s，避免真实 FFmpeg 任务仍在运行时误报失败。

浏览器/渲染/接口证据：隔离服务 `PORT=4214`、无密钥、无 TTS；真实浏览器导入 3 个本地 MP4 和 1 个 WAV，并使用服务端项目时间线（画面 0–1s、1.5–2.5s、2.5–3.5s，音频 0–3.5s，字幕 1.5–2.3s）。真实 DOM 标记显示总时长 `3.500s`；播放约 0.75s 时活跃片段为第三个视频片段，继续播放到 `3.50s` 时活跃状态为 `gap`，页面显示空隙提示并自动停止；连续播放期间暂停按钮和播放头约 `3.33s` 可见；浏览器 error 日志为空。此前同一隔离服务的三段媒体导出证据仍由渲染技术质检覆盖。

未运行检查及原因：尚未把完整 UI 预览回归固化成独立自动化入口；真实供应商、真实 TTS/GPU 和效果的代理预览未执行，不以本地时间线夹具替代这些条件。

数据迁移状态与回滚方式：预览状态不写入项目正文；仅在当前代码和临时隔离 DATA_DIR 验证，时间线已有字段保持兼容。可回退 `src/previewTimeline.js`、`src/main.jsx`、`src/styles.css` 与对应审计脚本，不需要迁移用户数据。

尚存风险/阻塞：T10 的效果目录、基础变换与导出/刷新一致性仍需真实验证；T11 浏览器取消/重试已在下一条记录完成，最终 local_v1 矩阵仍未收口。

任务状态：T10.1 完成；T10 母任务继续 `in_progress`。

nextTask：T11.2/T23，导出任务取消/重试真实浏览器闭环和最终矩阵收口。

nextAction（具体到动作或命令）：在同一隔离服务点击真实 MP4 导出，记录取消后的任务终态；再次点击重试并等待服务端 job 文件与成片技术质检均为成功，再更新发布验收表。

### 2026-09-06 — T11.2/T21 导出取消、重试与真实 MP4 终态

currentTask / 子任务：T11.2，完成浏览器导出任务取消、重试和服务端终态核验。

修复前行为与复现：取消/重试逻辑虽已存在，尚缺真实浏览器证据证明取消不会把半成品标为成功、重试会创建独立任务并最终通过技术质检。

修改文件：本子任务未新增业务代码；更新 `docs/OPTIMIZATION_PROGRESS.md` 与 `docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

完成的行为：真实浏览器导出进入 `PENDING` 后点击“取消渲染”，页面显示 `CANCELLED · 100%` 和“已取消渲染”；随后“重试真实 MP4”重新进入 `RUNNING · 10%`，服务端最终将新任务写为 `SUCCEEDED` 并产生独立 `deliverable.mp4`，原取消任务保持 `CANCELLED`，未被覆盖。

实际执行的命令、退出码、结果：隔离服务 `PORT=4214` 持续运行；取消任务 `render-preview-browser-a-1788692215626-30vfbn` 状态 `CANCELLED`、failure 为“渲染已取消”；重试任务 `render-preview-browser-a-1788692226881-9e0ho8` 状态 `SUCCEEDED`、progress 100、deliverable `/api/render/preview-browser-a/deliverable.mp4`、技术质检 duration `3.5` 秒；页面任务完成后关闭导出弹窗，浏览器 error 日志为空。

浏览器/渲染/接口证据：真实 DOM 在取消前显示 `PENDING` 与“取消渲染”；取消后显示“重试真实 MP4”及 `CANCELLED · 100%`；重试后页面不再显示渲染中弹窗，服务端 job 快照和真实 MP4 文件共同确认成功。该路径不调用真实供应商、不依赖 API key/TTS。

未运行检查及原因：尚未在浏览器关闭/刷新中途重新打开任务中心；现有服务启动恢复、任务快照和跨项目 A/B 导出证据由前置审计覆盖，最终矩阵仍需合并回读。

数据迁移状态与回滚方式：仅使用临时项目 `preview-browser-a`、临时 DATA_DIR 和两条渲染任务；当前用户项目数据未改写，不需要迁移。取消任务保留为历史失败/取消记录，可按项目任务清理策略处理。

尚存风险/阻塞：T11 的刷新恢复、幂等键复用、同项目多次导出历史和 T10 效果能力仍需最终矩阵复核；`api_verified_v1` 仍等待真实授权和预算。

任务状态：T11.2 真实取消/重试子项完成；T11 母任务继续 `in_progress`。

nextTask：T10.2/T23，效果能力一致性与最终 local_v1 矩阵。

nextAction（具体到动作或命令）：复读方案第 6 节逐项核对 T10/T11 必要条件；对未实现的效果只允许禁用并说明，或先补齐同一 RenderPlan 的渲染实现，再运行 `pnpm lint`、`pnpm build`、`pnpm check` 和真实 MP4 质检。

### 2026-09-06 — T10.2/T21 效果能力诚实门禁与最终回归

currentTask / 子任务：T10.2，消除效果面板对未实现能力的假成功反馈，并完成本轮代码回归。

修复前行为与复现：效果面板中的交叉溶解、闪白、黑边、手持、速度渐变和稳定按钮点击后统一提示“已应用到选中片段”，但当前 RenderPlan/FFmpeg 渲染器没有对应实现，刷新或导出无法证明这些效果存在。

修改文件：`src/main.jsx`、`docs/OPTIMIZATION_PROGRESS.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

完成的行为：效果目录改为由当前能力表驱动；未有同一 RenderPlan 和 MP4 技术质检证据的效果全部禁用，并显示具体原因，不再产生假成功通知。基础变换、交叉转场和代理预览没有被标为完成，继续保留在 T10/T23 待办。

实际执行的命令、退出码、结果：`pnpm lint`（0，0 errors、24 个既有 React Hooks warnings）；`pnpm build`（0，1607 modules，入口 JS 340.50 kB，CSS 233.05 kB）；`pnpm check`（0，121 个语法文件、71 项离线审计）；`pnpm test:performance`（0，首屏 JS/CSS gzip 225,901 bytes，低于 1.5 MB 门槛）。此前同轮 `preview-timeline-audit`、真实浏览器多素材预览以及导出取消/重试终态继续有效。

浏览器/渲染/接口证据：重新加载隔离服务 `PORT=4214` 后真实浏览器打开“效果”面板，6 个效果按钮均为 disabled，并分别暴露待接入 RenderPlan/导出滤镜/代理预览的原因；页面无浏览器 error 日志，也没有“已应用到选中片段”假成功文本。真实浏览器的节目预览和真实 MP4 取消/重试证据已写入前两条记录。此次只改变错误反馈和可用性门禁，没有改写用户项目或上传外部数据。

未运行检查及原因：尚未实现交叉转场、导出级基础变换或低清代理预览，因此没有运行这些能力的“通过”测试；真实 API/TTS/GPU/许可仍不具备授权条件。

数据迁移状态与回滚方式：仅增加前端能力表和禁用呈现，不改变项目 JSON schema、时间线或服务端数据；删除该能力表及面板变更即可回滚，无迁移。

尚存风险/阻塞：T10 的实现性效果和 RenderPlan/预览一致性仍未完成；T23 最终矩阵、浏览器关闭/刷新中途恢复、大媒体流式/断点、配置并发、真实 TTS/GPU/许可和 `api_verified_v1` 仍待验证。

任务状态：T10.2 诚实门禁完成；T10 母任务继续 `in_progress`，未实现效果不计完成。

nextTask：T23 最终 local_v1 矩阵复核，同时保留 T10 效果实现为明确待办。

nextAction（具体到动作或命令）：按方案第 6 节逐项回读既有证据，先执行发布验收矩阵中尚未覆盖的浏览器关闭/刷新恢复和同项目多次导出历史；不得把效果禁用状态提升为能力完成。

### 2026-09-06 — T22/T23 发布入口复核

currentTask / 子任务：T22/T23，复核最新前端收口后的环境 doctor、浏览器启动契约和临时服务清理。

修复前行为与复现：T10.2 修改效果面板后，需要确认生产构建仍能被本地安装检查、浏览器入口和导出预检正常消费；临时浏览器服务也不能遗留监听端口。

修改文件：仅更新 `docs/OPTIMIZATION_PROGRESS.md`；业务代码使用上一条记录中的能力门禁。

完成的行为：当前工作区 `doctor`、生产浏览器启动审计均通过；测试服务 4214 已按明确 PID 停止，未留下监听端口。没有把临时服务存储写入当前项目用户数据。

实际执行的命令、退出码、结果：`pnpm run doctor`（0；Node 24.18.0、pnpm 11.19.0、FFmpeg/FFprobe、libx264、字幕滤镜、数据目录权限通过，TTS 正确显示可选 offline）；`pnpm test:browser-bootstrap`（0；health/html、JS/CSS MIME、9:16/30fps 预检、无 FFmpeg 阻断和诊断 ZIP 全部通过）；停止服务后 4214 无监听。

浏览器/渲染/接口证据：前一条真实浏览器效果面板、节目预览和导出取消/重试证据保持有效；本条只验证发布入口和清理，不调用真实供应商。

未运行检查及原因：最终 local_v1 的浏览器关闭/刷新中途恢复、同项目多次导出历史和完整无人值守生成表单仍未固化；这些未通过真实验证，不标完成。

数据迁移状态与回滚方式：无数据迁移；临时服务和临时媒体/任务目录与当前 `server/data` 隔离。代码回滚沿用 `.local-baseline-2026-09-05/` 快照和项目备份恢复入口。

尚存风险/阻塞：T23 仍需最终矩阵回读；T10 效果实现、T07 大文件流式/断点、T03 配置并发、T17 真实 TTS/GPU/许可和 `api_verified_v1` 仍未验证。

任务状态：T22 发布入口复核子项完成；T22/T23 母任务继续 `in_progress`。

nextTask：T23 最终 local_v1 场景矩阵。

nextAction（具体到动作或命令）：下一轮从方案第 6 节“导出恢复”开始，启动隔离服务创建长时真实渲染，验证浏览器刷新/重开后任务可查且旧成片不被覆盖，再处理同项目多次导出 URL 历史；未验证前不提升 local_v1 状态。

### 2026-09-06 — T10.3/T11.3/T11.4/T21/T23 导出恢复、RenderPlan 变换与字幕交付

currentTask / 子任务：T10.3、T11.3/T11.4，完成基础画面变换、刷新恢复、独立导出历史和 SRT 下载的真实闭环。

修复前行为与复现：检查器中的位置/缩放/旋转只改变浏览器预览，FFmpeg 成片不读取这些字段；导出任务完成后页面状态会显示 `SUCCEEDED · 0%`；同一项目多次后台导出都使用 `/api/render/{projectId}/deliverable.mp4`，历史记录可能互相覆盖；导出中心没有独立 SRT 下载入口；渲染审计在 Windows 短暂文件锁或变换耗时下会误报失败。

修改文件：`server/render.mjs`、`server/index.mjs`、`src/main.jsx`、新增 `src/captionExport.js`、新增 `scripts/caption-export-audit.mjs`、`scripts/render-profile-audit.mjs`、`scripts/render-audit.mjs`、`scripts/remote-content-type-audit.mjs`、`scripts/check.mjs`、`docs/OPTIMIZATION_PROGRESS.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

完成的行为：

- FFmpeg 画面片段接收 `positionX/positionY/scale/rotation`，与预览使用同一时间线字段；帧指纹审计确认变换确实改变导出帧。
- 导出任务使用任务级 renderKey 和独立目录/URL；旧直接渲染接口保持兼容；`GET /api/jobs` 只返回公开投影，不带 `projectSnapshot`。
- 页面刷新后从服务端恢复任务历史和状态，终态进度显示实际 100%；同项目历史按任务保留，独立成片 URL 可单独下载。
- 导出中心新增 SRT 下载；只导出字幕轨，支持多行文本，拒绝空文本、无效时间和重叠；不把画面镜头名冒充字幕。
- 审计等待真实 FFmpeg 完成并在 Windows 上等待子进程/重试 EBUSY 清理；远程 MIME 审计改用明确公网 IP 夹具，避免当前 DNS 代理把测试域名解析到内网而误判。

实际执行的命令、退出码、结果：`pnpm exec node scripts/render-profile-audit.mjs`（0，7 种画幅/帧率组合、空隙、变速、源入点、transform 帧指纹、非法帧率和重叠拒绝）；`pnpm exec node scripts/render-audit.mjs`（0，HTTP render/download、启动恢复、后台两次导出独立 URL、公开任务快照隐藏、取消/重试、音频字幕和未验证媒体拒绝）；`pnpm exec node scripts/caption-export-audit.mjs`（0，2 条字幕、多行、画面轨排除、重叠拒绝）；`pnpm lint`（0 errors、24 个既有 Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 227,060 bytes）；最终 `pnpm check`（0，122 个语法文件、72 项离线审计）。

浏览器/渲染/接口证据：隔离服务 `PORT=4215`、无 API key、无 TTS；真实浏览器检查器设置 `X=120、Y=-40、缩放=145%、旋转=8°`，提交真实 MP4 后 DOM 显示 `RUNNING · 10%`，最终自动下载并提示成片完成；服务端最新 job 为 `SUCCEEDED/progress=100`，技术质检为 16 秒、1280×720、25fps、H.264、无警告，job 快照含上述变换字段；刷新后导出历史显示多条成功记录，任务级 URL 均返回 HTTP 200，互不覆盖，浏览器 error 日志为空。随后在同一隔离项目新增并确认“浏览器 SRT 回归”字幕，导出中心点击“下载字幕 SRT”显示“已导出 1 条字幕 SRT”，浏览器 error 日志为空。隔离服务已按 PID 停止，无 LISTEN 端口。

未运行检查及原因：未将浏览器下载拦截固化为自动化文件断言；本次通过真实 DOM 成功提示、纯函数 SRT 审计和浏览器无错误共同验证。未调用真实供应商、真实 TTS/GPU 或外部授权模型。

数据迁移状态与回滚方式：渲染任务新增可选任务级目录/URL，旧 `/api/render/{projectId}/deliverable.mp4` 路径仍可读；字幕导出不改变项目 schema；仅使用临时隔离 DATA_DIR 与项目，未写入当前用户数据。回退代码可使用 `.local-baseline-2026-09-05/` 和现有项目备份；无需数据迁移。

尚存风险/阻塞：T10 交叉转场、稳定/速度渐变和代理预览仍禁用；T11 expectedRevision/幂等键和 deliveryReady 审核语义尚未实现；T07 大文件流式/断点、T03 配置并发、T17 真实 TTS/GPU/许可、浏览器关闭中途自动化和 `api_verified_v1` 仍未验证；因此 T10/T11/T23 母任务继续 `in_progress`，local_v1 仍为 `pending`。

任务状态：T10.3、T11.3、T11.4、T21 本轮子项完成；T10/T11/T23 母任务继续 `in_progress`，未把禁用能力或未授权外部条件标记完成。

nextTask：T11 expectedRevision/幂等契约与 T23 最终 local_v1 矩阵。

nextAction（具体到动作或命令）：先检查 `POST /api/render/jobs` 是否接受项目 revision 与幂等键；补同项目重复请求去重/旧 revision 拒绝审计，再按方案第 6 节逐项回读未通过条件，不得提前提升 local_v1 或 api_verified_v1。

### 2026-09-07 — T11.5/T11.6/T12/T21 渲染契约、人工交付审核与任务尾写修复

currentTask / 子任务：T11.5、T11.6；同时修复 T12 任务失败终态的尾写竞态并补 T21 回归证据。

修复前行为与复现：`POST /api/render/jobs` 没有比较 `expectedRevision`，同项目重复提交也没有消费幂等键；任务只记录渲染快照，无法表达输入 revision/hash/preset 与“技术成功但尚未人工交付”的区别。另一次完整门禁在 `needs_reconcile` 任务刚写入终态后立即清理临时目录，后台事件尾写触发 Windows `ENOENT`；缺失项目因新渲染分支吞掉 `ENOENT` 后变成 400，而诊断契约要求 404。

修改文件：`server/index.mjs`、`server/taskWorker.mjs`、`src/main.jsx`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`、`docs/RELEASE_ACCEPTANCE_2026-09-06.md`。

完成的行为：

- 渲染创建支持 `projectId / expectedRevision / preset / idempotencyKey`；服务端在使用提交快照渲染前校验已保存项目 revision，旧版本返回 409 `REVISION_CONFLICT`，缺失 projectId 仍返回 404 `ENOENT`。
- 同项目同幂等键在进程内串行并在重启后从 JSON 任务记录复用同一 job；相同键但项目输入、预设或 revision/hash 不同返回 409 `RENDER_IDEMPOTENCY_CONFLICT`。公开任务隐藏 `projectSnapshot` 与 `idempotencyKey`，记录 `inputRevision/inputFingerprint/preset`。
- 真实文件与技术 QC 通过只进入 `SUCCEEDED`，创建/成功默认 `deliveryReady:false`；新增 `/api/render/jobs/:id/review`，仅对真实成功任务接受 `pass` 或 `needs-revision`，审核记录含结论、备注和时间，只有 `pass` 才设置 `deliveryReady:true`。导出中心历史提供“确认可交付/退回复核”，重试会清除旧审核。
- 任务失败/needs_reconcile/cancelled 路径先写事件、最后公开终态，避免外部看到终态后临时目录被清理而发生尾写 `ENOENT`；行为不改变原有重试、对账和取消语义。

实际执行的命令、退出码、结果：`pnpm exec node scripts/render-audit.mjs`（0；真实 HTTP render/download、启动恢复、两次独立导出 URL、旧 revision 409、幂等复用同 job、输入冲突 409、取消终态 CANCELLED、真实音视频字幕与未验证媒体拒绝；成功任务未审核为 `deliveryReady:false`，人工 pass 后为 true）；`pnpm exec node scripts/task-retry-policy-audit.mjs` 连续 3 次（0，retryable/FAILED/needs_reconcile 均通过）；`pnpm exec node scripts/diagnostics-audit.mjs`（0，缺失项目/任务 404、requestId/脱敏/关联字段通过）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、24 个既有 React Hooks warnings）；`pnpm test:performance`（0，首屏 JS/CSS gzip 227,538 bytes）；最终 `pnpm check`（0，122 个语法文件、72 项离线审计）。

浏览器/渲染/接口证据：审核接口与渲染闭环在真实隔离 HTTP 服务和 FFmpeg/ffprobe 夹具中完成；前端构建包含真实 revision/idempotency 请求体和审核按钮，之前浏览器真实 MP4 导出、刷新恢复、独立历史、变换与 SRT 证据保持有效。本轮在隔离服务 `PORT=4215` 中通过应用内浏览器真实点击首条“确认可交付”，历史状态由 `SUCCEEDED · 待人工审核` 变为 `SUCCEEDED · 可交付`，按钮变为“已确认”，页面提示“已人工确认：成片可交付”；服务随后已停止且无 LISTEN 端口。

未运行检查及原因：未调用真实供应商 API、真实 TTS/GPU 或外部授权模型；未把交叉转场、代理预览、大媒体流式/断点和完整无人工 local_v1 矩阵标记完成。

数据迁移状态与回滚方式：渲染任务 JSON 仅新增可选幂等、输入指纹、输入 revision、preset、deliveryReady 和 deliveryReview 字段；旧任务可继续读取，公开投影仍不返回快照/幂等键。仅使用隔离 `DATA_DIR` 和临时媒体，当前用户项目与正式数据目录未改写；可用 `.local-baseline-2026-09-05/`、项目备份和逐文件回退恢复。

尚存风险/阻塞：T11 仍缺更完整的人工审核/项目 delivery 联动和无人工最终矩阵；T12 SQLite 跨进程唯一约束与真实 provider 回放仍待完成；T03 配置并发、T07 大媒体流式/断点、T10 交叉转场/代理预览、T17 真实 TTS/GPU/许可、`api_verified_v1` 和 local_v1 最终矩阵仍未验证。未经真实验证的能力没有标记完成。

任务状态：T11.5/T11.6、T21 本轮子项完成；T12 尾写稳定性子项完成；T11/T12/T21/T23 母任务继续 `in_progress`，`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T12/T14 剩余后台任务与 provider 可靠性边界。

nextAction（具体到动作或命令）：先检查并补跨进程任务幂等唯一约束的隔离审计；随后在不调用真实供应商的前提下扩展结构化 provider 错误/对账矩阵，再用 `pnpm check` 和真实本地媒体渲染回归；有真实授权后才执行 api_verified_v1。

### 2026-09-07 — T11.6 浏览器人工交付审核点击补证

currentTask / 子任务：T11.6，补齐前端人工交付审核入口的真实 DOM 点击证据。

完成的行为：在隔离 `PORT=4215`、无 API key、无 TTS 的服务中打开真实项目导出历史，点击首条成功任务的“确认可交付”；页面即时显示 `SUCCEEDED · 可交付`、按钮“已确认”（disabled），并显示“已人工确认：成片可交付”。这证明服务端审核状态已被前端真实动作读取并反映到 UI；没有把其他待审核任务误改为可交付。

实际执行的命令、退出码、结果：应用内浏览器真实点击与等待（0；快照确认状态和提示均符合预期）；点击前隔离服务监听 PID `20468` 已核验为 Node，随后按精确 PID 停止，端口 `4215` 复核为无监听。

浏览器/渲染/接口证据：浏览器控制台无新增错误；本条只补人工审核按钮点击，不扩大到真实供应商、TTS/GPU、交叉转场或无人工发布矩阵。

未解决问题：T11 的项目级 delivery 联动、下载拦截自动断言和无人工最终矩阵仍未完成；其他外部授权能力继续保持未验证。

任务状态：T11.6 浏览器点击证据 done；T11/T23 母任务继续 `in_progress`，`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T14.3 Provider 异常响应与结构化错误矩阵。

nextAction（具体到动作或命令）：检查 `server/providers.mjs` 对 HTTP/JSON 错误的所有字段路径与状态映射，补一份受控 provider 响应矩阵审计；只验证离线结构化行为，不伪造真实账户成功。

### 2026-09-07 — T14.3 Provider HTTP/JSON 结构化错误矩阵收口

currentTask / 子任务：T14.3，统一各 provider adapter 的 HTTP 错误响应路径，并补齐不调用真实供应商的响应矩阵。

修复前行为与复现：多个文本、图片、语音、视频 adapter 直接把上游响应拼成普通 `Error`，JSON 错误里的 `error.code/type/status`、HTTP `Retry-After` 和响应正文脱敏没有统一入口；上传、轮询、媒体下载阶段也会丢失 provider/model/task 关联，导致限流、权限失败、暂时性上游错误和需对账异常难以稳定分类。

修改文件：`server/providerErrors.mjs`、`server/providers.mjs`、`scripts/provider-error-audit.mjs`。

完成的行为：

- 所有会抛出 HTTP 错误的 provider adapter 统一调用 `requireProviderResponse`；保留 HTTP status、上游 `code/type/status`、截断后的安全 detail、Retry-After 和 provider/model/task 上下文。
- 401/403 权限错误不标记可重试；429 与 5xx 标记可重试并解析秒数或日期 Retry-After；视频网络/超时仍按 `needs_reconcile` 语义优先，避免重复扣费或重复提交。
- provider 错误正文中的 Bearer、API key、access token、secret 值会脱敏；2xx 响应保持原对象透传，便于后续 JSON Schema 门禁继续消费。
- 本地 TTS 探活在候选地址失败时仍继续尝试其他协议；上传、任务查询和结果下载失败则进入统一结构化错误路径。

实际执行的命令、退出码、结果：`pnpm exec node scripts/provider-error-audit.mjs`（0；401 JSON、429 Retry-After、503 JSON、504 纯文本、2xx 放行和敏感字段脱敏均通过）；`pnpm lint`（0 errors、24 个既有 React Hooks warnings）；`pnpm check`（0，122 个语法文件、72 项离线审计）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 227,538 bytes）；`pnpm exec node scripts/render-audit.mjs`（0；无密钥真实 HTTP/FFmpeg/ffprobe 成片、音视频字幕、后台成功与未验证媒体拒绝均通过）。

浏览器/渲染/接口证据：本条没有调用真实供应商账户；真实浏览器人工审核点击证据保持有效，最新无密钥真实 MP4 审计产生独立临时成片并通过下载/技术质检。未经真实账户回放，不标记 `api_verified_v1`。

未解决问题：真实 provider 响应字段仍需授权账户回放；provider cancel、真实额度/权限和多进程任务 claim 仍待外部或后续隔离验证；T03 配置并发、T07 大媒体流式/断点、T10 未实现效果和 `local_v1` 无人工最终矩阵继续未完成。

数据迁移状态与回滚方式：仅新增 provider 错误对象字段和 adapter 调用路径，不改变项目/资产/任务持久化 schema；回退可按文件恢复，当前用户数据无需迁移。

任务状态：T14.3 离线结构化响应矩阵 done；T14 母任务继续 `in_progress`，`api_verified_v1` 保持 pending_external_verification。

nextTask：T03/T12 配置与任务存储并发边界。

nextAction（具体到动作或命令）：盘点 `server/config.mjs` 与任务 Repository 的所有 read-modify-write 调用，验证是否共用串行协调器；补双请求/并发冲突隔离审计后再决定是否需要实现改动，不把单进程通过外推为多进程完成。

### 2026-09-07 — 本轮最终账本指针（代理预览链路）

currentTask / 子任务：T10；代理预览后端子项已取得真实证据，但前端显式入口与视觉效果仍未完成。

实际完成内容：`renderProject` 支持同一时间线/变速/入点/变换/音频/字幕 RenderPlan 的低清 profile；新增 `renderProxyProject` 与 `/api/render/proxy`，按完整项目指纹生成 640px 最大边的真实 MP4；同一指纹命中缓存，输入变化生成新目录；清理逻辑只保护当前指纹并回收过期旧代理。新增 `scripts/proxy-render-audit.mjs`。

实际执行的命令、退出码、结果：`pnpm exec node scripts/proxy-render-audit.mjs`（0；真实 640×360 MP4 generated、cached、HTTP API cached、invalidated、reclaimed）；`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 228,774 bytes）。此前真实成片审计仍通过：MP4 下载 200、后台成片 SUCCEEDED、音频淡入/淡出边缘 -21.6 dB、中段 -12.4 dB。

未解决问题：节目监视器目前仍默认浏览器直接预览，尚未提供切换到低清代理成片的用户入口和浏览器证据；交叉转场/闪白/黑边/手持/稳定等视觉效果继续禁用；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成。上述能力均未标记 done。

数据迁移状态与回滚方式：生产 JSON schema 未改变；代理缓存位于 `render/<project>/<fingerprint>`，删除对应缓存目录即可回滚，不影响项目媒体和交付物；审计使用隔离临时 DATA_DIR，正式 `server/data` 未被测试写入。

任务状态：T10 代理后端/缓存/失效回收子项有真实证据，T10 母任务继续 `in_progress`；T03/T07/T12/T13 母任务继续 `in_progress`；local_v1 与 api_verified_v1 保持 pending。

nextTask：T10 前端代理预览入口。

nextAction（具体到动作或命令）：在 `src/main.jsx` 的节目监视器增加“生成低清代理预览”按钮，调用 `/api/render/proxy` 并以独立播放器展示完整代理成片；保留浏览器即时预览为另一状态，避免把代理文件当作逐片段实时预览；补真实浏览器生成、刷新和输入变更失效审计后，再继续视觉效果或 SQLite 双读。

### 2026-09-07 — T10 前端低清代理预览入口与浏览器证据

currentTask / 子任务：T10；前端代理预览入口已实现并完成真实浏览器验证，T10 母任务仍未完成。

实际完成内容：在节目监视器增加“生成低清代理”入口和独立 `<video controls>` 播放器；浏览器即时预览继续使用原始 `/api/assets/...` 素材，不被代理文件替代；代理结果写入当前会话，刷新后可恢复；时间线输入 key 变化时标记 `stale=true`、隐藏旧代理并要求重新生成。

实际执行的真实浏览器步骤与结果：隔离项目含真实已探测 MP4；点击生成后状态 `ready/stale=false`，播放器实测 `640×360`、时长 `1s`、真实 `/api/render/.../deliverable.mp4`；即时播放器仍指向 `/api/assets/...` 的 `320×180` 原始素材；修改检查器位置 X 为 80 后状态变为 `ready/stale=true` 且代理播放器隐藏；重新生成得到不同代理指纹并恢复 `stale=false`；刷新页面后独立代理播放器仍恢复，媒体节点实测原始素材与代理成片同时存在，代理节点 `controls=true`、`640×360`。测试服务及临时数据已清理。

实际执行的命令、退出码、结果：`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 229,748 bytes）。

未解决问题：T10 的交叉转场、闪白、电影黑边、手持、稳定等视觉效果仍禁用，尚未完成同一 RenderPlan 的真实 FFmpeg 滤镜与浏览器验收；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成。上述能力均未标记 done。

任务状态：T10 代理后端、缓存、失效回收和前端入口子项有真实证据，T10 母任务继续 `in_progress`；T03/T07/T12/T13 母任务继续 `in_progress`；local_v1 与 api_verified_v1 保持 pending。

nextTask：T10 真实视觉效果滤镜。

nextAction（具体到动作或命令）：电影黑边子项已有真实证据；下一步实现交叉溶解，继续用真实 MP4 抽帧/ffprobe 比较基础版与效果版，并补浏览器撤销、刷新和不支持条件门禁。

### 2026-09-07 — T10 电影黑边真实 RenderPlan 与浏览器验证

currentTask / 子任务：T10；电影黑边子项已完成真实成片、代理成片和浏览器入口验证，T10 母任务继续 `in_progress`。

实际完成内容：时间线新增可持久化的 `letterbox` 字段；节目监视器的“电影黑边”按钮与预览遮罩、低清代理和最终 FFmpeg `drawbox` 使用同一 RenderPlan 字段；按钮支持键盘 Enter 切换，未接入的交叉转场、闪白、手持、稳定等效果仍保持禁用。代理预览入口继续独立于即时素材预览，输入变更会使旧代理失效。

实际执行的真实验证与结果：`pnpm exec node scripts/render-profile-audit.mjs`（0；7 个画幅/帧率 profile，`letterbox=true`，顶部灰度均值 `0`、中部 `123.73`，变换/入点/变速/间隙和不支持条件均通过）；隔离真实浏览器服务中启用黑边后预览遮罩节点为 1，生成的代理为真实 `640×360` MP4，Enter 关闭后遮罩节点为 0，再次启用恢复 active 状态；无密钥真实 MP4 成片审计仍通过。`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip `229,856` bytes）。

未解决问题：交叉溶解、闪白、手持、稳定等效果尚未取得真实导出证据；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成，均未标记 done。

数据迁移状态与回滚方式：新增字段对旧项目保持可选兼容；关闭 `letterbox` 或移除该字段即可回到原始画面，代理缓存按项目指纹隔离；本轮审计使用隔离临时 DATA_DIR，正式 `server/data` 未被测试写入。

任务状态：T10 代理后端、缓存、失效回收、前端入口和电影黑边子项有真实证据，T10 母任务继续 `in_progress`；T03/T07/T12/T13/T17 继续按账本状态推进；`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T10 交叉溶解真实效果。

nextAction（具体到动作或命令）：交叉溶解子项已有真实证据；下一步实现叠化闪白，继续用真实 MP4 抽帧、ffprobe 和浏览器代理验证，未取得证据前不启用其他效果。

### 2026-09-07 — 本轮最新账本指针

currentTask / 子任务：T10；本轮同时完成 T03 的 IndexedDB 草稿恢复闭环、T07 的本地媒体流式上传与 Range 验证，以及 T03/T12 的跨进程 JSON 并发隔离子项。

实际完成内容：新增并修正 Windows 可重试的共享文件锁，配置、音色库和任务的 read-modify-write 在多进程下保持串行；媒体上传改为分块落盘并继续执行签名/探测/目录门禁；前端将完整项目草稿保存到 IndexedDB，仅保留 localStorage 元数据，启动水合后支持离线编辑、刷新恢复和服务恢复自动补交；RenderPlan 真实接入音频音量、淡入和淡出，视觉效果/代理预览未伪造为已实现。

实际执行的命令、退出码、结果：`pnpm exec node scripts/concurrency-audit.mjs`（0；provider 字段 2、路由执行记录 4、音色 8、单 claim=1、事件 12、合并字段 12）；`pnpm check`（0，125 个语法文件、74 项离线审计）；`pnpm lint`（0 errors、25 个 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 228,774 bytes）；`pnpm exec node scripts/render-audit.mjs`（0；真实 MP4 下载 200、后台成片 SUCCEEDED、音频音量 70%、淡入淡出边缘 -21.6 dB、中段 -12.4 dB、未验证媒体拒绝）。独立浏览器证据：IndexedDB 草稿离线编辑后刷新恢复，服务恢复后自动补交，状态依次为 `offline`、`synced`、`ready`。

未解决问题：T10 交叉转场/闪白/黑边/手持/稳定等视觉效果与真实代理文件生成、缓存、失效回收仍未完成；T07 远程/base64/极大文件压力和客户端续传仍未完成；SQLite 仍是隔离适配器，尚未切换生产；T14 真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 仍未完成。上述能力均未标记 done。

数据迁移状态与回滚方式：本轮生产 JSON schema 未改变；新增锁文件、IndexedDB 草稿和流式临时上传文件均可由现有清理/陈旧回收路径处理；SQLite 与浏览器审计使用隔离临时数据，正式 `server/data` 未被测试写入。

任务状态：T03/T07/T10/T12/T13 母任务继续 `in_progress`；T03/T12 的并发子项有真实证据，T07 本地流式子项有真实证据，T10 音频效果子项有真实 MP4 证据；local_v1 与 api_verified_v1 保持 pending。

nextTask：T10 代理预览与 RenderPlan 一致性边界。

nextAction（具体到动作或命令）：检索 `server` 与 `src` 的 proxy/preview 入口，逐条对照 RenderPlan 的 sourceOffset、sourceIn、playbackRate、transform、音频与字幕字段；若没有真实代理生成、缓存命中、源变更失效和回收链路，则补审计并保持视觉代理能力阻断，再进入 SQLite 双读/在线备份设计。

### 2026-09-07 — 本轮最新账本指针（代理预览链路）

currentTask / 子任务：T10；代理预览后端子项已取得真实证据，但前端显式入口与视觉效果仍未完成。

实际完成内容：`renderProject` 支持同一时间线/变速/入点/变换/音频/字幕 RenderPlan 的低清 profile；新增 `renderProxyProject` 与 `/api/render/proxy`，按完整项目指纹生成 640px 最大边的真实 MP4；同一指纹命中缓存，输入变化生成新目录；清理逻辑只保护当前指纹并回收过期旧代理。新增 `scripts/proxy-render-audit.mjs`。

实际执行的命令、退出码、结果：`pnpm exec node scripts/proxy-render-audit.mjs`（0；真实 640×360 MP4 generated、cached、HTTP API cached、invalidated、reclaimed）；`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 228,774 bytes）。此前真实成片审计仍通过：MP4 下载 200、后台成片 SUCCEEDED、音频淡入/淡出边缘 -21.6 dB、中段 -12.4 dB。

未解决问题：节目监视器目前仍默认浏览器直接预览，尚未提供切换到低清代理成片的用户入口和浏览器证据；交叉转场/闪白/黑边/手持/稳定等视觉效果继续禁用；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成。上述能力均未标记 done。

数据迁移状态与回滚方式：生产 JSON schema 未改变；代理缓存位于 `render/<project>/<fingerprint>`，删除对应缓存目录即可回滚，不影响项目媒体和交付物；审计使用隔离临时 DATA_DIR，正式 `server/data` 未被测试写入。

任务状态：T10 代理后端/缓存/失效回收子项有真实证据，T10 母任务继续 `in_progress`；T03/T07/T12/T13 母任务继续 `in_progress`；local_v1 与 api_verified_v1 保持 pending。

nextTask：T10 前端代理预览入口。

nextAction（具体到动作或命令）：在 `src/main.jsx` 的节目监视器增加“生成低清代理预览”按钮，调用 `/api/render/proxy` 并以独立播放器展示完整代理成片；保留浏览器即时预览为另一状态，避免把代理文件当作逐片段实时预览；补真实浏览器生成、刷新和输入变更失效审计后，再继续视觉效果或 SQLite 双读。

### 2026-09-07 — T03 IndexedDB 草稿、启动水合与服务恢复自动补交

currentTask / 子任务：T03，完成大项目正文脱离 localStorage、浏览器重载恢复和离线保存自动补交；配置并发与任务锁证据沿用上一条记录。

修复前行为与复现：项目正文完全写入 localStorage，配额不足时只能保留不稳定的浏览器副本；重启时没有读取大草稿的独立存储，服务中断后的保存请求只显示“仅本地”而不会保留待提交版本，也没有服务恢复后的自动补交。首次启动从小型项目元数据读取期间还存在初始化副作用覆盖 IndexedDB 完整草稿的竞态。

修改文件：`src/workflow.js`、`src/main.jsx`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：

- 新增 `xingmu-drafts/projects` IndexedDB 记录，保存完整项目、`dirty`、更新时间和保存时间；`localStorage` 的 `xingmu-project` 只保存 id/title/type/revision/updatedAt 小元数据，保留旧完整 JSON 的读取兼容。
- 服务端保存前先落 dirty 草稿，服务端成功后写回带新 revision 的 clean 草稿；IndexedDB 不可用或 localStorage 配额失败时不阻断服务端请求，并在浏览器状态中明确区分本地保存。
- 启动先等待草稿水合，避免元数据覆盖完整项目；水合后用一次内容 key 重挂载页面，避免同一 project id 下的子页面状态仍显示初始空值。删除项目和重载服务端版本会清理/更新对应草稿。
- 离线失败会保留待提交版本并按退避间隔自动重试；服务恢复后状态由“仅本地”转为“已保存”，再次刷新仍显示离线期间的修改。

实际执行的命令、退出码、结果：`pnpm check`（0，125 个语法文件、74 项离线审计）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm build`（0，1608 modules）；浏览器隔离回归使用 `PORT=4223` 临时 DATA_DIR 与无密钥项目，初次创建和服务端保存成功；停止 API、使用 Vite 保持页面可刷新，修改“核心梗概”后显示 `仅本地`；刷新后 `data-draft-state=recovered` 且页面包含“离线恢复三次标记”；重启 API 到代理端口 `4174` 后自动重试，状态变为 `已保存`；再次刷新 `data-draft-state=ready` 且页面仍包含“自动补交测试标记”。所有隔离进程已停止，4174/4215/4221/4223 无监听。

浏览器/渲染/接口证据：应用内浏览器同一隔离 origin 完成创建、编辑、服务停止、刷新、服务恢复、自动补交和再次刷新；没有写入当前正式 `server/data`，没有调用真实供应商、真实 TTS/GPU 或外部授权模型。一次早期回归发现并修复了草稿水合覆盖竞态，并重新完成上述闭环；未经修复前结果没有计入通过证据。

未解决问题：T03 的 SQLite 生产切换、多标签完整普通保存回归和退出前提示仍待完成；T07 远程/base64/极大文件压力/客户端续传、T10 未实现效果/代理预览、T17 真实 TTS/GPU/许可、真实 provider 与 local_v1 最终矩阵继续未验证。

数据迁移状态与回滚方式：新增浏览器 IndexedDB 数据库 `xingmu-drafts`；旧 localStorage 完整项目可读取并在下一次保存时转为小元数据，服务端项目 schema 不变。代码可逐文件回退；测试只使用隔离浏览器 origin 和临时 DATA_DIR，没有清理或覆盖正式用户数据。

任务状态：T03 IndexedDB 草稿/水合/离线自动补交子项 done；T03/T12/T21/T23 母任务继续 `in_progress`，`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T10 未完成效果与代理预览边界。

nextAction（具体到动作或命令）：读取 `server/render.mjs` 的 RenderPlan 字段和 `src/main.jsx` 的预览/效果入口，先用离线审计确认已有可执行效果；有字段和真实 FFmpeg 行为才实现并补帧/浏览器证据，否则保持入口禁用并把代理预览阻断原因写入账本。

### 2026-09-07 — T10 音频片段效果进入真实 RenderPlan

currentTask / 子任务：T10，修复已有音频编辑字段只影响浏览器试听、未进入真实 MP4 的一致性缺口。

检查结论：`server/render.mjs` 现有真实 RenderPlan 只支持视频 sourceOffset、playbackRate、position/scale/rotation，字幕、音频混音和 loudnorm；交叉转场、闪白/黑边、手持、稳定、速度渐变和代理预览没有可质检的同链路实现，因此继续保持效果按钮 disabled，未把 UI 入口当成已完成能力。

修改文件：`server/render.mjs`、`scripts/render-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：音频轨的 `volume` 百分比映射为 dB，显式 `gainDb` 仍可覆盖；`fadeIn`/`fadeOut` 按时间线片段时长限制并编译为 FFmpeg `afade`；变速后再做淡入淡出，最后进入已有 amix/loudnorm，浏览器预览与真实成片消费同一批字段。

实际执行的命令、退出码、结果：`pnpm exec node scripts/render-audit.mjs`（0；真实视频/音频/SRT 成片、HTTP 下载、后台恢复/取消/重试、revision/幂等/人工审核/未验证媒体拒绝保持通过；音频片段 volume=70%，fadeIn/fadeOut 均通过真实响度窗口验证，首段 -21.6 dB、中段 -12.4 dB、末段 -21.6 dB）；随后完整 `pnpm check`（0，125 个语法文件、74 项离线审计）保持通过。最终构建/性能基线：`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 228,774 bytes）。

浏览器/渲染/接口证据：本子项使用临时 DATA_DIR 和 FFmpeg/ffprobe 生成真实 MP4，直接对成片首/中/尾音频窗口读取响度；视觉效果没有伪造或标记完成。此前真实浏览器三段本地媒体成片、变换帧指纹、SRT、人工审核和草稿恢复证据保持有效；本条未调用真实供应商/TTS/GPU。

未解决问题：T10 交叉转场、黑边/闪白、轻微手持、画面稳定、速度渐变和代理预览仍未实现；T07 远程/base64/极大文件压力/客户端续传、T13 SQLite 生产切换、T17 真实 TTS/GPU/许可、真实 provider 与 local_v1 最终矩阵继续未验证。

数据迁移状态与回滚方式：项目 schema 不变，仅让已有时间线字段进入渲染滤镜；旧项目无这些字段时保持原音频行为。回退 `server/render.mjs` 与审计文件即可，不触碰正式用户数据。

任务状态：T10 音频效果一致性子项 done；T10/T21/T23 母任务继续 `in_progress`，`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T10 代理预览与未实现视觉效果边界，随后按依赖继续 T12/T13 剩余生产切换条件。

nextAction（具体到动作或命令）：检查项目是否存在可生成、可缓存、可失效回收的代理文件接口；若没有，补离线阻断审计和 UI 说明，不新增假代理 URL；然后继续审查 SQLite 双读/备份/生产切换的最小可验证子项。

### 2026-09-07 — T07 流式媒体上传与 Range 断点回读

currentTask / 子任务：T07，完成本地媒体 HTTP 上传的流式落盘，并复核资产 Range/HEAD 读取。

修复前行为与复现：`POST /api/assets/media` 先用 `binaryBody` 把整个请求聚合成 Buffer，再交给 `saveBinaryAsset` 重复写入探测临时文件；大文件会同时占用请求 Buffer、探测 Buffer 和临时文件空间，上传路径没有真实分块回归证据。

修改文件：`server/index.mjs`、`server/store.mjs`、`scripts/streaming-media-audit.mjs`、`scripts/check.mjs`。

完成的行为：二进制媒体请求现在按 chunk 写入数据目录下的独立 `.part` 文件，实时执行 Content-Length/累计字节限额；写完后只读取文件头做签名检查，以文件路径运行 ffprobe/参考音频音量检测，再把通过门禁的文件 rename 到项目资产目录，失败或重复资产会清理自身临时文件。现有 JSON/base64 项目包路径继续使用 Buffer，不冒充已实现所有输入类型的流式化。

实际执行的命令、退出码、结果：`pnpm exec node scripts/streaming-media-audit.mjs`（0；真实 HTTP 分块上传 7,934 bytes、ffprobe `passed`、两段 `Range` 均 206 且字节与源文件一致、HEAD 长度 7,934）；`pnpm check`（0，125 个语法文件、74 项离线审计，包含分块上传、签名拒绝、超限 413、Range/HEAD）；`pnpm lint`（0 errors、24 个既有 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 227,538 bytes）。

浏览器/渲染/接口证据：本条使用真实隔离 HTTP 服务、临时 DATA_DIR 和 FFmpeg 夹具，没有写入当前用户数据；既有无密钥真实 MP4/音频/字幕成片审计保持通过。当前只证明本地媒体分块上传和服务端断点读取，不把远程下载、base64 项目包、大文件压力或完整续传协议标记完成。

未解决问题：远程媒体仍会完整下载到内存后再入库；项目包导入仍是受限 Buffer；尚未完成多百 MB/磁盘压力、客户端断点重传和浏览器播放器长文件矩阵；T03 草稿恢复、T10 未实现效果、T17 真实 TTS/GPU/许可、真实 provider 和 `local_v1` 最终矩阵继续未完成。

数据迁移状态与回滚方式：资产和项目 JSON schema 不变，新增仅限流式上传临时文件及路径探测分支；回滚代码即可，残留 `.part` 文件由请求 finally 清理，当前正式数据目录未被测试写入。

任务状态：T07 本地流式上传/Range 子项 done；T07 母任务继续 `in_progress`，T21/T23 继续 `in_progress`，`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T03 浏览器草稿恢复与 T10 未完成效果/代理预览边界。

nextAction（具体到动作或命令）：先审查保存协调器在服务重启/离线期间的草稿落盘和恢复路径，补真实浏览器重开回归；随后只对已有 RenderPlan 能力实现效果，否则维持禁用并补代理预览阻断说明。

### 2026-09-07 — T03/T12 配置、音色库与 JSON 任务跨进程并发收口

currentTask / 子任务：T03 配置并发与 T12 JSON 任务存储并发边界。

修复前行为与复现：`config.mjs`、`voiceLibrary.mjs` 和 `jobs.mjs` 只使用进程内 Map/缓存；多个 Node 进程同时做 read-modify-write 时可能互相覆盖，任务 claim 也没有跨进程临界区，事件追加可能丢事件。

修改文件：`server/fileCoordinator.mjs`、`server/config.mjs`、`server/voiceLibrary.mjs`、`server/jobs.mjs`、`scripts/concurrency-audit.mjs`、`scripts/check.mjs`。

完成的行为：新增带 PID/时间戳、超时和陈旧锁回收的共享文件锁；provider 配置、路由执行记录和音色 upsert/delete 在锁内刷新磁盘状态后写回；任务 save/claim/heartbeat/event/delete 在锁内完成读改写，跨进程只有一个 claim 胜出，事件与部分字段更新不会互相覆盖；临时文件名加入随机尾缀，替换失败会清理自身临时文件。

实际执行的命令、退出码、结果：`pnpm exec node scripts/concurrency-audit.mjs`（0；独立 Node 进程并发保留 provider 字段 2、路由执行记录 4、音色 8、任务单 claim=1、事件 12、合并字段 12）；`pnpm check`（0，124 个语法文件、73 项离线审计，包含该并发审计）；`pnpm lint`（0 errors、24 个既有 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 227,538 bytes）。

浏览器/渲染/接口证据：本子任务是独立服务进程/临时 DATA_DIR 的真实文件并发验证，没有写入当前用户数据；此前无密钥真实 MP4、浏览器审核点击和备份恢复证据保持有效。本轮未把 SQLite 生产切换或 provider 真实回放标记完成。

未解决问题：JSON 锁已覆盖当前单机多进程临界区，但 SQLite 双读/在线备份/生产切换仍未完成；T07 仍是整文件缓冲，T03 完整浏览器草稿恢复、T10 交叉转场/代理预览、T17 真实 TTS/GPU/许可、`api_verified_v1` 与 local_v1 最终矩阵继续未完成。

数据迁移状态与回滚方式：配置、音色库和任务 JSON schema 不变，仅新增 `.lock` 临时文件机制与审计脚本；临时锁会在正常完成/异常退出后按陈旧阈值回收，代码回退不需要数据迁移，当前正式 `server/data` 未被审计写入。

任务状态：T03 配置并发隔离子项 done；T12 JSON 跨进程 claim/event 子项 done；T03/T12/T21/T23 母任务继续 `in_progress`，`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T07 大媒体流式、Range 与断点可靠性。

nextAction（具体到动作或命令）：盘点 `server/store.mjs` 的上传/媒体读取和 `server/index.mjs` 的 asset/deliverable 路径，区分可流式传输的响应与必须落盘探测的输入；补受控大文件 Range/断点审计，不降低现有签名、探测和目录边界门禁。

### 2026-09-07 — T13.7 SQLite 幂等唯一约束隔离审计

currentTask / 子任务：T13.7，补 SQLite 迁移适配器的任务幂等唯一约束；不切换生产 JSON 存储。

修复前行为与复现：隔离 SQLite 适配器的 `jobs` 表没有保存 `idempotency_key`，不同任务可以在同一项目中写入相同幂等键；旧数据库也没有字段升级逻辑，且任务部分更新可能丢失幂等键。

修改文件：`server/sqliteRepository.mjs`、`scripts/sqlite-migration-audit.mjs`、`docs/OPTIMIZATION_PROGRESS.md`。

完成的行为：`jobs` 表新增兼容旧库的 `idempotency_key` 字段和 `(project_id,idempotency_key)` 非空唯一索引；SQLite Repository 的 `saveJob` 先合并已有 payload，部分状态更新不会丢幂等键；新增 `findJobByIdempotency` 查询；重复键由数据库约束拒绝。现网路由和 JSON 任务文件未切换，避免未完成的 SQLite revision/生命周期迁移影响用户数据。

实际执行的命令、退出码、结果：`pnpm exec node scripts/sqlite-migration-audit.mjs`（0；项目/任务导入、事务回滚、源 JSON 不变、`idempotencyUnique=true`、`partialUpdatePreserved=true`）；两个新增 `.mjs` `node --check`（0）；最终 `pnpm check`（0，122 个语法文件、72 项离线审计，真实 MP4/音频/字幕、后台恢复/取消/重试、备份恢复、输入防护、诊断和升级回退保持通过）。

浏览器/渲染/接口证据：本子任务只验证隔离 SQLite 文件和事务，不改变服务端默认存储；此前无密钥真实浏览器 MP4 成片、刷新恢复、独立历史、SRT、变换和人工审核 HTTP 证据保持有效。本轮没有把 SQLite 适配器通过误写成生产多进程服务已通过。

未运行检查及原因：未进行 SQLite 生产切换、活跃服务双进程并发 claim、真实 provider API 或 TTS/GPU 调用；这些需要先完成双读/备份/故障恢复设计和外部授权。

数据迁移状态与回滚方式：仅在临时 SQLite 文件上执行字段/索引升级，原 JSON 文件保留且内容哈希/版本未变；回滚为不启用适配器或删除临时数据库，不触碰当前 `server/data`。

尚存风险/阻塞：生产仍是 atomic JSON，跨进程 claim/幂等唯一性尚未由正式服务使用；SQLite 迁移还缺双读一致性、在线备份和生命周期删除策略。T03 配置并发、T07 大媒体流式/断点、T10 效果实现、T14 真实供应商回放和 `api_verified_v1` 继续未完成。

任务状态：T13.7 done（隔离唯一约束证据）；T13 母任务继续 `in_progress`，T12/T14/T23 继续 `in_progress`，未提升 local_v1 或 api_verified_v1。

nextTask：T03/T12 配置与任务存储并发边界。

nextAction（具体到动作或命令）：盘点 `server/config.mjs` 与任务 Repository 的所有 read-modify-write 调用，验证是否共用串行协调器；补双请求/并发冲突隔离审计后再决定是否需要实现改动，不把单进程通过外推为多进程完成。

### 2026-09-07 — 本轮最终账本指针（代理预览链路）

currentTask / 子任务：T10；代理预览后端子项已取得真实证据，但前端显式入口与视觉效果仍未完成。

实际完成内容：`renderProject` 支持同一时间线/变速/入点/变换/音频/字幕 RenderPlan 的低清 profile；新增 `renderProxyProject` 与 `/api/render/proxy`，按完整项目指纹生成 640px 最大边的真实 MP4；同一指纹命中缓存，输入变化生成新目录；清理逻辑只保护当前指纹并回收过期旧代理。新增 `scripts/proxy-render-audit.mjs`。

实际执行的命令、退出码、结果：`pnpm exec node scripts/proxy-render-audit.mjs`（0；真实 640×360 MP4 generated、cached、HTTP API cached、invalidated、reclaimed）；`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 228,774 bytes）。此前真实成片审计仍通过：MP4 下载 200、后台成片 SUCCEEDED、音频淡入/淡出边缘 -21.6 dB、中段 -12.4 dB。

未解决问题：节目监视器目前仍默认浏览器直接预览，尚未提供切换到低清代理成片的用户入口和浏览器证据；交叉转场/闪白/黑边/手持/稳定等视觉效果继续禁用；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成。上述能力均未标记 done。

数据迁移状态与回滚方式：生产 JSON schema 未改变；代理缓存位于 `render/<project>/<fingerprint>`，删除对应缓存目录即可回滚，不影响项目媒体和交付物；审计使用隔离临时 DATA_DIR，正式 `server/data` 未被测试写入。

任务状态：T10 代理后端/缓存/失效回收子项有真实证据，T10 母任务继续 `in_progress`；T03/T07/T12/T13 母任务继续 `in_progress`；local_v1 与 api_verified_v1 保持 pending。

nextTask：T10 前端代理预览入口。

nextAction（具体到动作或命令）：在 `src/main.jsx` 的节目监视器增加“生成低清代理预览”按钮，调用 `/api/render/proxy` 并以独立播放器展示完整代理成片；保留浏览器即时预览为另一状态，避免把代理文件当作逐片段实时预览；补真实浏览器生成、刷新和输入变更失效审计后，再继续视觉效果或 SQLite 双读。

### 2026-09-07 — T10 前端低清代理预览入口与浏览器证据

currentTask / 子任务：T10；前端代理预览入口已实现并完成真实浏览器验证，T10 母任务仍未完成。

实际完成内容：在节目监视器增加“生成低清代理”入口和独立 `<video controls>` 播放器；浏览器即时预览继续使用原始 `/api/assets/...` 素材，不被代理文件替代；代理结果写入当前会话，刷新后可恢复；时间线输入 key 变化时标记 `stale=true`、隐藏旧代理并要求重新生成。

实际执行的真实浏览器步骤与结果：隔离项目含真实已探测 MP4；点击生成后状态 `ready/stale=false`，播放器实测 `640×360`、时长 `1s`、真实 `/api/render/.../deliverable.mp4`；即时播放器仍指向 `/api/assets/...` 的 `320×180` 原始素材；修改检查器位置 X 为 80 后状态变为 `ready/stale=true` 且代理播放器隐藏；重新生成得到不同代理指纹并恢复 `stale=false`；刷新页面后独立代理播放器仍恢复，媒体节点实测原始素材与代理成片同时存在，代理节点 `controls=true`、`640×360`。测试服务及临时数据已清理。

实际执行的命令、退出码、结果：`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip 229,748 bytes）。

未解决问题：T10 的交叉转场、闪白、电影黑边、手持、稳定等视觉效果仍禁用，尚未完成同一 RenderPlan 的真实 FFmpeg 滤镜与浏览器验收；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成。上述能力均未标记 done。

任务状态：T10 代理后端、缓存、失效回收和前端入口子项有真实证据，T10 母任务继续 `in_progress`；T03/T07/T12/T13 母任务继续 `in_progress`；local_v1 与 api_verified_v1 保持 pending。

nextTask：T10 真实视觉效果滤镜。

nextAction（具体到动作或命令）：电影黑边子项已有真实证据；下一步实现交叉溶解，继续用真实 MP4 抽帧/ffprobe 比较基础版与效果版，并补浏览器撤销、刷新和不支持条件门禁。

### 2026-09-07 — T10 电影黑边真实 RenderPlan 与浏览器验证

currentTask / 子任务：T10；电影黑边子项已完成真实成片、代理成片和浏览器入口验证，T10 母任务继续 `in_progress`。

实际完成内容：时间线新增可持久化的 `letterbox` 字段；节目监视器的“电影黑边”按钮与预览遮罩、低清代理和最终 FFmpeg `drawbox` 使用同一 RenderPlan 字段；按钮支持键盘 Enter 切换，未接入的交叉转场、闪白、手持、稳定等效果仍保持禁用。代理预览入口继续独立于即时素材预览，输入变更会使旧代理失效。

实际执行的真实验证与结果：`pnpm exec node scripts/render-profile-audit.mjs`（0；7 个画幅/帧率 profile，`letterbox=true`，顶部灰度均值 `0`、中部 `123.73`，变换/入点/变速/间隙和不支持条件均通过）；隔离真实浏览器服务中启用黑边后预览遮罩节点为 1，生成的代理为真实 `640×360` MP4，Enter 关闭后遮罩节点为 0，再次启用恢复 active 状态；无密钥真实 MP4 成片审计仍通过。`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:performance`（0，首屏 JS/CSS gzip `229,856` bytes）。

未解决问题：交叉溶解、闪白、手持、稳定等效果尚未取得真实导出证据；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成，均未标记 done。

数据迁移状态与回滚方式：新增字段对旧项目保持可选兼容；关闭 `letterbox` 或移除该字段即可回到原始画面，代理缓存按项目指纹隔离；本轮审计使用隔离临时 DATA_DIR，正式 `server/data` 未被测试写入。

任务状态：T10 代理后端、缓存、失效回收、前端入口和电影黑边子项有真实证据，T10 母任务继续 `in_progress`；T03/T07/T12/T13/T17 继续按账本状态推进；`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T10 交叉溶解真实效果。

nextAction（具体到动作或命令）：交叉溶解子项已有真实证据；下一步实现叠化闪白，继续用真实 MP4 抽帧、ffprobe 和浏览器代理验证，未取得证据前不启用其他效果。

### 2026-09-07 — T10 交叉溶解真实 RenderPlan 与浏览器验证

currentTask / 子任务：T10；交叉溶解子项已完成真实 FFmpeg 成片、低清代理和浏览器入口验证，T10 母任务继续 `in_progress`。

实际完成内容：时间线为选中的相邻画面片段增加显式 `transition: 'crossfade'` 与 `transitionDuration`，启用时自动把当前片段起点移到上一片段结束前的重叠位置，关闭时恢复原起点并保留可撤销操作；服务端对未接入转场、非法重叠、首片段转场和跨空隙转场明确拒绝。RenderPlan 使用同一字段驱动 FFmpeg `xfade`，无转场项目继续走原 concat 路径。

实际执行的真实验证与结果：`pnpm exec node scripts/render-profile-audit.mjs`（0；`crossfade=true`，中间帧 RGB `[101,0,151]` 同时含红/蓝两段，交叉溶解输出时长 `1.77s`，电影黑边和原有 7 个画幅/帧率 profile 继续通过）；隔离真实浏览器中第二片段点击交叉溶解后提示“已启用交叉溶解，可撤销”，生成代理播放器真实元数据为 `640×360`、`1.666667s`、`controls=true`；关闭后旧代理 `stale=true` 且播放器隐藏，重新启用并刷新后按钮说明恢复为已接入状态、代理 `stale=false`。`pnpm build`（0，1608 modules）；`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个 React Hooks warnings）；`pnpm test:performance`（0，首屏 JS/CSS gzip `230,211` bytes）。测试服务、浏览器临时数据和监听端口已清理。

未解决问题：交叉溶解已完成，但浏览器即时播放器仍以当前片段为主，叠化效果的逐帧可视化还需下一轮补强；叠化闪白、轻微手持、稳定、速度渐变仍未取得真实导出证据；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成，均未标记 done。

数据迁移状态与回滚方式：新增转场字段对旧项目可选兼容；关闭交叉溶解会恢复 `transition` 为空、`transitionDuration` 为 0 和原始 `start`，旧项目仍走 concat；本轮渲染、浏览器和服务审计使用隔离临时数据，正式 `server/data` 未被测试写入。

任务状态：T10 代理后端、缓存、失效回收、前端入口、电影黑边和交叉溶解子项有真实证据，T10 母任务继续 `in_progress`；T03/T07/T12/T13/T17 继续按账本状态推进；`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T10 叠化闪白真实效果。

nextAction（具体到动作或命令）：叠化闪白子项已有真实证据；下一步实现轻微手持，继续用真实 MP4 抽帧、代理元数据、撤销和刷新验证，未经证据不启用速度渐变或稳定。

### 2026-09-07 — T10 叠化闪白真实 RenderPlan 与浏览器验证

currentTask / 子任务：T10；叠化闪白子项已完成真实 FFmpeg `fadewhite` 成片、低清代理和浏览器入口验证，T10 母任务继续 `in_progress`。

实际完成内容：显式支持 `transition: 'flash'` 与 `transitionDuration`；服务端在同一 RenderPlan 组合阶段使用 FFmpeg `xfade=transition=fadewhite`，保留相邻片段重叠几何、音频连续性和非法转场门禁；前端效果入口支持启用、撤销和持久化，未验证的其他效果仍不启用。

实际执行的真实验证与结果：`pnpm exec node scripts/render-profile-audit.mjs`（0；`flash=true`，中间帧 RGB `[135,137,255]`，平均亮度超过 170，输出时长 `1.77s`；黑边、交叉溶解和 7 个画幅/帧率 profile 继续通过）；隔离真实浏览器中第二片段启用叠化闪白后生成代理，播放器实测 `640×360`、`1.666667s`、`controls=true`；关闭后旧代理 `stale=true` 且播放器隐藏，重新启用并刷新后按钮恢复已接入状态、代理 `stale=false`。`pnpm build`（0，1608 modules）；`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个 React Hooks warnings）；`pnpm test:performance`（0，首屏 JS/CSS gzip `230,211` bytes）。测试服务、浏览器临时数据和监听端口已清理。

未解决问题：叠化闪白已完成；浏览器即时播放器仍以当前片段为主，转场区逐帧视觉预览仍需补强；轻微手持、速度渐变、稳定等效果尚未取得真实导出证据；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成，均未标记 done。

数据迁移状态与回滚方式：新增 `flash` 转场字段对旧项目可选兼容；关闭叠化闪白会恢复 `transition` 为空、`transitionDuration` 为 0 和原始 `start`，无转场旧项目仍走 concat；本轮渲染、浏览器和服务审计使用隔离临时数据，正式 `server/data` 未被测试写入。

任务状态：T10 代理后端、缓存、失效回收、前端入口、电影黑边、交叉溶解和叠化闪白子项有真实证据，T10 母任务继续 `in_progress`；T03/T07/T12/T13/T17 继续按账本状态推进；`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T10 轻微手持真实效果。

nextAction（具体到动作或命令）：为单个画面片段增加可控、可回溯的轻微手持运动字段，在同一 RenderPlan 的 FFmpeg 组合阶段实现有限幅度的时间/位置变化；先用真实 MP4 抽帧比较基础版与手持版差异，并验证浏览器代理、撤销、刷新和不支持条件，再推进速度渐变或稳定。

### 2026-09-08 — T10 轻微手持真实 RenderPlan、代理与刷新可靠性验证

currentTask / 子任务：T10；轻微手持子项已完成真实导出、代理和浏览器回归，T10 母任务继续 `in_progress`。

实际完成内容：为画面片段增加可选 `handheld` 字段；服务端在同一 RenderPlan 的片段组合阶段使用 4% 受控画面余量和低幅正弦/余弦时间函数位移，避免随机抖动、滚转和主体大幅漂移；浏览器节目监视器、代理预览与最终 MP4 均读取同一字段。效果按钮改为使用各自的 `active` 状态并暴露 `aria-pressed`。代理输入指纹改用排序后的稳定序列化，避免服务端保存/刷新后仅因对象键顺序变化而误报旧代理。

实际执行的真实验证与结果：`pnpm check`（0；126 个语法文件、75 项离线审计，内含 `render-profile-audit`：7 个画幅/帧率 profile、源入点、空隙、变速、变换、黑边、交叉溶解、叠化闪白、轻微手持和不支持条件均通过；`handheld=true`，手持版不同时间抽帧指纹不同）；隔离服务中使用真实已探测 MP4，浏览器启用轻微手持后提示“已启用轻微手持”，生成代理状态 `ready/stale=false`，实测视频 `640×360`、时长 `1s`、`controls=true`，源素材与代理节点同时存在；Enter 关闭后代理变为 `stale=true` 且旧播放器隐藏；重新启用并用稳定指纹重新生成后，刷新页面仍显示效果按钮 `[pressed]`、代理“真实 MP4 · 刚生成”，刷新后的代理元数据仍为 `640×360`、`1s`、`controls=true`。无密钥真实 MP4 闭环继续由审计覆盖，未把占位或模拟媒体标记为完成。

实际执行的命令、退出码、结果：`pnpm build`（0，1608 modules）；`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:performance`（0，首屏 JS/CSS gzip `230,380` bytes）。隔离服务端口已停止，隔离 DATA_DIR 和浏览器测试页已清理，正式 `server/data` 未被本轮浏览器夹具写入。

未解决问题：T10 的速度渐变、画面稳定和转场区即时播放器逐帧可视化仍未取得真实导出证据；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成，均未标记 `done`。

数据迁移状态与回滚方式：`handheld` 与 `stabilization` 均为可选布尔字段，旧项目默认关闭；关闭字段或删除字段即回到原始画面，代理指纹会随输入恢复并避免复用错误缓存。按钮激活态和稳定序列化只影响前端可见状态与代理失效判断，不改变旧项目媒体数据。

任务状态：T10 代理后端、缓存、失效回收、前端入口、电影黑边、交叉溶解、叠化闪白、轻微手持、速度渐变和画面稳定子项有真实证据，T10 母任务仍保留转场区即时逐帧预览未完成；T07 远程流式入库与客户端分块断点子项有证据，母任务继续 `in_progress`；T03/T12/T13/T17 继续按账本状态推进；`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T10 速度渐变真实效果。

nextAction（具体到动作或命令）：为画面片段增加可回溯的 `speedRamp` 起止速率字段；先在浏览器播放头同步中按时间计算当前速率，再在 FFmpeg RenderPlan 中实现有限范围的非恒定 `setpts`，用真实 MP4 的抽帧指纹、ffprobe 时长/帧率和代理缓存失效验证，未取得证据前保持“画面稳定”禁用。

### 2026-09-08 — T10 速度渐变真实 RenderPlan、动态预览与代理回滚验证

currentTask / 子任务：T10；速度渐变子项已完成真实导出、浏览器动态播放和代理刷新/撤销回归，T10 母任务继续 `in_progress`。

实际完成内容：为画面片段增加可选 `speedRamp: { from, to }` 字段，速率限制在 0.25–4 倍并对非法结构硬拒绝；浏览器预览新增按播放头线性插值的瞬时播放速率和积分源时间，播放中逐帧更新 `<video>.playbackRate`；FFmpeg RenderPlan 使用解析后的非恒定 `setpts` 曲线并裁剪对应源时长，旧的固定 `playbackRate` 路径保持兼容。效果目录的“速度渐变”现已启用并可撤销，仍未取得证据的“画面稳定”继续禁用。

实际执行的真实验证与结果：`pnpm exec node scripts/preview-timeline-audit.mjs`（0；端点 `0.5/1.0/1.5x`、积分源时间和 `speedRamp` 均通过）；`pnpm exec node scripts/render-profile-audit.mjs`（0；7 个画幅/帧率 profile 继续通过，`speedRamp=true`、输出时长 `1s`、抽帧指纹相对恒速基线在前后段均变化、非法曲线 `RENDER_SPEED_RAMP_INVALID` 被拒绝，同时黑边/交叉溶解/闪白/手持继续通过）。隔离真实浏览器中启用效果后按钮为 `class=active`、`aria-pressed=true`，提示“已启用速度渐变（0.75x→1.35x）”；静止播放头实测 `0.75x`，播放约 `0.45s` 后实测 `0.941x` 且媒体已前进；生成代理为真实 `640×360`、`2s` MP4；刷新后曲线按钮仍 active、代理 `stale=false`；Enter 撤销后按钮为 false、旧代理隐藏且 `stale=true`。服务端项目查询确认曲线持久化，测试使用无密钥真实媒体。

实际执行的命令、退出码、结果：`pnpm build`（0，1608 modules）；`pnpm check`（0，126 个语法文件、75 项离线审计）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:performance`（0，首屏 JS/CSS gzip `230,541` bytes）。隔离服务端口、浏览器测试页及临时 DATA_DIR 已清理，正式 `server/data` 未被测试夹具写入。

未解决问题：T10 的画面稳定和转场区即时播放器逐帧可视化仍未取得真实导出证据；T07 远程/base64/极大文件压力和客户端续传、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、`local_v1` 与 `api_verified_v1` 继续未完成，均未标记 `done`。

数据迁移状态与回滚方式：`speedRamp` 为可选字段，旧项目默认恒速；关闭效果或删除该字段即回到固定 `playbackRate`，代理指纹随时间线输入重新计算，不复用旧曲线缓存。非法曲线在服务端渲染入口拒绝，不会静默生成错误成片。

任务状态：T10 代理后端、缓存、失效回收、前端入口、电影黑边、交叉溶解、叠化闪白、轻微手持和速度渐变子项有真实证据，T10 母任务继续 `in_progress`；T03/T07/T12/T13/T17 继续按账本状态推进；`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T10 画面稳定真实效果。

nextAction（具体到动作或命令）：先确认本机 FFmpeg 是否提供可用的 `vidstabdetect/vidstabtransform` 或等价稳定滤镜；若可用，为单片段增加可回溯稳定字段并把分析/变换纳入同一 RenderPlan，用真实 MP4 抽帧和代理回归验证；若不可用，保持按钮禁用并记录明确阻断证据，不以浏览器 CSS 位移冒充导出稳定。

### 2026-09-08 — T10 画面稳定与 T07 远程/断点媒体链路

currentTask / 子任务：T07；T10.6 画面稳定已完成真实证据，T07 继续推进远程媒体和客户端断点可靠性，母任务仍为 `in_progress`。

实际完成内容：确认本机 FFmpeg 同时提供 `deshake`、`vidstabdetect` 与 `vidstabtransform`；本轮选用可单遍、可取消、无需额外分析文件的 `deshake`，为画面片段增加可回溯 `stabilization` 布尔字段，接入同一 RenderPlan 的代理与真实导出，并在渲染入口和预检入口拒绝非法字段/缺少滤镜。浏览器即时监视器保留原片，不冒充实时稳定；效果目录明确提示代理/导出才反映稳定结果，时间线变化会使旧代理 stale。

T07 方面：远程 provider 媒体下载改为受 250MB 上限的响应流式落盘，完成后复用文件签名、真实 ffprobe 和原子资产提交，失败清理自身 `.remote-*.part`；新增 `Content-Range + uploadId` 的分块上传协议，按项目隔离临时文件，返回 `nextOffset`，重复偏移返回 409，中断后客户端查询偏移并继续，最终块完成后才入库。原有单请求流式上传、Range/HEAD 与目录边界门禁保持不变。

实际执行的真实验证与结果：`ffmpeg -hide_banner -filters`（确认 `deshake`、`vidstabdetect`、`vidstabtransform`）；`pnpm exec node scripts/render-profile-audit.mjs`（0；抖动夹具启用稳定后真实 MP4 抽帧指纹变化、输出时长 1s、非法 `stabilization` 被拒绝、预检 capability 通过）；隔离浏览器（效果按钮 `class=active`、`aria-pressed=true`，生成真实 640×360/2s 代理，刷新仍 active 且 `stale=false`，撤销后 `stale=true`/代理隐藏，服务端 revision 3 持久化关闭）；`pnpm exec node scripts/streaming-media-audit.mjs`（0；7,934 bytes 分块上传、两段 Range 206、断点重复偏移 409、续传最终 201、ffprobe passed、无残留 `.part`）；`pnpm exec node scripts/remote-content-type-audit.mjs`（0；分片响应流推断 `video/mp4` 并通过 ffprobe，伪媒体拒绝）；`pnpm exec node scripts/client-media-upload-audit.mjs`（0；10,000,000 bytes 客户端分成 8MB+2MB，首块模拟断连后按服务端偏移继续，最终资产返回）。

未解决问题：T07 项目包导入仍由 `binaryBody` 聚合 Buffer，极大文件/磁盘压力和陈旧分块定期清理尚未完成；T10 转场区即时播放器逐帧可视化仍未完成；SQLite 生产切换、真实 provider/TTS/GPU/许可回放、完整多标签保存回归、`local_v1` 与 `api_verified_v1` 继续未完成，均未标记 `done`。

数据迁移状态与回滚方式：`stabilization` 为可选布尔字段，旧项目默认关闭；删除或设为 false 即回到原片，代理指纹会变化并阻止复用稳定版缓存。上传临时文件只在项目数据目录中以 uploadId 隔离；完成后原子移动，错误可恢复偏移或删除指定 uploadId，不影响正式资产。

任务状态：T10.6、T07 远程流式、服务端断点协议和客户端续传契约有真实证据；T07 母任务继续 `in_progress`，T10 母任务仍因转场区逐帧预览保持 `in_progress`；T03/T12/T13/T17 按账本状态推进；`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T07 大文件与项目包导入可靠性。

nextAction（具体到动作或命令）：检查 `server/projectPackage.mjs`、`binaryBody` 和维护清理入口，先增加可控大文件/中断包导入的临时文件与空间上限测试；若 ZIP 依赖不支持流式解析，则保留明确的 500MB Buffer 上限、失败清理和用户可见错误，不把未验证的“流式项目包导入”标为完成。

### 2026-09-08 — T07 项目包请求流式落盘与临时文件清理

currentTask / 子任务：T07；inspect/import 已从请求聚合 Buffer 改为先写入数据目录内独立 `.package-*.part`，完成接收后再执行既有 ZIP 校验/导入；T07 母任务继续 `in_progress`。

实际完成内容：项目包 HTTP inspect/import 现在复用受限 `receiveBinaryFile`，在 500MB 上限、Content-Length 提前拒绝和请求结束后才进入解析之间形成明确边界；成功、损坏和导入失败都在 finally 清理自身临时文件。维护清理策略纳入 `.upload-*.part` 与 `.package-*.part`：超过保留期可回收，保留期内的活动分块受保护。ZIP 解析器仍使用自有无压缩 ZIP 的受限 Buffer 校验，没有把“请求流式落盘”冒称为“端到端流式 ZIP 解析”。

实际执行的真实验证与结果：`pnpm exec node scripts/project-package-http-audit.mjs`（0；HTTP 导出/inspect/import 仍分别 200/200/201，冲突副本成功，包请求无残留 `.part`）；`pnpm exec node scripts/cleanup-audit.mjs`（0；陈旧 upload 临时文件被回收、活动 upload 临时文件受保护、正式项目渲染/资产不受影响）；前一项 `pnpm exec node scripts/streaming-media-audit.mjs`（0；分块续传和取消删除后无残留）；`pnpm exec node scripts/client-media-upload-audit.mjs`（0；客户端断连恢复仍通过）。

未解决问题：`server/projectPackage.mjs` 仍需把完整 ZIP 读入受限 Buffer 后校验，未取得 500MB 级 ZIP 解析的空间压力证据；GET 导出包仍一次性构建 ZIP Buffer；T07 远程重定向 DNS 与实际连接一致性、T10 转场区即时逐帧预览、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、完整多标签保存、`local_v1` 与 `api_verified_v1` 继续未完成，均未标记 `done`。

数据迁移状态与回滚方式：项目数据 schema 不变；新增 HTTP 上传临时文件命名和清理匹配规则，删除这些规则或回退路由即可恢复旧请求路径，正式资产与项目文件不被清理规则匹配。分块上传完成前不会产生正式资产，取消通过 uploadId 删除自身临时文件。

任务状态：T07 本地媒体流式、远程流式入库、服务端分块续传、客户端断点恢复、取消清理和项目包请求流式落盘子项有审计证据；T07 母任务继续 `in_progress`，T10/T12/T13/T17 按账本状态推进；`local_v1` 与 `api_verified_v1` 保持 pending。

nextTask：T07 ZIP 解析与大文件空间压力，随后回到 T10 转场区逐帧预览。

nextAction（具体到动作或命令）：为 `server/projectPackage.mjs` 的 `parseZip`/`inspectProjectPackage` 增加真实受控大包和损坏包压力审计，测量峰值可观测内存与临时文件回收；若未引入流式 ZIP 解析器，保留当前 500MB Buffer 上限并明确阻断，不标记 T07 母任务完成。

### 2026-09-08 — T07/T10 本轮验证收口与持续任务续行

currentTask / 子任务：T07；T10.6 画面稳定和 T07 远程/断点媒体链路、项目包请求落盘均已完成本轮可验证范围，T07 母任务继续 `in_progress`。

实际完成内容：画面片段的 `stabilization` 布尔字段已接入统一 RenderPlan 的 FFmpeg `deshake`，渲染预检、非法字段拒绝、代理失效和浏览器效果入口保持一致；远程媒体改为受 250MB 上限约束的响应流式落盘，完成后复用签名、真实 ffprobe 和原子资产提交；本地媒体新增按项目隔离的 `Content-Range + uploadId` 续传协议，服务端返回已写偏移并拒绝重复偏移，客户端断线后读取偏移继续；项目包 inspect/import 请求先流式落盘到独立临时文件，再进入现有受限 ZIP Buffer 解析，成功、失败和取消路径清理自身临时文件；维护清理入口已覆盖 upload/package 临时文件并保护活动分块。

实际执行的真实验证与结果：`pnpm exec node scripts/render-profile-audit.mjs`（0；稳定前后真实 MP4 抽帧指纹不同、时长 1s、能力预检和非法字段拒绝通过）；隔离真实浏览器验证画面稳定按钮 `class=active`、`aria-pressed=true`、真实 640×360/2s MP4 代理、刷新保持、撤销后代理隐藏且 `stale=true`；`pnpm exec node scripts/streaming-media-audit.mjs`（0；7,934 bytes 分块上传、Range 两次 206、重复偏移 409、续传最终 201、ffprobe passed、无残留 `.part`）；`pnpm exec node scripts/client-media-upload-audit.mjs`（0；10,000,000 bytes 按 8MB+2MB 分块，模拟断连后按服务端偏移恢复）；`pnpm exec node scripts/remote-content-type-audit.mjs`（0；分片响应流推断 `video/mp4` 并通过 ffprobe，伪媒体拒绝）；`pnpm exec node scripts/project-package-http-audit.mjs`（0；导出/inspect/import 为 200/200/201，包请求无残留 `.part`）；`pnpm exec node scripts/cleanup-audit.mjs`（0；陈旧 upload 临时文件回收、活动分块保护）；`pnpm check`（0，127 个语法文件、76 项离线审计）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:performance`（0，首屏 JS/CSS gzip 230,989 bytes，低于 1.5MB 目标）。测试使用隔离 DATA_DIR，正式 `server/data` 未被夹具污染。

未解决问题：项目包 ZIP 解析仍需完整受限 Buffer，尚未取得 500MB 级空间压力和峰值内存证据；GET 导出包仍一次性构建 ZIP Buffer；远程重定向 DNS 与实际连接的一致性、T10 转场区即时逐帧预览、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、完整多标签保存、`local_v1` 与 `api_verified_v1` 继续未完成，均未标记 `done`。当前 lint 警告为既有 React Hooks 依赖提示，不阻断构建或审计。

数据迁移状态与回滚方式：`stabilization` 为可选字段，旧项目默认关闭，设为 `false` 或删除即可回到原片；上传续传只使用项目数据目录内按 uploadId 隔离的临时文件，完成后原子移入正式资产，取消或异常可删除自身临时文件；项目包请求临时文件不改变项目 schema，清理规则不匹配正式资产。

任务状态：T10.6、T07 远程流式、服务端续传、客户端断点恢复、取消清理和项目包请求落盘均有真实证据；T07 母任务继续 `in_progress`，T10/T12/T13/T17 按账本状态推进，`local_v1` 与 `api_verified_v1` 保持 pending。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：T07 ZIP 解析与大文件空间压力。

nextAction（具体到动作或命令）：新增 `server/projectPackage.mjs` 的受控大包/损坏包审计，记录 `parseZip`/`inspectProjectPackage` 的可观测峰值内存、500MB 上限行为和异常后的 `.package-*.part` 回收；若现有 ZIP 依赖不支持流式解析，则保留当前受限 Buffer 边界并记录明确阻断，再回到 T10 转场区逐帧预览。

### 2026-09-08 — T07 压力边界收口与 T10.7 转场逐帧预览

currentTask / 子任务：T07；T10.7 已完成真实浏览器证据，T07 的受控项目包压力与解析边界审计已完成，T07 母任务继续 `in_progress`。

实际完成内容：`server/projectPackage.mjs` 在格式分支前统一拒绝超过 500MB 的输入，补充 ZIP 中央目录记录长度、条目本地偏移、数据边界和解压总量校验，并导出明确的项目包大小常量；项目包 HTTP 路由增加受上限约束的可配置测试边界，包校验类错误统一返回 422。新增 `scripts/project-package-pressure-audit.mjs` 覆盖有效包、CRC 损坏、中央目录损坏、500MB+1 直接输入、较小配置上限的真实 HTTP 超限和异常后临时文件清理，并纳入 `scripts/check.mjs`。T10.7 新增 `previewTransitionAt`，在剪辑台重叠区按播放头计算前后片段、源时间和混合进度，浏览器对交叉溶解显示双层 MP4，对叠化闪白叠加白闪峰值层；暂停拖动和播放状态均保留真实媒体同步。

实际执行的真实验证与结果：`pnpm exec node scripts/project-package-pressure-audit.mjs`（0；CRC/中央目录损坏拒绝、超大输入拒绝、配置上限 HTTP 413、临时文件清理通过；500MB+1 防护后的 RSS 增量约 53KB）；`pnpm exec node scripts/project-package-audit.mjs`（0）；`pnpm exec node scripts/project-package-http-audit.mjs`（0，导出/inspect/import 为 200/200/201）；`pnpm exec node scripts/preview-timeline-audit.mjs`（0，交叉溶解进度 0.5、闪白峰值 1）；真实浏览器隔离夹具中，交叉溶解中点出现两层真实 MP4，源时间为 1.75s/0.25s、透明度均为 0.5；叠化闪白中点进度 0.486、白闪层透明度约 0.971，前后层源时间约 1.82s/0.17s；浏览器、API、Vite、临时 DATA_DIR 均已关闭清理，4174/4238 无监听；`pnpm check`（0，128 个语法文件、77 项离线审计）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:performance`（0，首屏 JS/CSS gzip 230,989 bytes）。

未解决问题：项目包解析和 GET 导出仍使用受限 Buffer，尚未完成端到端流式 ZIP 解析及 500MB 实包空间压力；远程重定向 DNS 与实际连接一致性、SQLite 生产切换、真实 provider/TTS/GPU/许可回放、完整多标签保存、`local_v1` 与 `api_verified_v1` 继续未完成，均未标记 `done`。T07 仍需处理大文件内存复制/磁盘余量策略，T10 已因转场逐帧预览证据将母任务标记完成。

数据迁移状态与回滚方式：新增 `previewTransitionAt` 只读计算，不改变项目 schema；已有 `transition`/`transitionDuration` 字段保持兼容，清空转场字段即可回到单层浏览器预览，RenderPlan 行为不变；项目包仍保持 500MB 上限和既有存储格式，删除压力审计与结构校验扩展不会触碰正式项目/资产。

任务状态：T10.1–T10.7 均有行为或真实媒体证据，T10 母任务标记 `done`；T07 压力/损坏包审计和解析边界已完成，但因 ZIP Buffer、导出 Buffer 和资源策略未闭环，母任务继续 `in_progress`；T03/T12/T13/T17 按账本状态推进，`local_v1` 与 `api_verified_v1` 保持 pending。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：T07 大文件内存/磁盘余量与远程连接一致性，随后推进仍有外部条件的交付项。

nextAction（具体到动作或命令）：先在 `server/projectPackage.mjs`/`server/index.mjs` 为包解析前增加可观测磁盘余量门禁并消除可避免的条目 Buffer 复制，补充低余量和多条目包审计；同步复核远程下载每次重定向的 DNS 解析与连接地址一致性。若 ZIP 依赖仍不支持流式解析，保留当前 500MB 受限 Buffer 并把该能力明确记为阻断，再继续 T13 SQLite 生产切换或 T14 外部回放条件审计。

### 2026-09-08 — T07 资源门禁与项目包解析复制收口

currentTask / 子任务：T07；本轮完成项目包结构边界、请求磁盘余量保护和可避免条目复制消除，T07 母任务继续 `in_progress`；T10.1–T10.7 保持 `done`。

实际完成内容：`server/projectPackage.mjs` 在解析前统一执行 500MB 上限和 ZIP 中央目录/本地条目/解压总量边界校验，条目数据改为输入 Buffer 的受限切片，避免逐条复制；`server/index.mjs` 为项目包 inspect/import 增加可配置上传上限、默认 32MB 磁盘余量预留和流式接收中的周期性余量检查，低余量返回 HTTP 507，并在异常/取消后清理临时包文件。新增项目包多条目、损坏结构、超限、低余量审计并纳入统一检查；未改变项目 schema 或正式资产命名规则。

实际执行的真实验证与结果：`pnpm exec node scripts/project-package-pressure-audit.mjs`（0；有效包、多条目包 66 条、条目共享输入 Buffer、CRC/中央目录损坏拒绝、超大输入拒绝、配置上限 HTTP 413、临时文件清理通过）；`pnpm exec node scripts/project-package-disk-audit.mjs`（0；受控低余量 HTTP 507、临时文件清理通过）；`pnpm exec node scripts/project-package-audit.mjs`（0）；`pnpm exec node scripts/project-package-http-audit.mjs`（0，导出/inspect/import 为 200/200/201）；此前真实隔离浏览器 T10.7 交叉溶解/叠化闪白双层 MP4 证据仍有效；`pnpm check`（0，129 个语法文件、78 项离线审计）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:performance`（0，当前首屏 JS/CSS gzip 232,418 bytes，低于 1.5MB 目标）。审计均使用隔离 `DATA_DIR`，正式 `server/data` 未被夹具污染。

未解决问题：项目包 inspect/import 仍会把完整 ZIP 读入受限 Buffer，GET 导出仍一次性构建 ZIP Buffer，尚未完成端到端流式 ZIP 解析或 500MB 实包峰值空间验证；远程重定向 DNS 与实际连接地址一致性仍需真实网络条件复核。SQLite 生产切换、真实 provider/TTS/GPU/许可回放、完整多标签保存、`local_v1` 与 `api_verified_v1` 也继续未完成，均未标记 `done`。当前 lint 警告仍为既有 React Hooks 依赖提示。

数据迁移状态与回滚方式：本轮无 schema 迁移；ZIP 校验与 Buffer 切片只影响解析过程，删除结构校验扩展即可回退旧解析路径；磁盘余量门禁可通过环境配置恢复为既有请求上限策略，项目包临时文件仍按自身前缀清理，不匹配正式资产。预览转场计算为只读，清空转场字段即可回到单层预览。

任务状态：T07 的请求落盘、解析结构防护、资源门禁和可避免复制均有真实审计证据，但因端到端流式 ZIP、导出 Buffer 和远程 DNS 一致性未闭环，母任务继续 `in_progress`；T10.1–T10.7 标记 `done`；T03/T12/T13/T17 按账本状态推进，`local_v1` 与 `api_verified_v1` 保持 pending。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：T07 端到端 ZIP 流式解析/导出空间策略与远程重定向连接一致性；若依赖或真实网络条件不足，再推进 T13 SQLite 生产切换或 T14 外部回放条件审计。

nextAction（具体到动作或命令）：先盘点当前依赖是否提供可验证的流式 ZIP reader/writer；若可用，替换 inspect/import/GET export 的全包 Buffer 路径并用受控大包审计验证峰值与清理，若不可用则保留 500MB 受限 Buffer、记录明确阻断，再对远程下载每次重定向执行 DNS 解析地址与实际 socket 连接地址一致性审计。

### 2026-09-08 — T07 流式项目包、远程连接固定与 T13 SQLite 生产切换

currentTask / 子任务：T12；T07 的项目包 reader/writer、远程媒体 DNS/HTTPS 连接固定、资产元数据子项和 T13 的 SQLite 生产后端/迁移子项已完成可验证范围，T07/T13/T12 母任务仍按各自剩余验收保持 `in_progress`。

实际完成内容：项目包新增原生无压缩 ZIP 文件扫描器，按固定大小块校验本地条目、中央目录、CRC、SHA-256、路径和解压总量；inspect/import 支持 `inputPath`，导入按条目流式复制，GET 导出使用带准确 `Content-Length` 的流式 ZIP writer，旧 Buffer API 保持兼容。远程媒体每次重定向重新解析并拒绝私网地址，生产 HTTPS 请求将 socket lookup 固定到已校验地址并核对实际远端地址；保留离线 fetch 注入路径。媒体入库返回并登记 `assetId/bytes/sha256` 及 ffprobe 元数据。新增 `STORAGE_BACKEND=sqlite`，使用 WAL、事务、busy timeout、project_versions、job_events、资产元数据、任务幂等键、revision 冲突、删除墓碑/恢复和跨进程 worker；新增 `migrate:sqlite` dry-run/备份/幂等迁移命令，源 JSON 保留。

实际执行的验证与结果：`pnpm exec node scripts/project-package-streaming-audit.mjs`（0；真实 FFmpeg 6 秒 MP4，GET 下载 22–24 个响应块，文件 inspect、HTTP inspect 200、HTTP import 201、导入资产字节保持、临时包清理）；`pnpm exec node scripts/project-package-pressure-audit.mjs`（0；多条目共享输入切片、CRC/中央目录损坏、500MB+1、HTTP 413 和清理）；`pnpm exec node scripts/project-package-disk-audit.mjs`（0；受控低余量 507）；`pnpm exec node scripts/remote-content-type-audit.mjs`（0；流式真实 MP4 类型推断与伪媒体拒绝）；`pnpm exec node scripts/remote-dns-live-audit.mjs`（0；真实 `w3.org → www.w3.org` HTTPS 重定向、DNS 固定、PNG 保存）；`pnpm exec node scripts/sqlite-production-audit.mjs`（0；JSON dry-run/备份/重复迁移、SQLite 读写、跨 revision 冲突、任务 claim/event、服务端 SQLite worker `SUCCEEDED`、删除后迟到结果阻断和恢复）；`pnpm check`（0，134 个语法文件、80 项离线审计）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:performance`（0，首屏 JS/CSS gzip 232,418 bytes）。

未解决问题：T07 尚未完成完整媒体缩略图/波形/代理生成与长期缓存清理矩阵，仍需审查 asset metadata 在默认 JSON 存储和备份中的完整生命周期；项目包仍只支持未压缩 ZIP，不支持通用 deflate/Zip64，500MB 物理极限压力仍以受控边界审计为主。T12 的真实 provider 受理后的费用/取消对账、浏览器关闭中途恢复和多任务 UI，T13 的正式迁移后媒体 manifest 与 SQLite 一致备份，以及 T14/T17 的真实 API/TTS/GPU/许可验证仍未完成。`local_v1` 保持 pending，`api_verified_v1` 保持 pending_external_verification，均未标记完成。

数据迁移状态与回滚方式：新增 SQLite 表和 `STORAGE_BACKEND` 只在显式迁移并切换后生效；迁移命令先输出源文件数量/字节/聚合哈希，apply 前复制项目与任务 JSON 到 `.sqlite-migration-backup`，不删除源文件，重复执行不重复入库，事务失败回滚。未设置 `STORAGE_BACKEND=sqlite` 可继续使用原子 JSON；项目墓碑恢复只改变 SQLite 文档状态，媒体文件不因墓碑删除。新项目包/远程下载代码不修改既有项目 schema。

任务状态：T07 的流式上传、Range/HEAD、续传、远程下载、项目包流式 HTTP、资源门禁和真实重定向连接均有审计证据，但因媒体派生物/缓存生命周期及通用压缩 ZIP 未闭环，母任务继续 `in_progress`；T13 SQLite 生产后端与迁移子项有隔离服务证据，正式默认切换和一致备份矩阵未完成；T12 继续推进后台任务恢复与 provider 对账；T10.1–T10.7 保持 `done`，真实 provider/TTS/GPU/许可不以模拟结果代替。

nextTask：T12 浏览器关闭后任务恢复、跨进程重启与取消/对账边界；随后继续 T13 正式媒体 manifest/备份一致性和 T14 外部条件审计。

nextAction（具体到动作或命令）：在隔离 SQLite 数据目录启动真实前端/API，提交一个可恢复的后台渲染任务后关闭浏览器并终止/重启服务，核对 job 状态、产物、项目引用和旧 revision；再对取消、重复幂等键和 `needs_reconcile` 分支逐项补浏览器/HTTP 证据，未经真实外部受理不标记 provider 验证完成。

### 2026-09-08 — T12 SQLite 跨进程渲染恢复与服务关闭清理

currentTask / 子任务：T12；已完成隔离 SQLite 下的跨进程渲染恢复证据，T12 母任务继续 `in_progress`，因为浏览器关闭中途恢复、多任务 UI 和真实 provider 对账仍未完成。

实际完成内容：`server/index.mjs` 的 SIGINT/SIGTERM 停止流程现在在 HTTP 服务关闭后显式释放 SQLite project/job backend，并以单次清理 Promise 防止超时兜底重复释放；新增 `scripts/sqlite-render-recovery-audit.mjs`，在隔离数据目录写入真实 FFmpeg 视频资产和 SQLite `RUNNING` 渲染任务，启动首个服务进程后受控中断，再启动第二个服务进程，通过启动恢复逻辑继续任务并验证成片、项目引用和 revision。

实际执行的验证与结果：`pnpm exec node scripts/sqlite-render-recovery-audit.mjs`（退出码 0；首进程中断时状态 `RUNNING`，第二进程状态 `SUCCEEDED`，HTTP 下载真实 MP4 172,391 字节，`ffprobe` 时长 80.000000 秒且含视频流，项目 revision 为 1、时间线 80 个片段保持不变）；`pnpm check`（退出码 0；135 个语法文件、81 项离线审计）；`pnpm build`（退出码 0；1608 modules）；`pnpm lint`（退出码 0；0 errors、25 个既有 React Hooks warnings）；`pnpm test:performance`（退出码 0；首屏 JS/CSS gzip 232,418 bytes）。审计使用隔离 `DATA_DIR`，测试目录在结束后清理，未写入正式数据目录。

未解决问题：本轮证明的是服务进程级崩溃/重启恢复，不等同于已完成浏览器关闭中途的真实 UI 证据；真实 provider 的 `needs_reconcile`、取消/费用对账、SQLite 正式迁移后的媒体 manifest/一致备份、T07 派生媒体缓存、T14/T17 外部条件仍未完成。`local_v1` 继续 `pending`，`api_verified_v1` 继续 `pending_external_verification`，不以 MOCK 或本地重启结果替代。

数据迁移状态与回滚方式：本轮无新的 schema 迁移；服务停止时仅关闭 SQLite 连接，不删除任务、项目或媒体。仍可通过保留的 JSON 源和 `.sqlite-migration-backup` 回退，未设置 `STORAGE_BACKEND=sqlite` 时继续使用原子 JSON。

任务状态：T12 的 SQLite 任务恢复和真实 MP4 产物子项有跨进程证据，母任务继续 `in_progress`；T07/T13 继续按上条账本的未完成矩阵推进；T10.1–T10.7 保持 `done`，真实 provider/TTS/GPU/许可保持 pending。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：T12 浏览器关闭/重开期间的前端状态恢复和任务列表证据，再补 HTTP `needs_reconcile`、取消、重复幂等键的边界记录；随后推进 T13 媒体 manifest/一致备份与 T07 派生媒体生命周期。

nextAction（具体到动作或命令）：使用现有浏览器控制运行时打开隔离 SQLite 服务，提交一个后台渲染任务，在任务进入 `RUNNING` 后关闭并重新打开页面，读取 `/api/render/jobs/:id` 与项目 revision；同时补一条 `needs_reconcile` 任务的取消/重试 HTTP 审计，只有拿到真实状态转移证据才更新 T12 子状态。

### 2026-09-09 — T12 浏览器关闭/重开恢复与 Windows TTS 清理竞态

currentTask / 子任务：T12；完成真实 in-app Browser 页面关闭/重开期间的项目与后台渲染恢复证据，并修复全量验收中的 Windows TTS 子进程清理竞态；T12 母任务继续 `in_progress`，真实 provider 对账、多任务 UI 完整矩阵仍未完成。

实际完成内容：新增 `scripts/browser-recovery-setup.mjs`，为隔离 SQLite 服务准备真实 FFmpeg 视频资产和项目；通过浏览器项目总览打开案例和剪辑台，提交后台渲染任务后确认状态进入 `RUNNING`，关闭页签并确认页签列表为空，再重新打开服务页面并确认项目标题/真实视频素材仍载入。页面关闭期间服务继续处理任务，最终通过 HTTP 查询和 `ffprobe` 核对成片。另修复 `server/localTtsManager.mjs`：停止托管 TTS 子进程后暴露可等待的退出 Promise，生命周期审计在删除隔离目录前等待子进程退出，消除 Windows `EBUSY`。

实际执行的验证与结果：浏览器隔离实测（in-app Browser；服务 `STORAGE_BACKEND=sqlite`、隔离 `DATA_DIR`）中，首个错误夹具因测试时间线片段重叠被产品正确拒绝为 `RENDER_TIMELINE_OVERLAP`，随后用不重叠时间线重新提交；任务关闭页面前为 `RUNNING`，关闭后重新打开页面仍载入《浏览器重开恢复审计》和真实视频素材，任务最终为 `SUCCEEDED`，下载成片 27,700,623 字节，`ffprobe` 报告视频流、160.000000 秒，项目 revision 1、持久化时间线 1 个片段未改变，关闭时页签列表为空；`pnpm exec node scripts/local-tts-lifecycle-audit.mjs`（退出码 0，托管子进程退出等待、忙碌停止保护、引擎切换保护、外部服务保护和目录清理通过）；`pnpm check`（退出码 0；136 个语法文件、81 项离线审计）；`pnpm lint`（退出码 0；0 errors、25 个既有 React Hooks warnings）。隔离服务、浏览器页签和测试数据目录均已关闭/清理，正式 `server/data` 未被写入。

未解决问题：本轮浏览器提交使用隔离 HTTP 任务接口配合页面生命周期操作，应用当前剪辑台没有直接的“后台渲染”可点击入口，因此尚不能声称完整 UI 提交矩阵已完成；真实 provider 的受理/费用/取消对账、`needs_reconcile` 页面状态、多任务 UI、SQLite 正式媒体 manifest/一致备份、T07 派生媒体缓存、T14/T17 外部条件仍未完成。`local_v1` 继续 `pending`，`api_verified_v1` 继续 `pending_external_verification`，不以 MOCK 或本地服务替代。

数据迁移状态与回滚方式：本轮无数据库 schema 变化；TTS 修复只增加停止等待，不改变音色或项目数据。继续保留 JSON 源与 `.sqlite-migration-backup`，显式移除 `STORAGE_BACKEND=sqlite` 即可回到原子 JSON；浏览器审计目录为临时隔离数据，已删除且不含用户正式资产。

任务状态：T12 的跨进程恢复和浏览器页面关闭/重开期间的数据可见性已有真实证据，母任务继续 `in_progress`；T07/T13 按既有未完成矩阵推进；T10.1–T10.7 保持 `done`，真实 API/TTS/GPU/许可仍保持 pending。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T12 的 `needs_reconcile`、取消、重试和重复幂等键页面/HTTP状态转移证据；随后补 T13 媒体 manifest 与一致备份恢复，再收口 T07 派生媒体/缓存生命周期。

nextAction（具体到动作或命令）：在隔离服务中构造已进入 `needs_reconcile` 的 provider 任务，分别执行取消、重试和同幂等键重复提交，逐次读取 `/api/generate/jobs/:id`、`/api/jobs` 和项目 revision；若页面入口缺失，先补明确的“暂不支持/状态可见” UI，而不是用成功提示代替，再跑浏览器关闭/重开回归与 `pnpm check`。

### 2026-09-09 — T12 HTTP 对账状态机与取消降级保护

currentTask / 子任务：T12；完成隔离 SQLite 服务上的 HTTP `needs_reconcile`、幂等复用、重试恢复和运行中取消状态转移验证，修复取消后异步失败覆盖终态的问题；T12 母任务继续 `in_progress`。

实际完成内容：`server/taskWorker.mjs` 在错误处理分支优先检查任务 abort 信号，避免取消中的延迟供应商错误把 `CANCELLED` 改写为 `needs_reconcile` 或 `FAILED`。`server/providers.mjs` 增加仅 `NODE_ENV=test` 且显式设置 `XINGMU_TEST_PROVIDER_FAILURE` 时才启用的本地故障夹具，可在不触发真实供应商的前提下让 HTTP worker 进入 `needs_reconcile`；夹具支持受控延迟以验证取消竞态。新增 `scripts/generation-reconcile-http-audit.mjs` 并纳入统一检查，覆盖 SQLite 服务重启、同项目同幂等键复用、人工重试和取消后的稳定事件。

实际执行的验证与结果：`pnpm exec node scripts/generation-reconcile-http-audit.mjs`（退出码 0；首次任务 `needs_reconcile/NEEDS_RECONCILE`，重复幂等键复用同一 job ID；重启服务后 retry 为 `SUCCEEDED` 并记录 `manual_retry/succeeded`；延迟执行中的任务取消后稳定为 `CANCELLED/TASK_CANCELLED`，包含 `cancelled` 事件且无 `needs_reconcile` 降级）；故障夹具只在测试环境启用，未访问外部 API；`pnpm check`（退出码 0；137 个语法文件、82 项离线审计）；`pnpm build`（退出码 0；1608 modules）；`pnpm lint`（退出码 0；0 errors、25 个既有 React Hooks warnings）；`pnpm test:performance`（退出码 0；首屏 JS/CSS gzip 232,418 bytes）。此前浏览器页面关闭/重开恢复和真实 MP4 证据继续有效。

未解决问题：应用剪辑台仍没有直接的后台渲染提交入口，本轮 HTTP 对账验证使用隔离 API 配合页面生命周期；完整多任务 UI、真实 provider 受理/费用/取消对账、T13 SQLite 媒体 manifest/一致备份、T07 派生媒体缓存、T14/T17 外部条件仍未完成。`local_v1` 继续 `pending`，`api_verified_v1` 继续 `pending_external_verification`，不以故障夹具或 MOCK 结果替代。

数据迁移状态与回滚方式：本轮无数据库 schema 变化；worker 取消判定和测试故障夹具不改变项目/媒体格式。删除 `XINGMU_TEST_PROVIDER_FAILURE` 或切换非测试环境即可去除故障注入；SQLite 仍可通过 JSON 源和 `.sqlite-migration-backup` 回退，未设置 `STORAGE_BACKEND=sqlite` 即回到原子 JSON。

任务状态：T12 的 HTTP 对账与取消终态保护子项有真实隔离服务证据，母任务继续 `in_progress`；T07/T13 按既有未完成矩阵推进；T10.1–T10.7 保持 `done`，真实 API/TTS/GPU/许可保持 pending。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T12 完整多任务 UI 状态可见性与页面恢复回归；随后推进 T13 媒体 manifest 和数据库/媒体一致备份，再收口 T07 派生媒体与长期缓存生命周期。

nextAction（具体到动作或命令）：先定位剪辑台的成片交付操作和任务面板，把后台 render job 的提交、进度、`needs_reconcile`、取消、重试和幂等复用状态显式接入页面；用浏览器在隔离 SQLite 服务中完成至少两个并行任务的关闭/重开验证，再运行 `pnpm check`、`pnpm build` 与 `pnpm lint`。

### 2026-09-09 — T12 任务中心 UI 收口与运行时错误修复

currentTask / 子任务：T12；任务中心多任务状态可见性、页面恢复、取消/重试和 `needs_reconcile` 展示已完成真实隔离验证，T12 母任务继续 `in_progress`，真实 provider 受理后的费用/取消对账仍未完成。

实际完成内容：`src/main.jsx` 新增后台任务中心，统一展示 render/generation 任务、进度、终态、失败原因、取消、重试、下载和人工对账状态；`needs_reconcile` 明确显示“待人工对账 · 不自动重试”，重试按钮要求“已对账，重试”。任务轮询改为覆盖所有非终态任务，修复 generation 已进入 `needs_reconcile` 但页面仍停留“执行中”的状态滞后；项目恢复 effect 排除 render job，修复剪辑 render 被误送 `/api/generate/status` 的运行时错误。render 提交保留请求幂等键，未知请求失败时不丢键，页面标识幂等复用；`src/styles.css` 补齐任务中心的状态、进度、操作和窄屏布局。

实际执行的真实验证与结果：隔离 SQLite 服务和 in-app Browser 中并行提交两条 render job，关闭页面前两条均为 `RUNNING`，关闭后页签列表为空，重开后任务中心重新显示两条；点击其中一条取消后服务端为 `CANCELLED`，再点击重试恢复为 `RUNNING`。另一隔离故障夹具最终为 `needs_reconcile`，页面稳定显示“待人工对账 · 不自动重试”和“已对账，重试”，轮询不会回退为执行中；最终服务日志没有 render job 被错误查询生成供应商异步状态的记录。隔离浏览器服务、页签和临时数据目录均已清理，正式 `server/data` 未写入。

实际执行的命令、退出码、结果：`pnpm exec node scripts/generation-reconcile-http-audit.mjs`（0；`needs_reconcile`、同幂等键复用、人工重试 `SUCCEEDED`、运行中取消 `CANCELLED` 和取消事件通过）；`pnpm check`（0，138 个语法文件、83 项离线审计）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，首屏 JS/CSS gzip 234,882 bytes）。

未解决问题：真实 provider 的受理、费用、供应商侧取消/对账未验证；本轮 UI 使用隔离本地服务和故障夹具，不将其作为外部 provider 证据。T13 SQLite 媒体 manifest/一致备份、T07 派生媒体缓存、T14/T17 外部条件仍按后续账本推进；`local_v1` 与 `api_verified_v1` 保持 pending。

数据迁移状态与回滚方式：本轮 UI 和任务状态修复不改变项目或 SQLite schema；回退 `src/main.jsx`、`src/styles.css` 即移除任务中心展示，后台任务数据和渲染产物不被删除。测试数据为临时隔离目录，已清理。

任务状态：T12 的任务中心多任务状态、页面恢复、取消/重试和 `needs_reconcile` 子项有真实隔离证据，母任务继续 `in_progress`；T07/T13/T17 按账本状态推进，T10.1–T10.7 保持 `done`，真实 API/TTS/GPU/许可保持 pending。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：T13 SQLite 项目/资产/任务快照与备份 manifest 一致性。

nextAction（具体到动作或命令）：新增隔离 SQLite 备份一致性审计，验证真实媒体哈希、项目 revision、任务事件和删除后恢复；篡改清单或媒体时必须拒绝且不产生部分恢复，再运行全量检查、构建和 lint。

### 2026-09-09 — T13 SQLite 媒体 manifest 与项目级一致备份恢复

currentTask / 子任务：T13；SQLite 项目级媒体 manifest、项目/任务/资产元数据快照、删除后恢复和篡改拒绝已完成隔离真实验证，T13 母任务继续 `in_progress`，正式默认存储切换和外部交付验收仍不自动执行。

实际完成内容：`server/sqliteBackend.mjs` 新增项目资产读取、项目存储快照和事务恢复；恢复会精确回写项目 revision/project_versions、项目任务及其事件、项目资产元数据，不删除 shared 资产。`server/store.mjs` 暴露 SQLite 快照读取/恢复接口；`server/backup.mjs` 为 SQLite 备份写入 1.1.0 manifest，记录项目与任务文件引用、资产相对路径、字节数和 SHA-256，并在校验阶段交叉验证项目 ID/revision、任务归属、资产 metadata 与媒体文件哈希；恢复文件失败或数据库回写失败均不提交文件变更。`server/index.mjs` 的手动/自动备份现在携带 SQLite 快照，恢复路由在文件校验成功后以 SQLite 事务恢复数据库记录，并拒绝 SQLite 备份写入 JSON 存储。新增 `scripts/sqlite-backup-manifest-audit.mjs` 并纳入 `scripts/check.mjs`。

实际执行的真实验证与结果：`pnpm exec node scripts/sqlite-backup-manifest-audit.mjs`（0；隔离 SQLite 中用本机 FFmpeg 生成 2,133 字节真实 MP4，manifest 同时包含项目 revision 1、1 条任务、1 条资产 metadata 和媒体哈希；通过 HTTP 创建备份、删除项目、恢复备份后项目文档、任务状态和 MP4 字节完全恢复；篡改媒体后校验拒绝，目标目录 sentinel 保持不变）；原有 `scripts/backup-restore-audit.mjs`、`scripts/backup-http-audit.mjs`、`scripts/sqlite-production-audit.mjs` 均通过；`pnpm check`（0，138 个语法文件、83 项离线审计，含新审计）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，首屏 JS/CSS gzip 234,882 bytes）。所有审计使用隔离 `DATA_DIR`，正式 `server/data` 未被写入。

未解决问题：T13 仍未把 SQLite 设为用户正式数据目录的默认后端，未执行正式生产迁移或外部交付回放；本轮证明的是项目级备份 manifest 与 SQLite 恢复闭环，不等于真实供应商媒体、费用或安装交付已验证。T07 派生媒体/长期缓存、T14/T17 外部条件、`local_v1` 与 `api_verified_v1` 继续保持未完成。通用压缩 ZIP/Zip64 仍不在本项范围内。

数据迁移状态与回滚方式：新增的是备份 manifest 1.1.0 和运行时快照接口，无 SQLite 表结构迁移；旧 JSON 备份继续使用 1.0.0 文件清单路径。SQLite 恢复采用事务替换目标项目的 project_versions/jobs/job_events/assets，失败回滚事务；文件恢复失败或回调失败回滚 staged/rollback 文件。仍可移除 `STORAGE_BACKEND=sqlite` 回到原子 JSON，并保留 `.sqlite-migration-backup` 与 JSON 源。

任务状态：T13 的 SQLite 媒体 manifest、资产 metadata/媒体哈希一致性和项目级备份恢复子项有隔离真实证据，母任务继续 `in_progress`；T12 任务中心子项保持已验证但真实 provider 对账 pending，T07/T17 按账本状态推进，T10.1–T10.7 保持 `done`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：T07 派生媒体、代理和长期缓存生命周期，随后复核 T13 正式迁移/默认切换的交付边界。

nextAction（具体到动作或命令）：先检查 `server/cleanup.mjs`、render/proxy 输出和资产引用关系，补一条隔离项目的派生媒体生成、引用保护、陈旧缓存回收和 dry-run 边界审计；必须同时验证正式资产、任务产物和 shared voice 不被清理，再继续 `pnpm check`、`pnpm build`、`pnpm lint`。

### 2026-09-09 — T07 SQLite 派生 proxy / render 缓存生命周期

currentTask / 子任务：T07；SQLite 模式下的活动项目引用保护、当前 proxy 识别、陈旧 proxy 回收、orphan render 回收和 shared voice 边界已完成真实隔离验证，T07 母任务继续 `in_progress`，通用压缩 ZIP/Zip64 和其余外部交付条件仍未完成。

实际完成内容：`server/cleanup.mjs` 支持由维护入口传入 SQLite 活动项目 ID 和完整项目文档；`server/index.mjs` 清理接口现在从 SQLite 项目读取完整文档，并把活动后台任务所属项目加入保护集合，避免把 SQLite 模式的 render 根目录误判为 orphan。当前 proxy fingerprint 继续受保护，输入变化后的旧 proxy 按 retention 回收；不再引用项目的 render 目录仍按保留期回收，清理范围不触碰 `assets/voice-library` 等 shared 资产。新增 `scripts/sqlite-cache-lifecycle-audit.mjs` 并纳入 `scripts/check.mjs`。

实际执行的真实验证与结果：`pnpm exec node scripts/sqlite-cache-lifecycle-audit.mjs`（0；隔离 SQLite 项目生成真实 FFmpeg proxy MP4，当前 proxy 受保护、旧 fingerprint proxy 回收、orphan render 回收、shared voice 文件保持、dry-run/apply 通过）；既有 `scripts/cleanup-audit.mjs`（0；临时文件、活动分块和项目 render 保护）与 `scripts/proxy-render-audit.mjs`（0；真实代理生成、缓存、失效和回收）继续通过。随后将运行 `pnpm check`、`pnpm build`、`pnpm lint` 与 UI/性能回归。

未解决问题：T07 仍保留无压缩 ZIP/非 Zip64 的明确边界，项目包通用压缩支持和极大包端到端压力未完成；本项只证明派生媒体缓存生命周期，不将本地代理缓存等同于真实 provider 产物。T13 正式迁移/默认切换、T14/T17 外部条件、`local_v1` 与 `api_verified_v1` 继续保持未完成。

数据迁移状态与回滚方式：新增 `projectIds`/`projectDocuments` 清理输入，不改变项目或媒体 schema；回退 `server/cleanup.mjs` 与维护路由即可恢复旧清理入口。apply 仅删除 dry-run 明确列出的 dataDir 内缓存路径，活动项目/任务和 shared voice 不被删除。

任务状态：T07 的 SQLite 派生 proxy/render 引用保护、陈旧回收和 shared 资产边界有真实证据，母任务继续 `in_progress`；T10.1–T10.7 保持 `done`，T12/T13 已验证子项与真实 provider/正式交付边界按账本保留 pending。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：T07 全量回归收口，再复核 T13 正式迁移/默认切换和 T14/T17 外部验证条件。

nextAction（具体到动作或命令）：运行 `pnpm check`、`pnpm build`、`pnpm lint`、`pnpm test:ui`、`pnpm test:performance`；若全绿，检查 `docs/OPTIMIZATION_PLAN.zh-CN.md` 中 T07/T13 的剩余验收，继续处理唯一仍可在本地真实验证的可靠性缺口，不把 provider/安装等外部条件标为完成。

### 2026-09-09 — T07 派生缓存清理与全量回归收口

currentTask / 子任务：T07；SQLite 派生 proxy/render 的引用保护、陈旧回收、orphan 回收和 shared voice 边界已完成真实隔离审计；T07 母任务继续 `in_progress`，因为通用压缩 ZIP/Zip64 与最终交付矩阵仍有明确未完成项。

实际执行的命令、退出码、结果：`pnpm check`（0，139 个语法文件、84 项离线审计，含 SQLite 备份 manifest 和缓存生命周期审计）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，首屏 JS/CSS gzip 234,882 bytes）。新增 `scripts/sqlite-cache-lifecycle-audit.mjs` 和本轮 T13 `scripts/sqlite-backup-manifest-audit.mjs` 均在全量检查中通过；所有临时服务/数据目录均已清理，正式 `server/data` 未被写入。

未解决问题：T07 的项目包仍限定无压缩 ZIP，通用 deflate/Zip64 和极大包端到端空间压力未闭环；T13 正式迁移/默认切换、真实 provider/TTS/GPU/许可、T14/T17 外部条件及 `local_v1`/`api_verified_v1` 仍保持 pending。25 条 lint 警告为既有 React Hooks 依赖提示，未新增错误。

数据迁移状态与回滚方式：本轮仅扩展清理入口的项目引用输入，不改变项目/资产 schema；删除 `projectIds`/`projectDocuments` 保护扩展可回退旧清理逻辑。清理仅 apply dry-run 列出的 dataDir 内缓存路径，正式资产、活动项目/任务和 shared voice 已由隔离审计验证受保护。

任务状态：T07 派生缓存生命周期子项有真实 FFmpeg proxy 与隔离 SQLite 服务证据，母任务继续 `in_progress`；T10.1–T10.7 保持 `done`，T12/T13 已验证子项保持有效，真实 provider 和正式安装交付不标记完成。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：复核 T07/T13 剩余本地可验证边界，再推进 T14/T17 外部条件准备。

nextAction（具体到动作或命令）：检查 `docs/OPTIMIZATION_PLAN.zh-CN.md` 的 T07/T13/T14/T17 验收项，优先完成仍能在隔离环境真实验证的本地缺口；对真实供应商、费用、GPU、许可、正式安装或默认数据迁移，只记录前置条件和验证命令，不在缺少授权/环境时标记完成。

### 2026-09-09 — T22 安装环境诊断复核

currentTask / 子任务：T22；完成当前工作区的只读 doctor 复核，安装交付仍未标记完成。

实际执行的验证与结果：`pnpm doctor`（退出码 0；pnpm 11.19.0、Node.js 24.19.0、文件系统、npm registry 连通性、离线 `file:` 安装 smoke test 均通过；唯一警告为用户级 `C:\Users\33347\AppData\Local\pnpm\bin` 未加入 PATH）。本次未修改用户数据、环境变量或全局 PATH。

未解决问题：尚未在全新目标目录完成按 README 的安装/启动/升级回退全流程，PATH 警告需要用户环境决策；真实 provider、TTS/GPU/许可和 `local_v1`/`api_verified_v1` 仍保持 pending。

数据迁移状态与回滚方式：本轮无代码、数据库或用户环境写入；doctor 为只读诊断。若后续修复 PATH，应通过用户自己的 shell 配置完成，不由项目代码静默修改。

任务状态：T22 的环境诊断与离线安装 smoke test 有证据，但正式安装交付验收未完成；T07/T13/T12 的已验证子项保持有效，母任务按剩余边界继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：T22 干净路径安装/启动与升级回退演练，之后复核 T14/T17 外部验证前置条件。

nextAction（具体到动作或命令）：在不触碰正式 `server/data` 的临时目录复制源码与锁文件，执行 `pnpm install --offline`、`pnpm build`、`pnpm doctor` 和隔离服务 `/api/health` 启动检查；记录 README 步骤、失败回退和 PATH 警告，完成前不把 `local_v1` 标为通过。

### 2026-09-09 — T22 干净路径安装、构建与健康启动

currentTask / 子任务：T22；已完成临时干净路径的离线安装、生产构建、环境诊断和服务健康启动，T22 母任务仍不标记完成，升级后完整回退和最终发布材料复核还需单独确认。

实际执行的验证与结果：从当前源码复制不含 `node_modules`、`dist`、正式 `server/data`、`.env` 和日志的临时副本；执行 `pnpm install --offline --frozen-lockfile`（退出码 0，157 个包从本机内容寻址缓存复用）、`pnpm build`（退出码 0，1608 modules）、`pnpm doctor`（退出码 0，版本/文件系统/registry/离线 file 安装 smoke test 通过，仅用户级 pnpm bin PATH 警告）；随后以前台 `pnpm start` 启动隔离副本，`GET /api/health` 返回 HTTP 200，服务正常执行 SIGINT 关闭。临时目录已按已校验绝对路径删除，正式项目数据和全局 PATH 未修改。

未解决问题：尚未在全新目标机环境完成包含升级、失败回退、保留同一 `DATA_DIR` 的完整 T22 发布演练；pnpm bin PATH 警告仍由用户 shell 环境决定。真实 provider/TTS/GPU/许可验证及 `local_v1`/`api_verified_v1` 继续保持 pending。

数据迁移状态与回滚方式：本轮无正式目录写入、无数据库迁移、无全局配置变更；临时副本及其依赖、构建物和运行数据已清理。正式升级仍按 README 先备份 `DATA_DIR`，失败时恢复旧代码并复用原数据目录。

任务状态：T22 的干净路径离线安装、构建、doctor 和健康启动子项有实测证据；T07/T12/T13 已验证子项保持有效，T10.1–T10.7 保持 `done`，完整 `local_v1` 仍不宣称通过。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：复核 T14/T17 的外部验证前置条件，同时保留 T22 升级回退为发布前门禁。

nextAction（具体到动作或命令）：检查 `docs/OPTIMIZATION_PLAN.zh-CN.md` T14/T17 与 T23 条目，整理真实 API/本地 TTS/GPU/许可验证所需的授权、模型、费用和硬件条件；无授权时继续只做本地契约/错误边界审计，不触发收费调用。

### 2026-09-09 — T14/T17 无密钥真实边界审计与全量回归

currentTask / 子任务：T14、T17、T23 外部验证前置条件复核；provider 路由、契约、响应 schema、错误分类、无密钥 live 边界和本地 TTS 生命周期均已完成本地可重复审计，真实账户/硬件/许可仍不宣称通过。

实际完成内容：新增 `scripts/provider-no-key-audit.mjs` 并纳入 `scripts/check.mjs`。审计在临时 `DATA_DIR` 中清空 OpenAI、Anthropic、Gemini、DeepSeek、DashScope、ElevenLabs、Runway、自定义 OpenAI 与本地 TTS 配置，强制 `MOCK_MODE=false`，用完整故事输入调用真实 `runProvider`，同时将网络出口替换为会直接失败的守卫；确认返回 `PROVIDER_NOT_CONFIGURED`、错误指向 `OPENAI_API_KEY`、`fetchCalls=0`，且没有模拟成功表述。这样只验证本地真实性边界，不伪造供应商受理、费用或模型产物。

实际执行的命令、退出码、结果：`pnpm exec node scripts/model-route-audit.mjs`（0）；`pnpm exec node scripts/provider-contract-audit.mjs`（0）；`pnpm exec node scripts/provider-schema-audit.mjs`（0）；`pnpm exec node scripts/provider-error-audit.mjs`（0）；`pnpm exec node scripts/provider-no-key-audit.mjs`（0，live 无密钥拒绝且 0 次网络调用）；`pnpm check`（0，140 个语法文件、85 项离线审计）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，首屏 JS/CSS gzip 234,882 bytes）。临时数据目录和网络守卫均已清理，正式 `server/data` 未写入。

未解决问题：T14/T17 的真实授权路线尚未执行，仍缺用户提供的有效账户/密钥、供应商许可与预算、真实任务 ID/费用/上游取消对账；本地 IndexTTS/F5-TTS 的可移植配置和生命周期已有契约证据，但没有本机模型、GPU/CPU、驱动与实际音频生成证据。T13 正式 SQLite 默认切换/生产迁移回滚、T22 升级失败回退和 T23 完整 `local_v1` 矩阵仍保持 pending。25 条 lint 警告为既有 Hooks 依赖提示。

数据迁移状态与回滚方式：本轮仅新增离线审计脚本和文档，不改变项目/资产/SQLite schema、用户配置或正式数据；审计临时目录已删除。若后续启用真实路线，必须先由用户明确授权、预算和目标模型，再保留输入 revision、providerTaskId、产物哈希与费用来源；无授权时继续保持拒绝，不回退到 demo。

任务状态：T14/T17 的本地契约、错误和无密钥真实性边界有可重复证据，外部真实能力继续 `pending_external_verification`；T07/T12/T13/T22 已验证子项保持有效，T10.1–T10.7 保持 `done`，整体目标继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：进入 T14/T17/T23 的外部验证准备门禁，同时复核 T13 正式迁移和 T22 升级回退是否存在可在本地完成的独立缺口。

nextAction（具体到动作或命令）：先由用户提供或明确授权一组真实文本/图片/语音/视频路线的账户、模型、预算和可记录的任务范围；在此之前只运行 `pnpm check`、本地 TTS/FFmpeg 与受控 provider 契约审计，不调用收费 API、不把手动或模拟结果写为真实成功。

### 2026-09-09 — T07 标准 ZIP deflate 导入与 Zip64 边界

currentTask / 子任务：T07/T18 项目包兼容性与资源安全；标准 ZIP 的 deflate 条目已完成真实隔离验证，Zip64 因当前 500MB 包上限明确拒绝，未将拒绝能力写成支持。

实际完成内容：`server/projectPackage.mjs` 的 ZIP 生成器可构造 deflate 测试包；内存解析、文件扫描和项目包导入均支持 method 8，并在流式解压过程中校验声明的解压长度、CRC-32、SHA-256 和 1GB 总解压上限，导入仍写入自身临时目录后原子提交。标准存储条目保持兼容；Zip64 的 EOCD/尺寸/偏移占位会返回 `PACKAGE_ZIP_UNSUPPORTED`，避免把 32 位字段错误解释为有效地址。修正了损坏中央目录超长字段应返回 `PACKAGE_ZIP_INVALID` 的错误分类。新增 `scripts/project-package-deflate-audit.mjs` 并纳入 `scripts/check.mjs`。

实际执行的真实验证与结果：`pnpm exec node scripts/project-package-deflate-audit.mjs`（0；deflate ZIP 内存检查、文件流扫描、导入后 44,000 字节媒体逐字节一致，889 字节压缩包可恢复，Zip64 输入明确拒绝）；`scripts/project-package-audit.mjs`、`scripts/project-package-http-audit.mjs`、`scripts/project-package-streaming-audit.mjs`、`scripts/project-package-pressure-audit.mjs`、`scripts/project-package-disk-audit.mjs` 均通过；`pnpm check`（0，142 个语法文件、87 项离线审计）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，首屏 JS/CSS gzip 234,882 bytes）。所有临时项目包、导入目录和服务数据均已清理，正式 `server/data` 未写入。

未解决问题：Zip64 不支持是当前包上限下的明确边界，不代表可处理超过 4GB 或超过 65,535 条目的包；若未来提高 500MB 上限，必须先实现 Zip64 解析、流式解压压力和磁盘配额再改状态。T07/T18 的完整 `local_v1` 矩阵、T13 正式 SQLite 默认切换、T14/T17 真实 provider/TTS/GPU/许可和 T22 正式生产迁移仍保持 pending。

数据迁移状态与回滚方式：本轮仅修改项目包解析/导入逻辑和离线审计，不改变项目/资产/SQLite schema，也未写正式数据。若 deflate 导入中途失败，现有项目包导入流程删除自身临时文件且不提交项目/资产；回退 `server/projectPackage.mjs` 与审计脚本即可恢复旧无压缩 ZIP 行为，但不应在未验证时把 Zip64 标为支持。

任务状态：T07/T18 的标准存储与 deflate 包导入、压缩解压校验和错误边界有真实隔离证据；Zip64 继续 `unsupported-by-limit`，T07 母任务及完整 `local_v1` 继续 `in_progress`。T12/T13/T14/T17/T22 的已验证子项保持有效，真实 API/TTS/GPU/许可和正式生产迁移仍 pending。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续复核 T13 正式 SQLite 迁移/默认切换与 T22 发布回退的本地门禁，再进入 T14/T17/T23 外部授权准备。

nextAction（具体到动作或命令）：先检查迁移脚本、README 与 doctor 是否能在同一临时 `DATA_DIR` 上完成“备份→切换→健康检查→失败回退”；只在隔离目录演练并保留 JSON 源，完成前不改变正式默认后端，也不调用收费 provider。

### 2026-09-09 — T13/T22 SQLite 服务级切换与回退

currentTask / 子任务：T13/T22 正式迁移与回退门禁；同一 `DATA_DIR` 的 JSON→SQLite→JSON 服务级切换已有真实隔离证据，正式用户数据仍不自动切换。

实际完成内容：新增 `scripts/sqlite-switch-rollback-audit.mjs` 并纳入 `scripts/check.mjs`。审计在临时数据目录创建项目，先执行迁移 dry-run 和 apply，确认 `.sqlite-migration-backup` 保留；启动 JSON 后端读取项目，停止后启动 SQLite 后端从同一目录读取并更新到 revision 2；再次停止并移除 SQLite 后端开关，启动 JSON 后端读取原始项目并确认 JSON 源字节未被 SQLite 写入覆盖。各服务均通过本地 `/api/health`，无正式 `server/data` 写入。

实际执行的真实验证与结果：`pnpm exec node scripts/sqlite-switch-rollback-audit.mjs`（0；`dryRun=true`、迁移 applied、JSON 读取、SQLite 读取、SQLite revision 2 写入、JSON 回退读取、源文件和备份保留均通过）；既有 `scripts/sqlite-production-audit.mjs`（0）继续通过。临时服务、SQLite 文件、备份和数据目录均已清理。

未解决问题：这证明的是隔离目录的显式后端切换和回退，不授权把 SQLite 改成正式默认或宣称完成生产迁移；正式切换仍需用户确认停机窗口、备份位置、目标 Node 版本、磁盘/锁定策略和回退演练。T22 全新目标机安装与代码升级失败回退已有证据，但正式发布包复核、用户环境 PATH 和完整 T23 `local_v1` 矩阵仍 pending；T14/T17 真实 provider/TTS/GPU/许可也继续 pending。

数据迁移状态与回滚方式：本轮仅新增隔离服务审计和文档，不改正式数据、项目 schema 或默认 `STORAGE_BACKEND`。正式使用仍按 README 先 dry-run、复制 `DATA_DIR/.sqlite-migration-backup/`、apply 后健康检查；若回退，停止服务、移除 `STORAGE_BACKEND=sqlite` 并复用保留 JSON 源，再运行 doctor/health 检查。SQLite 侧写入不会反向覆盖 JSON 源，但两套后端不得同时写同一数据目录。

任务状态：T13 的迁移备份、SQLite 服务读写、同目录回退和源保留有真实隔离证据，正式默认切换保持 `pending-user-confirmation`；T22 的升级回退子项有实测证据。整体目标继续 `in_progress`，真实 API/TTS/GPU/许可与完整 local_v1 不标记完成。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：复核 T22 发布材料、README/doctor 的路径与回退说明，并继续进入 T14/T17/T23 外部验证准备门禁。

nextAction（具体到动作或命令）：在不改变正式数据的前提下检查发布包排除清单、README 命令与 doctor 输出是否一致；若无新的本地缺口，继续等待用户授权的真实 provider/TTS 验证条件，不调用收费 API。

### 2026-09-09 — T22 可分享源码发布包与干净交付验证

currentTask / 子任务：T22 发布材料与干净交付；已提供可重复的源码发布包生成入口，并完成发布包排除清单、离线安装、构建和 doctor 实测，正式发布与用户目标机回放仍不宣称完成。

实际完成内容：新增 `scripts/create-release-package.mjs` 和 `pnpm release:package`。生成器拒绝覆盖已有输出目录，排除 `node_modules`、`dist`（可用 `--include-dist` 显式包含）、`dist-demo`、`.env`（保留 `.env.example`）、`server/data`、`.local-baseline-*`、`.dsh-vision-router`、release/artifacts、缓存、历史 SQLite 迁移备份、日志、`.part/.err/.out` 临时文件，输出 `release-manifest.json`，记录 217 个源码文件的相对路径、字节数、SHA-256 和总大小。修复审计中发现的历史基线目录泄漏风险，并将命令与排除规则写入 README。新增 `scripts/release-package-audit.mjs`，验证清单没有敏感/用户数据，再在临时发布目录执行离线依赖安装、生产构建和 doctor。

实际执行的真实验证与结果：`pnpm exec node scripts/release-package-audit.mjs`（0；`manifestFiles=217`、`forbiddenFiles=0`、离线安装/构建/doctor 均通过、运行时只允许空 `server/data`）；`node scripts/create-release-package.mjs --output <临时目录>`（0；CLI 生成 manifest，临时目录已清理）；`pnpm check`（0，145 个语法文件、89 项离线审计）；发布包中的 `pnpm install --offline --frozen-lockfile`（0）、`pnpm build`（0，1608 modules）和 `pnpm doctor`（0）。本轮临时发布目录、依赖和运行数据均已清理，正式 `server/data` 未写入。

未解决问题：当前证据是源码发布目录和本机离线缓存上的安装回放，不等于已生成安装程序或已在全新目标机/用户权限环境完成发布；pnpm bin PATH 警告仍由用户 shell 决定。T22 的升级失败回退已有同一 `DATA_DIR` 隔离实测，但正式目标机升级窗口、签名/安装器、完整 T23 `local_v1` 矩阵和 T14/T17 真实 provider/TTS/GPU/许可仍 pending。

数据迁移状态与回滚方式：本轮只新增发布脚本、README 和审计，不改变项目/资产/SQLite schema、默认存储或用户环境；生成器不会覆盖已有目录，失败时输出目录可直接删除，正式数据完全不在发布包中。接收方失败回退按 README 停止服务、保留同一 `DATA_DIR`、恢复旧代码并执行 doctor/health；未授权时不触发真实 provider。

任务状态：T22 的可分享源码包、敏感/用户数据排除、清单哈希、离线安装、构建和 doctor 子项有真实隔离证据；正式安装器/目标机发布仍保持 `pending`。T07/T12/T13/T14/T17 的已验证子项保持有效，整体目标继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：复核 T22 发布包在 README/doctor/启动路径的最终一致性，然后进入 T14/T17/T23 外部授权准备门禁。

nextAction（具体到动作或命令）：运行 `pnpm lint`、`pnpm test:ui`、`pnpm test:performance` 做最终前端回归；确认无新增错误后，只等待真实 provider/TTS 验证所需的授权、模型、预算和硬件，不调用收费 API。

### 2026-09-09 — T22/T07 最终构建与回归收口

currentTask / 子任务：T22/T07/T18 本地交付回归；发布包、deflate 项目包、SQLite 切换回退和无密钥真实性边界均已纳入检查并完成最终构建回归，整体目标继续 `in_progress`。

实际完成内容：最终工作树确认 `pnpm build`、`pnpm lint`、`pnpm test:ui`、`pnpm test:performance` 均可执行；前端构建保持 1608 modules，UI 审计保持 10 项通过，首屏 JS/CSS gzip 保持 234,882 bytes，lint 仍为 0 errors 和 25 条既有 React Hooks 依赖 warnings。全量 `pnpm check` 已包含 89 项离线审计：项目包 deflate/Zip64 边界、发布包敏感文件排除与离线安装、SQLite 服务切换回退、升级失败回退及 provider 无密钥拒绝均通过。

实际执行的命令、退出码、结果：`pnpm check`（0，145 个语法文件、89 项离线审计）；`pnpm build`（0，1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，首屏 JS/CSS gzip 234,882 bytes）。最终未发现审计进程或新增发布/SQLite/deflate 临时目录；正式 `server/data` 未写入，之前 CLI 发布包测试目录已按已校验绝对路径清理。

未解决问题：完整 T23 `local_v1` 仍未在人工无人值守矩阵中通过；`api_verified_v1` 仍缺真实账户、密钥、模型权限、预算、任务 ID、产物和费用/取消对账；本地 TTS/GPU/许可实机验证未完成。SQLite 正式默认切换、安装器/签名和全新目标机发布仍需用户决策或环境条件；Zip64 在 500MB 上限下明确不支持。25 条 Hooks warnings 尚未逐项收口。

数据迁移状态与回滚方式：本轮最终回归不改变正式数据或 schema。项目包导入、发布包生成、SQLite 切换和升级回退演练均使用临时目录；正式操作仍需先备份 `DATA_DIR`，SQLite 失败时移除显式开关回到保留 JSON 源，代码升级失败时恢复旧发布目录并复用同一 `DATA_DIR`。

任务状态：T07/T13/T18/T22 的本地可靠性、备份恢复、缓存保护、ZIP deflate、发布包和回退子项已有真实隔离证据；T12 已验证任务中心/worker 子项保持有效；T14/T17 外部真实能力和 T23 完整交付门禁保持 pending。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：进入 T14/T17/T23 外部验证准备门禁；若外部条件仍未授权，继续保持无密钥拒绝和本地手动路线，不把模拟/手动结果写成真实 API 成功。

nextAction（具体到动作或命令）：等待用户明确授权的真实文本/图片/语音/视频路线、模型、预算和记录范围；条件满足后再执行 `test:e2e:live` 前置检查与限额短样例，否则继续运行现有 `pnpm check` 和本地 FFmpeg/TTS/存储审计，不触发收费调用。

### 2026-09-09 — T17 F5-TTS 回环协议回退与 live WAV 资产闭环

currentTask / 子任务：T17/T23 本地交付门禁；复核本地 TTS 服务管理器与桥接协议的一致性，整体目标继续 `in_progress`。

实际完成内容：发现并修复 `server/localTtsManager.mjs` 的 F5-TTS 探测缺口：默认健康地址 `/api/status` 不存在时，现按配置顺序回退到 `/health`，仅在状态接口确实返回非 ready 时保留模型加载状态。这样与 `scripts/local_tts_bridge.py --engine f5-tts` 公开的 `/health` 合约一致，不再把已启动的官方桥接误判为离线并等待超时。新增 `scripts/local-tts-provider-audit.mjs` 并纳入 `scripts/check.mjs` 与 `pnpm test:tts-provider`：在隔离 `DATA_DIR` 中生成真实 WAV 参考音频，由本机回环假桥接校验 `engine/language/referenceAudio/referenceText/text`，返回真实 WAV 字节，经 live provider schema、媒体探测和资产登记后再核对路由执行记录。测试没有访问公网、没有读取真实音色库，也没有把假桥接写成真实模型验证。

实际执行的命令、退出码、结果：首次 `pnpm test:tts-provider`（1，按实际 voice prompt contract 报缺少 `scene`，未修改生产代码）；补齐审计输入后再次 `pnpm test:tts-provider`（0，F5 默认 `/api/status`→`/health` 回退，`/api/tts` 1 次，返回 25,678 字节 WAV、0.8 秒，生成资产 `probeStatus=passed`）；`pnpm exec node scripts/local-tts-config-audit.mjs`（0）；`pnpm exec node scripts/local-tts-lifecycle-audit.mjs`（0）；`pnpm exec node scripts/local-tts-queue-audit.mjs`（0）；`pnpm exec node scripts/local-tts-start-error-audit.mjs`（0）；`pnpm exec node scripts/voice-sample-audit.mjs`（0）；`pnpm exec node scripts/voice-line-stale-audit.mjs`（0）；全量 `pnpm check`（0，146 个语法文件、90 项离线审计）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm build`（0，1608 modules）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，首屏 JS/CSS gzip 234,882 bytes）。相关隔离进程和本轮临时目录已清理，正式 `server/data` 未写入。

未解决问题：本轮证明的是本地 TTS HTTP 协议、授权参考音频、返回 WAV 与资产登记的真实软件闭环，不证明 IndexTTS/F5-TTS 模型权重、CUDA/GPU、驱动、音质或商业许可；这些仍需本机条件。完整 T23 `local_v1` 无人工无人值守矩阵、多标签普通保存最终回归、真实 provider 受理/费用/取消对账、SQLite 正式默认切换、安装器签名和目标机发布仍 pending；Zip64 在 500MB 上限下明确不支持；25 条 Hooks warnings 尚未逐项收口。

数据迁移状态与回滚方式：本轮只修改本地 TTS 探测回退、审计脚本、检查清单、package script 和账本；审计数据及 WAV 均在临时目录，正式项目/配置/数据库未迁移。若回退，恢复 `server/localTtsManager.mjs` 的前一版本并移除新增审计入口即可；外部已启动服务不由本项目停止，托管服务仍通过 PID/startToken 和 busy 保护管理。

任务状态：T17 本地配置、托管生命周期、队列互斥、启动错误、样音质量、逐句 stale 以及 F5 `/health` 回退和 live WAV 资产登记均有可重复隔离证据；真实 TTS/GPU/许可保持 `pending_external_verification`。T07/T12/T13/T18/T22 已验证子项保持有效，T23 与整体目标继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：复核 T22 发布/安装交付门禁，并继续保持 T14/T17 外部真实验证待授权；浏览器任务中心恢复、取消/重试、双标签冲突和项目包空实例导入已补齐，但完整 `local_v1` 仍不能标记通过。

nextAction（具体到动作或命令）：新增一个隔离的 `local-v1-acceptance-audit.mjs`，只使用 FFmpeg 合成媒体和临时 `DATA_DIR`，串联现有时间线编辑/渲染、SRT、项目包导入、重启恢复和结果 ffprobe 校验；完成后运行 `pnpm check`、`pnpm build`，并据综合证据决定是否仍保持 `local_v1=pending`。

### 2026-09-09 — T23 local_v1 综合隔离验收夹具

currentTask / 子任务：T23 local_v1 本地可执行门禁；综合夹具已完成并通过，整体目标继续 `in_progress`。

实际完成内容：新增 `scripts/local-v1-acceptance-audit.mjs` 并纳入 `scripts/check.mjs` 与 `pnpm test:local-v1`。审计只在两个临时 `DATA_DIR` 中用 FFmpeg 生成红/绿/蓝三段真实 MP4、语音与音乐 WAV，使用真实 `executeEditingPlan` 执行源入点/修剪、拆分、变速、空隙、静音、音量、响度和字幕操作；随后完成 16:9/24fps 的音画字幕成片和 ffprobe，导出项目包到空目录并核对媒体字节与相对资产引用，再通过隔离服务切换为 9:16/30fps 重新渲染，最后提交 12 片段后台任务、停止服务、以新端口重启并确认任务恢复为 SUCCEEDED，恢复下载的 MP4 同时含视频/音频流。审计脚本自身的两次失败也已按真实错误修正：第一次等待旧 Windows 端口释放造成连接拒绝，第二次误把源目录 URL 用于目标目录恢复夹具导致服务正确报 ENOENT；修复后未放宽任何生产门禁即通过。

实际执行的命令、退出码、结果：首次 `pnpm test:local-v1`（1，发现审计重启端口竞态，临时目录已清理）；第二次 `pnpm test:local-v1`（1，发现恢复夹具错误混入源资产 URL，服务正确拒绝，临时目录已清理）；修复后 `pnpm test:local-v1`（0；编辑 6 项，源成片 16:9/24，目标成片 9:16/30，项目包迁移/字节保持，重启恢复 SUCCEEDED，输出 138,397 字节且含视频/音频）；最终 `pnpm check`（0，147 个语法文件、91 项离线审计）。此前同一工作树最终回归的 `pnpm build`（0，1608 modules）、`pnpm lint`（0 errors、25 个既有 React Hooks warnings）、`pnpm test:ui`（0，10 项）和 `pnpm test:performance`（0，首屏 JS/CSS gzip 234,882 bytes）保持有效。全部当前综合夹具服务、数据目录和输出已清理，正式 `server/data` 未写入。

未解决问题：该综合夹具证明本地可执行服务闭环，但不等于人工浏览器无人值守矩阵全部通过；多标签普通保存最终回归、真实 TTS 模型/GPU/音质/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换、安装器签名和新目标机发布仍 pending。`api_verified_v1` 继续 pending_external_verification，Zip64 在 500MB 上限下明确不支持，25 条 Hooks warnings 尚未逐项收口。

数据迁移状态与回滚方式：本轮只新增综合离线审计、检查入口和文档；项目包导入、服务重启、渲染产物和数据均位于临时目录，正式项目与用户媒体未迁移。若审计代码需要回退，移除 `local-v1-acceptance-audit.mjs` 的检查入口即可；生产代码未改变数据 schema。正式发布仍先备份 `DATA_DIR`，升级失败恢复旧代码并复用同一数据目录。

任务状态：T23 的本地时间线编辑→真实 MP4、画幅/帧率、项目包迁移、空目录媒体保持和后台重启恢复已有综合实测；`local_v1` 因完整浏览器/人工矩阵仍保持 `pending`，不可把综合夹具结果扩大解释为最终交付通过。T17 的 F5 `/health` 回退及 live WAV 软件闭环、T07/T12/T13/T18/T22 已验证子项保持有效。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 本地浏览器最终门禁中仍可独立完成的多标签保存、刷新/取消/重新打开任务中心和项目包下载操作；若浏览器矩阵无新增缺口，再整理正式安装/升级回退发布复核，外部真实能力继续单独等待授权。

nextAction（具体到动作或命令）：在隔离服务上执行一次浏览器 `local_v1` 矩阵，至少覆盖两标签 revision 冲突、页面刷新恢复任务、取消/重试、SRT 下载和项目包下载后空目录导入；仅断言实际项目/任务/媒体结果，并把浏览器证据与失败项追加到 `docs/RELEASE_ACCEPTANCE_2026-09-08.md`，不运行 `test:e2e:live`。

### 2026-09-09 — T23 浏览器 local_v1 增量矩阵与项目包导入

currentTask / 子任务：T23 本地浏览器最终门禁；任务中心持久化、取消/重试、真实 MP4 下载、双标签 revision 冲突和项目包空实例导入均完成真实隔离验证，`local_v1` 仍不扩大标记为最终交付通过。

实际完成内容：在临时 `DATA_DIR` 和本地 in-app Browser 上打开含 36 个真实时间线片段的项目。任务中心刷新后显示服务端提交的 RUNNING render job；刷新页签并重新打开任务中心后，任务仍被服务端恢复并最终显示 SUCCEEDED/100%。通过浏览器任务卡执行取消，状态显示 CANCELLED 和“渲染已取消”；再点“重试”后显示 PENDING/0%，最终恢复为 SUCCEEDED。点击“下载成片”得到“最近一次真实 MP4 成片已下载”反馈，点击“下载可移植项目包”得到“项目包已下载”反馈；对应成片 HTTP HEAD 为 200、`video/mp4`、1,032,991 字节。两个标签页均从同一 revision=1 打开项目，第一标签页保存位置 X=100 后第二标签页以旧 revision 保存位置 X=200，真实出现“项目有新的服务端版本”冲突对话框；选择“保留本地副本”后第二页显示“仅本地”、值保持 200，服务端仍为 revision=2、位置 X=100，未被静默覆盖。

项目包导入在第二个空数据目录的真实浏览器实例中完成：源实例项目包大小 1,588 字节；目标服务原本无项目，使用文件选择器导入后页面显示“共 1 个”、项目《浏览器项目包源》，目标 `GET /api/projects` 也只返回该 1 个导入项目。导入前后临时服务均用 `pnpm start` 实际启动，验证结束后停止并删除了已校验的临时服务目录、包文件和浏览器标签页。

实际执行的验证与结果：浏览器 in-app Browser（0，任务中心 RUNNING→刷新/重开后 SUCCEEDED、UI CANCELLED→PENDING→SUCCEEDED、成片/项目包下载反馈、双标签冲突保护）；临时源服务 `GET /api/projects/browser-package-source/package`（200，1,588 字节 ZIP）；目标服务浏览器文件导入（201，目标项目列表 1 项）；目标 `GET /api/projects`（200，导入项目 1 项）；隔离服务关闭后临时目录存在性均为 false。此前同一工作树 `pnpm test:local-v1`（0）和最终 `pnpm check`（0，147 个语法文件、91 项离线审计）保持有效；本轮未写入正式 `server/data`。补充记录：服务重启后对“再次导出真实 MP4”按钮做了多次浏览器点击，未观察到新增 `/api/render/jobs` 任务；随后用 HTTP 只提交隔离夹具任务，验证了任务中心本身的刷新、重开、取消、重试和下载。该按钮的直接 UI 提交链路因此不标完成，待下一轮带请求级证据复现/修复。

未解决问题：本轮只覆盖浏览器可执行的核心增量门禁；尚未形成完整浏览器无人值守矩阵（全部编辑工具、字幕导出文件内容、媒体上传/恢复、不同浏览器视口和长时任务压力）及全新目标机安装器回放，因此 `local_v1` 继续保持 `pending`。服务重启后“再次导出真实 MP4”直接按钮未产生可观察的新任务，需继续检查按钮事件/预检状态/请求链路，不能以 HTTP 夹具替代；真实 TTS 模型/GPU/音质/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换、安装器签名和 Zip64 仍未验证；25 条 Hooks warnings 仍为既有提示。停止隔离服务时服务端日志出现第二标签旧 revision 的预期 `项目版本冲突`，与页面已展示的冲突保护一致，不是数据覆盖。

数据迁移状态与回滚方式：本轮只做浏览器和隔离 HTTP 服务验证，没有修改正式项目、资产、schema 或用户配置；所有导入、render 产物和下载包均位于临时目录并已删除。若复现失败，保留源项目和目标空目录即可重跑；正式项目包导入仍使用校验后原子导入，冲突时默认 copy，不覆盖现有项目。正式升级/存储切换仍先备份 `DATA_DIR`，失败时恢复旧代码并回到保留 JSON 源。

任务状态：T23 的浏览器任务中心服务端恢复、取消/重试、真实 MP4 下载、项目包下载与空目录文件导入、双标签冲突不覆盖均有实际证据；完整 `local_v1` 仍保持 `pending`，整体目标继续 `in_progress`。T07/T12/T13/T17/T18/T22 已验证子项保持有效，外部真实 provider/TTS/GPU/许可仍 `pending_external_verification`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：复核 T22 发布/安装交付门禁，并继续等待 T14/T17 外部真实验证授权；不运行收费 API，不把回环桥接或手动结果写成真实供应商成功。

nextAction（具体到动作或命令）：复现并修复/验证剪辑台“再次导出真实 MP4”的直接 UI 请求链路，增加请求级或任务 ID 证据后再补浏览器矩阵；随后运行 `pnpm check`、`pnpm build`、`pnpm lint`、`pnpm test:ui`、`pnpm test:performance`，继续保留 `local_v1=pending`。

### 2026-09-09 — T23 浏览器矩阵后的全量回归

currentTask / 子任务：T23 浏览器增量门禁回归；文档与验收记录已同步，未发现新代码回归，整体目标继续 `in_progress`。

实际执行的命令、退出码、结果：`pnpm check`（0，147 个语法文件、91 项离线审计）；`pnpm build`（0，Vite 5.4.19、1608 modules）；`pnpm lint`（0 errors、25 个既有 React Hooks warnings）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，初始 JS/CSS 828,713 bytes、gzip 234,882 bytes，低于 1.5MB 目标）。全量检查再次覆盖项目包 deflate/Zip64 边界、SQLite/JSON 切换回退、发布包离线安装、无密钥 provider、本地 TTS 回环、local_v1 综合夹具和后台任务审计。

未解决问题：本轮没有新的生产代码修改；`local_v1` 仍因完整浏览器无人值守矩阵、全新目标机安装器/签名回放等未全部具备而保持 pending。真实 provider 受理/费用/取消对账、本地 TTS 模型/GPU/音质/许可、SQLite 正式默认切换和 Zip64 继续未验证；25 条 Hooks warnings 保持既有状态。

数据迁移状态与回滚方式：只更新账本/验收报告，正式 `server/data`、schema、用户配置和媒体均未写入；回归使用的构建输出可由 `pnpm build` 覆盖重建，隔离服务和临时导入目录已清理。正式升级仍按 README 先备份 `DATA_DIR`，失败恢复旧代码并复用原数据目录。

任务状态：本轮浏览器增量证据与五项回归均真实通过；不把回归绿灯扩大解释为完整交付，T23、T14/T17 外部验证、T22 安装器/目标机发布继续保持未完成或待外部条件。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：复核 T22 发布/安装材料的一致性；若无新的本地缺口，进入外部授权等待，不调用收费 provider。

nextAction（具体到动作或命令）：保留 `local_v1=pending`、`api_verified_v1=pending_external_verification`、`hosted_v2=not_requested`；下一轮先检查 README、release manifest、doctor 与升级回退说明是否仍一致，或在用户明确提供真实账户/模型/预算/硬件后再执行限额短样例。

### 2026-09-09 — T23 导出弹窗可达性与真实按钮提交闭环

currentTask / 子任务：T23 本地浏览器交付门禁；修复导出弹窗在桌面视口下底部真实 MP4 操作不可达的问题，并完成直接按钮提交、成片和任务中心回收验证，整体目标继续 `in_progress`。

修复前行为与复现：`.export-modal` 在桌面端没有最大高度或内部滚动；弹窗内容超过 720px 视口时，“再次导出真实 MP4”虽存在于 DOM，但实际点击位置落在视口外，导致浏览器矩阵无法把该按钮的请求链路作为真实证据。此前因此只记录了 HTTP 夹具，未把直接按钮标为完成。

实际完成内容：新增 `src/modalOverrides.css` 并在 `src/main.jsx` 引入，为导出弹窗增加 `max-height: calc(100dvh - 24px)` 与 `overflow-y: auto`；保留 `mergeRenderJob`，使直接提交后的任务及轮询状态立即合并到任务中心和导出历史，而不是等待下一次手动刷新。没有改变任务状态机、幂等键、渲染参数或正式数据结构。

实际执行的真实验证与结果：隔离 `DATA_DIR`、真实 FFmpeg 3 秒 MP4 和本地服务 4299 上，重新加载生产构建后浏览器检测到弹窗 `clientHeight=694`、`scrollHeight=863`、`overflow=auto`；通过真实 UI 点击“再次导出真实 MP4”创建新任务 `render-render-ui-repro-1788933429947-tm5q6s`，页面显示“后台任务已受理”，任务从 PENDING/0% 进入 SUCCEEDED/100%，浏览器自动下载成片并关闭弹窗。随后点击“任务中心”，无需手动刷新即显示该新任务及旧任务；服务端 `GET /api/jobs?projectId=render-ui-repro` 返回新任务 SUCCEEDED，成片 HEAD 为 HTTP 200、`video/mp4`、5,499 字节。`pnpm check`（0，147 个语法文件、91 项离线审计）；`pnpm build`（0，1609 modules transformed）；`pnpm lint`（0 errors、25 条既有 Hooks warnings）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，初始 JS/CSS 828,901 bytes、gzip 234,946 bytes）。

未解决问题：该修复完成了直接真实 MP4 按钮的本地浏览器证据，但不等于完整 `local_v1` 通过；全部编辑工具、字幕文件内容、媒体上传/恢复、不同视口/压力、全新目标机安装器与签名仍未形成完整矩阵。真实 TTS 模型/GPU/音质/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换和 Zip64 仍保持未验证；25 条 Hooks warnings 为既有提示。

数据迁移状态与回滚方式：本轮只修改前端样式引入、导出任务状态的前端合并逻辑和账本；隔离服务、MP4、任务与成片均位于临时目录，正式 `server/data` 未写入。若需回退，移除 `src/modalOverrides.css` 引入及 `mergeRenderJob` 调用/定义即可；正式项目、schema、用户配置和媒体不受影响。

任务状态：T23 直接按钮提交、真实渲染、自动下载和无需刷新任务中心收录已有真实浏览器证据；`local_v1` 继续保持 `pending`，`api_verified_v1` 继续 `pending_external_verification`，整体目标继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：复核 T22 发布/安装交付材料的一致性，再处理仍可在本地独立完成的 T23 浏览器覆盖；外部真实能力继续等待授权，不调用收费 provider。

nextAction（具体到动作或命令）：检查 README、release manifest、doctor 与升级回退说明的路径/命令一致性；若发现本地缺口，使用隔离 `DATA_DIR` 修复并真实验证，否则保持上述 pending 边界并等待明确账户、模型、预算和硬件条件。

### 2026-09-09 — T22 发布路径一致性复核

currentTask / 子任务：T22/T23 本地交付复核；完成 README、发布包生成器、doctor 和升级回退说明的命令/路径一致性检查，未发现新的本地阻断，整体目标继续 `in_progress`。

实际完成内容：核对 README 中的 `pnpm run doctor`、`pnpm start`、`DATA_DIR`、`STORAGE_BACKEND`、`pnpm migrate:sqlite`、`pnpm release:package`、无密钥手动路线及升级回退说明，与 `scripts/doctor.mjs`、`scripts/create-release-package.mjs` 和现有启动入口一致；新增加的 `src/modalOverrides.css` 已被发布包纳入，未改变排除用户数据/凭据/缓存/日志的边界。

实际执行的命令、退出码、结果：`pnpm doctor`（0；pnpm 11.19.0、Node 24.19.0、文件系统、离线 file 安装通过，仅有用户级 pnpm bin 未加入 PATH 的既有警告）；`pnpm exec node scripts/release-package-audit.mjs`（0；清单 220 个文件、0 个敏感/用户数据文件、离线安装/build/doctor 通过）；此前本轮 `pnpm check`（0，147 个语法文件、91 项离线审计）和 `pnpm build`（0，1609 modules transformed）已覆盖新增样式与发布清单。

未解决问题：没有新的本地修复项。正式安装器/签名/全新目标机发布仍未完成；完整 T23 浏览器矩阵仍缺全部编辑工具、字幕文件内容、媒体上传恢复、不同视口/压力等项目级覆盖。真实 TTS 模型/GPU/音质/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换和 Zip64 仍保持未验证；25 条 Hooks warnings 仍未逐项收口。

数据迁移状态与回滚方式：本轮只读检查和隔离发布包回放，没有写入正式 `server/data`、用户配置或项目 schema；发布包输出和依赖均在脚本临时目录内并已清理。正式升级仍需先备份 `DATA_DIR`，失败时停止服务、恢复旧代码、复用同一数据目录，再执行 doctor/health；SQLite 仍必须显式启用，失败时回到保留 JSON 源。

任务状态：T22 源码发布包、排除清单、离线安装、doctor、README 路径说明和升级回退说明已有实测一致性；正式安装器/目标机交付继续 `pending`。T23 直接真实 MP4 UI 提交及任务中心自动收录已验证，但 `local_v1` 继续 `pending`，`api_verified_v1` 继续 `pending_external_verification`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 本地浏览器覆盖中仍可独立验证的字幕下载内容、媒体上传/恢复和更多编辑操作；保持真实外部能力等待授权。

nextAction（具体到动作或命令）：在新的隔离 `DATA_DIR` 启动本地服务，使用真实 FFmpeg 媒体通过浏览器导入并捕获 SRT/项目包下载内容，核对下载字节与服务端资产/项目结果；完成后再运行相关回归并更新本账本，不能只凭 toast 标记通过。

### 2026-09-09 — T23 浏览器字幕、媒体恢复与剪辑增量验证

currentTask / 子任务：T23 本地浏览器交付门禁；完成隔离 SQLite 项目的真实媒体导入、刷新/服务重启恢复、字幕编辑与 SRT 导出反馈、修剪和拆分持久化，整体目标继续 `in_progress`。

实际完成内容：在新隔离 `DATA_DIR` 中用真实 FFmpeg 4 秒 MP4 建立项目并加入字幕轨道。浏览器通过“导入视频 / 音频 / 图片”选择真实 `fixture.mp4`，页面显示已导入，服务端登记 118,816 字节媒体；修改双行中文字幕并确认校时，真实保存为 `status=synced`；导出中心点击“下载字幕 SRT”显示“已导出 1 条字幕 SRT”，从持久化项目重新生成的 SRT 内容为 `00:00:00,750 --> 00:00:02,250`、双行文本。随后浏览器执行修剪出点与拆分，服务端 revision=7，两个视频片段各 1.75 秒。停止并重启同一 SQLite 服务后，浏览器重新打开项目仍显示 `fixture.mp4`、字幕文本、字幕轨和已保存状态。

实际执行的命令、退出码、结果：隔离 `pnpm exec node scripts/browser-recovery-setup.mjs <temp>`（0，真实 MP4 118,816 字节、probe passed）；浏览器 in-app Browser（0，真实文件导入、字幕确认、SRT 导出反馈、修剪/拆分交互）；服务端 `GET /api/projects/browser-recovery`（重启前后 revision=7，字幕内容和 `synced` 保持、视频片段 2 个且均 1.75 秒）；媒体 HEAD（200，`video/mp4`，118,816 字节）；`node --input-type=module -e ... buildSrt(...)` 输出了实际持久化时间码与双行中文内容。隔离服务退出后已删除临时目录，端口 4301 不再监听；未写入正式 `server/data`。

未解决问题：浏览器下载事件对 Blob URL 未返回可读取的本地文件句柄，因此本轮对 SRT 的强证据是浏览器真实导出反馈加持久化时间线经同一 `buildSrt` 生成的完整内容，仍未宣称已读取浏览器下载文件本身。完整 T23 矩阵仍缺全部编辑工具、媒体断点上传/取消、不同视口/压力和全新目标机安装器/签名回放；真实 TTS 模型/GPU/音质/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换和 Zip64 继续保持未验证；25 条 Hooks warnings 仍存在。

数据迁移状态与回滚方式：本轮仅使用隔离 SQLite 数据目录和真实测试媒体；重启验证读取同一数据库，之后已关闭服务并删除临时目录。正式项目、资产、schema 和配置未迁移；若需回退，本轮没有生产数据变更，正式升级仍按 README 先备份 `DATA_DIR`，SQLite 失败回到保留 JSON 源。

任务状态：T23 的真实媒体导入/资产登记、刷新与服务重启恢复、字幕编辑确认、SRT 生成反馈、修剪和拆分浏览器交互已有证据，但 `local_v1` 继续保持 `pending`，`api_verified_v1` 继续 `pending_external_verification`，整体目标继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 可本地独立验证的媒体断点上传/取消恢复和剩余编辑操作；保持外部 provider/TTS/GPU/许可 pending，不调用收费服务。

nextAction（具体到动作或命令）：在隔离服务上用浏览器导入第二个真实媒体并制造上传中断，确认取消清理与再次导入后的资产/时间线状态；随后执行 `pnpm check`、`pnpm build` 并更新本账本，未取得下载文件内容前不把 SRT 下载文件读取标为完成。

### 2026-09-09 — T23 增量矩阵回归确认

currentTask / 子任务：T23 本地浏览器交付门禁；字幕、媒体恢复、修剪/拆分验证后完成全量离线检查与生产构建回归，整体目标继续 `in_progress`。

实际执行的命令、退出码、结果：`pnpm check`（0，147 个语法文件、91 项离线审计，包含真实 FFmpeg 成片、媒体/项目包、任务恢复、SQLite/JSON、无密钥 provider、F5-TTS 回环和 local_v1 综合夹具）；`pnpm build`（0，Vite 5.4.19，1609 modules transformed）。本轮浏览器隔离服务已关闭，临时 `DATA_DIR` 已删除，端口 4301 不再监听；正式 `server/data` 未写入。

未解决问题：不把 Blob URL 的浏览器 SRT 下载事件超时扩大解释为文件内容已读取；媒体断点上传/取消、多视口/压力、全部编辑工具和正式安装器/签名仍待验证。真实 TTS 模型/GPU/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换和 Zip64 仍保持 pending；25 条 Hooks warnings 仍存在。

数据迁移状态与回滚方式：本轮只有隔离 SQLite 项目被导入、修改和删除，回归脚本及构建不改正式数据。正式升级和存储切换继续按 README 先备份 `DATA_DIR`，失败时恢复旧代码并回到保留 JSON 源。

任务状态：新增浏览器媒体导入/重启恢复、字幕编辑/SRT 生成反馈、修剪和拆分证据，并完成 check/build 回归；`local_v1` 仍为 `pending`，`api_verified_v1` 仍为 `pending_external_verification`，整体目标继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 可本地独立验证的媒体断点上传/取消恢复与更多编辑操作；外部真实能力不调用，等待明确授权。

nextAction（具体到动作或命令）：在隔离服务上用浏览器从真实大文件上传路径触发中断/取消，再确认临时分片清理、再次导入、资产登记和刷新恢复；仅在观察到服务端文件与项目状态后更新验收结论。

### 2026-09-09 — T23 浏览器大文件上传取消与恢复闭环

currentTask / 子任务：T23 本地浏览器交付门禁；把媒体上传取消能力接入剪辑台真实按钮，并完成浏览器大文件取消、服务端临时分片清理、再次导入、资产探测和刷新恢复验证；整体目标继续 `in_progress`。

实际完成内容：`src/workflow.js` 的 `uploadProjectMedia` 现在接受 `AbortSignal` 与进度回调；客户端中断或三次重试后的终态错误都会调用服务端 `DELETE /api/assets/media?uploadId=...` 清理临时分片，再抛出原始错误，不登记半成品资产。`src/main.jsx` 为素材导入创建独立 `AbortController`，导入按钮在进行中切换为可点击的“取消媒体导入”，取消后显示清理反馈；成功导入仍把真实探测结果和结构化关联清单写回项目。新增 `scripts/media-upload-cancel-audit.mjs`，用真实 FFmpeg MP4、真实隔离服务和 8MB 分块验证取消前第一块已入服务、取消状态 404、`.part` 清理以及取消后再次导入的 `probeStatus:passed`。

实际执行的命令、退出码、结果：`pnpm test:upload-cancel`（0；`cancelledUpload=true`、`firstChunkAccepted=true`、`cancelledStatus=404`、`partialFilesClean=true`、`reimported=true`、`probeStatus=passed`）；`pnpm check`（0，148 个语法文件、92 项离线审计，发布清单 221 个文件且 0 个禁入文件）；`pnpm build`（0，Vite 5.4.19、1609 modules transformed）；`pnpm lint`（0 errors、25 条既有 React Hooks warnings）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，初始 JS/CSS 829,721 bytes、gzip 235,197 bytes，低于 1.5MB 目标）。

浏览器/渲染/接口证据：在隔离 `DATA_DIR` 与 in-app Browser 上选择真实 112,745,960 字节、8 秒、1280×720 H.264 MP4，实际看到按钮变为“取消媒体导入”并点击；页面显示“媒体导入已取消，临时分片已清理”。随后检查服务端数据目录无 `.part`，再次导入真实 12,561,319 字节 MP4，项目 `localMedia` 从 1 条变为 2 条，最新资产 `probeStatus=passed`、duration=8、HEAD 为 200 / `video/mp4` / 12,561,319 字节；刷新页面后仍恢复编辑器与 2 条媒体记录，浏览器错误日志为空。隔离端口 4311 已停止，临时服务/媒体/数据目录已删除，正式 `server/data` 未写入。

未解决问题：浏览器大文件取消/再次导入/刷新恢复已取得证据，但完整 T23 仍不通过；SRT Blob 下载尚未取得浏览器可读取的文件句柄，全部编辑工具、多视口/压力、全新目标机安装器/签名回放仍未完成。真实 TTS 模型/GPU/音质/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换和 Zip64 继续保持未验证；25 条 Hooks warnings 仍未逐项收口。取消审计使用受控隔离服务，不代表上游 provider 取消或费用对账已验证。

数据迁移状态与回滚方式：本轮只使用临时 `DATA_DIR`；没有迁移或修改正式 JSON/SQLite 数据。生产回滚可回到 `src/workflow.js` 的兼容调用（新增 options 为可选），或按 README 保留 `DATA_DIR`、停服务后恢复旧代码；取消操作只删除对应 `uploadId` 的临时 `.part`，不会删除既有资产。

任务状态：T07 的客户端取消清理和 T23 的浏览器大文件取消闭环已有真实证据；`local_v1` 仍为 `pending`，`api_verified_v1` 仍为 `pending_external_verification`，整体目标继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 本地浏览器交付门禁中仍可独立完成的字幕文件内容、剩余编辑工具和视口/压力验证；外部真实 provider/TTS/GPU/许可不调用，继续保持 pending。

nextAction（具体到动作或命令）：先在隔离服务上补齐 SRT 下载内容的可读取文件证据；若浏览器下载仍只暴露 Blob URL，则保留现状并转向字幕/轨道/变速/音量等剩余编辑按钮的真实操作，随后运行 `pnpm check`、`pnpm build`、`pnpm lint`、`pnpm test:ui` 和 `pnpm test:performance`，不得把本轮取消证据扩大为 `local_v1` 最终通过。

### 2026-09-09 — T23 SRT 原生下载内容闭环

currentTask / 子任务：T23 本地浏览器交付门禁；将 SRT 导出从不可读取的 Blob URL 改为服务端 UTF-8 下载端点，并完成真实按钮下载文件内容核对；整体目标继续 `in_progress`。

实际完成内容：`server/index.mjs` 新增 `GET /api/projects/:id/captions.srt`，从已保存时间线提取字幕，校验空字幕并返回 422，成功响应包含 `application/x-subrip`、UTF-8 `Content-Length`、`Content-Disposition` 和 RFC 5987 文件名；`src/main.jsx` 的“下载字幕 SRT”先用当前时间线执行一次保存，再触发原生 HTTP 下载，保存冲突或服务不可用时不下载陈旧内容。新增 `scripts/caption-export-http-audit.mjs`，覆盖多行中文、时间码、Content-Disposition、字节长度和空字幕拒绝。

实际执行的命令、退出码、结果：`pnpm test:caption-http`（0；2 条字幕、UTF-8、Content-Disposition、95 字节、空字幕 422/CAPTIONS_NOT_FOUND）；`pnpm check`（0，149 个语法文件、93 项离线审计，发布清单 222 个文件且 0 个禁入文件）；`pnpm build`（0，Vite 5.4.19、1609 modules transformed）；`pnpm lint`（0 errors、25 条既有 React Hooks warnings）；`pnpm test:ui`（0，10 项）；`pnpm test:performance`（0，初始 JS/CSS 829,420 bytes、gzip 235,046 bytes，低于 1.5MB 目标）。

浏览器/渲染/接口证据：在全新隔离项目和新构建 in-app Browser 中，通过真实编辑器“导出项目 → 下载字幕 SRT”按钮捕获下载文件，实际读取 `字幕下载新构建_字幕.srt` 为 122 字节，内容包含 `00:00:00,750 --> 00:00:02,250`、`00:00:02,500 --> 00:00:03,250`、多行中文和第二条字幕；服务端直接响应与下载文件内容一致。浏览器按钮点击无异常，端点响应为 200；端点空字幕测试为 422。测试页签、临时服务、测试下载文件和临时数据均已清理，端口 4312 不再监听，正式 `server/data` 未写入。测试期间其他旧页签提交旧 revision 时服务端返回预期版本冲突，没有静默覆盖。

未解决问题：SRT 文件内容现在已有浏览器文件句柄证据，但完整 T23 仍不通过；全部编辑工具、多视口/压力、全新目标机安装器/签名回放仍未完成。真实 TTS 模型/GPU/音质/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换和 Zip64 继续保持未验证；25 条 Hooks warnings 仍未逐项收口。SRT 导出前保存会增加一次项目 revision，后续可在保存协调器收口时继续优化交互，但不会绕过冲突保护。

数据迁移状态与回滚方式：本轮只使用临时 JSON 数据目录；端点和前端改动不改变项目 schema。若需回滚，删除端点调用并恢复 Blob 导出即可，或按 README 停服务、保留 `DATA_DIR` 后恢复旧代码；项目内容仍由原子保存和 revision 冲突门禁保护。

任务状态：T11.4/T23 的 SRT 原生下载、文件内容、空字幕错误和浏览器按钮链路已有真实证据；`local_v1` 仍为 `pending`，`api_verified_v1` 仍为 `pending_external_verification`，整体目标继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 剩余编辑工具与不同视口/压力验证；外部真实 provider/TTS/GPU/许可不调用，继续保持 pending。

nextAction（具体到动作或命令）：在隔离项目中按顺序操作字幕确认、轨道切换、变速、音量/淡入淡出、复制/波纹删除和代理预览，核对每项服务端 revision 与刷新恢复；随后运行全量回归并仅依据实际成片/项目状态更新 `local_v1`，不把局部通过标成最终交付。

### 2026-09-09 — T23 编辑器控件与真实低清代理闭环

currentTask / 子任务：T23 本地浏览器交付门禁；完成真实媒体项目的字幕、轨道、变速、音频按钮、复制/波纹删除和低清代理控件验收，整体目标继续 `in_progress`。

修复前行为与复现：本轮未发现需要放宽产品校验的新缺陷；前一轮 SRT 原生下载改动后的剩余风险是编辑器控件只具备局部代码/离线证据，尚未逐项取得浏览器实际交互和服务端状态证据。低清代理验收初始夹具误把音频 `trackType` 写成不兼容的 `audio`，服务端按产品设计拒绝了该输入；已修正验收夹具为正式 `voice` 类型并重新执行，没有修改生产校验逻辑。

实际完成内容：在隔离服务和 in-app Browser 中使用真实 FFmpeg 生成的 640×360、24fps、3 秒 H.264 MP4 与 3 秒 WAV，确认视频/音频资产均 `probeStatus=passed` 并写入当前项目。浏览器实际点击速度 `1.5x` 后服务端视频片段为 `speed=1.5`、`duration=2`；点击静音后服务端音量为 `0`，重置后恢复 `volume=100`；轨道禁用/启用分别落库为 `muted=true/false`；字幕确认后为 `status=synced`；复制产生副本（同轨、从 3 秒开始），波纹删除后副本消失且原视频片段保留。修正真实媒体归属和音频类型后，浏览器点击“生成低清代理”显示“真实 MP4 · 刚生成”，预览节点存在，媒体接口 HEAD 返回 `200 / video/mp4 / 336,956 bytes`。

实际执行的命令、退出码、结果：本轮浏览器与接口操作均在临时 `DATA_DIR`、临时端口 4313 和隔离项目 `editor-controls-audit-20260909-1` 完成；真实上传响应均为 201，视频 635,462 字节、音频 264,678 字节，二者探测通过。最终项目 revision=16，时间线保留视频 3 秒、voice 音频 3 秒、已确认字幕 0.5–1.5 秒；代理复查返回 `cached=true`，技术 QC 为 640×360、24fps、3 秒，视频 H.264 + 音频 AAC。此前已通过的当前构建回归仍为 `pnpm check` 0（149 个语法文件、93 项离线审计）、`pnpm build` 0（1609 modules）、`pnpm lint` 0（0 errors、25 条既有 Hooks warnings）、`pnpm test:ui` 0（10 项）、`pnpm test:performance` 0（829,420 bytes、gzip 235,046 bytes）。

浏览器/渲染/接口证据：浏览器 DOM 实际显示字幕确认控件、轨道按钮状态、速度按钮激活态和代理预览节点；每次按钮操作后以 `GET /api/projects/editor-controls-audit-20260909-1` 核对 revision 与字段。代理节点 URL 为 `/api/render/editor-controls-audit-20260909-1/proxy-5655e38d67ef3be1dedca98ef1a7c2f7/deliverable.mp4`，HEAD 为 200、`video/mp4`、336,956 字节；同一 RenderPlan 的服务端代理复查技术 QC 含视频/音频流，无错误告警。测试中旧项目/错误夹具触发的 revision 冲突、媒体归属拒绝、非法上传标识和字幕越界均保持产品预期拒绝，未被标为成功能力。

未解决问题：本轮只覆盖单一桌面浏览器视口和受控单页操作，淡入/淡出/声像的精确滑块输入、更多编辑效果、不同视口、长时间/高并发压力、多标签普通保存最终回归仍待继续；低清代理成功不等于完整 `local_v1` 通过。正式安装器/签名/目标机交付、真实 TTS/GPU/许可、云端 provider 受理/费用/取消对账和 SQLite 正式默认切换仍未验证；25 条 Hooks warnings 仍存在。临时验收服务已停止、端口 4313 无 Listen、临时目录已删除，正式 `server/data` 未写入。

数据迁移状态与回滚方式：本轮只写入临时项目、临时资产和 render proxy；没有迁移或修改正式 JSON/SQLite 数据。正式升级仍按 README 先备份 `DATA_DIR`；代码回滚沿用既有 SRT 端点/前端调用回退方式，编辑器验收夹具与临时输出不进入生产数据。

任务状态：T23 编辑器控件与真实低清代理已有局部真实浏览器、服务端 revision、资产探测和 MP4 技术 QC 证据；`local_v1` 继续保持 `pending`，`api_verified_v1` 继续 `pending_external_verification`，整体目标继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 不同视口/压力与 T22 正式安装器、签名和目标机条件复核；外部真实能力继续保持 pending。

nextAction（具体到动作或命令）：先在隔离服务上运行浏览器 760/420 视口与长时间重复编辑/保存压力，记录浏览器错误、revision 冲突和媒体/代理结果；随后检查正式安装器/签名工具是否存在并执行可真实执行的目标机交付门禁，未取得证据不更新 `local_v1`。

### 2026-09-09 — T23 窄视口与重复编辑压力门禁、T22 安装就绪复核

currentTask / 子任务：T23 本地浏览器交付门禁与 T22 安装交付复核；完成窄视口、内部滚动、重复编辑操作压力和发布就绪检查，整体目标继续 `in_progress`。

实际完成内容：在隔离 SQLite 服务中使用真实 FFmpeg 生成并探测通过的 118,816 字节 MP4，浏览器分别设置 760×420 与 420×760 视口。两种视口 `body/document width` 均与视口一致，没有页面级横向溢出；编辑器内部滚动可达，420×760 滚动到底后检查器仍可见，时间线、代理和导出控件均存在。执行 20 次速度预设切换耗时 592ms，服务端 revision=2，无冲突弹窗/alert；执行 8 次复制→波纹删除耗时 1,825ms，最终 revision=3、时间线恢复 1 个片段、无残留副本、无冲突/alert。浏览器开发日志为空数组。压力验证只证明控件与保存链路在该隔离项目和视口下稳定，不扩展为所有设备或高并发保证。

实际执行的命令、退出码、结果：`pnpm exec node scripts/browser-recovery-setup.mjs <临时 DATA_DIR>`（0；真实 MP4 118,816 字节、`probeStatus=passed`）；隔离 SQLite 服务端口 4314 的浏览器实测完成后已停止，端口无 Listen，临时目录已删除。`pnpm exec node scripts/release-readiness-audit.mjs`（0；无 FFmpeg 隔离服务可启动、导出预检正确阻断、诊断 ZIP 可生成）；`pnpm doctor`（0；pnpm 11.19.0、Node 24.19.0、文件系统、registry 和离线 `file:` 安装 smoke test 通过，仅用户级 pnpm bin 未加入 PATH 警告）。

浏览器/渲染/接口证据：760×420 的编辑器内部滚动区域为 `clientHeight=250 / scrollHeight=1335 / scrollWidth=745`，滚动到底 `scrollTop=1085`；420×760 为 `clientHeight=596 / scrollHeight=1376 / scrollWidth=405`，滚动到底 `scrollTop=780`，检查器位于可视区。20 次速度操作与 8 次复制/波纹删除均以真实键盘操作触发并通过项目 GET 回读 revision/时间线；没有将 DOM 暂态值当作服务端成功。

未解决问题：仓库中没有真实 Windows 安装器、签名配置/工具链或可供回放的目标机发布环境；现有交付物仍是可离线安装、可启动的源码发布包，不能标记正式安装器/签名/目标机完成。T23 仍缺精确音量滑块、淡入淡出/声像、全部效果、多标签普通保存最终回归和更长/更高并发压力；真实 TTS/GPU/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换继续保持 pending；25 条 React Hooks warnings 仍存在。

数据迁移状态与回滚方式：本轮只写入隔离临时 DATA_DIR 和浏览器验收项目，未写入正式 `server/data`、用户配置或正式 SQLite；临时服务和目录均已清理。发布就绪审计只使用其自有临时目录。正式升级仍按 README 先备份 `DATA_DIR`，SQLite 失败时保留 JSON 源并取消 `STORAGE_BACKEND=sqlite`，再执行 doctor/health。

任务状态：T23 窄视口、内部滚动和受控重复编辑压力已有真实浏览器证据；T22 源码发布包/离线安装/doctor/无 FFmpeg 预检已有证据，但正式安装器/签名/目标机仍 `pending`。`local_v1` 继续保持 `pending`，`api_verified_v1` 继续 `pending_external_verification`，持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 尚可本地验证的精确音频控件、更多效果和多标签普通保存回归；随后再次核对是否出现真实安装器/签名/目标机条件，外部模型/provider 仍等待授权。

nextAction（具体到动作或命令）：先在隔离项目用真实浏览器提交音量滑块、淡入淡出/声像并 GET 回读服务端字段，再执行双标签普通保存与长时重复保存；若未提供安装器、证书和目标机，运行现有 `release-readiness-audit`/`doctor` 后继续保留 T22 pending，不生成或宣称伪安装器。

### 2026-09-09 — T23 精确混音、真实代理与双标签普通保存

currentTask / 子任务：T23 本地浏览器交付门禁；完成精确音量/淡入/淡出/声像的服务端保存、真实代理成片和双标签普通保存回归，整体目标继续 `in_progress`。

实际完成内容：在正确隔离的 SQLite 服务中重新导入真实 3 秒 WAV，浏览器用音量范围键盘操作保存 `volume=135`，并填写淡入 `0.6` 秒、淡出 `0.8` 秒、声像 `35`；等待保存协调器后以项目接口回读，revision=9、四个字段一致。随后用同一项目的正确视频/音频资产生成真实低清代理，响应 200，代理 HEAD 为 `video/mp4`、345,177 字节，技术质检包含 640×360/24fps H.264 视频与 AAC 音频，只有受控的 0.5 秒静音风险告警，没有把 UI 暂态当作渲染成功。双标签回归中，标签一先保存画面 X=40 至 revision=10；标签二基于旧 revision 操作时出现“项目有新的服务端版本”，服务端未被覆盖；选择“重新加载服务端版本”后，标签二保存 Y=25 至 revision=11，最终服务端同时保留 X=40/Y=25。

实际执行的命令、退出码、结果：真实媒体由 FFmpeg 生成 WAV 264,678 字节；此前隔离项目初始化 `pnpm exec node scripts/browser-recovery-setup.mjs <临时 DATA_DIR>` 退出码 0，视频 118,816 字节且 `probeStatus=passed`。本轮服务端浏览器交互、代理请求和双标签回读均完成；两标签开发日志均为空。前一次错误启动曾将同名临时音频写入正式资产目录，已确认无项目引用后删除唯一文件 `server/data/assets/browser-recovery/audio-voicewav-1788939049091-f4vk0f.wav`；正确隔离服务停止后端口 4315 无 Listen，临时目录已删除。

浏览器/渲染/接口证据：混音控件 DOM 实际显示 135%、0.6、0.8、35，服务端 GET 回读 `revision=9` 与字段一致；代理复查响应为 `status=200`、`cached=false`、技术 QC `duration=4`、`width=640`、`height=360`、`fps=24`，视频 H.264、音频 AAC；浏览器代理节点显示“真实 MP4 · 刚生成”。双标签服务端回读为 revision 10（X=40）→冲突保护→revision 11（X=40/Y=25），两页 `dev.logs()` 均为 `[]`。混音代理之前的失败仅由错误服务目录中的旧路径导致，已清理且未作为通过/失败产品证据。

未解决问题：T23 仍缺更多效果组合后的真实成片、全部无人值守浏览器矩阵及更长/更高并发保存压力；正式安装器/签名/目标机环境不存在，T22 只能保持源码发布包 pending。真实 TTS/GPU/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换继续未验证；25 条 React Hooks warnings 仍存在。当前局部混音代理通过不等于 `local_v1` 通过。

数据迁移状态与回滚方式：正确验收只写入已删除的临时 DATA_DIR；误启动产生的唯一正式目录临时音频文件已在确认无引用后删除，未删除正式项目或用户文件；正式 `server/data` 当前不应保留本轮该文件。代码未新增 schema 迁移。正式升级仍按 README 先备份 DATA_DIR，SQLite 失败时保留 JSON 源并取消 `STORAGE_BACKEND=sqlite`。

任务状态：T23 精确混音、真实代理和双标签普通保存已有局部真实证据；`local_v1` 继续 `pending`，`api_verified_v1` 继续 `pending_external_verification`，整体目标继续 `in_progress`。持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 更多效果组合成片与更长保存压力；T22 复核正式安装器/签名/目标机条件，外部模型/provider 仍等待授权。

nextAction（具体到动作或命令）：在新的隔离项目中逐一启用现有交叉溶解、叠化闪白、速度渐变、画面稳定并生成真实代理，核对技术 QC 和可回滚关闭；再运行至少 30 次保存操作与双标签刷新回读。若没有真实安装器、证书和目标机，运行现有 release readiness/doctor 后保持 T22 pending，不生成伪安装器。

### 2026-09-09 — T23 全部现有效果组合真实代理与回滚

currentTask / 子任务：T23 本地浏览器交付门禁；完成相邻画面转场、画面滤镜/位移、速度曲线与稳定效果的组合保存、真实代理质检和逐项关闭回滚，整体目标继续 `in_progress`。

实际完成内容：在全新隔离 SQLite 项目中复制真实 320×180/24fps、4 秒 H.264 画面片段形成相邻片段。浏览器依次启用交叉溶解、速度渐变（0.75→1.35）、画面稳定（deshake）、关闭交叉溶解并切换叠化闪白，再启用电影黑边和轻微手持；服务端最终 revision=9 同时记录 `transition=flash`、`speedRamp`、`stabilization=true`、`letterbox=true`、`handheld=true`。生成真实组合代理后页面显示“真实 MP4 · 刚生成”，HEAD 为 200、`video/mp4`、568,707 字节，技术 QC 为 7.5 秒、640×360、24fps、H.264、无告警。随后逐项关闭五类效果和叠化闪白，服务端 revision=14 恢复 `transition=''`、`speedRamp=null`、`stabilization=false`、`letterbox=false`、`handheld=false`、片段起点恢复 4 秒；再次生成真实代理，HEAD 200、`video/mp4`、538,169 字节。证明这些效果字段与 RenderPlan 可回滚，不替代完整交付验收。

实际执行的命令、退出码、结果：隔离项目初始化 `pnpm exec node scripts/browser-recovery-setup.mjs <临时 DATA_DIR>` 退出码 0，真实 MP4 118,816 字节、`probeStatus=passed`；隔离服务使用端口 4316 和正确 `DATA_DIR` 完成浏览器操作，开发日志为 `[]`，服务停止后端口无 Listen，临时目录已删除。所有真实代理均来自当前隔离项目，未使用密钥或付费 provider。

浏览器/渲染/接口证据：效果浏览器控件的 aria 文本与激活态在每步操作后更新；组合状态 GET 回读 revision=9，组合代理 HEAD 为 200/568,707 字节，技术 QC 无 warning；关闭回滚 GET 回读 revision=14，回滚代理 HEAD 为 200/538,169 字节。中途切换转场时产品拒绝在未关闭交叉溶解前直接替换为叠化闪白，先关闭后切换成功；该互斥保护保持有效。

未解决问题：T23 仍缺完整无人值守浏览器矩阵、至少 30 次长时保存压力及多设备/高并发证明；正式安装器/签名/目标机环境不存在，T22 继续 pending。真实 TTS/GPU/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换继续未验证；25 条 React Hooks warnings 仍存在，`local_v1` 不能据此标通过。

数据迁移状态与回滚方式：本轮只使用隔离 SQLite DATA_DIR、临时真实媒体和代理产物，服务停止后临时目录已删除，正式 `server/data` 未写入。效果操作均通过项目 revision 原子保存，关闭效果即可恢复前一版本语义；正式升级仍按 README 先备份 DATA_DIR，SQLite 失败回到 JSON 源。

任务状态：T23 全部现有效果组合的真实代理和回滚已有局部证据；T23 母任务保持 `in_progress`，`local_v1` 保持 `pending`，`api_verified_v1` 保持 `pending_external_verification`，持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 至少 30 次长时保存压力和跨标签刷新回读；T22 保持正式安装器/签名/目标机条件复核，外部模型/provider 仍等待授权。

nextAction（具体到动作或命令）：在新隔离项目重复 30 次以上速度/音量/位置编辑并等待每轮服务端 revision，再双标签刷新核对最终时间线；完成后运行 `pnpm check`、`pnpm build`、`pnpm lint` 和现有真实 MP4 回归。若没有真实安装器、证书和目标机，保持 T22 pending，不生成伪安装器。

### 2026-09-09 — T23 三十轮保存压力与最终回归门禁

currentTask / 子任务：T23 本地浏览器交付门禁；完成 30 轮真实编辑保存、刷新标签页回读和当前代码最终回归，整体目标继续 `in_progress`。

实际完成内容：在新的隔离 SQLite 项目中用浏览器对真实视频片段连续执行 30 轮位置 X 编辑，每轮等待保存协调器完成并通过项目接口回读，服务端 revision 从 1 递增到 31，位置值从 1 到 30 一一对应，累计耗时 24,658ms。新建第二标签页刷新后仍读取单片段、revision=31、位置 X=30；浏览器开发日志为空，未出现冲突或 alert。该压力结果证明当前单项目单字段的连续保存链路稳定，不延伸为所有设备或高并发保证。

实际执行的命令、退出码、结果：`pnpm exec node scripts/browser-recovery-setup.mjs <临时 DATA_DIR>`（0；真实 MP4 118,816 字节、`probeStatus=passed`）；隔离服务端口 4317 已停止，端口无 Listen，临时目录已删除。最终 `pnpm check`（0；149 个语法文件、93 项离线审计）、`pnpm build`（0；1609 modules transformed）、`pnpm lint`（0 errors、25 条既有 Hooks warnings）、`pnpm test:ui`（0；10 项）、`pnpm test:performance`（0；初始 JS/CSS 829,315 bytes，gzip 235,016 bytes）均通过。

浏览器/渲染/接口证据：30 轮回读记录为 `{revision:2..31, positionX:1..30}`，每轮服务端值与输入一致；刷新标签页最终 `clipCount=1`、`serverRevision=31`、`serverPositionX=30`、日志 `[]`。此前现有效果组合真实代理/回滚、精确混音真实代理和双标签冲突/普通保存证据均已写入本账本，本轮没有把静态 DOM 值代替服务端结果。

未解决问题：T23 仍不是完整无人值守 `local_v1` 交付矩阵，仍缺跨页面、更多真实项目形态和更高并发证明；T22 没有真实 Windows 安装器、签名证书/工具链或目标机发布环境，继续保持 pending。真实 TTS/GPU/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换未验证；25 条 React Hooks warnings 仍存在。

数据迁移状态与回滚方式：本轮只使用隔离临时 DATA_DIR 与真实测试媒体，停止服务后临时目录删除，正式 `server/data` 未写入；没有 schema 迁移。正式升级继续先备份 DATA_DIR，SQLite 失败时保留 JSON 源并取消 `STORAGE_BACKEND=sqlite`。

任务状态：T23 30 轮保存压力、刷新回读和最终回归已有实测证据；T23 母任务保持 `in_progress`，`local_v1` 保持 `pending`，`api_verified_v1` 保持 `pending_external_verification`，持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 跨页面无人值守回归与必要的更高并发验证；T22 只在出现真实安装器/证书/目标机后再复核正式交付，外部模型/provider 仍等待授权。

nextAction（具体到动作或命令）：下一轮在隔离项目从导入→编辑→任务中心→刷新/重开→下载成片串联跨页面路径，记录每个服务端 revision 和真实 MP4；随后复跑 release readiness/doctor。若外部安装器、签名和目标机条件仍不存在，保持 T22/local_v1 pending，不生成伪交付物。

### 2026-09-09 — T23 跨页面真实导入、后台成片恢复与跨进程并发

currentTask / 子任务：T23 本地浏览器交付门禁；在隔离 SQLite 项目中完成真实媒体导入→编辑保存→后台任务中心→页面刷新/重开→真实 MP4 成片回读，并补跑跨进程并发门禁；整体目标继续 `in_progress`。

实际完成内容：使用文件选择器从浏览器导入真实 2 秒 MP4（57,919 字节），项目 `localMedia` 登记 `duration=2`、`probeStatus=passed`、字节数一致，原有 4 秒 V1 时间线保持不变；导入后将位置 X 编辑为 65，服务端保存到 revision=5。打开任务中心提交真实 MP4 后台任务，任务以 inputRevision=5 完成 `SUCCEEDED/100%`；页面刷新/重开后仍恢复位置 X=65、最新任务、100% 状态和“下载成片”入口。

浏览器/渲染/接口证据：最新成片 GET 返回 HTTP 200、`video/mp4`、678,533 字节，MP4 文件头为 `ftyp`；`ffprobe` 实测 duration=4.000 秒、1280×720、24fps、H.264，技术 QC 无告警。浏览器开发日志为 `[]`。浏览器自动化点击“下载成片”未捕获 Blob URL 的 download 事件，因此只确认服务端真实成片和下载入口/接口，未把浏览器本地文件句柄标为已取得。

并发与清理证据：`pnpm exec node scripts/concurrency-audit.mjs` 退出码 0；4 路配置并发、8 个音色并发写入、8 个 worker 竞争同一任务仅 1 个 claim、12 个任务事件和 12 个合并字段均完整，跨进程锁通过。随后 `pnpm exec node scripts/release-readiness-audit.mjs` 退出码 0（无 FFmpeg 服务可启动、预检正确阻断、诊断 ZIP 可生成），`pnpm doctor` 退出码 0（版本/文件系统/registry/离线 file 安装 smoke test 通过，仅用户级 pnpm bin PATH 警告）。隔离服务端口 4318 已停止且无 Listen，临时目录已删除，正式 `server/data` 下未发现 `extra.mp4`。

未解决问题：这次补齐的是单项目的跨页面真实链路与跨进程数据层并发，不等于完整无人值守 `local_v1` 矩阵、多设备网络高并发或浏览器本地下载文件句柄已通过。停止隔离服务阶段输出过一次未保留请求路径的 `ENOENT 项目不存在` 堆栈，尚未确认是否为关闭阶段的客户端尾请求；需下一轮用诊断记录和可控页面关闭顺序复现。T22 正式 Windows 安装器/签名/目标机仍无真实条件；真实 TTS/GPU/许可、云端 provider 受理/费用/取消对账和 SQLite 正式默认切换仍 pending；25 条 React Hooks warnings 仍存在。

数据迁移状态与回滚方式：本轮仅使用临时 `DATA_DIR`、临时 SQLite 和真实测试媒体，未修改正式数据，没有 schema 迁移；正式升级仍先备份 DATA_DIR，SQLite 失败时保留 JSON 源并取消 `STORAGE_BACKEND=sqlite`。

任务状态：T23 跨页面真实导入/编辑/后台成片/刷新回读及跨进程并发已有实测证据；T23 母任务保持 `in_progress`，`local_v1` 保持 `pending`，`api_verified_v1` 保持 `pending_external_verification`，持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 服务停止尾请求诊断、完整编辑工具、多项目形态和跨页面无人值守矩阵；T22 只在出现真实安装器/证书/目标机后再复核正式交付，外部模型/provider 仍等待授权。

nextAction（具体到动作或命令）：在新的隔离服务启动后先导出诊断请求快照，执行页面关闭→服务停止顺序并复现/定位 `ENOENT` 请求；随后串联字幕、项目包、媒体恢复和更多编辑控件的跨页面路径，记录服务端 revision、任务状态和真实 MP4/下载结果。若没有真实安装器、证书和目标机，保持 T22/local_v1 pending，不生成伪交付物。

### 2026-09-09 — T23 请求级错误诊断与原生真实 MP4 下载

currentTask / 子任务：T23 本地浏览器交付门禁；完成偶发运行错误的请求级可观测性补强，并完成任务中心原生下载事件、下载文件和真实 MP4 技术信息回读；整体目标继续 `in_progress`。

实际完成内容：服务端异常处理现在为每个进入主处理器的错误保留 `requestId`、HTTP 方法、路径、错误码和完整堆栈，且将错误码同步到诊断请求记录；新增 `scripts/request-error-diagnostics-audit.mjs` 并纳入 `pnpm check` 与 `pnpm test:request-diagnostics`。剪辑台成片下载改为先用 HEAD 校验 `video/mp4`，再通过同源原生链接触发下载，不再把完整 MP4 读入 Blob URL；渲染完成后的自动下载也复用该路径。

浏览器/接口证据：在隔离 SQLite 服务端口 4322 中，任务中心“下载成片”实际产生浏览器 download 事件并取得本地文件句柄 `C:\Users\33347\Downloads\浏览器重开恢复审计_成片 (4).mp4`；文件实测 693,355 字节，`ffprobe` 为 4.000 秒、1280×720、24fps、H.264 视频，未将该无音频 fixture 误标为含音频。验证完成后已删除这一个精确测试下载文件。服务端缺失项目真实请求返回 404/`ENOENT`，响应 requestId 与日志中 `GET /api/projects/diagnostic-missing-project` 完全一致，前端仍只收到脱敏错误。

实际执行的命令、退出码、结果：`pnpm test:request-diagnostics`（0；404/ENOENT、requestId/path 日志和临时文件清理通过）；`pnpm check`（0；150 个语法文件、94 项离线审计）；`pnpm build`（0；1609 modules transformed）；`pnpm lint`（0 errors、25 条既有 React Hooks warnings）。隔离服务停止后端口 4322 无 Listen，临时 DATA_DIR 已删除，正式 `server/data` 未写入。

停止顺序对照：此前端口 4319 先关闭浏览器页面再停止服务、端口 4320 页面保持打开直接停止服务各完成一次，均未复现 `ENOENT`；因此当前只能把问题标记为间歇性、未定位，不能推断为关闭竞态。新增请求级日志已为下一次真实复现保留请求路径和 requestId。

未解决问题：T23 仍不是完整无人值守 `local_v1` 矩阵，仍缺字幕/项目包/媒体恢复/更多控件的组合回放、多项目形态和多设备高并发；`api_verified_v1` 仍缺真实授权 provider/TTS/GPU/许可与费用/取消对账。T22 仍没有真实 Windows 安装器、签名证书/工具链或目标机发布环境；SQLite 正式默认切换仍未执行；25 条 React Hooks warnings 仍存在。原生下载闭环已通过一次真实浏览器文件句柄和 ffprobe，但不据此宣称完整交付。

数据迁移状态与回滚方式：本轮只修改 `server/index.mjs`、`src/main.jsx`、`scripts/check.mjs`、`scripts/request-error-diagnostics-audit.mjs` 和 `package.json`，验收数据、下载文件与服务均在隔离临时目录；无 schema 迁移，正式 `server/data` 未写入。若需回退，移除新增审计入口并恢复下载函数的旧实现即可；正式数据仍按 README 先备份 DATA_DIR。

任务状态：T23 请求级诊断和原生真实 MP4 下载已有实测证据；T23 母任务保持 `in_progress`，`local_v1` 保持 `pending`，`api_verified_v1` 保持 `pending_external_verification`，持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 跨页面无人值守矩阵，优先串联字幕导出、项目包导出/导入、媒体恢复和更多编辑控件，再补至少一个多项目隔离回放；T22 只在出现真实安装器/证书/目标机后复核正式交付。

nextAction（具体到动作或命令）：在新的隔离服务调用 `/api/diagnostics/export` 建立请求快照，完成字幕→项目包→媒体恢复→编辑→后台真实 MP4→页面重开→原生下载的单次无人工路径，并记录 revision、任务状态、下载文件和 ffprobe；同时保留 `pnpm test:request-diagnostics` 作为 ENOENT 复现门禁。若仍无真实安装器、证书、目标机或 provider 授权，继续保持 T22/local_v1/api_verified_v1 的 pending 边界，不标记完成。

### 2026-09-09 — T23 字幕保存版本回写与完整跨页面回放

currentTask / 子任务：T23 本地浏览器交付门禁；修复字幕导出后编辑器未同步服务端 revision 的真实冲突，并完成诊断 ZIP、字幕、项目包、隔离实例导入、媒体恢复、后台真实 MP4 与刷新回读的连续路径；整体目标继续 `in_progress`。

修复前证据与修改：首次“字幕导出→再次导出真实 MP4”回放中，字幕保存将服务端 revision 提升到 4，但编辑器仍提交 revision=3，服务端以 `409/REVISION_CONFLICT` 正确拒绝；新增请求级日志同时保留了该失败请求的 requestId、`POST /api/render/jobs` 和错误码。修改 `src/main.jsx` 的 SRT 导出路径，在服务端保存成功后把返回 revision 写回编辑器状态，随后让保存协调器继续以新版本提交。

浏览器/接口证据：修复后同一隔离项目导出真实中文 SRT 54 字节（`00:00:00,500 --> 00:00:02,000`，正文“跨页面回放字幕”）；项目包导出 121,910 字节 ZIP。将项目包导入第二个隔离 SQLite 服务后，项目 revision=1、时间线 2 项、字幕 `synced`，原视频媒体 HEAD 返回 200、`video/mp4`、118,816 字节；刷新/重开后字幕与媒体仍可见。随后真实 MP4 后台任务以 inputRevision=4 完成 `SUCCEEDED/100%`，项目最终 revision=5，任务中心刷新后恢复完成状态和下载入口；下载成片 664,688 字节，`ffprobe` 为 4.000 秒、1280×720、24fps、H.264 视频。首次已验证的独立原生下载回放仍取得浏览器 download 事件和文件句柄；本次自动渲染路径也产生了对应本地文件，未将 fixture 的无音频结果误记为含音频。

其它真实证据：隔离服务启动后直接调用 `/api/diagnostics/export` 返回 200、`application/zip`、967 字节且 ZIP 头为 `PK`；浏览器开发日志为空数组。服务端口 4323/4324 均已停止，两个临时 DATA_DIR 及本轮 SRT、项目包、MP4 下载文件均按精确路径删除，正式 `server/data` 未写入。

实际执行的命令、退出码、结果：修复后 `pnpm check`（0；150 个语法文件、94 项离线审计，包含 request diagnostics）；`pnpm build`（0；1609 modules transformed）；`pnpm lint`（0 errors、25 条既有 React Hooks warnings）；`pnpm test:ui`（0；10 项）；`pnpm test:performance`（0；初始 JS/CSS 829,651 bytes，gzip 235,135 bytes）。浏览器跨页面操作、接口回读、下载文件和 ffprobe 均未依赖密钥或付费 provider。

未解决问题：首次 revision 冲突已被修复并用同一路径实测通过；服务停止阶段的 `ENOENT` 仍仅有一次历史间歇性记录，端口 4319“先关页面再停服务”和 4320“页面保持打开直接停服务”对照均未复现，现只能标记为未定位并依赖请求级诊断继续追踪。T23 仍缺完整无人值守 `local_v1` 矩阵、多项目更多组合和多设备高并发；T22 正式安装器/签名/目标机不存在；真实 TTS/GPU/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换和 25 条 Hooks warnings 仍未完成/未消除。

数据迁移状态与回滚方式：本轮只更新 `src/main.jsx` 下载 SRT 的 revision 回写逻辑；验收项目、项目包、字幕、媒体和成片均在隔离临时目录，未做 schema 迁移。回退代码不会删除正式项目数据；正式升级仍按 README 先备份 DATA_DIR，SQLite 失败时保留 JSON 源并取消 `STORAGE_BACKEND=sqlite`。

任务状态：T23 字幕保存→真实成片连续路径、项目包隔离导入/媒体恢复、刷新回读和下载证据已有局部实测；T23 母任务保持 `in_progress`，`local_v1` 保持 `pending`，`api_verified_v1` 保持 `pending_external_verification`，持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 的更多编辑控件、多项目隔离与跨页面无人值守组合；T22 只在出现真实安装器/证书/目标机后复核正式交付，外部模型/provider 仍等待授权。

nextAction（具体到动作或命令）：在新的隔离服务重新导出诊断请求快照，串联至少两个项目的字幕/项目包/媒体恢复、编辑保存、后台真实 MP4、页面重开与原生下载，核对每个项目的 revision、任务 inputRevision、文件字节和 ffprobe；保留 `pnpm test:request-diagnostics` 作为运行错误门禁，缺少外部安装器/证书/目标机/provider 条件时继续保持 pending，不标记完成。

### 2026-09-09 — T23 片段名称回退与最终门禁

currentTask / 子任务：T23 本地浏览器交付门禁；修复缺少 `label` 的真实时间线片段在 UI 中被误显示为“未选择片段”的问题，并完成最终构建、检查和性能回归；整体目标继续 `in_progress`。

实际完成内容：`src/Timeline.jsx` 与 `src/main.jsx` 现在在片段没有 label 时按名称、镜头 ID、`clip-*` ID 生成稳定显示文本。隔离浏览器加载同一缺少 label 的真实视频片段后，时间线与检查器均显示“镜头 1”，而非“未选择片段”；浏览器开发日志为空，未改变项目时间线数据或服务端存储语义。

实际执行的命令、退出码、结果：隔离浏览器端口 4325 启动与片段显示回放通过，服务停止后端口无 Listen、临时 DATA_DIR 已删除；最终 `pnpm check`（0；150 个语法文件、94 项离线审计）、`pnpm build`（0；1609 modules transformed）、`pnpm lint`（0 errors、25 条既有 React Hooks warnings）、`pnpm test:ui`（0；10 项）、`pnpm test:performance`（0；初始 JS/CSS 829,783 bytes，gzip 235,181 bytes）。正式 `server/data` 未写入。

未解决问题：T23 仍是局部可验证矩阵，完整无人值守 `local_v1`、多项目更多组合和多设备高并发仍未完成；T22 正式安装器/签名/目标机不存在；真实 TTS/GPU/许可、云端 provider 受理/费用/取消对账、SQLite 正式默认切换和 25 条 Hooks warnings 仍保持未完成或 pending。历史间歇性服务停止 `ENOENT` 已有请求级 requestId/path 记录能力，但受控停止顺序尚未再次复现，因此不宣称根因已定位。

任务状态：T23 片段显示回退和全量门禁已有实测证据；T23 母任务保持 `in_progress`，`local_v1` 保持 `pending`，`api_verified_v1` 保持 `pending_external_verification`，持续自动任务保持活动，不需要用户重复输入提示词。

nextTask：继续 T23 多项目跨页面无人值守组合和真实媒体形态回放；T22 只在出现真实安装器/证书/目标机后复核正式交付，外部模型/provider 仍等待授权。

nextAction（具体到动作或命令）：在新的隔离服务对两个项目分别执行字幕导出、项目包导出/导入、媒体恢复、编辑保存、后台真实 MP4、页面重开和原生下载，逐项记录 revision、inputRevision、字节数、ffprobe 和诊断快照；任何未取得真实条件的安装器、证书、目标机或 provider 能力继续保持 pending，不标记完成。

### 2026-09-15 — T23 三段视频/双音轨/9:16/30fps/1:1/25fps 与取消竞态修复

currentTask / 子任务：T23 本地浏览器交付门禁；在双项目回放之后继续验证真实多媒体组合、导出文件和后台取消/重启恢复，修复一次真实暴露的渲染成功覆盖取消竞态；T23 母任务继续 `in_progress`，`local_v1` 继续 `pending`。

实际完成内容：在全新隔离 SQLite 服务和 in-app Browser 中，通过文件选择器导入三段真实本地 MP4、独立人声 WAV、BGM WAV 和中文 SRT；确认字幕，保存人声音量 85%、淡入 0.2 秒、淡出 0.3 秒、声像 -15，以及人声/BGM 轨道用途；项目设置保存为 9:16、30fps，编辑器刷新/重开后仍能读回 7 条时间线项、字幕和媒体。浏览器生成低清代理并经 HEAD 校验为 `200/video/mp4/261,450` 字节，`ffprobe` 为 9.866667 秒、360×640、30fps、H.264 视频和 AAC 音频；导出弹窗再次提交真实 MP4，实际下载文件 438,876 字节，`ffprobe` 为 9.866667 秒、720×1280、30fps、H.264/AAC。SRT 原生下载文件 69 字节，内容与中文字幕一致；项目包原生下载 1,679,436 字节、ZIP 头为 `PK`，HTTP inspect 显示完整清单、6 个媒体条目和 `missingRefs=[]`。随后同一浏览器项目切换并保存为 1:1、25fps，导出预检显示 `1080 × 1080 · 25fps`，新建真实任务 `render-browser-recovery-1789459494604-8kh175` 完成 `SUCCEEDED/100%`；原生下载 337,025 字节，`ffprobe` 为 78.4 秒、1080×1080、25fps、H.264/AAC，刷新重开后导出历史仍可回读该预设和任务。

实际发现与修复：长时间线浏览器任务在点击取消后曾出现 UI 显示已取消但后台最终变为 `SUCCEEDED` 的真实竞态；诊断确认早期点击可能发生在前端尚未拿到 `renderJobId` 的窗口。`server/index.mjs` 新增渲染任务锁、取消标记、成功写回前终态复核和取消等待；`src/main.jsx` 保留取消意图直到任务 ID 可用，并避免取消请求过早中止任务 ID 响应；新增 `scripts/render-cancel-race-audit.mjs` 纳入统一检查。修复后真实 80 秒时间线在任务中心取消，任务 `render-browser-recovery-1789458476797-unint2` 稳定为 `CANCELLED/100%`，错误码 `RENDER_CANCELLED`、无 result，诊断包含取消请求；服务停止/重启后，已取消任务、此前成功任务、9:16/30fps 设置、字幕和三类媒体均可回读，浏览器开发日志为 `[]`。此外修复 `retryRender` 未清理前端幂等键的问题，避免“重试旧任务”后的下一次导出复用旧输入；实际回放确认切换到 1:1/25fps 后创建了新任务并输出匹配预设。另一次双标签提交以旧 revision 真实触发 `409/REVISION_CONFLICT`，未覆盖服务端新版本。

实际执行的命令、退出码、结果：`pnpm test:render-cancel-race`（0；真实 40 秒 MP4 取消后最终与 500ms 稳定检查均为 `CANCELLED`，成功写回被阻止）；修复幂等键后的 `pnpm check`（0；152 个语法文件、96 项离线审计）；`pnpm build`（0；1609 modules transformed）；`pnpm lint`（0 errors、25 条既有 React Hooks warnings）；`pnpm test:ui`（0；10 项）；`pnpm test:performance`（0；初始 JS/CSS 830,300 bytes、gzip 235,304 bytes）；`pnpm doctor`（0；1 个用户级 pnpm PATH 警告）；`pnpm exec node scripts/release-readiness-audit.mjs`（0；无 FFmpeg 预检阻断和诊断 ZIP 生成通过）。

数据与回滚：本轮服务、SQLite、真实音视频、渲染产物和浏览器下载文件均位于隔离临时目录或明确的 Downloads 测试文件，正式 `server/data` 未写入；停止服务并确认端口无 Listen 后，隔离根目录和 9 个本轮明确下载文件按精确路径清理，4327 无 Listen；正式目录现存 8 个 2026-09-02 的历史 render MP4，未被本轮触碰。无 schema 迁移；代码回退范围为 `server/index.mjs`、`src/main.jsx`、`scripts/render-cancel-race-audit.mjs`、`scripts/check.mjs`、`package.json` 及本账本/验收记录。

未解决问题：上述是三段视频、双音轨、SRT、9:16/30fps、1:1/25fps 和一次可靠取消/重启的局部真实证据，不等于完整无人值守 `local_v1`；更多多项目组合、完整浏览器矩阵、取消/重启压力和更高并发仍需继续。T22 仍无真实 Windows 安装器、签名证书/工具链和目标机；`api_verified_v1` 仍缺真实授权 provider/TTS/GPU/许可与费用边界；25 条 Hooks warnings 未清零。未经真实条件的能力均未标记完成。

任务状态：T23 继续 `in_progress`，`local_v1` 保持 `pending`，`api_verified_v1` 保持 `pending_external_verification`，`hosted_v2` 保持 `not_requested`，持续自动任务保持活动，不需要用户再次输入提示词。

nextTask：继续 T23 多项目组合、服务停止尾请求诊断和更高并发；随后在真实安装器/证书/目标机出现时复核 T22，外部 provider/TTS/GPU/许可仍等待授权。

nextAction（具体到动作或命令）：在新的隔离 DATA_DIR 中至少保留两个项目，继续执行项目包/字幕/媒体恢复、编辑保存、后台真实 MP4、页面重开和取消/重启回放，并用 `/api/diagnostics/export` 对照服务停止前后的 requestId/path；再运行更高并发压力门禁。若仍无真实安装器、证书、目标机或 provider 授权，保持 T22/local_v1/api_verified_v1 的 pending 边界，不生成伪交付物。

### 2026-09-15 — T23 双项目 SQLite 项目包、字幕 HEAD 与真实成片回放

currentTask / 子任务：T23 本地浏览器交付门禁；修复 SQLite 项目包冲突复制的真实运行错误，补齐字幕 HEAD/原生下载校验，并完成两个独立项目的浏览器回放；T23 母任务继续 `in_progress`。

实际发现与修复：首次在 SQLite 隔离服务中将项目 A 的项目包复制导入为项目 B 时，接口返回 `400/EPERM`，原因是冲突 ID 只检查 JSON 文件而忽略 SQLite 项目和已有资产目录；失败清理还会无条件删除同名资产目录，存在误删原项目媒体的风险。`server/projectPackage.mjs` 现在接收服务端现有项目 ID、同时检查资产目录，导入回滚只删除本次实际移动成功的目标；导入返回资产元数据，`server/index.mjs` 在 SQLite 模式下把复制项目与媒体哈希/探测元数据登记回 SQLite，保持项目读取、媒体读取和备份边界一致。字幕接口新增 HEAD 响应，前端 SRT 下载先校验 `application/x-subrip`/`text/plain` 再走同源原生下载，避免把有效字幕误判为失败。

双项目真实证据：全新隔离 SQLite 服务中，项目 A `browser-recovery` 浏览器确认字幕“ 双项目 A 回放字幕 ”、位置 X=12，服务端最终 revision=15；真实后台任务 `render-browser-recovery-1789002216798-vgpnmt` 以 `inputRevision=4`、`SUCCEEDED/100%` 完成，技术 QC 为 4.000 秒、1280×720、24fps、H.264，无音频 fixture 未误标音轨；浏览器下载文件 662,333 字节，`ffprobe` 与任务 QC 一致。项目 A SRT 通过原生 download 事件取得 `浏览器重开恢复审计_字幕 (3).srt`，57 字节，内容为 A 字幕。项目 A 项目包浏览器下载 122,585 字节 ZIP。

项目 B 由项目包复制导入为 `browser-recovery-copy-1`，导入接口 `201`，包预检 `200/complete=true`；导入后项目 revision=1，视频媒体 HEAD `200/video/mp4/118,816` 字节，项目 A 原媒体同时保持 `200/118,816`。浏览器将 B 字幕改为“ 双项目 B 回放字幕 ”、位置 X=25，服务端最终 revision=8；真实后台任务 `render-browser-recovery-copy-1-1789002345377-dt30qp` 以 `inputRevision=3`、`SUCCEEDED/100%` 完成，技术 QC 为 4.000 秒、1280×720、24fps、H.264，浏览器下载文件 661,113 字节，`ffprobe` 一致。项目 B SRT 通过原生 download 事件取得 `浏览器重开恢复审计_字幕 (4).srt`，57 字节，内容为 B 字幕；项目 B 项目包下载 122,939 字节，HTTP 重新 inspect 返回 `200`，manifest projectId 为 B、预检完整。刷新/重开 B 后，字幕、位置 X=25、真实媒体仍可见，任务中心显示该 render job 已完成，浏览器开发日志为 `[]`。同一隔离服务的诊断导出为 `200/application/zip/18,340` 字节，ZIP 头为 `PK`。

实际执行的命令、退出码、结果：`pnpm test:package-sqlite-conflict`（0；SQLite 项目包导出/冲突复制/原项目媒体保留/复制媒体读取，两个项目可列出）；`pnpm test:caption-http`（0；GET 与 HEAD 均 200，2 条 UTF-8 字幕、Content-Disposition、95 字节长度、空字幕 422/CAPTIONS_NOT_FOUND）；`pnpm check`（0；151 个语法文件、95 项离线审计）；`pnpm build`（0；1609 modules transformed）；`pnpm lint`（0 errors、25 条既有 React Hooks warnings）；`pnpm test:ui`（0；10 项）；`pnpm test:performance`（0；初始 JS/CSS 830,019 bytes、gzip 235,213 bytes）。

数据与回滚：本轮项目、SQLite、渲染产物、项目包、SRT 和 MP4 全部使用 `C:\Users\33347\AppData\Local\Temp\xingmu-two-projects-20260909` 及明确的下载文件；验证后服务端口 4326 无 Listen，隔离目录和 8 个本轮下载文件均按精确路径删除，正式 `server/data` 未写入。代码回退可恢复 `projectPackage.mjs`、`store.mjs`、`index.mjs`、`main.jsx` 及新增审计脚本；正式升级仍先备份 DATA_DIR。新增 SQLite 导入逻辑未改变 JSON 默认存储。

未解决问题：这次是两个项目的局部跨页面证据，不等于完整 `local_v1` 矩阵；三段本地视频+人声/BGM/SRT、多画幅/帧率、更多后台取消/重启、全量浏览器无人值守和更高并发仍需继续。T22 仍无真实 Windows 安装器、签名证书/工具链与目标机；`api_verified_v1` 仍需真实授权 provider/TTS/GPU/许可与费用边界，25 条 Hooks warnings 仍未清零。上述能力均未标记为完成。

任务状态：T23 双项目项目包/字幕/媒体/编辑/真实 MP4/刷新回读已有实测证据；`local_v1` 保持 `pending`，`api_verified_v1` 保持 `pending_external_verification`，`hosted_v2` 保持 `not_requested`，持续自动任务保持活动，不需要用户再次输入提示词。

nextTask：在新的隔离 DATA_DIR 继续执行三段本地视频、独立人声与 BGM、SRT、多画幅/24/25/30fps 的浏览器导入→编辑→后台真实 MP4→刷新/取消/重启回放；每个项目继续记录真实文件与 ffprobe。随后运行 `pnpm doctor`、`pnpm exec node scripts/release-readiness-audit.mjs`，若仍没有安装器/证书/目标机或 provider 授权则保持 T22、local_v1、api_verified_v1 的 pending 边界。

### 2026-09-16 — T23 持续门禁与并发/诊断复核

currentTask / 子任务：T23 本地浏览器交付门禁；按上轮真实浏览器结果继续执行可重复的 SQLite 项目包、运行错误和跨进程并发门禁。本轮没有新的交付等级提升，继续由单个智能体执行。

实际完成内容：在不启动真实 provider、不读取正式用户数据的前提下，重新运行 SQLite 项目包冲突复制审计，确认原项目媒体保持完整、复制项目资产可读、两个项目均可列出；重新运行请求级诊断审计，隔离缺失项目请求仍返回 `404/ENOENT`，requestId 与方法/路径日志一致，临时文件清理通过；重新运行跨进程并发审计，2 个配置字段、4 条路由执行、8 个音色并发写入、单任务唯一 claim、12 个任务事件和跨进程锁均保持完整。结合 2026-09-15 已落账的真实浏览器三段视频/双音轨/SRT、9:16/30fps、1:1/25fps 成片和取消/重启回读，当前 T23 证据继续有效，但不把局部证据扩展为完整 `local_v1`。

实际执行的命令、退出码、结果：`pnpm exec node scripts/concurrency-audit.mjs`（0；`crossProcessLock=true`、`singleClaim=1`、12 个事件）；`pnpm test:package-sqlite-conflict`（0；SQLite 导入 `201`、原媒体完整、复制媒体 `200/118,816`、项目数 2）；`pnpm test:request-diagnostics`（0；真实缺失项目 `404/ENOENT`、requestId/path 记录和临时清理通过）。此前修复后的全量门禁仍为 `pnpm check` 152 个语法文件/96 项离线审计、`pnpm build` 1609 modules、lint 0 errors/25 warnings、UI 10 项、性能 gzip 235,304 bytes。

数据与回滚：本轮三个审计均使用自身隔离临时目录并自动清理，没有启动持久测试服务，没有写入正式 `server/data`，没有调用付费 API；无 schema 迁移。若需回退，按上轮记录回退渲染任务锁/前端取消与重试幂等键改动及对应审计入口，不删除用户媒体或历史正式 render 文件。

未解决问题：完整无人值守 `local_v1` 浏览器矩阵、多项目完整组合回放、更高并发压力、T22 真实 Windows 安装器/签名/目标机、真实 TTS/GPU/许可和外部 provider 仍未完成；`local_v1`、`api_verified_v1` 和 T22 均不标记完成，25 条 Hooks warnings 保持记录。

任务状态：T23 继续 `in_progress`，`local_v1` 保持 `pending`，`api_verified_v1` 保持 `pending_external_verification`，`hosted_v2` 保持 `not_requested`，持续自动任务保持活动，不需要用户再次输入提示词。

nextTask：继续 T23 新隔离 DATA_DIR 的双项目浏览器组合回放及服务停止尾请求对照；再按真实条件复核 T22，保持外部 provider/TTS/GPU/许可边界。

nextAction（具体到动作或命令）：启动新的隔离 SQLite 服务，创建两个项目并在浏览器中完成项目包导入、字幕/媒体回读、编辑保存、后台 MP4、刷新/重开、取消与重启；服务停止前后各导出一次 `/api/diagnostics/export` 并逐项比对 requestId/path；完成后运行 `pnpm check` 和相关并发门禁。缺少真实安装器、证书、目标机或 provider 授权时，继续保持 pending，不生成伪交付物。
