# tools/ — 复制即用提示词卡目录说明

> 项目：星幕 AI 短剧工作台 · 短剧《雾港来信》（项目 ID `project-1787490128785`）
> 内容来源：`text/_text-bible.md`（剧本圣经，唯一事实来源，勿改动）
> 用途：为**不同外部工具**分别生成 **图像 / 语音 / 视频**素材，提示词均为"复制即用"的自包含文本。

## 本目录文件

| 文件 | 适用工具 | 内容 | 产物目录 |
|---|---|---|---|
| `image-chatgpt.md` | ChatGPT 生图（兼容其它文生图） | 2 角色 + 3 场景 + 6 首帧，共 11 条生图提示词 | `out/image/` |
| `image-sensenova.md` | 商汤 SenseNova（备用文生图） | 同上 11 条，结构相同、稍简 | `out/image/` |
| `voice-voxcpm2.md` | 开源 TTS VoxCPM-2 | 3 句对白（音色/情绪/语速/停顿） | `out/audio/` |
| `voice-breezett2.md` | 开源 TTS Breeze-TTS-2 | 3 句对白（音色/情绪/语速/停顿） | `out/audio/` |
| `video-tools.md` | MiniMax H3 / 豆包对话 / 可灵 AI 等视频工具 | 6 镜头图生视频提示词 | `out/video/` |

## 生成顺序（依赖关系）

1. **先 image，后 video**：`video-tools.md` 依赖 `image-chatgpt.md`（或 `image-sensenova.md`）产出的首帧图 `shot-XX.png` 作为输入第一帧。
   - 图像内部顺序：**角色图（char-*）→ 场景图（env-*）→ 首帧图（shot-*）**，先锚定角色再搭场景再叠加镜头，角色识别锚点必须跨图一致。
2. **voice 可并行**：`voice-voxcpm2.md` / `voice-breezett2.md` 与图像、视频互不依赖，可同时进行。

## 全局硬规格（所有产物）

- **图像**：16:9 横构图 **1280x720**，**PNG**，无文字、无水印、无签名。首帧既是图也是视频输入帧。
- **音频**：**WAV 44100Hz 单声道 16bit**，文件名 `voice-ep1d1.wav` / `voice-ep1d2.wav` / `voice-ep1d3.wav`。
- **视频**：**MP4 H.264 1280x720 25fps 无声轨**，时长 **±0.5s**（video-01=4s，02=5s，03=3s，04=4s，05=4s，06=5s）。

## 角色一致锚点（跨工具全链路保持）

- **沈知遥** = 芥末黄雨衣 + 旧银色钥匙（胸前左侧吊坠）+ 黑色齐肩短发 + 琥珀眼。
- **顾川** = 深绿旧航海夹克 + 银色口哨 + 深色短发 + 方形下颌。

## 使用流程速览

1. 读 `image-chatgpt.md` → 用 ChatGPT（或备用 `image-sensenova.md` 用 SenseNova）生成 11 张图 → 存 `out/image/`。
2. 读 `video-tools.md` → 用图生视频工具以 `shot-XX.png` 为首帧运动起来 → 存 `out/video/video-01..06.mp4`。
3. 并行读 `voice-voxcpm2.md` / `voice-breezett2.md` → 合成 3 句对白 → 存 `out/audio/`。
4. 素材齐备后交由后续合成与剪辑环节（本院线外）。