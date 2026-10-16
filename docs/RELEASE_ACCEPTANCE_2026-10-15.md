# 0.2.0 工程优化与回归记录

日期：2026-10-15。基线：`53c793a`。工作分支：`arena/2f2d2e75-aivideo-maker`。

## 本轮范围

本轮完成 HTTP 数据完整性／媒体传输、源码发布包安全、定向依赖升级和版本管理门禁。不进行框架重写，不调用收费供应商，不改变项目 schema，不将历史验收结果当作本轮浏览器实测。

### 修复与证据

| 问题 | 修复 | 新增／相关回归 |
| --- | --- | --- |
| 中文／emoji 被 TCP 分块截断，JSON 按字符而非字节限流 | Buffer 拼接后解码；按字节拒绝过量；明确 `INVALID_JSON`／取消错误 | `http-transport-audit.mjs` 逐字节输入、声明／实际超限、无效 JSON、中断 |
| `bytes=-3` 等尾部 Range 端点计算错误 | 独立范围解析；空文件、超界、开放范围、HEAD、416 | 14 组范围契约 + 真实 HTTP 响应断言 |
| 流读取失败、异常 URL 可能导致未处理错误 | 同一文件描述符 stat／读取；pipeline；等待异步静态处理；已开始响应不重复写 headers | 客户端中断后下一请求成功；异常编码／异常绝对 URL 后服务仍在线 |
| 缺失静态 JS 返回 HTML；gzip 忽略 q=0 | 缺失资源 404；方法限制；异步 gzip、Vary、Content-Length | MIME／状态与压缩协商／HEAD 回归 |
| 项目包成功响应早于 `.part` 清理 | inspect/import 清理结束后再返回成功 | `project-package-http-audit.mjs` 保持即时清理断言，不放宽断言 |
| 源码子目录打包失败、链接与敏感文件边界不足 | 先枚举再复制；拒绝已有目录／符号链接；排除运行数据与凭据；只回滚本次目标 | `release-safety-audit.mjs` 子目录、已有输出、链接、DATA_DIR、SHA-256 |
| 版本来源分散、性能检查只打印不阻断 | 单一应用版本；tag／changelog 检查；gzip 预算失败返回非零 | `version-check.mjs`、`performance-budget-audit.mjs`；health 版本断言 |

## 实际验证环境

- Linux x64；Node **22.22.3**；pnpm **11.19.0**。
- 测试环境初始未安装 FFmpeg / FFprobe。通过 npm / PyPI 获取隔离测试工具后加入本轮命令的 PATH，没有添加媒体二进制到项目依赖或 Git。
- FFmpeg **7.0.2**（具备 libx264、subtitles）；FFprobe **4.0.2**。
- 所有服务使用临时 DATA_DIR；本轮未修改正式 `server/data` 中的用户数据，也没有配置真实供应商密钥。

## 命令与结果

| 命令 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过；唯一锁文件可复现安装 |
| `pnpm test`（即 `pnpm validate`） | **通过**；包含版本、lint、构建、全量离线审计、性能预算 |
| `pnpm check`（由 test 调用） | **159 个语法文件、99 项离线审计通过** |
| `pnpm lint` | 0 errors、25 条既有 Hooks warnings；警告上限 25 |
| `pnpm build` | Vite 6.4.4 正常构建，1605 modules |
| `pnpm build:demo` | 单文件演示构建通过 |
| `pnpm test:regressions` | HTTP、发布安全、性能预算新增回归通过 |
| `pnpm version:check --tag v0.2.0` | 通过；拟发布 tag 与应用版本一致 |
| `pnpm test:performance` | 首屏 JS/CSS gzip **235,524 bytes**，低于 300,000 bytes 门禁 |
| `pnpm audit --prod` | 本轮 registry 返回 **无已知漏洞** |
| `pnpm audit` | **仍有 1 项高危开发依赖告警**，见下文，不计为通过 |
| 发布包审计 | 临时包锁定离线安装、构建、doctor 通过；无用户数据／环境凭据 |

全量审计包括真实 FFmpeg 合成、音画字幕、画幅／帧率、SQLite 项目包冲突复制、后台恢复、渲染取消竞态、HTTP 上传取消等。真实 TTS 审计使用本地受控桥接返回，不等价于真实 GPU 模型部署验收。

体积基线原为 gzip 235,304 bytes，本轮为 235,524 bytes（定向工具链升级后增加 220 bytes，未宣称前端包缩小）。HTTP 压缩移出同步阻塞路径，但没有执行并发吞吐基准，不宣称特定性能提升百分比。

## 安全与验收边界

- `braces@3.0.3`，`GHSA-vfj7-8cjw-p6xm`，来自开发依赖 `vite-plugin-singlefile → micromatch`。本轮 registry 查询修复版本 `3.0.4` 返回 404。已记录风险，不假装完整审计全绿，不通过忽略列表隐藏告警。详见 [SECURITY.md](../SECURITY.md)。
- 未实际运行 GitHub 托管 CI；新增的 Node 24 CI 矩阵仍需推送后验证。本机实测为 Node 22.22.3。
- 未进行本轮完整浏览器交互回放、Windows 安装器／签名、真实付费模型、真实 GPU/TTS 或公网权限系统验收。
- `local_v1` 的完整浏览器交付矩阵仍保持 pending；`api_verified_v1` 仍为 pending_external_verification；`hosted_v2` 未请求。自动化本地媒体审计通过不提升这些等级。

## 版本管理与回退

本轮改动按 HTTP 修复、发布包修复、依赖更新、版本与 CI 四类独立提交，版本为 **0.2.0**，本地 annotated tag 为 `v0.2.0`。不会自动推送、合并或创建远端 Release。

本版无 schema 迁移。升级和回滚前先停止服务并备份独立 DATA_DIR；需要回退时使用上一验证发布包，或从新到旧逐项 `git revert` 对应提交，不删除用户媒体。完整步骤见 [VERSIONING.md](./VERSIONING.md)。
