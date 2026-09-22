# 星幕当前发布验收记录（2026-09-07复核）

这份报告记录当前代码状态，不把历史测试或未授权的真实供应商调用当成当前通过。最终 `local_v1` 仍需 T23 按完整矩阵复核后才能标记通过。

## 当前可交付能力

- Windows 本地启动入口：`pnpm install`、`pnpm run doctor`、`pnpm build`、`pnpm start`。
- 默认数据目录为 `server/data/`，可用 `DATA_DIR` 指向独立目录；项目包、任务、媒体和备份不会写入构建产物。
- 无云端密钥、无本地 TTS 时，页面、手动提示词回收、项目包和编辑器仍可用；TTS 状态显示为可解释的 offline。
- 有真实本地媒体且 FFmpeg/FFprobe、`libx264`、字幕滤镜可用时，渲染服务生成并质检真实 MP4；缺少工具时服务继续运行，导出预检返回安装或配置原因。
- `/api/diagnostics/export` 只导出请求关联、运行指标、项目摘要、任务摘要和备份摘要，不含项目正文、媒体、请求体、凭据或上游原始响应。

## 已执行证据

| 检查 | 结果 |
| --- | --- |
| `pnpm run doctor` | 通过；Node 24.18.0、pnpm 11.19.0、FFmpeg/FFprobe、`libx264`、字幕滤镜、数据目录权限通过；TTS 为可选 offline |
| `pnpm build` | 通过；最新 1608 modules，首屏 JS/CSS 原始 801,062 bytes；Timeline 动态 chunk 与正式 hash 资源构建通过 |
| `pnpm lint` | 0 errors；24 个既有 React Hooks warnings；远程 MIME 审计使用 `globalThis.Response` 的 lint 回归已修复 |
| `pnpm check` | 通过；122 个语法文件、72 项离线审计，新增 revision/幂等/输入冲突/取消、任务失败终态写入顺序和缺失项目 404 诊断回归；字幕 SRT、多次导出 URL 隔离、FFmpeg 基础变换帧指纹、Windows 文件锁清理、preview timeline、真实 FFmpeg MP4/音频/字幕、后台任务、项目包、备份、诊断、跨项目、输入防护、远程 MIME、旧 JSON 重启和升级回退审计保持通过 |
| `pnpm test:performance` | 通过；首屏 JS/CSS gzip 227,538 bytes，低于 1.5 MB 门槛；初始资源 4 个，性能基线目标满足 |
| `pnpm test:browser-bootstrap` | 通过；生产 HTML、JS/CSS MIME、健康接口、9:16/30fps 预检、无 FFmpeg 阻断和诊断 ZIP 均通过 |
| 节目预览时间线 | 通过子项；真实浏览器播放头驱动 3 个视频片段，跨片段后进入空隙并自动停止，3.5 秒音轨与字幕状态同步，`sourceIn/playbackRate` 由离线审计覆盖，浏览器 error 日志为空 |
| 导出取消/重试 | 通过子项；真实浏览器 `PENDING` 点击取消得到 `CANCELLED · 100%`，重试任务独立进入 `RUNNING` 后 `SUCCEEDED`，生成 3.5 秒真实 MP4；原取消任务保持取消，不被成功结果覆盖 |
| 刷新恢复与独立导出历史 | 通过子项；真实浏览器刷新后从服务端恢复成功任务历史并显示 `SUCCEEDED · 100%`；同项目两次后台导出生成不同任务级 URL，两个 MP4 URL 均 HTTP 200，公开 `/api/jobs` 不含 `projectSnapshot` |
| 基础变换导出一致性 | 通过子项；检查器真实设置位置/缩放/旋转后导出任务 `SUCCEEDED/100%`，job 快照保留字段，技术质检通过；`render-profile-audit` 用帧指纹确认变换确实改变导出画面 |
| SRT 字幕导出 | 通过子项；真实浏览器添加并确认 1 条字幕后，导出中心“下载字幕 SRT”显示“已导出 1 条字幕 SRT”；离线审计覆盖多行字幕、画面轨排除和重叠拒绝，浏览器错误日志为空 |
| 真实本地媒体 UI 闭环 | 通过；隔离服务无密钥条件下经浏览器导入 3 个真实 MP4、2 个 WAV 和 2 条 SRT，完成时间线编辑/裁剪/字幕确认；预检通过，后台任务 `SUCCEEDED`，下载并 `ffprobe` 验证 6.000 秒、1280×720、25fps、H.264+AAC |
| 无 FFmpeg 隔离服务 | 通过；服务健康接口可用，导出预检阻断码为 `FFMPEG_UNAVAILABLE`，诊断 ZIP 可下载 |
| 干净临时路径 | 通过；全新源码目录排除 `node_modules`、`dist`、用户数据和缓存，执行不带 `--offline`/`--ignore-scripts` 的 `pnpm install --frozen-lockfile` 退出码 0，157 个包含 `@esbuild/win32-x64@0.21.5`；doctor 0、生产 build 0（1606 modules），随后 4212 写入、停止，4213 重启读取项目和列表均通过，两个端口均关闭 |
| 冻结缓存安装探针 | 通过；独立临时目录执行 `pnpm install --frozen-lockfile --offline --ignore-scripts`，锁文件策略通过，157 个依赖全部从本机 pnpm store 复用，退出码 0；这证明缓存可用，不替代完整源代码复制后的构建验收 |
| 完整源码隔离启动 | 通过；此前缓存探针曾暴露 esbuild 可选包缺件，随后在全新 registry/cache 源码目录完成无人工补件安装、doctor、构建和独立数据目录生命周期；4212 写入 revision 1 后停止，4213 重启 health 200，项目标题/revision/列表保持 |
| 移动代码/保留数据 | 通过；移动后的代码目录写入 `project-clean-move-proof`，停止并重启后仍能通过项目接口读回同一标题与 ID |
| 诊断 ZIP 标准兼容性 | 通过；Windows `System.IO.Compression` 可打开 `README.txt` 与 `diagnostics.json`，无 `API_KEY`/Bearer/password/secret 字段 |
| 生产静态资源与浏览器回归 | 通过；修复 `/assets/*` 找不到构建产物时错误回退 `index.html`，并修复空项目被注入演示时间线；干净实例可挂载首页、打开空项目并进入剪辑台，导出对话框显示 0 个时间线片段和明确阻断原因，Escape 后焦点回到导出按钮，浏览器控制台错误数为 0 |
| 真实输出规格与时间线契约 | 通过；`scripts/render-profile-audit.mjs` 真实 FFmpeg 验证 16:9/9:16/1:1、24/25/30fps、源入点、空隙、变速，并拒绝不支持帧率和同轨重叠；视频-only 路径同步验证 |
| 旧项目兼容与重启 | 通过；真实浏览器导入既有星幕 JSON 后恢复标题、13 个分镜和工作流；隔离服务停止后换端口重启，旧项目字段、4 条缺失引用和列表可见性保持；HTTP ZIP 项目包导入返回 201 并正确复制冲突 ID |
| 输入防护与媒体真实性 | 通过；真实 MP4 可上传，伪造/错 MIME/损坏媒体返回 422，不支持类型返回 415，超大请求返回 413，越界路径不崩溃，Range 边界为 206/416，私网远程 URL 被拒绝；当前大文件仍未完成流式压力验收 |
| 双标签数据保护 | 通过；两个真实浏览器标签页基于同一 revision 保存，第二次提交出现 409 冲突 UI；选择保留本地副本后本地显示“仅本地”，服务端仍保持先提交版本和 revision=2，未静默覆盖 |
| 跨项目浏览器任务与真实渲染隔离 | 通过子项；真实 A/B 标签分别打开项目，A 合法后台任务 `PENDING→SUCCEEDED` 只写入 A；A 真实导出 `PENDING→SUCCEEDED` 后获得 1 秒、1280×720/25fps、H.264 成片，B 保持自身标题/revision、无导出弹窗和无 delivery；B 故意缺失媒体仅返回错误，服务未退出 |
| 渲染 revision 与幂等契约 | 通过子项；真实隔离 HTTP 服务中旧 `expectedRevision` 返回 409/`REVISION_CONFLICT`，同项目同幂等键两次请求复用同一 job，不泄露幂等键；修改输入返回 409/`RENDER_IDEMPOTENCY_CONFLICT`，取消后终态为 `CANCELLED`；任务记录保留 input revision/hash/preset 且 `deliveryReady=false` |
| 人工交付审核 | 通过子项；真实成功任务默认 `deliveryReady=false`，调用审核接口 `decision=pass` 后任务记录变为 `deliveryReady=true` 并保存结论/备注/时间；`needs-revision` 保持不可交付，重试会清除旧审核 |

## 仍未通过或需外部条件

- T23 尚未完成全部 local_v1 场景矩阵和浏览器无人工自动化固化；三段本地媒体 UI 成片、节目预览跨片段/空隙、导出取消/重试、刷新恢复/独立历史、SRT、基础变换、旧项目迁移、输入防护、停止/重启和跨项目浏览器任务/渲染隔离子项已通过，因此 `local_v1` 仍保持 pending。
- `api_verified_v1` 保持 pending_external_verification；没有调用真实供应商，也没有凭据、预算或模型许可确认。
- 配置并发序列化、真实 TTS/GPU/权利许可和所有设备性能目标仍未标记完成。
- T22 的完整源代码复制安装、registry/cache 自动取得平台可选二进制、doctor、生产构建与停止/重启已通过；此前仅缓存目录缺件的失败保留为环境诊断，不影响具备完整 registry/cache 的纯净安装证据。代码目录移动、独立数据目录和启动行为已验证。
- 浏览器关键路径目前已完成真实生产实例回归，但尚未固化为无需人工介入的自动化入口；下载文件本身尚未由浏览器下载拦截器自动断言。
- 生成表单 UI 的完整无人值守提交、多任务状态 UI、浏览器关闭/刷新中途恢复和发布介质最终矩阵仍需下一轮按隔离路径复验；双标签 revision 冲突、跨项目 A→B 真实渲染、节目预览取消/重试与纯净 registry/cache 安装已通过，大媒体流式/断点也未标记完成。
- T10 效果目录目前不把未实现的实时效果冒充已应用；交叉转场、稳定/速度渐变和代理预览仍未实现。
- T10 基础变换已由同一 RenderPlan 和真实 MP4 帧指纹验证；交叉转场、稳定/速度渐变与代理预览仍禁用，不计入完成。
- T11 的 `expectedRevision`、幂等键、输入 revision/hash/preset 记录、`deliveryReady=false` 及显式人工审核 pass/needs-revision 语义已有真实 HTTP 证据；隔离服务中真实点击“确认可交付”后，历史条目已显示 `SUCCEEDED · 可交付`、按钮“已确认”，浏览器审核入口证据已补齐；项目级 delivery 联动和无人工最终矩阵仍不计入母任务完成。
- 远程 `application/octet-stream` 仅在已识别签名时推断为支持的媒体类型，未知内容仍拒绝；该兼容边界已有 FFmpeg 夹具审计，但真实供应商网络响应仍需授权条件。

## 回退动作

1. 停止 `pnpm start`，保留当前 `DATA_DIR`。
2. 用上一份代码目录替换当前代码目录，不删除 `DATA_DIR`。
3. 运行 `pnpm run doctor`，确认端口、数据目录和媒体工具，再运行 `pnpm start`。
4. 使用项目备份恢复入口恢复升级前项目；`scripts/upgrade-rollback-audit.mjs` 对该路径做离线回归。
