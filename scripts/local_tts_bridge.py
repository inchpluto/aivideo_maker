"""Minimal loopback bridge for IndexTTS 2/2.5 and F5-TTS.

Run this script inside the corresponding model's Python environment. It exposes
GET /health and POST /api/tts for the Xingmu Node orchestrator.
"""

import argparse
import base64
import json
import os
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def clamp(value, low, high):
    return max(low, min(high, value))


def decode_audio(data_uri, folder):
    if not isinstance(data_uri, str) or not data_uri.startswith("data:audio/"):
        raise ValueError("referenceAudio 必须是本地服务传入的 audio data URI")
    header, encoded = data_uri.split(",", 1)
    ext = ".wav" if "wav" in header else ".mp3" if "mpeg" in header else ".m4a"
    target = Path(folder) / f"reference{ext}"
    target.write_bytes(base64.b64decode(encoded, validate=True))
    return str(target)


class IndexEngine:
    name = "index-tts"

    def __init__(self, root, model_dir, version):
        if root:
            sys.path.insert(0, str(Path(root).resolve()))
        model_dir = str(Path(model_dir or (Path(root or ".") / ("checkpoints" if version == "2.5" else "checkpoints_2"))).resolve())
        module = "indextts.infer_v2_5" if version == "2.5" else "indextts.infer_v2"
        IndexTTS2 = __import__(module, fromlist=["IndexTTS2"]).IndexTTS2
        kwargs = {"model_dir": model_dir, "cfg_path": str(Path(model_dir) / "config.yaml")}
        if version == "2.5":
            kwargs["use_bf16"] = False
        else:
            kwargs["use_fp16"] = False
        self.tts = IndexTTS2(**kwargs)
        self.version = version

    def infer(self, request, reference, output):
        intensity = clamp(float(request.get("emotionIntensity", 55)) / 100, 0.1, 1.0)
        kwargs = dict(
            spk_audio_prompt=reference,
            text=request["text"],
            output_path=output,
            emo_alpha=intensity,
            use_emo_text=True,
            emo_text=request.get("emotion") or "自然、清晰、符合剧情",
            use_random=False,
            duration_factor=clamp(float(request.get("durationFactor", 1)), 0.5, 2.0),
            verbose=False,
        )
        if self.version == "2.5":
            kwargs["lang"] = "ZH"
        return self.tts.infer(**kwargs)


class F5Engine:
    name = "f5-tts"

    def __init__(self, root, _model_dir, _version):
        if root:
            sys.path.insert(0, str(Path(root).resolve() / "src"))
        from f5_tts.api import F5TTS
        self.tts = F5TTS()

    def infer(self, request, reference, output):
        reference_text = str(request.get("referenceText") or "").strip()
        if not reference_text:
            raise ValueError("F5-TTS 需要准确的英文参考音频转写")
        settings = request.get("voiceSettings") or {}
        self.tts.infer(
            ref_file=reference,
            ref_text=reference_text,
            gen_text=request["text"],
            speed=clamp(float(settings.get("speed", request.get("speed", 1))), 0.5, 2.0),
            nfe_step=int(clamp(float(settings.get("nfeStep", 32)), 8, 64)),
            cfg_strength=clamp(float(settings.get("guidance", 2.0)), 0.5, 5.0),
            cross_fade_duration=clamp(float(settings.get("crossFade", 0.15)), 0, 0.5),
            file_wave=output,
            remove_silence=bool(settings.get("removeSilence", False)),
        )


def make_handler(engine):
    lock = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        server_version = "XingmuLocalTTS/1.0"

        def send_json(self, status, body):
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path == "/health":
                return self.send_json(200, {"ok": True, "engine": engine.name})
            self.send_json(404, {"error": "not found"})

        def do_POST(self):
            if self.path != "/api/tts":
                return self.send_json(404, {"error": "not found"})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length <= 0 or length > 12_000_000:
                    raise ValueError("请求为空或超过 12MB")
                request = json.loads(self.rfile.read(length))
                if not str(request.get("text") or "").strip():
                    raise ValueError("text 不能为空")
                with tempfile.TemporaryDirectory(prefix="xingmu-tts-") as folder:
                    reference = decode_audio(request.get("referenceAudio"), folder)
                    output = str(Path(folder) / "output.wav")
                    with lock:
                        engine.infer(request, reference, output)
                    audio = Path(output).read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(audio)))
                self.end_headers()
                self.wfile.write(audio)
            except Exception as error:
                self.send_json(400, {"error": str(error)[:500]})

        def log_message(self, pattern, *args):
            print(f"[local-tts] {self.address_string()} {pattern % args}")

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Xingmu local TTS bridge")
    parser.add_argument("--engine", choices=("index-tts", "f5-tts"), required=True)
    parser.add_argument("--root", default="", help="IndexTTS/F5-TTS repository root")
    parser.add_argument("--model-dir", default="")
    parser.add_argument("--version", choices=("2", "2.5"), default="2.5")
    parser.add_argument("--port", type=int, default=0)
    args = parser.parse_args()
    if args.engine == "index-tts":
        engine = IndexEngine(args.root, args.model_dir, args.version)
        port = args.port or 7860
    else:
        engine = F5Engine(args.root, args.model_dir, args.version)
        port = args.port or 7861
    server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(engine))
    print(f"Xingmu {engine.name} bridge: http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
