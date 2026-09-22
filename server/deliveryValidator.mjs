import { createHash } from 'node:crypto';
import { readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const FORMAT = 'xingmu-delivery-manifest';
const VERSION = 1;
const sha256 = data => createHash('sha256').update(data).digest('hex');
const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value];
const num = value => Number.isFinite(Number(value)) ? Number(value) : null;

function parseRate(value) {
  if (typeof value === 'number') return value;
  const text = String(value || '').trim();
  if (!text) return null;
  if (text.includes('/')) { const [a,b] = text.split('/').map(Number); return b ? a / b : null; }
  return num(text);
}

function normalizeCodec(value) {
  return String(value || '').toLowerCase().replace(/^avc1.*$/, 'h264').replace(/^avc3.*$/, 'h264').replace(/^hev1.*$/, 'hevc').replace(/^hvc1.*$/, 'hevc');
}

function pathInside(root, relative) {
  const raw = String(relative || '').replaceAll('\\', '/');
  if (!raw || raw.startsWith('/') || /^[A-Za-z]:\//.test(raw) || raw.split('/').includes('..')) throw Object.assign(new Error(`交付清单路径不安全：${relative}`), { code:'DELIVERY_PATH_INVALID' });
  const resolved = path.resolve(root, raw);
  const base = path.resolve(root);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) throw Object.assign(new Error(`交付清单路径越界：${relative}`), { code:'DELIVERY_PATH_INVALID' });
  return resolved;
}

function normalizeArtifact(item, index, settings = {}) {
  const expected = { ...(settings.expected || {}), ...(item.expected || {}) };
  const kind = item.kind || item.type || (String(item.path || '').match(/\.(png|jpe?g|webp)$/i) ? 'image' : String(item.path || '').match(/\.(wav|mp3|m4a|ogg)$/i) ? 'audio' : 'video');
  if (!['image','audio','video'].includes(kind)) throw Object.assign(new Error(`交付清单第 ${index + 1} 项类型无效：${kind}`), { code:'DELIVERY_SCHEMA_INVALID' });
  if (!item.path && !item.localRelativePath) throw Object.assign(new Error(`交付清单第 ${index + 1} 项缺少 path。`), { code:'DELIVERY_SCHEMA_INVALID' });
  return { id:String(item.id || item.assetId || `artifact-${index + 1}`), kind, path:String(item.path || item.localRelativePath), required:item.required !== false, sha256:item.sha256 || '', expected };
}

export function normalizeDeliveryManifest(input) {
  if (!input || typeof input !== 'object') throw Object.assign(new Error('交付 manifest 必须是 JSON 对象。'), { code:'DELIVERY_SCHEMA_INVALID' });
  const settings = { ...(input.settings || {}), ...(input.delivery || {}) };
  const rawArtifacts = input.artifacts || input.outputs || input.assets || input.entries;
  if (!Array.isArray(rawArtifacts)) throw Object.assign(new Error('交付 manifest 缺少 artifacts 数组。'), { code:'DELIVERY_SCHEMA_INVALID' });
  const artifacts = rawArtifacts.filter(item => item && item.kind !== 'source' && item.path).map((item, index) => normalizeArtifact(item, index, settings));
  if (!artifacts.length) throw Object.assign(new Error('交付 manifest 没有可验证的媒体条目。'), { code:'DELIVERY_SCHEMA_INVALID' });
  return { format:input.format || FORMAT, version:input.version || VERSION, projectId:String(input.projectId || input.project?.id || ''), title:String(input.title || input.project?.title || ''), root:String(input.root || ''), settings, artifacts };
}

function runProbe(file) {
  return new Promise(resolve => {
    let raw = ''; let error = '';
    const proc = spawn('ffprobe', ['-v','error','-show_streams','-show_format','-of','json',file], { stdio:['ignore','pipe','pipe'] });
    proc.stdout.on('data', chunk => { raw += chunk; });
    proc.stderr.on('data', chunk => { error += chunk; });
    proc.on('error', cause => resolve({ code:-1, error:cause.message, data:null }));
    proc.on('close', code => { try { resolve({ code, error:error.trim(), data:JSON.parse(raw) }); } catch { resolve({ code, error:error.trim() || 'ffprobe 输出无效。', data:null }); } });
  });
}

function pushMismatch(mismatches, field, expected, actual) { mismatches.push({ field, expected, actual }); }

function compareArtifact(item, probe, settings) {
  const expected = item.expected || {}; const streams = probe?.data?.streams || []; const video = streams.find(stream => stream.codec_type === 'video'); const audio = streams.find(stream => stream.codec_type === 'audio'); const mismatches = [];
  if (!probe?.data || probe.code !== 0) return [{ field:'probe', expected:'ffprobe 可读取', actual:probe?.error || `exit ${probe?.code}` }];
  const target = item.kind === 'audio' ? audio : video;
  if (!target) pushMismatch(mismatches, `${item.kind}.stream`, item.kind, 'missing');
  if (target && expected.width != null) { if (Number(target.width) !== Number(expected.width)) pushMismatch(mismatches,'width',Number(expected.width),Number(target.width)); }
  if (target && expected.height != null) { if (Number(target.height) !== Number(expected.height)) pushMismatch(mismatches,'height',Number(expected.height),Number(target.height)); }
  if (target && expected.codec) { const accepted=asArray(expected.codec).map(normalizeCodec); if (!accepted.includes(normalizeCodec(target.codec_name))) pushMismatch(mismatches,'codec',accepted,target.codec_name); }
  if (target && expected.fps != null) { const actual=parseRate(target.avg_frame_rate || target.r_frame_rate); const tolerance=num(expected.fpsTolerance ?? settings.fpsTolerance) ?? 0.01; if (actual == null || Math.abs(actual-Number(expected.fps)) > tolerance) pushMismatch(mismatches,'fps',{value:Number(expected.fps),tolerance},actual); }
  if (item.kind === 'video' && expected.hasAudio === true && !audio) pushMismatch(mismatches,'audioTrack',true,false);
  if (item.kind === 'video' && expected.hasAudio === false && audio) pushMismatch(mismatches,'audioTrack',false,true);
  if (audio && expected.sampleRate != null && Number(audio.sample_rate) !== Number(expected.sampleRate)) pushMismatch(mismatches,'sampleRate',Number(expected.sampleRate),Number(audio.sample_rate));
  if (audio && expected.channels != null && Number(audio.channels) !== Number(expected.channels)) pushMismatch(mismatches,'channels',Number(expected.channels),Number(audio.channels));
  const actualDuration=num(probe.data.format?.duration ?? target?.duration); const expectedDuration=num(expected.durationSec ?? expected.duration); if (expectedDuration != null) { const tolerance=num(expected.durationToleranceSec ?? settings.durationToleranceSec) ?? 0.04; if (actualDuration == null || Math.abs(actualDuration-expectedDuration) > tolerance) pushMismatch(mismatches,'durationSec',{value:expectedDuration,tolerance},actualDuration); }
  return mismatches;
}

export async function validateDeliveryManifest(input, { root = process.cwd(), hash = true } = {}) {
  const manifest = normalizeDeliveryManifest(input); const base = path.resolve(root, manifest.root || '.'); const artifacts = []; const failures = [];
  for (const item of manifest.artifacts) {
    let file;
    try { file = pathInside(base, item.path); } catch (error) { const result={...item,status:'failed',missing:false,mismatches:[{field:'path',expected:'安全相对路径',actual:error.message}]}; artifacts.push(result); failures.push(result); continue; }
    let info; try { info=await stat(file); } catch { const result={...item,status:item.required?'missing':'skipped',missing:true,mismatches:item.required?[{field:'file',expected:'存在',actual:'missing'}]:[]}; artifacts.push(result); if(item.required) failures.push(result); continue; }
    const probe=await runProbe(file); const mismatches=compareArtifact(item,probe,manifest.settings); let digest=''; if(hash){ try{digest=sha256(await readFile(file));}catch{} }
    if(item.sha256 && digest && item.sha256.toLowerCase()!==digest.toLowerCase()) pushMismatch(mismatches,'sha256',item.sha256,digest);
    const result={...item,status:mismatches.length?'failed':'passed',missing:false,bytes:info.size,sha256:digest||item.sha256||'',probe:probe.data?{format:probe.data.format||{},streams:(probe.data.streams||[]).map(stream=>({index:stream.index,codecType:stream.codec_type,codecName:stream.codec_name,width:stream.width,height:stream.height,avgFrameRate:stream.avg_frame_rate,sampleRate:stream.sample_rate,channels:stream.channels,duration:stream.duration}))}:{error:probe.error},mismatches}; artifacts.push(result); if(mismatches.length) failures.push(result);
  }
  return { ok:failures.length===0, format:manifest.format, version:manifest.version, projectId:manifest.projectId, artifacts, failures, summary:{total:artifacts.length,passed:artifacts.filter(item=>item.status==='passed').length,failed:artifacts.filter(item=>item.status==='failed').length,missing:artifacts.filter(item=>item.status==='missing').length} };
}

export function previewDeliveryPatch(input, report) {
  const manifest=normalizeDeliveryManifest(input); const byId=new Map((report.artifacts||[]).map(item=>[item.id,item])); const next={...input,validation:{status:report.ok?'passed':'failed',validatedAt:new Date().toISOString(),summary:report.summary},artifacts:(input.artifacts||input.outputs||input.assets||input.entries||[]).map(item=>{const result=byId.get(String(item.id||item.assetId||''));return result?{...item,observed:{status:result.status,bytes:result.bytes,sha256:result.sha256,probe:result.probe,mismatches:result.mismatches}}:item})}; const changes=[]; for(const [key,value] of Object.entries(next.validation)) if(JSON.stringify(input.validation?.[key])!==JSON.stringify(value))changes.push({path:`validation.${key}`,before:input.validation?.[key],after:value}); return { before:input, after:next, changes, inverse:{restore:'original-manifest',manifestPath:null} };
}

export async function applyDeliveryPatch(manifestPath, input, report) {
  const preview=previewDeliveryPatch(input,report); const backupPath=`${manifestPath}.bak`; await writeFile(backupPath,JSON.stringify(input,null,2),'utf8'); const temporary=`${manifestPath}.${Date.now()}.part`; await writeFile(temporary,JSON.stringify(preview.after,null,2),'utf8'); await rename(temporary,manifestPath); preview.inverse={restore:'backup',manifestPath:backupPath}; return { ...preview, backupPath };
}

export async function undoDeliveryPatch(manifestPath) {
  const backupPath=`${manifestPath}.bak`; const original=JSON.parse(await readFile(backupPath,'utf8')); const temporary=`${manifestPath}.${Date.now()}.undo`; await writeFile(temporary,JSON.stringify(original,null,2),'utf8'); await rename(temporary,manifestPath); return { ok:true, manifestPath, backupPath };
}

export { FORMAT as DELIVERY_MANIFEST_FORMAT, VERSION as DELIVERY_MANIFEST_VERSION };
