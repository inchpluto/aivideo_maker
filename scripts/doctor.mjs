import { mkdir, rm, statfs, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

const root = process.cwd();
const env = process.env;
const dataDir = path.resolve(env.DATA_DIR || path.join(root, 'server', 'data'));
const port = Number(env.PORT || 4174);

function run(command, args) {
  const result = spawnSync(command, args, { cwd:root, encoding:'utf8', windowsHide:true, timeout:10_000 });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  return { ok:result.status === 0 && !result.error, output, error:result.error?.message || '' };
}

function inspectTool(command, args = ['-hide_banner', '-version']) {
  const result = run(command, args);
  return { ok:result.ok, command, version:result.output.match(/(?:ffmpeg|ffprobe) version\s+([^\s]+)/i)?.[1] || '', error:result.ok ? '' : result.error || `${command} 不可用` };
}

async function portFree() {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
}

async function writableDirectory() {
  await mkdir(dataDir, { recursive:true });
  const file = path.join(dataDir, `.xingmu-doctor-${process.pid}-${Date.now()}.tmp`);
  await writeFile(file, 'ok', { encoding:'utf8', flag:'wx' });
  await rm(file, { force:true });
  const fs = await statfs(dataDir);
  return { freeBytes:Number(fs.bavail) * Number(fs.bsize) };
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
const nodeMinor = Number(process.versions.node.split('.')[1]);
const ffmpeg = inspectTool(env.FFMPEG_PATH || 'ffmpeg');
const ffprobe = inspectTool(env.FFPROBE_PATH || 'ffprobe');
const ffmpegFeatures = ffmpeg.ok ? run(env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-encoders']) : { ok:false, output:'' };
const subtitleFeatures = ffmpeg.ok ? run(env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-filters']) : { ok:false, output:'' };
const data = await writableDirectory().catch(error => ({ error:error.message || String(error) }));
const packageManager = process.platform === 'win32' ? run(process.env.ComSpec || 'cmd.exe', ['/d', '/c', 'pnpm', '--version']) : run('pnpm', ['--version']);
const lockfile = await import('node:fs/promises').then(({ access }) => access(path.join(root, 'pnpm-lock.yaml')).then(() => true).catch(() => false));
const report = {
  ok: nodeMajor >= 20 && nodeMajor < 25 && (nodeMajor > 20 || nodeMinor >= 19) && packageManager.ok && lockfile && !data.error && ffmpeg.ok && ffprobe.ok && /\blibx264\b/i.test(ffmpegFeatures.output),
  root,
  dataDir,
  checks: {
    node: { ok:nodeMajor >= 20 && nodeMajor < 25 && (nodeMajor > 20 || nodeMinor >= 19), version:process.versions.node, required:'20.19–24.x' },
    packageManager: { ok:packageManager.ok, version:packageManager.output.split(/\s+/)[0] || '', required:'pnpm' },
    lockfile: { ok:lockfile, file:'pnpm-lock.yaml' },
    port: { ok:await portFree(), value:port },
    dataDir: { ok:!data.error, freeBytes:data.freeBytes || null, error:data.error || '' },
    ffmpeg: { ...ffmpeg, encoderLibx264:/\blibx264\b/i.test(ffmpegFeatures.output), subtitlesFilter:/\bsubtitles\b/i.test(subtitleFeatures.output) },
    ffprobe,
    localTts: { optional:true, configured:Boolean(env.INDEXTTS_BASE_URL || env.F5TTS_BASE_URL), note:'未安装或未启动 TTS 不阻断编辑；仅影响声音生成。' }
  }
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ok ? 0 : 1;
