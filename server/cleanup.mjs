import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { proxyRenderFingerprint } from './render.mjs';

const projectIdPattern=/^[a-zA-Z0-9_-]+$/;
const tempPattern=/^\.(?:probe|voice-check|import|render|upload|package)-/;
const inside=(root,target)=>{const base=path.resolve(root);const resolved=path.resolve(target);return resolved!==base&&resolved.startsWith(`${base}${path.sep}`)};
const ageOf=async target=>{const info=await stat(target);return info.mtimeMs};

async function projectIds(dataDir,extraIds=[]){
  const files=await readdir(dataDir,{withFileTypes:true}).catch(()=>[]); const ids=new Set((Array.isArray(extraIds)?extraIds:[]).map(String).filter(id=>projectIdPattern.test(id)));
  for(const entry of files)if(entry.isFile()&&entry.name.endsWith('.json')&&projectIdPattern.test(entry.name.slice(0,-5))){try{const project=JSON.parse(await readFile(path.join(dataDir,entry.name),'utf8'));if(project.id)ids.add(String(project.id))}catch{}}
  return ids;
}

export async function previewCacheCleanup({dataDir,maxAgeMs=24*60*60*1000,now=Date.now(),projectIds:knownProjectIds=[],projectDocuments=[]}={}){
  const root=path.resolve(dataDir); await mkdir(root,{recursive:true}); const referenced=await projectIds(root,knownProjectIds); const documents=new Map((Array.isArray(projectDocuments)?projectDocuments:[]).filter(project=>project?.id).map(project=>[String(project.id),project])); const candidates=[]; const protectedPaths=[]; const cutoff=now-Math.max(0,Number(maxAgeMs)||0);
  const renderRoot=path.join(root,'render'); const renderEntries=await readdir(renderRoot,{withFileTypes:true}).catch(()=>[]);
  for(const entry of renderEntries){
    if(!entry.isDirectory()||!projectIdPattern.test(entry.name))continue;
    const target=path.join(renderRoot,entry.name);
    if(referenced.has(entry.name)){
      protectedPaths.push({path:target,reason:'project-referenced'});
      let project=documents.get(entry.name)||null;try{project ||= JSON.parse(await readFile(path.join(root,`${entry.name}.json`),'utf8'))}catch{}
      if(project){
        const currentProxy=`proxy-${proxyRenderFingerprint(project).slice(0,32)}`;
        const children=await readdir(target,{withFileTypes:true}).catch(()=>[]);
        for(const child of children){
          if(!child.isDirectory()||!child.name.startsWith('proxy-')||child.name===currentProxy)continue;
          const proxyPath=path.join(target,child.name);const mtime=await ageOf(proxyPath).catch(()=>now);
          if(mtime<cutoff)candidates.push({path:proxyPath,kind:'stale-proxy-cache',reason:'proxy-input-fingerprint-changed',ageMs:now-mtime});
          else protectedPaths.push({path:proxyPath,reason:'stale-proxy-younger-than-retention',ageMs:now-mtime});
        }
      }
      continue;
    }
    const mtime=await ageOf(target).catch(()=>now);if(mtime<cutoff)candidates.push({path:target,kind:'orphan-render-cache',reason:'no-project-reference',ageMs:now-mtime});else protectedPaths.push({path:target,reason:'cache-younger-than-retention'});
  }
  const topEntries=await readdir(root,{withFileTypes:true});for(const entry of topEntries){if(!entry.name.startsWith('.')||!tempPattern.test(entry.name))continue;const target=path.join(root,entry.name);const mtime=await ageOf(target).catch(()=>now);if(mtime<cutoff)candidates.push({path:target,kind:'stale-temporary',reason:'temporary-file-retention',ageMs:now-mtime});else protectedPaths.push({path:target,reason:'temporary-younger-than-retention'});}
  return {ok:true,dataDir:root,cutoff,referencedProjectIds:[...referenced],candidates,protected:protectedPaths};
}

export async function applyCacheCleanup(plan,{dryRun=true}={}){
  if(dryRun)return {...plan,applied:false,removed:[]}; const removed=[];
  for(const item of plan.candidates||[]){if(!inside(plan.dataDir,item.path))continue;await rm(item.path,{recursive:true,force:true});removed.push(item.path);}
  return {...plan,applied:true,removed};
}

export async function cleanupUnreferencedCache(options={}){const plan=await previewCacheCleanup(options);return applyCacheCleanup(plan,{dryRun:options.dryRun!==false});}
