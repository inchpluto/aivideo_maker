import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd());
const numberOr=(value,fallback)=>Number.isInteger(Number(value))&&Number(value)>0?Number(value):fallback;
const trimBase=value=>String(value||'').replace(/\/$/,'');
const definitions=()=>({
  index_tts_local:{
    label:'IndexTTS 2.5',base:trimBase(process.env.INDEXTTS_BASE_URL||process.env.INDEXTTS_URL||`http://127.0.0.1:${numberOr(process.env.INDEXTTS_PORT,7860)}`),health:process.env.INDEXTTS_HEALTH||'/health',
    executable:process.env.INDEXTTS_PYTHON||'',
    args:[process.env.INDEXTTS_BRIDGE||path.join(root,'scripts','local_tts_bridge.py'),'--engine','index-tts','--version',process.env.INDEXTTS_VERSION||'2.5','--root',process.env.INDEXTTS_ROOT||'','--model-dir',process.env.INDEXTTS_MODEL_DIR||'','--port',String(numberOr(process.env.INDEXTTS_PORT,7860))],
    cwd:process.env.INDEXTTS_CWD||root
  },
  f5_tts_local:{
    label:'F5-TTS',base:trimBase(process.env.F5TTS_BASE_URL||process.env.F5TTS_URL||`http://127.0.0.1:${numberOr(process.env.F5TTS_PORT,7862)}`),health:process.env.F5TTS_HEALTH||'/api/status',healthFallback:['/health'],
    executable:process.env.F5TTS_PYTHON||'',
    args:[process.env.F5TTS_APP||'','--server-only'],
    cwd:process.env.F5TTS_CWD||(process.env.F5TTS_APP?path.dirname(process.env.F5TTS_APP):root)
  }
});

let managed=null;
const startupFlights=new Map();
const inferenceQueues=new Map();
let inferenceLease=null;
let stopFlight=Promise.resolve();
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const boundedLog=value=>String(value||'').slice(-12000);
const startupDiagnostic=(output,reason='')=>{const text=boundedLog(output);if(/CUDA|out of memory|显存/i.test(text))return 'CUDA/显存不可用或不足，请检查 GPU 与模型占用。';if(/model|模型|checkpoint|权重/i.test(text))return '本地 TTS 模型或权重缺失，请检查模型目录配置。';return `${reason||'本地 TTS 进程启动失败'}${text?`：${text.slice(-600)}`:''}`};

async function probe(definition) {
  const endpoints=[definition.health,...(definition.healthFallback||[])].filter((item,index,array)=>item&&array.indexOf(item)===index);
  let last={ready:false,state:'offline',message:'未启动'};
  for(const endpoint of endpoints){
    try{
      const response=await fetch(`${definition.base}${endpoint}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(2500)});
      if(!response.ok){last={ready:false,state:'offline',message:`HTTP ${response.status}`};continue}
      const data=await response.json().catch(()=>({}));
      if(endpoint==='/api/status'&&data.status!=='ready')return {ready:false,state:data.status||'loading',message:data.message||'模型加载中',detail:data};
      return {ready:true,state:'ready',message:'服务已就绪',detail:data,healthEndpoint:endpoint};
    }catch(error){last={ready:false,state:'offline',message:error.message||'未启动'}}
  }
  return last;
}

function stopManagedChild({force=false}={}) {
  if(!managed)return {stopped:false,reason:'none'};
  const queue=inferenceQueues.get(managed.engine);
  if(!force&&(managed.activeRequests>0||queue?.running||queue?.pending.length))return {stopped:false,reason:'busy',engine:managed.engine,pid:managed.pid,startToken:managed.startToken};
  const current=managed;
  managed=null;
  stopFlight=new Promise(resolve=>{
    if(current.child?.exitCode!==null||!current.child){resolve();return;}
    const done=()=>{current.child.removeListener('error',done);current.child.removeListener('exit',done);resolve()};
    current.child.once('error',done);current.child.once('exit',done);
  });
  if(current.child&&!current.child.killed){try{current.child.kill()}catch{}}
  return {stopped:true,engine:current.engine,pid:current.pid,startToken:current.startToken};
}

async function ensureLocalTtsServiceInternal(engine,{waitMs=180000}={}) {
  const definition=definitions()[engine];if(!definition)throw new Error(`未知本地语音引擎：${engine}`);
  let childFailure='';
  const existing=await probe(definition);if(existing.ready)return {...existing,engine,label:definition.label,managed:managed?.engine===engine,pid:managed?.engine===engine?managed.pid:0,startToken:managed?.engine===engine?managed.startToken:''};
  if(managed?.engine===engine&&managed.child?.exitCode==null){
    if(waitMs<=0)return {...existing,engine,label:definition.label,managed:true,pid:managed.pid,startToken:managed.startToken};
  }else{
    if(managed&&managed.engine!==engine)throw new Error(`${definitions()[managed.engine].label} 仍由本项目托管运行中（PID ${managed.pid}），请等待当前语音任务完成后再切换引擎。`);
    if(engine==='f5_tts_local'&&!process.env.F5TTS_APP)throw Object.assign(new Error(`${definition.label} 未配置 F5TTS_APP；可先启动外部服务，或设置应用路径。`),{code:'LOCAL_TTS_START_FAILED'});
    if(!definition.executable)throw Object.assign(new Error(`${definition.label} 未配置托管 Python 路径；可先启动外部服务，或设置对应环境变量。`),{code:'LOCAL_TTS_START_FAILED'});
    if(!existsSync(definition.executable))throw Object.assign(new Error(`${definition.label} Python 环境不存在：${definition.executable}`),{code:'LOCAL_TTS_START_FAILED'});
    if(!definition.args[0]||!existsSync(definition.args[0]))throw Object.assign(new Error(`${definition.label} 启动桥接脚本不存在：${definition.args[0]||'未配置'}`),{code:'LOCAL_TTS_START_FAILED'});
    const child=spawn(definition.executable,definition.args,{cwd:definition.cwd,windowsHide:true,stdio:['ignore','ignore','pipe']});
    const startToken=randomUUID();
    managed={engine,child,pid:child.pid||0,startToken,startedAt:new Date().toISOString(),activeRequests:0};
    let childOutput='';
    child.stderr?.on('data',chunk=>{childOutput=boundedLog(`${childOutput}${chunk}`)});
    child.once('error',error=>{childFailure=startupDiagnostic(childOutput,error.message);if(managed?.startToken===startToken)managed={...managed,startError:childFailure}});
    child.once('exit',(code,signal)=>{if(code!==0||signal)childFailure=startupDiagnostic(childOutput,`本地 TTS 进程退出（code=${code ?? 'null'}, signal=${signal || 'none'}）`);if(managed?.startToken===startToken){if(childFailure)managed={...managed,startError:childFailure};else managed=null}});
  }
  if(waitMs<=0)return {ready:false,state:'starting',message:'正在启动模型',engine,label:definition.label,managed:true};
  const timeout=Math.max(0,Math.min(180000,Number.isFinite(Number(waitMs))?Number(waitMs):180000));
  const deadline=Date.now()+timeout;let current=existing;
  while(Date.now()<deadline){await wait(Math.min(1000,Math.max(50,deadline-Date.now())));if(childFailure)throw Object.assign(new Error(childFailure),{code:'LOCAL_TTS_START_FAILED'});current=await probe(definition);if(current.ready)return {...current,engine,label:definition.label,managed:true,pid:managed?.pid||0,startToken:managed?.startToken||''}}
  if(childFailure)throw Object.assign(new Error(childFailure),{code:'LOCAL_TTS_START_FAILED'});
  throw Object.assign(new Error(`${definition.label} 启动超时：${current.message}`),{code:'LOCAL_TTS_START_TIMEOUT'});
}

export function ensureLocalTtsService(engine,{waitMs=180000}={}) {
  const pending=startupFlights.get(engine);if(pending)return pending;
  const flight=ensureLocalTtsServiceInternal(engine,{waitMs}).finally(()=>{if(startupFlights.get(engine)===flight)startupFlights.delete(engine)});
  startupFlights.set(engine,flight);return flight;
}

const queueLimit=()=>numberOr(process.env.LOCAL_TTS_QUEUE_LIMIT,2);
const queueTimeout=()=>numberOr(process.env.LOCAL_TTS_QUEUE_TIMEOUT_MS,300000);
function drainInferenceQueues() {
  if(inferenceLease)return;
  for(const [engine,queue] of inferenceQueues){
    if(queue.running||!queue.pending.length)continue;
    const item=queue.pending.shift();
    if(item.timer)clearTimeout(item.timer);
    queue.running=true;inferenceLease={engine,startedAt:new Date().toISOString()};
    if(managed?.engine===engine&&managed.startToken)managed.activeRequests+=1;
    Promise.resolve().then(()=>item.task(item.service))
      .then(item.resolve,item.reject)
      .finally(()=>{
        if(managed?.engine===engine&&managed.startToken)managed.activeRequests=Math.max(0,managed.activeRequests-1);
        queue.running=false;inferenceLease=null;
        if(!queue.pending.length)inferenceQueues.delete(engine);
        drainInferenceQueues();
      });
    break;
  }
}
function enqueueInference(engine,service,task) {
  const queue=inferenceQueues.get(engine)||{running:false,pending:[]};
  const capacity=queueLimit();
  if((queue.running?1:0)+queue.pending.length>=capacity)throw new Error(`${engine} 本地语音推理队列已满（容量 ${capacity}），请稍后重试。`);
  const promise=new Promise((resolve,reject)=>{
    const item={service,task,resolve,reject,timer:null};
    item.timer=setTimeout(()=>{const index=queue.pending.indexOf(item);if(index<0)return;queue.pending.splice(index,1);reject(new Error(`${engine} 本地语音推理排队超时。`))},queueTimeout());
    queue.pending.push(item);
  });
  inferenceQueues.set(engine,queue);drainInferenceQueues();return promise;
}
export async function withLocalTtsService(engine,task) {
  const result=await ensureLocalTtsService(engine,{waitMs:180000});
  return enqueueInference(engine,result,task);
}

export async function localTtsServiceStatus() {
  const entries=await Promise.all(Object.entries(definitions()).map(async([engine,definition])=>{const queue=inferenceQueues.get(engine);const managedForEngine=managed?.engine===engine;const probeResult=await probe(definition);return [engine,{engine,label:definition.label,base:definition.base,managed:managedForEngine,pid:managedForEngine?managed.pid:0,activeRequests:managedForEngine?managed.activeRequests:0,queueRunning:Boolean(queue?.running),queueWaiting:queue?.pending.length||0,...probeResult,...(managedForEngine&&managed.startError?{state:'failed',message:managed.startError}: {})}]}));
  return {activeEngine:managed?.engine||'',activePid:managed?.pid||0,inferenceLease:inferenceLease?.engine||'',services:Object.fromEntries(entries)};
}

export function startPreferredLocalTts(engine='index_tts_local') {
  if(process.env.LOCAL_TTS_AUTOSTART!=='true')return;
  void ensureLocalTtsService(engine,{waitMs:180000}).then(result=>console.log(`[tts] ${result.label} 已随项目服务启动`)).catch(error=>console.warn(`[tts] 自动启动失败：${error.message}`));
}

export function stopLocalTtsServices(options){return stopManagedChild(options)}
export async function waitForLocalTtsStop(){await stopFlight}

export function localTtsConfiguration(engine) { const definition=definitions()[engine]; if(!definition) return null; const port=engine==='index_tts_local'?numberOr(process.env.INDEXTTS_PORT,7860):numberOr(process.env.F5TTS_PORT,7862); return { engine, label:definition.label, base:definition.base, health:definition.health, executable:definition.executable, app:engine==='f5_tts_local'?(process.env.F5TTS_APP||''):definition.args[0], port:String(port), managedStartConfigured:Boolean(definition.executable && (engine==='index_tts_local' || process.env.F5TTS_APP)) }; }
