# 版本、质量门禁与发布流程

## 三种版本不要混用

| 字段 | 含义 | 来源 |
| --- | --- | --- |
| 应用版本 `0.2.1` | 本次代码能力与兼容性 | `package.json`；健康接口和发布清单读取同一来源 |
| 发布清单 `version: 1.0.0` | `release-manifest.json` 文件结构版本 | `scripts/create-release-package.mjs` |
| 项目 `schemaVersion` / `revision` | 项目格式迁移／并发写入版本 | 项目存储层；不随应用 patch 自动修改 |

应用遵循 SemVer：patch 用于兼容修复，minor 用于能力或开发环境要求变化，major 用于稳定版不兼容改动。当前为 0.x，升级前必须阅读变更日志并备份数据。

## Git 管理

- 本轮固定工作分支：`arena/2f2d2e75-aivideo-maker`，不直接修改 `main`。
- 采用小而独立的 Conventional Commits：`fix(http)`、`fix(release)`、`chore(deps)`、`chore(release)` 等。
- 不提交 `.env`、`server/data`、SQLite 文件、`node_modules`、构建结果或生成的发布包。
- 应用版本确认后使用 annotated tag，例如 `v0.2.1`；tag 表示代码快照，不表示云端供应商、Windows 安装器或托管版已验收。
- 本轮只做本地提交和标签；远端推送、PR、合并和 GitHub Release 是独立步骤，不自动执行。

## 本地验证

推荐 Node 22.22.3（见 `.node-version`）、pnpm 11.19.0。最低 Node 22.13.0，低于 25；全量审计要求 `ffmpeg` / `ffprobe` 在 PATH，FFmpeg 推荐 5+ 且具备 `libx264` 和 `subtitles` 滤镜。

```bash
pnpm install --frozen-lockfile
pnpm test                 # 版本 → lint → build → 100 项离线审计 → 体积预算
pnpm build:demo           # 单文件演示构建兼容性
pnpm audit --prod         # 生产依赖审计
pnpm audit                # 完整依赖审计；当前已知告警见 SECURITY.md
```

`pnpm check` 是底层审计入口，需先有 `dist/`；`pnpm test` / `pnpm validate` 自动按正确顺序构建。不需要真实云端密钥，不运行 `test:e2e:live`，不读取 `.env`。测试使用隔离临时目录；不要在测试命令环境里注入真实供应商密钥或正式 `SQLITE_DATABASE`。

快速验证本轮前端修复可运行 `pnpm test:frontend`（31 组 React 挂载行为回归）；验证 HTTP／发布／性能及前端回归可运行 `pnpm test:regressions`，无需 FFmpeg，但不替代全量测试。

门禁说明：

- ESLint：0 errors；现有 20 条 Hooks warnings 保留，`--max-warnings 20` 防止总数继续增加。禁止以禁用规则代替修复。
- 首屏 JS/CSS：gzip 总体积最多 300,000 bytes。`PERFORMANCE_BUDGET_BYTES` 可临时调整用于诊断，正式门禁使用默认值。该指标不是浏览器交互性能实测。
- 版本检查：`pnpm version:check`；发布前 `pnpm version:check --tag v0.2.1` 验证拟使用的 tag。
- CI：push 到 `main` / `arena/**`、PR 或手动运行时，Linux Node 22.22.3 / 24 矩阵执行同样门禁。新增 workflow 不等于已经在 GitHub 上运行成功。

## 下一次发布

1. 确认工作区现有修改归属，备份独立 `DATA_DIR`，勿使用 `git reset --hard` 丢弃他人修改。
2. 修改 `package.json` 的应用版本，补充 `CHANGELOG.md` 对应条目；不修改项目 revision 或清单格式版本来凑应用版本。
3. 运行上述验证与依赖审计，记录环境、通过项和未验证项；有已知安全告警时明确风险，不声称全绿。
4. 提交版本改动并确认 `git status --short` 干净，再运行版本/tag 校验、创建本地 annotated tag：

   ```bash
   pnpm version:check --tag v0.2.1
   git tag -a v0.2.1 -m "星幕 0.2.1：前端异步隔离与语音服务生命周期"
   ```

   以上是本版示例，下一版需使用新版本号；不要移动已存在的发布 tag。

5. 从干净且验证过的工作区创建源码发布包：

   ```bash
   pnpm release:package -- --output release/xingmu-0.2.1
   # 如需带上刚验证过的生产前端：追加 --include-dist
   ```

   输出目录必须不存在；默认不带 `dist`。`--include-dist` 要求事先成功构建；清单记录所有文件的 SHA-256/字节数、应用版本和 Git commit/dirty。`dirty: true` 的包只用于调试，不能当作该 tag 的正式产物。

6. 复核清单无凭据／用户数据，再按需推送当前工作分支、提交 PR。此会话只允许推送 `arena/2f2d2e75-aivideo-maker`；标签发布和远端 Release 由维护者另行确认。

## 回滚

本版没有项目 schema 迁移。回滚仍需先停止服务并备份 `DATA_DIR`，避免用旧代码读写升级过程中的半成品。

- 代码：优先通过 `git revert <明确的提交号>` 在当前分支追加可审计的回退提交；有依赖关系时按从新到旧顺序回退。不要覆盖其他人的提交或强推。
- 运行环境：使用上一已验证发布包，执行锁定安装与构建，再指向同一个独立 `DATA_DIR`。若数据曾迁移，必须按对应迁移文档恢复备份，不能只回退代码。
- 验证：运行 `pnpm doctor`，读取 `/api/health` 的 `version`，打开项目并核对素材／任务／渲染历史；不要删除媒体来“修复”状态。
