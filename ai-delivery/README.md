# 星幕短剧 · 素材生产交付包（按工具拆分版）

本目录是一个可替换项目的交付素材示例，实际项目名称、ID、文件和技术目标由 `delivery-manifest.json` 声明，不由验收脚本写死。
本目录已按「你在用哪些工具」拆分：**每类素材一个工具对应一份"复制即用"的提示词卡片**，
你不需要让某个模型读整个文件夹，只需在对应工具里粘贴对应卡片即可。

## 你的工具分工（按你说的）

| 素材 | 用什么工具 | 提示词卡片 |
|---|---|---|
| 图片（角色/场景/首帧） | ChatGPT 网站 / SenseNova 等 | `tools/image-chatgpt.md`、`tools/image-sensenova.md` |
| 配音（3 句对白） | VoxCPM2 / Breeze TTS 2 | `tools/voice-voxcpm2.md`、`tools/voice-breezett2.md` |
| 视频（6 个镜头） | MiniMax H3 / 豆包对话 / 可灵 AI | `tools/video-tools.md` |

## 全局规格（任何工具产出的文件都必须满足）

- 图片：PNG、1280x720（16:9）、无文字/水印/Logo/边框。
- 配音：WAV、44100Hz、单声道、16bit；无背景音/噪声，人声清晰。
- 视频：MP4（H.264）、1280x720、25fps、无声轨；时长必须等于卡片指定 ±0.5s。
## 使用步骤

1. **读剧本圣经**（`text/_text-bible.md`）了解故事、角色、场景、镜头——这是所有生成的唯一事实来源，务必先读一遍。
2. **生成顺序**：
   - 先 `image-*` 卡片产出**角色图**（2 张）→ **场景图**（3 张）→ **镜头首帧图**（6 张）。
   - 再 `voice-*` 卡片产出**配音**（3 句）。
   - 最后 `video-tools.md` 产出**镜头视频**（6 段），**图生视频优先**（用对应首帧图做第一帧）。
3. **保存位置**：所有产物放入 `out/` 对应子目录——
   - `out/image/`（11 张 PNG）、`out/audio/`（3 段 WAV）、`out/video/`（6 段 MP4）。
   - 文件名必须与卡片里指定的完全一致（例如 `char-1-shenzhiyao.png`、`voice-ep1d1.wav`、`video-01.mp4`）。
4. **验收**：先复制并按当前项目修改 `delivery-manifest.example.json` 为 `delivery-manifest.json`，再运行（在项目根目录）：
   ```bash
   node scripts/validate-delivery.mjs --manifest ai-delivery/delivery-manifest.json --root ai-delivery --strict --preview
   ```
   预览确认后，使用 `--apply` 将实际探测结果回填到 manifest；如需撤销，使用 `--undo`。只有通过验证的素材才可进入工作台并用 FFmpeg 渲染器合成 MP4 成片。

## 目录结构

```
ai-delivery/
├── README.md            ← 本文件（先读）
├── delivery-manifest.example.json ← 可复制的通用清单模板
├── text/_text-bible.md  ← 剧本圣经（事实来源）
├── tools/               ← 各工具的"复制即用"提示词卡片
│   ├── image-chatgpt.md
│   ├── image-sensenova.md
│   ├── voice-voxcpm2.md
│   ├── voice-breezett2.md
│   └── video-tools.md
└── out/                 ← 产物落点（image/audio/video）
```

> 若某个工具生成的图片/视频不是 1280x720，请在工具里设置画幅为 16:9 或产出后放大/裁剪到 1280x720。
