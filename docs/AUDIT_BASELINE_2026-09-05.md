# 星幕项目优化审计基线

审计日期：2026-09-05。项目目录：`G:\vibecoding\codex_project\aiviedo_make`。

这是一份代码审计与优化交接基线，不是已完成修复或生产验收证明。用户要求后续由单个执行模型持续推进，不开启子智能体。

## 本次实际验证

| 项目 | 结果 | 证明范围 |
| --- | --- | --- |
| 工作区版本控制 | `git status --short` 返回不是 Git 仓库 | 实施前应建立可恢复的代码基线 |
| 本机运行时 | Node v24.18.0；pnpm 11.19.0 | 仅记录本机环境，不代表最低兼容版本 |
| 独立构建 | `pnpm exec vite build --outDir .audit-build/2026-09-05` 通过 | 1599 个模块；未覆盖原 `dist/` |
| 构建体积 | 单文件 HTML 6,226.67 kB，gzip 4,317.61 kB | 当前内联策略的实测体积，不是页面加载耗时 |
| 16 项现有审计 | 全部退出码 0 | 纯函数/源码约束检查，不能代替浏览器和真实服务验收 |
| 存储配额探针 | `QuotaExceededError`，服务端 fetch 次数 0 | 确认浏览器存储失败会阻断服务端保存 |
| 质量门禁探针 | 4 个分镜均缺首尾帧描述时，分镜阶段 `score=90,state=done` | 确认评分阈值会跳过必要条件 |
| FFmpeg / ffprobe | 能在 PATH 找到 | 未执行本次成片渲染，不宣称编码器/字体能力全部就绪 |

通过的审计命令：

```text
test:prompts
test:plan
test:motion
test:editing
test:context
test:models
test:voice-performance
test:timeline
test:ui
test:canvas
test:effects
test:linkage
test:script-voice-ui
test:assistant-route
test:runway-prompt
test:video-platforms
```

本次没有运行 `test:voices`：它通过 `listVoicePacks()` 访问实际音色库，并可能初始化文件，应先改成隔离测试。没有运行 `test:e2e:live`、调用付费生成、读取 `.env` 内容或验证任何账户的真实模型权限。没有启动/重启用户服务，没有操作现有用户项目和媒体。没有进行本轮浏览器点击验收、并发压测或公网安全测试。

## 确认的问题与代码位置

以下行号对应本次审计快照；格式化或重构后请按函数名重新定位。C=代码直接确认，R=本次最小探针复现。优先级含义见主方案。

| 编号 | 证据 | 位置 | 具体问题 | 处理任务 |
| --- | --- | --- | --- | --- |
| F01 | C | `src/FreeformCanvas.jsx:8,97` | 图片生成分支调用 `scenePromptContext`，当前模块没有定义或导入；可在发请求前抛 ReferenceError | T02 |
| F02 | C | `src/main.jsx:483,501` | 拆分和修剪未计算源素材入点，拆分后两段无法按源时间连续播放/渲染 | T06 |
| F03 | C | `src/main.jsx:478,509` | 预览根据选中素材播放；未形成随时间线切段、混音和变速的节目播放时钟 | T10 |
| F04 | C | `src/main.jsx:516,517` | 特效按钮与上一/下一剪辑点按钮只发成功通知，没有对应编辑或定位操作 | T02、T10 |
| F05 | C | `src/main.jsx:505,520` | 导出实际为 JSON；没有调用 `/api/render`；导出预设固定 1920×1080/24fps | T11 |
| F06 | C | `server/render.mjs:23,46,72` | 每段无条件使用默认图片；忽略真实视频/图片素材；固定720p/25fps；去除声音；字幕取镜头名 | T08、T09 |
| F07 | C | `server/render.mjs:49,63,87` | 以时长连续拼接，忽略空隙/入点/叠放；同项目固定输出目录和文件名，可覆盖结果 | T08、T11 |
| F08 | R | `src/workflow.js:208,212` | `localStorage.setItem` 在服务器请求及其 try/catch 之前；存储配额错误使服务器完全收不到保存 | T03 |
| F09 | C | `src/main.jsx:567` | 在 React 状态 updater 中触发全量保存和状态更新；无请求排队、去抖或版本约束 | T03 |
| F10 | C | `src/main.jsx:564` | 等待旧项目任务结束后未再次核对取消状态和当前 projectId，存在跨项目写回路径 | T02、T12 |
| F11 | C | `server/store.mjs:16`、`server/index.mjs:165` | 原子替换和进程内队列已存在，但全量 PUT 无 revision 比较；不能防逻辑丢更新 | T03、T13 |
| F12 | C | `server/index.mjs:147`、`server/jobs.mjs:11` | 只对返回 taskId 的视频记录任务；没有统一后台任务队列、租约、取消、幂等和恢复体系 | T12 |
| F13 | R | `server/pipeline.mjs:27,64` | 阶段评分达到85即可 done，与必要条件未满足相冲突 | T04 |
| F14 | C | `server/pipeline.mjs:54,67` | 用固定轨道索引与片段数量推断视频覆盖，未验证镜头资产映射及媒体可用性 | T04、T06 |
| F15 | C | `vite.config.js:1`、`src/workflow.js:175` | 前端请求相对 `/api`，开发配置无代理；默认 Vite 开发端口无法按文档直接连后端 | T01 |
| F16 | C | `vite.config.js:7` | 100MB 内联阈值、禁用 CSS 拆分与动态分块，造成6MB级单文件 | T20 |
| F17 | C | `server/index.mjs:168,182` | 媒体和成片整文件读内存，无 Range/206/HEAD；大文件拖动与并发存在瓶颈 | T07 |
| F18 | C | `server/index.mjs:42`、`server/store.mjs:77` | 上传/远程下载多次整块缓冲；远程资产仅校验 https，未限制目标IP、重定向、字节数 | T07、T05 |
| F19 | C | `server/index.mjs:95,179,209` | 服务默认只监听127.0.0.1，已有 Origin 检查；但无会话鉴权/Host白名单，且接受任意 frameFile 输入 | T05 |
| F20 | C | `server/config.mjs:24,72` | 配置写入无统一修改队列，临时名仅时间戳；并发更新可能覆盖且有命名碰撞风险 | T03、T05 |
| F21 | C | `server/providers.mjs:136,153,158` | JSON解析被当作结构校验；非严格供应商响应没有统一本地业务Schema验证 | T14 |
| F22 | C | `server/index.mjs:137`、`server/providers.mjs:143,152` | 大文本及序列化输入按字符硬截断；没有按章节预算处理与覆盖清单 | T15 |
| F23 | C | `server/workflow.mjs:20,29` | 本地解析含固定人物外观/剧情默认值，场景仅前4章；应明确为待确认建议，不作为原文事实 | T15 |
| F24 | C | `server/localTtsManager.mjs:8,14,39` | 启停健康地址固定，和可配置 BASE_URL 不一致；缺启动互斥和正在推理时的安全切换 | T17 |
| F25 | C | `server/store.mjs:49`、`server/jobs.mjs:43` | 删除只覆盖项目文件/资产/任务，未包含渲染产物，也未阻止执行中任务重新写回 | T13、T18 |
| F26 | C | `scripts/validate-delivery.mjs:17` | 验收清单写死《雾港来信》文件名；未完整校验帧率、音轨、指定时长，也不执行自动回填 | T18、T21 |
| F27 | C | `scripts/editor-ui-audit.mjs:5`、`scripts/react-effect-audit.mjs:8` | 部分测试只是源码正则，不能验证点击、Effect竞态、实际排版；缺统一test/lint/typecheck | T01、T21 |
| F28 | C | `README.md`、`QA_REPORT.md`、`ai-delivery/README.md` | README渲染/模型路径与现代码不同；素材说明声称验收后自动回填，但脚本只验证；旧QA混合历史阶段 | T22 |

补充维护事实：`src/main.jsx` 271,724字节、626行；`src/styles.css` 233,657字节、290行，含大量长行。源目录存在 `main.jsx.corrupted.bak`、`.recovered`、`.reversed-check`，不能当正常维护入口。`.gitignore` 仅3条，未覆盖完整生成资产、任务、日志和构建目录。

## 不应夸大的结论

- 未发现“已经公网暴露”的证据；默认监听回环地址。联网版本仍必须完成身份和项目权限隔离。
- 服务端已有原子写入和写队列；应补版本冲突处理，而不是重复声称它完全没有持久化保护。
- 已有真实 provider 适配、严格模式、手动素材回收、剪辑提案和版本记录；应保留、统一并验证。
- 本轮构建及16项脚本通过，不能据此宣称完整成片、无运行时错误、真实模型可调用。
- SSRF、并发覆盖、TTS切换等以代码路径/设计缺口为依据；本轮没有攻击服务或故障注入实际用户环境。

## 两个可重跑的隔离探针

在项目根目录把以下 JavaScript 交给 Node 的模块模式运行；不读用户数据、不发真实网络请求：

```js
import { syncProject } from './src/workflow.js';
let fetchCalls = 0;
globalThis.localStorage = {
  setItem() {
    const error = new Error('quota');
    error.name = 'QuotaExceededError';
    throw error;
  }
};
globalThis.fetch = async () => {
  fetchCalls++;
  return { ok: true, json: async () => ({}) };
};
try { await syncProject({ id: 'quota-probe' }); }
catch (error) { console.log(error.name, fetchCalls); }
// 审计时输出：QuotaExceededError 0。
```

```js
import { inspectWorkflow } from './server/pipeline.mjs';
const shot = {
  sceneRef: 'scene-1', subjectAction: 'a', type: 'wide', move: 'pan',
  visualContent: 'v', sound: 's', narrativePurpose: 'p',
  duration: 3, continuity: ['a', 'b']
};
const project = { shots: Array.from({ length: 4 }, (_, i) => ({ ...shot, id: String(i) })) };
console.log(inspectWorkflow(project).stages.find(stage => stage.id === 'storyboard'));
// 审计时：score=90、state=done，同时 missing 中仍有“部分镜头缺少首尾帧”。
```

修复后应把这些探针迁入正式回归测试，并更新预期行为，保留本文件作为历史审计记录。
