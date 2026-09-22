import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { withFileLock } from './fileCoordinator.mjs';

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'server', 'data'));
const libraryPath = path.join(dataDir, 'voice-library.json');
const safe = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);

const starterPacks = [
  { id:'zh-cinematic', name:'中文影视对白', language:'zh-CN', engine:'index_tts_local', description:'克制、悬疑、情感与叙事型中文声线', licenseNote:'仅添加自有、授权或可商用参考音频', voices:[
    { id:'zh-young-calm', name:'青年女声·清澈克制', tags:['青年','女声','克制'], gender:'女声', ageStyle:'青年', tone:'清澈偏低', usage:'主角对白', status:'needs-sample' },
    { id:'zh-mature-deep', name:'成熟男声·低沉稳重', tags:['成熟','男声','稳重'], gender:'男声', ageStyle:'成熟', tone:'低沉干净', usage:'悬疑与长辈角色', status:'needs-sample' },
    { id:'zh-narrator-warm', name:'旁白·温暖叙事', tags:['旁白','中性','温暖'], gender:'中性', ageStyle:'成熟', tone:'温暖自然', usage:'剧情旁白', status:'needs-sample' }
  ]},
  { id:'en-cinematic', name:'English Cinematic', language:'en-US', engine:'f5_tts_local', description:'Natural English dialogue and narration voices', licenseNote:'F5-TTS pretrained weights are CC-BY-NC; verify deployment use', voices:[
    { id:'en-young-intimate', name:'Young·Intimate', tags:['young','intimate','dialogue'], gender:'female', ageStyle:'young', tone:'soft and intimate', usage:'lead dialogue', status:'needs-sample' },
    { id:'en-mature-gritty', name:'Mature·Gritty', tags:['mature','gritty','drama'], gender:'male', ageStyle:'mature', tone:'low and textured', usage:'dramatic roles', status:'needs-sample' },
    { id:'en-narrator-clear', name:'Narrator·Clear', tags:['narrator','clear','neutral'], gender:'neutral', ageStyle:'adult', tone:'clear and neutral', usage:'documentary narration', status:'needs-sample' }
  ]}
];

async function readLibrary() {
  try { const data=JSON.parse(await readFile(libraryPath,'utf8')); if(Array.isArray(data.packs))return data; }
  catch {}
  return { version:'1.0.0', updatedAt:null, packs:JSON.parse(JSON.stringify(starterPacks)) };
}

async function writeLibrary(library) {
  await mkdir(dataDir,{recursive:true});
  const next={...library,version:'1.0.0',updatedAt:new Date().toISOString()};
  const temporary=`${libraryPath}.${Date.now()}.${Math.random().toString(36).slice(2,8)}.tmp`;
  await writeFile(temporary,JSON.stringify(next,null,2),'utf8');
  await rename(temporary,libraryPath);
  return next;
}

export async function listVoicePacks() { return readLibrary(); }

export async function upsertVoice(input={}) {
  return withFileLock(`${libraryPath}.lock`, async () => {
    const library=await readLibrary();
    const packId=safe(input.packId); const voiceId=safe(input.id)||`voice-${Date.now()}`;
    const pack=library.packs.find(item=>item.id===packId);
    if(!pack)throw new Error('语音包不存在。');
    const existing=pack.voices.find(item=>item.id===voiceId)||{};
    const sourceType=['owned','licensed','synthetic','public-domain'].includes(input.sourceType)?input.sourceType:'owned';
    if(input.sampleUrl&&!input.rightsConfirmed)throw new Error('导入参考音频前必须确认拥有使用权或声音授权。');
    const sampleMetadata=input.sampleMetadata&&typeof input.sampleMetadata==='object'?{duration:Number(input.sampleMetadata.duration||0),streams:Array.isArray(input.sampleMetadata.streams)?input.sampleMetadata.streams.map(stream=>({type:String(stream.type||''),codec:String(stream.codec||''),sampleRate:Number(stream.sampleRate||0),channels:Number(stream.channels||0)})).slice(0,2):[]}:existing.sampleMetadata||null;
    const sampleQuality=input.sampleQuality&&typeof input.sampleQuality==='object'?{duration:Number(input.sampleQuality.duration||0),maxVolumeDb:Number(input.sampleQuality.maxVolumeDb)}:existing.sampleQuality||null;
    const voice={...existing,id:voiceId,name:String(input.name||existing.name||'新音色').trim().slice(0,60),language:pack.language,engine:pack.engine,tags:Array.isArray(input.tags)?input.tags.map(String).slice(0,8):(existing.tags||[]),gender:String(input.gender||existing.gender||'未指定').slice(0,20),ageStyle:String(input.ageStyle||existing.ageStyle||'未指定').slice(0,20),tone:String(input.tone||existing.tone||'自然').slice(0,120),usage:String(input.usage||existing.usage||'角色对白').slice(0,120),sampleUrl:String(input.sampleUrl||existing.sampleUrl||''),referenceText:String(input.referenceText||existing.referenceText||'').trim().slice(0,1000),sampleDuration:Number(input.sampleDuration||sampleMetadata?.duration||sampleQuality?.duration||existing.sampleDuration||0),sampleMetadata,sampleQuality,sourceType,rightsConfirmed:Boolean(input.rightsConfirmed||existing.rightsConfirmed),rightsNote:String(input.rightsNote||existing.rightsNote||'').trim().slice(0,240),status:(input.sampleUrl||existing.sampleUrl)&&Boolean(input.rightsConfirmed||existing.rightsConfirmed)?'ready':'needs-sample',updatedAt:new Date().toISOString()};
    pack.voices=[...pack.voices.filter(item=>item.id!==voiceId),voice];
    return {library:await writeLibrary(library),voice};
  });
}

export async function deleteVoice(packId,voiceId) {
  return withFileLock(`${libraryPath}.lock`, async () => {
    const library=await readLibrary(); const pack=library.packs.find(item=>item.id===safe(packId));
    if(!pack)throw new Error('语音包不存在。');
    const before=pack.voices.length;pack.voices=pack.voices.filter(item=>item.id!==safe(voiceId));
    if(before===pack.voices.length)throw new Error('音色不存在。');
    await writeLibrary(library);return {packId:safe(packId),voiceId:safe(voiceId)};
  });
}

export function findVoice(library,voiceId) {
  return (library?.packs||[]).flatMap(pack=>(pack.voices||[]).map(voice=>({...voice,packId:pack.id,packName:pack.name,language:voice.language||pack.language,engine:voice.engine||pack.engine}))).find(item=>item.id===voiceId)||null;
}
