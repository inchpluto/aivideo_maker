# 星幕当前发布验收记录（2026-09-08）

本报告只记录当前代码和本轮实际命令结果。`local_v1` 尚未通过完整 T23 矩阵，`api_verified_v1` 未执行真实供应商调用，保持 pending；`hosted_v2` 未选择。

## 当前状态

| 交付级别 | 状态 | 依据 |
| --- | --- | --- |
| `local_v1` | `pending` | 无密钥真实 FFmpeg MP4、音频、字幕、项目包、任务恢复、浏览器任务中心/冲突保护等子项已通过；完整无人值守浏览器矩阵和最终交付复核仍未完成 |
| `api_verified_v1` | `pending_external_verification` | 适配器/契约/错误矩阵已通过，未使用真实账户、密钥、配额或付费调用 |
| `hosted_v2` | `not_requested` | 未实施联网版 |

## 当前已验证能力

- 本地导入与真实 FFmpeg 成片：视频、音频、字幕、空隙、源入点、变速、画幅/帧率、基础变换、交叉溶解、叠化闪白、稳定效果均有隔离夹具或真实浏览器证据；输出包含可探测视频/音频流，不以 demo 结果代替。
- 项目包：标准 ZIP 存储与 deflate 条目的内存解析、文件流 inspect/import、CRC/SHA-256/路径/条目/总量校验、500MB 上限、低磁盘余量 507、异常清理和冲突复制均有证据；Zip64 明确拒绝，旧 Buffer API 保持兼容。
- 媒体安全：签名与 ffprobe 校验、250MB 上传上限、Range/HEAD、分块续传、取消清理、远程 HTTPS 每跳 DNS 解析并固定实际 socket 地址；真实 `w3.org → www.w3.org` 重定向下载通过。
- 存储与后台：默认原子 JSON 保持兼容；`STORAGE_BACKEND=sqlite` 提供 WAL、事务 revision 冲突、项目版本、任务事件、唯一幂等键、墓碑/恢复和服务端 worker。JSON→SQLite 支持 dry-run、备份、幂等重复迁移和源文件保留；项目级 SQLite 备份 manifest 已纳入项目 revision、任务、资产元数据及媒体 SHA-256，并通过删除后恢复验证。
- 派生媒体清理：SQLite 活动项目的 render 根目录和当前 proxy 受保护，陈旧 fingerprint proxy/orphan render 可按 retention 回收，dry-run/apply 通过，shared voice 边界保持不变。
- 安装与性能：`doctor`/构建/启动路径已有隔离证据；生产首屏 JS/CSS gzip 当前 235,181 bytes，低于 1.5MB 目标。
- 发布包：`pnpm release:package` 可生成不可覆盖的源码发布目录，清单记录文件 SHA-256，并排除正式数据、媒体、凭据、依赖、缓存和日志；发布包已在临时目录完成离线安装、构建和 doctor。
- 真实性边界：live 模式清空全部凭据并禁止网络请求时，完整故事输入明确返回 `PROVIDER_NOT_CONFIGURED`，调用次数为 0，不生成模拟成功；真实供应商调用仍保持 pending。
- 本地 TTS 适配器：隔离回环桥接仅提供 `/health` 时，F5-TTS 默认探测可正确回退并完成一次 live WAV 请求；参考音频授权、英文转写、返回音频探测和资产登记均通过，未连接真实模型权重。
- `local_v1` 综合夹具：临时数据目录中用三段本地视频、双音频和字幕执行真实编辑命令，再完成 16:9/24fps 与 9:16/30fps 成片、项目包空目录导入、媒体字节核对、服务重启后的后台渲染恢复和输出 ffprobe；该综合审计通过，但不替代完整浏览器无人值守矩阵。浏览器还已验证桌面导出弹窗滚动后直接“再次导出真实 MP4”提交、自动下载和任务中心无需刷新收录。

## 本轮当前版本证据

| 命令 | 结果 |
| --- | --- |
| `pnpm check` | 退出码 0；152 个语法文件、96 项离线审计 |
| `pnpm build` | 退出码 0；1609 modules transformed |
| `pnpm lint` | 退出码 0；0 errors、25 个既有 React Hooks warnings |
| `pnpm test:performance` | 退出码 0；初始 JS/CSS 830,286 bytes、gzip 235,305 bytes |
| `pnpm exec node scripts/project-package-streaming-audit.mjs` | 退出码 0；真实 6 秒 MP4，GET 22–24 个响应块，流式 inspect/import 200/201，资产字节保持，临时文件清理 |
| `pnpm exec node scripts/project-package-deflate-audit.mjs` | 退出码 0；真实 deflate ZIP 内存解析、文件流扫描和导入后的 44,000 字节媒体一致，Zip64 输入明确拒绝 |
| `pnpm exec node scripts/project-package-pressure-audit.mjs` | 退出码 0；多条目、损坏包、超限和 413 清理 |
| `pnpm exec node scripts/project-package-disk-audit.mjs` | 退出码 0；受控低余量 507，临时文件清理 |
| `pnpm exec node scripts/remote-dns-live-audit.mjs` | 退出码 0；真实 HTTPS 重定向/地址固定/PNG 保存 |
| `pnpm exec node scripts/sqlite-production-audit.mjs` | 退出码 0；迁移 dry-run/备份/重复迁移、revision 冲突、任务 worker、删除墓碑/恢复和服务后端通过 |
| `pnpm exec node scripts/sqlite-switch-rollback-audit.mjs` | 退出码 0；同一 `DATA_DIR` 完成 JSON 读取→SQLite 读取/写 revision 2→关闭 SQLite 回到 JSON，源文件与迁移备份保持不变 |
| `pnpm exec node scripts/sqlite-render-recovery-audit.mjs` | 退出码 0；首进程中断时任务为 RUNNING，第二进程从同一 SQLite 恢复为 SUCCEEDED，真实 MP4 172,391 字节/80 秒，项目 revision 与 80 个片段保持不变 |
| 浏览器隔离恢复实测（in-app Browser） | 通过；页面关闭后重新打开仍载入项目，任务关闭前为 RUNNING、重开后为 SUCCEEDED，真实 MP4 27,700,623 字节/160 秒，项目 revision 1 与原时间线保持不变 |
| `pnpm exec node scripts/local-tts-lifecycle-audit.mjs` | 退出码 0；停止操作等待托管子进程真实退出，Windows 隔离目录可清理，忙碌保护和外部服务保护保持通过 |
| `pnpm exec node scripts/generation-reconcile-http-audit.mjs` | 退出码 0；HTTP `needs_reconcile`、重复幂等键、重启后重试 `SUCCEEDED`、运行中取消 `CANCELLED` 及取消事件稳定性通过 |
| 浏览器隔离任务中心实测（in-app Browser） | 通过；两条并行 render job 在关闭页面前均为 RUNNING，关闭后页签为空，重开后任务中心重新显示两条任务；页面取消/重试一条任务产生 `CANCELLED → RUNNING`；隔离 `needs_reconcile` 任务持续轮询并显示“待人工对账 · 不自动重试”，人工重试事件可见；最终构建服务日志无 render 异步供应商查询错误 |
| `pnpm exec node scripts/sqlite-backup-manifest-audit.mjs` | 退出码 0；隔离 SQLite 中真实 FFmpeg MP4 的项目 revision/任务/资产元数据与媒体哈希进入 manifest，HTTP 删除后恢复项目/任务/媒体，篡改媒体拒绝且无部分恢复 |
| `pnpm exec node scripts/sqlite-cache-lifecycle-audit.mjs` | 退出码 0；真实 SQLite proxy 当前版本受保护、旧 fingerprint/orphan render 回收、shared voice 保持，dry-run/apply 均通过 |
| `pnpm exec node scripts/provider-no-key-audit.mjs` | 退出码 0；live 模式无凭据时返回 `PROVIDER_NOT_CONFIGURED`，错误指向 `OPENAI_API_KEY`，无外网调用、无模拟成功 |
| `pnpm exec node scripts/local-tts-provider-audit.mjs` | 退出码 0；F5-TTS `/api/status` 缺失时回退 `/health`，真实隔离桥接返回 25,678 字节 WAV，0.8 秒媒体探测和生成资产登记通过，`/api/tts` 仅调用 1 次 |
| `pnpm exec node scripts/local-v1-acceptance-audit.mjs` | 退出码 0；源入点/修剪/拆分/变速/空隙/静音/音量/字幕真实编辑，16:9/24 与 9:16/30 输出、项目包迁移和重启后后台渲染均通过，恢复成片含视频/音频流（138,397 字节） |
| `pnpm doctor` | 退出码 0；pnpm/Node、文件系统、registry 连通性和离线 `file:` 安装 smoke test 通过；仅报告用户级 pnpm bin 未加入 PATH 警告 |
| T22 README/发布/doctor 一致性复核 | 通过；README 的 `doctor`、`start`、`DATA_DIR`、SQLite 迁移、源码发布包和升级回退路径与当前脚本/入口一致；新增样式文件被发布包纳入，用户数据/凭据/缓存/日志排除边界保持不变 |
| T22 干净路径启动实测 | 通过隔离源码副本执行 `pnpm install --offline --frozen-lockfile`（157 个包）、`pnpm build`（1608 modules），`pnpm start` 后 `GET /api/health` 返回 HTTP 200；临时副本已清理 |
| `pnpm exec node scripts/release-package-audit.mjs` | 退出码 0；发布清单 223 个文件、0 个敏感/用户数据文件，临时发布包离线 install/build/doctor 全部通过 |
| `pnpm exec node scripts/release-readiness-audit.mjs` | 退出码 0；无 FFmpeg 隔离服务可启动、无 FFmpeg 导出预检正确阻断、诊断 ZIP 可生成；该审计不等同于正式安装器或签名验收 |
| `pnpm test:request-diagnostics` | 退出码 0；隔离服务真实缺失项目请求返回 404/ENOENT，响应 requestId 与服务日志中的方法/路径/错误码一致，临时数据清理 |
| `pnpm test:request-diagnostics` | 退出码 0；隔离服务真实缺失项目请求返回 404/ENOENT，响应 requestId 与服务日志中的方法/路径/错误码一致，临时数据清理 |
| T22 安装器/签名/目标机条件复核 | 未通过/未具备条件；仓库没有 Windows 安装器、签名配置/工具链或目标机发布回放入口，现有可交付物为已验证的源码发布 ZIP |
| T23 窄视口与重复编辑压力矩阵（in-app Browser） | 部分通过；760×420、420×760 均无页面级横向溢出，编辑器内部滚动可达且检查器可见；20 次速度切换（592ms）与 8 次复制→波纹删除（1,825ms）无冲突/alert，最终时间线无残留副本，浏览器开发日志为空；不代表所有设备或高并发完成 |
| 浏览器精确混音/代理矩阵（in-app Browser） | 部分通过；真实 3 秒 WAV 在隔离 SQLite 项目中通过浏览器键盘/输入实际保存音量 135%、淡入 0.6 秒、淡出 0.8 秒、声像 +35，服务端 revision=9 回读字段一致；纠正临时资产归属后重新生成低清代理，接口 200、`video/mp4`、345,177 字节，技术 QC 含 640×360/24fps H.264 视频与 AAC 音频，警告仅为受控 0.5 秒静音风险。 |
| 浏览器双标签普通保存回归（in-app Browser） | 部分通过；标签一保存画面位置 X=40 后 revision=10，标签二以旧 revision 操作触发“项目有新的服务端版本”冲突，服务端仍保留 X=40；选择重载服务端版本后，标签二普通保存位置 Y=25，revision=11，最终 X=40/Y=25 均保留；两标签开发日志均为空。 |
| 浏览器全部现有效果组合/回滚矩阵（in-app Browser） | 部分通过；相邻真实画面片段启用交叉溶解、叠化闪白、电影黑边、轻微手持、速度渐变和画面稳定，组合代理 HEAD 200 / `video/mp4` / 568,707 字节，技术 QC 640×360/24fps H.264、7.5 秒、无告警；逐项关闭后 revision=14 恢复无效果，再生成代理 HEAD 200 / 538,169 字节。 |
| 浏览器 30 轮保存压力/刷新回读（in-app Browser） | 部分通过；真实视频片段执行 30 轮位置编辑，每轮服务端 revision 从 1 递增至 31、输入值 1–30 全部一致，耗时 24,658ms；新标签页刷新仍读到 revision=31、位置 X=30、1 个片段，开发日志为空；不代表跨页面全矩阵或高并发完成。 |
| 浏览器跨页面导入→编辑→任务中心→刷新/重开→真实 MP4（in-app Browser） | 部分通过；文件选择器导入真实 2 秒 MP4，服务端登记 57,919 字节、`probeStatus=passed`，项目 `localMedia` 持久化且原时间线保持 1 个片段；导入后位置 X=65 保存到 revision=5，任务中心再次提交的渲染任务以 inputRevision=5 完成 `SUCCEEDED/100%`；页面刷新后仍恢复 X=65、最新任务和“下载成片”入口。成片 GET 200 / `video/mp4` / 678,533 字节，文件头为 MP4，`ffprobe` 为 4.000 秒、1280×720、24fps、H.264；浏览器自动化未捕获 Blob URL 的 download 事件，故下载文件句柄仍不宣称已取得，浏览器开发日志为空。 |
| 浏览器原生 MP4 下载闭环（in-app Browser） | 部分通过；任务中心“下载成片”经 HEAD 校验后走同源原生下载，真实产生 download 事件并取得本地文件句柄；文件 693,355 字节，`ffprobe` 为 4.000 秒、1280×720、24fps、H.264 视频，临时下载文件已删除。该 fixture 无音频，完整无人值守 `local_v1` 仍未宣称通过。 |
| 浏览器字幕保存→真实 MP4 连续回放（in-app Browser） | 部分通过；首次回放发现字幕导出后服务端 revision=4 而编辑器仍提交 revision=3，触发可追踪的 409 冲突；修复 SRT 导出后的 revision 回写后，同一路径导出 54 字节中文 SRT、提交后台真实 MP4 以 inputRevision=4 完成 `SUCCEEDED/100%`，最终 revision=5；刷新后任务、字幕和下载入口恢复，下载文件 664,688 字节，`ffprobe` 为 4.000 秒、1280×720、24fps、H.264 视频。 |
| 浏览器缺少 label 片段显示回退（in-app Browser） | 通过；隔离真实项目中无 label 的视频片段在时间线和检查器均显示“镜头 1”，不再误显示“未选择片段”，浏览器开发日志为空，项目数据未改变。 |
| T23 跨进程并发门禁 | 通过；`pnpm exec node scripts/concurrency-audit.mjs` 退出码 0，4 路配置并发、8 个音色并发写入、8 个 worker 竞争同一任务仅 1 个 claim、12 个任务事件和 12 个合并字段均完整，跨进程锁验证通过；不等同于多设备网络高并发。 |
| 浏览器 `local_v1` 增量矩阵（in-app Browser） | 部分通过；任务中心在刷新/重开后恢复服务端任务，UI 取消产生 `CANCELLED`、重试经历 `PENDING` 后 `SUCCEEDED`，真实 MP4/项目包下载反馈正常；双标签旧 revision 触发冲突对话框并保留本地副本，服务端 revision 2 / 位置 X=100 未被覆盖；第二个空数据目录通过文件选择器导入项目包后服务端仅有 1 个项目。修复桌面导出弹窗内部滚动后，直接点击“再次导出真实 MP4”创建新任务并完成 `SUCCEEDED/100%`，自动下载后重新打开任务中心无需刷新即可看到新任务；该成片接口 HEAD 为 200、`video/mp4`、5,499 字节。 |
| 浏览器媒体/字幕增量矩阵（in-app Browser） | 部分通过；真实 FFmpeg MP4 浏览器导入后服务端登记 118,816 字节，刷新和同一 SQLite 服务重启后仍可恢复；双行中文字幕编辑、确认校时、SRT 导出反馈、修剪出点和拆分均实际操作，服务端 revision 7 保留 `synced` 字幕与两个 1.75 秒视频片段。随后新构建改用原生 HTTP SRT 下载，在全新隔离项目中通过编辑器按钮捕获并读取 122 字节文件，双条时间码、多行中文和服务端内容一致。 |
| `pnpm test:caption-http` | 退出码 0；GET/HEAD 均 200，2 条字幕 UTF-8 内容、Content-Disposition、95 字节长度校验及空字幕 422/CAPTIONS_NOT_FOUND 通过 |
| `pnpm test:package-sqlite-conflict` | 退出码 0；SQLite 项目包冲突复制为 copy-1，原媒体保持 200/118,816，复制媒体同样可读，项目列表 2 个 |
| `pnpm test:render-cancel-race` | 退出码 0；真实 40 秒 MP4 渲染任务在 RUNNING 后立即取消，最终稳定为 `CANCELLED/100%`、`RENDER_CANCELLED`，无 result，500ms 后未被成功写回覆盖 |
| `pnpm test:upload-cancel` | 退出码 0；真实 FFmpeg MP4、8MB 分块、真实隔离服务完成取消中断，第一块已入服务，取消后状态 404、临时 `.part` 清理，再次导入和 `probeStatus=passed` 通过 |
| 浏览器大文件媒体取消/恢复矩阵（in-app Browser） | 部分通过；真实 112,745,960 字节 MP4 导入时按钮实际变为并可点击“取消媒体导入”，页面显示清理反馈，服务端无 `.part`；随后再次导入 12,561,319 字节 MP4，资产探测通过、HEAD 200 / `video/mp4`，刷新后项目仍恢复 2 条媒体记录，浏览器运行时错误为空。 |
| 浏览器编辑器控件/代理矩阵（in-app Browser） | 部分通过；真实 640×360/24fps MP4 + 3 秒 WAV 的隔离项目中，字幕确认、轨道禁用/启用、1.5x 变速、静音/重置、复制/波纹删除均实际点击并核对服务端 revision；修正音频类型与项目归属后低清代理显示“真实 MP4 · 刚生成”，预览 HEAD 200 / `video/mp4` / 336,956 字节，技术 QC 为 3 秒、640×360、24fps，含 H.264 视频与 AAC 音频。 |
| 浏览器双项目 SQLite 项目包/字幕/成片回放（in-app Browser） | 部分通过；项目 A 与复制项目 B 分别完成字幕编辑、位置编辑、任务中心后台真实 MP4、SRT 原生下载、项目包下载和刷新/重开回读；A 成片 662,333 字节、B 成片 661,113 字节，均经 ffprobe 确认为 4 秒、1280×720、24fps、H.264；A/B SRT 下载分别为 57 字节，B 项目包 HTTP inspect 200 且 manifest projectId 正确，A 原媒体和 B 复制媒体均 HEAD 200/118,816，诊断 ZIP 200/18,340；浏览器开发日志为空。完整 local_v1 仍保持 pending。 |
| 浏览器三段视频/双音轨/9:16/30fps/取消重启回放（in-app Browser） | 部分通过；真实导入三段本地 MP4、voice WAV、music WAV 和中文 SRT，确认字幕并保存音量 85%、淡入 0.2 秒、淡出 0.3 秒、声像 -15、人声/BGM 轨道；低清代理 HEAD 200/261,450，ffprobe 为 9.866667 秒、360×640、30fps、H.264/AAC；再次导出本地真实 MP4 438,876 字节，ffprobe 为 9.866667 秒、720×1280、30fps、H.264/AAC；SRT 69 字节，项目包 1,679,436 字节且 inspect 完整、6 个媒体条目、无 missingRefs。长时间线任务经任务中心取消后稳定为 `CANCELLED/100%`、`RENDER_CANCELLED`、无 result，服务重启后项目、字幕、媒体和任务历史可回读；完整 local_v1 仍保持 pending。 |
| 浏览器 1:1/25fps 真实成片与重试预设隔离（in-app Browser） | 部分通过；切换项目设置为 1:1/25fps 后导出预检显示 1080×1080/25fps，创建新真实任务 `render-browser-recovery-1789459494604-8kh175` 并完成 `SUCCEEDED/100%`；浏览器原生下载文件 337,025 字节，ffprobe 为 78.4 秒、1080×1080、25fps、H.264/AAC，刷新重开后任务与预设仍可回读；修复重试路径清理旧幂等键，避免复用旧 9:16/30fps 输入。完整 local_v1 仍保持 pending。 |

以上审计使用隔离 `DATA_DIR`；未写入正式 `server/data`，未打印或提交密钥。

## 未通过、未完成或需外部条件

- 完整 T23 `local_v1` 无人工自动化浏览器矩阵尚未完成，因此不宣称可交付；本轮已补齐任务中心恢复/取消重试、项目包空实例导入、双标签冲突保护、桌面导出弹窗的直接真实 MP4 提交链路、真实三段视频/双音轨/SRT/9:16/30fps 与 1:1/25fps 成片、真实媒体/字幕/修剪/拆分增量操作、浏览器大文件上传取消清理和再次导入恢复、SRT 原生下载文件内容读取，以及字幕/轨道/变速/静音/重置/复制/波纹删除/低清代理控件、精确音量/淡入/淡出/声像、760×420/420×760 视口、受控重复编辑压力、双标签普通保存、全部现有效果组合/回滚和 30 轮保存压力/刷新回读、渲染取消成功覆盖竞态修复与服务重启回读的局部真实证据，但完整无人值守浏览器矩阵、更高并发压力和正式安装器/签名/目标机交付仍需继续。
- `api_verified_v1` 仍需用户授权后的真实文本/图片/语音/视频短样例，并记录真实任务 ID、产物、模型、费用边界和时间。
- SQLite 当前通过显式 `STORAGE_BACKEND=sqlite` 启用；项目级媒体 manifest/数据库一致备份、派生缓存清理以及同一 `DATA_DIR` 的 JSON↔SQLite 服务级切换回退已有隔离真实证据，但正式默认切换仍未执行。JSON 默认路径保留以避免未经确认自动切换用户数据。
- 远程下载的安全实现已通过真实 HTTPS 重定向，但真实供应商媒体授权、网络策略和上游取消/费用对账仍未验证；本地 TTS/GPU/许可同样保持 pending。
- 既有 25 个 React Hooks 依赖警告不阻断构建，但应在后续 UI 收口时逐项处理。

## 回滚与恢复

1. 停止服务并保留 `DATA_DIR`。
2. SQLite 迁移失败时使用 `DATA_DIR/.sqlite-migration-backup/` 和仍保留的 JSON 源文件；不设置 `STORAGE_BACKEND=sqlite` 即回到原子 JSON 路径。
3. 项目层使用备份清单校验后恢复；SQLite 备份同时事务恢复项目/任务/资产元数据，媒体文件仍独立存放，不因代码回退被删除。
4. 运行 `pnpm run doctor`、`pnpm build` 和隔离数据目录启动检查后再恢复日常使用。

下一条执行动作已写入进度账本：在新的隔离 DATA_DIR 至少保留两个项目，继续项目包/字幕/媒体恢复、编辑保存、后台真实 MP4、页面重开和取消/重启回放，并用 `/api/diagnostics/export` 对照服务停止前后的 requestId/path，再运行更高并发压力门禁；若仍无真实安装器/证书/目标机或 provider 授权，只保留已验证源码发布包和 pending 边界，不标记完成。
