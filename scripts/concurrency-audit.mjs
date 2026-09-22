import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = await mkdtemp(path.join(os.tmpdir(), 'xingmu-concurrency-audit-'));
process.env.DATA_DIR = dataDir;
const configUrl = pathToFileURL(path.join(root, 'server', 'config.mjs')).href;
const voiceUrl = pathToFileURL(path.join(root, 'server', 'voiceLibrary.mjs')).href;
const jobsUrl = pathToFileURL(path.join(root, 'server', 'jobs.mjs')).href;
const workerCode = `
const mode=process.argv[1];
if(mode.startsWith('config:')){const {updateProviderConfig}=await import(${JSON.stringify(configUrl)});const id=mode.slice(7);await updateProviderConfig({values:id.startsWith('a')?{CUSTOM_OPENAI_MODEL:id}:{DASHSCOPE_BASE_URL:\`http://127.0.0.1:\${6400+Number(id.slice(1))}\`},routePreferences:{[id.startsWith('a')?'story':'editing']:\`route-\${id}\`}});}
else if(mode.startsWith('execution:')){const {recordRouteExecution}=await import(${JSON.stringify(configUrl)});const id=mode.slice(10);await recordRouteExecution({task:'editing',routeId:\`route-\${id}\`,provider:'audit',model:id});}
else if(mode.startsWith('voice:')){const {upsertVoice}=await import(${JSON.stringify(voiceUrl)});const id=mode.slice(6);await upsertVoice({packId:'zh-cinematic',id:\`audit-voice-\${id}\`,name:\`并发音色 \${id}\`});}
else if(mode.startsWith('claim:')){const {claimGenerationJob}=await import(${JSON.stringify(jobsUrl)});const claimed=await claimGenerationJob('claim-job',{workerId:\`audit-worker-\${mode.slice(6)}\`,leaseMs:60000});process.stdout.write(JSON.stringify({claimed:Boolean(claimed),workerId:claimed?.workerId||''}));}
else if(mode.startsWith('event:')){const {recordGenerationJobEvent}=await import(${JSON.stringify(jobsUrl)});await recordGenerationJobEvent('event-job',{type:'parallel-audit',index:Number(mode.slice(6))});}
else if(mode.startsWith('merge:')){const {saveGenerationJob}=await import(${JSON.stringify(jobsUrl)});const id=mode.slice(6);await saveGenerationJob({id:'merge-job',[\`field-\${id}\`]:true});}
`;

function runWorker(mode) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', workerCode, mode], { cwd: root, env: { ...process.env, DATA_DIR: dataDir, MOCK_MODE: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout=''; let stderr='';
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
    child.once('error', reject); child.once('exit', code => code === 0 ? resolve({ mode, stdout, stderr }) : reject(new Error(`${mode} exit ${code}: ${stderr || stdout}`)));
  });
}

try {
  await Promise.all([
    ...Array.from({length:4}, (_,index) => runWorker(`config:${index % 2 ? `b${index}` : `a${index}`}`)),
    ...Array.from({length:8}, (_,index) => runWorker(`voice:${index}`)),
  ]);
  const config = JSON.parse(await readFile(path.join(dataDir, '.provider-config.json'), 'utf8'));
  assert.match(config.values.CUSTOM_OPENAI_MODEL, /^a(?:0|2)$/);
  assert.match(config.values.DASHSCOPE_BASE_URL, /^http:\/\/127\.0\.0\.1:640[13]$/);
  await Promise.all(Array.from({length:4}, (_,index) => runWorker(`execution:${index}`)));
  const configAfterExecutions = JSON.parse(await readFile(path.join(dataDir, '.provider-config.json'), 'utf8'));
  assert.equal(Object.keys(configAfterExecutions.routeExecutions || {}).length, 4);
  assert.equal(Object.keys(configAfterExecutions.routeExecutions || {}).sort()[0], 'editing:route-0');

  const { listVoicePacks } = await import(voiceUrl);
  const library = await listVoicePacks();
  const auditVoices = library.packs.flatMap(pack => pack.voices || []).filter(voice => voice.id.startsWith('audit-voice-'));
  assert.equal(auditVoices.length, 8);

  const { saveGenerationJob, readGenerationJob } = await import(jobsUrl);
  await saveGenerationJob({ id:'claim-job', projectId:'concurrency', status:'PENDING' });
  const claimResults = await Promise.all(Array.from({length:8}, (_,index) => runWorker(`claim:${index}`)));
  const claimed = claimResults.filter(item => JSON.parse(item.stdout).claimed);
  assert.equal(claimed.length, 1);

  await saveGenerationJob({ id:'event-job', projectId:'concurrency', status:'PENDING', events:[] });
  await Promise.all(Array.from({length:12}, (_,index) => runWorker(`event:${index}`)));
  const eventJob = await readGenerationJob('event-job');
  assert.equal(eventJob.events.length, 12);

  await saveGenerationJob({ id:'merge-job', projectId:'concurrency', status:'PENDING' });
  await Promise.all(Array.from({length:12}, (_,index) => runWorker(`merge:${index}`)));
  const mergedJob = await readGenerationJob('merge-job');
  assert.equal(Object.keys(mergedJob).filter(key => key.startsWith('field-')).length, 12);
  console.log(JSON.stringify({ ok:true, configFields:2, routeExecutions:4, voices:8, singleClaim:claimed.length, events:eventJob.events.length, mergedFields:12, crossProcessLock:true }));
} finally {
  await rm(dataDir, { recursive:true, force:true });
}
