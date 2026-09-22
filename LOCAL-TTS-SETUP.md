# 本地语音生成接入

星幕通过本机回环地址接入本地 TTS：中文默认使用 IndexTTS，英文默认使用 F5-TTS。音色参考样本由“角色与声音 → 本地音色库”统一管理，角色绑定后，逐句台词、场景、情绪、强度和引擎参数会自动传给对应服务。

## 1. 自动启动与退出

运行 `pnpm start` 时，星幕可按配置启动默认的 IndexTTS 中文服务；第一次加载模型时界面显示“模型加载中”。在“角色与声音”切换到 English 语音包时，项目会关闭自己启动的 IndexTTS，再启动 F5-TTS；切回中文时执行相反操作，避免两套模型争抢显存。正常使用 `Ctrl+C` 结束项目服务时，项目会同步结束自己启动的语音子进程。没有本地模型时请保持 `LOCAL_TTS_AUTOSTART=false`，这不会阻断普通编辑、手动声音回收或项目导出。

可通过 `.env` 关闭自动启动或覆盖本机路径：

```dotenv
LOCAL_TTS_AUTOSTART=false
INDEXTTS_ROOT=D:\AI\index-tts
INDEXTTS_MODEL_DIR=D:\AI\index-tts\checkpoints
INDEXTTS_PYTHON=D:\AI\index-tts\.venv\Scripts\python.exe
F5TTS_PYTHON=D:\AI\f5tts-env\Scripts\python.exe
F5TTS_APP=D:\AI\f5tts-app\app.py
```

## 2. 手动启动 IndexTTS 中文服务（故障排查）

先按 IndexTTS 官方仓库说明完成模型与依赖安装，然后在该 Python 环境运行：

```powershell
python scripts/local_tts_bridge.py --engine index-tts --version 2.5 --root "D:\AI\index-tts" --model-dir "D:\AI\index-tts\checkpoints" --port 7860
```

健康检查：`http://127.0.0.1:7860/health`

## 3. 手动启动 F5-TTS 英文服务（故障排查）

当前项目可直接连接本机的“F5-TTS 语音合成工作台”。桌面应用启动后会在 `7862` 提供状态、上传、合成任务与结果接口，不需要额外桥接。

如使用官方 F5-TTS 而非该桌面应用，也可在它的 Python 环境运行通用桥接：

```powershell
python scripts/local_tts_bridge.py --engine f5-tts --root "D:\AI\F5-TTS" --port 7862
```

桌面端状态：`http://127.0.0.1:7862/api/status`；通用桥接健康检查：`http://127.0.0.1:7862/health`

## 4. 在星幕中验证

1. 启动项目：`npm start`，等待中文语音状态显示“服务已就绪”。
2. 打开“角色与声音”，选择中文或 English 语音包；所选引擎会自动启动。
3. “API 与模型”仍可用于检查固定地址和连接状态。
4. 导入拥有使用权的单人、无配乐参考音频并填写准确原文；不限制时长，但简洁干净的片段通常更稳定，F5-TTS 的英文转写为必填。
5. 确认授权，保存音色并绑定角色，再生成当前台词或运行完整工作流。生成结果会绑定台词 ID 与场景 ID，并自动进入人声轨。

默认地址可在 `.env` 或页面中修改：

```dotenv
INDEXTTS_BASE_URL=http://127.0.0.1:7860
F5TTS_BASE_URL=http://127.0.0.1:7862
```

## 权利与许可边界

- 不要从影视作品中截取演员声音后作为公共音色包分发，除非已获得声音克隆、样音和再分发授权。
- 语音库只接受“本人/团队录制、已获授权、合成声音、公版素材”四类来源，并要求保存授权说明。
- IndexTTS 官方仓库要求商业使用另行联系其团队；F5-TTS 代码采用 MIT，但官方预训练权重因训练数据采用 CC-BY-NC，商业项目需另行确认可用权重或授权。

官方资料：[IndexTTS](https://github.com/index-tts/index-tts) · [F5-TTS](https://github.com/SWivid/F5-TTS)
