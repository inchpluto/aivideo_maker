import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { saveAsset, saveRemoteAsset } from './store.mjs';

const root=path.resolve(process.env.DATA_DIR || path.join(process.cwd(),'server','data')); const dir=path.join(root,'asset-bindings'); const locks=new Map(); const keyId=value=>createHash('sha256').update(String(value)).digest('hex').slice(0,40);
const readBinding=async id=>JSON.parse(await readFile(path.join(dir,`${id}.json`),'utf8'));
const saveBinding=async binding=>{await mkdir(dir,{recursive:true});const destination=path.join(dir,`${binding.id}.json`);const temporary=path.join(dir,`.${binding.id}.${Date.now()}.tmp`);await writeFile(temporary,JSON.stringify({...binding,updatedAt:new Date().toISOString()},null,2),'utf8');await rename(temporary,destination);return binding;};

export async function bindProviderAsset({ providerTaskId, projectId='shared', kind='video', base64='', url='', contentType='video/mp4' }) {
  if (!providerTaskId || (!base64 && !url)) throw new Error('媒体绑定缺少 providerTaskId 或来源。'); const id=`binding-${keyId(`${projectId}:${providerTaskId}`)}`; const previous=locks.get(id)||Promise.resolve(); const current=previous.catch(()=>undefined).then(async()=>{const existing=await readBinding(id).catch(()=>null);if(existing?.status==='BOUND'&&existing.asset?.url)return existing.asset;await saveBinding({id,providerTaskId,projectId,kind,status:'DOWNLOADING',source:url?'remote':'inline'});try{const asset=url?await saveRemoteAsset({url,kind,projectId,assetKey:`provider-task:${providerTaskId}`}):await saveAsset({base64,contentType,kind,projectId,assetKey:`provider-task:${providerTaskId}`});await saveBinding({id,providerTaskId,projectId,kind,status:'BOUND',asset});return asset;}catch(error){await saveBinding({id,providerTaskId,projectId,kind,status:'FAILED',failure:String(error.message||error).slice(0,500),code:error.code||'ASSET_BIND_FAILED'});throw error;}});locks.set(id,current);try{return await current;}finally{if(locks.get(id)===current)locks.delete(id);}}

export async function readAssetBinding(providerTaskId, projectId='shared') { return readBinding(`binding-${keyId(`${projectId}:${providerTaskId}`)}`).catch(()=>null); }
