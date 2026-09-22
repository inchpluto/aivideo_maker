import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, CheckCircle2, FileAudio, LoaderCircle, Mic2, Pause, Play, Plus, RefreshCw, Save, ShieldCheck, SlidersHorizontal, Upload, X } from 'lucide-react';
import { listVoicePacks, saveVoiceProfile, uploadProjectMedia } from './workflow.js';
import { useModelRoute } from './useModelRoute.js';

const blankProfile = pack => ({
  id:'', packId:pack?.id||'zh-cinematic', name:'', gender:'未指定', ageStyle:'青年', tone:'自然',
  usage:'角色对白', tags:'', referenceText:'', sourceType:'owned', rightsConfirmed:false, rightsNote:'', sampleUrl:'', sampleDuration:0
});

const audioDuration = file => new Promise((resolve,reject)=>{
  const element=document.createElement('audio');
  const url=URL.createObjectURL(file);
  element.preload='metadata';
  element.onloadedmetadata=()=>{const duration=Number(element.duration);URL.revokeObjectURL(url);Number.isFinite(duration)?resolve(duration):reject(new Error('无法读取音频时长。'))};
  element.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('无法读取音频，请换用 WAV、MP3、M4A 或 OGG。'))};
  element.src=url;
});

export default function VoiceLibraryPanel({ active, draft, setDraft, notify, onBind }) {
  const voiceRoute=useModelRoute('voice');
  const [library,setLibrary]=useState({packs:[]});
  const [packId,setPackId]=useState(draft.voicePackId||'zh-cinematic');
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);
  const [playing,setPlaying]=useState('');
  const [service,setService]=useState({checking:false,status:'unknown',label:'检测服务'});
  const [pendingAudio,setPendingAudio]=useState(null);
  const audioRef=useRef(null);
  const fileRef=useRef(null);
  const pack=library.packs.find(item=>item.id===packId)||library.packs[0];
  const selectedId=draft.voiceProfileId||active?.voiceProfileId||'';
  const voices=useMemo(()=>pack?.voices||[],[pack]);
  const defaults=pack?.engine==='f5_tts_local'?{speed:1,nfeStep:32,guidance:2,crossFade:.15,seed:-1,removeSilence:false,autoEmotion:true}:{durationFactor:1,seed:-1,autoEmotion:true};
  const settings={...defaults,...(draft.voiceSettings||active?.voiceSettings||{})};
  const localMode=['index_tts_local','f5_tts_local'].includes(voiceRoute.route);const localRoutes=voiceRoute.options.filter(item=>item.id.endsWith('_local'));const apiRoutes=voiceRoute.options.filter(item=>!item.id.endsWith('_local'));
  const selectRoute=route=>{setDraft(previous=>({...previous,voiceEngine:route}));void voiceRoute.setRoute(route)};
  const patchSettings=patch=>setDraft(previous=>{const voiceSettings={...defaults,...(previous.voiceSettings||active?.voiceSettings||{}),...patch};return {...previous,voiceSettings,voiceProfile:previous.voiceProfile&&typeof previous.voiceProfile==='object'?{...previous.voiceProfile,voiceSettings}:previous.voiceProfile}});

  const reload=()=>listVoicePacks().then(data=>{setLibrary(data);if(!data.packs?.some(item=>item.id===packId))setPackId(data.packs?.[0]?.id||'zh-cinematic')}).catch(error=>notify?.(error.message));
  useEffect(()=>{void reload()},[]);
  useEffect(()=>{if(draft.voicePackId)setPackId(draft.voicePackId)},[draft.voicePackId]);
  const readService=async()=>{const response=await fetch('/api/tts/services');const data=await response.json();if(!response.ok)throw new Error(data.error||'状态读取失败');const current=data.services?.[pack?.engine];const next={checking:false,status:current?.ready?'ready':current?.state==='loading'||current?.managed?'starting':'offline',label:current?.ready?'服务已就绪':current?.state==='loading'||current?.managed?'模型加载中':'服务未启动',base:current?.base||''};setService(next);return next};
  const checkService=async(silent=false)=>{setService({checking:true,status:'starting',label:'正在启动'});try{const response=await fetch('/api/tts/services/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({engine:pack?.engine,waitMs:0})});const data=await response.json();if(!response.ok)throw new Error(data.error||'服务启动失败');const next=await readService();if(!silent)notify?.(next.status==='ready'?`${data.label} 已连接`:`${data.label} 正在后台加载`) }catch(error){setService({checking:false,status:'offline',label:'启动失败'});if(!silent)notify?.(error.message)}};
  useEffect(()=>{if(localMode&&pack?.engine)void checkService(true)},[localMode,pack?.engine]);
  useEffect(()=>{if(service.status!=='starting')return;const timer=window.setInterval(()=>void readService().catch(()=>{}),2000);return()=>window.clearInterval(timer)},[service.status,pack?.engine]);
  useEffect(()=>()=>{if(pendingAudio?.url)URL.revokeObjectURL(pendingAudio.url)},[pendingAudio?.url]);

  const bind=voice=>{
    if(!voice.sampleUrl||!voice.rightsConfirmed)return void openEditor(voice);
    const binding={
      voice:voice.name,voiceProfileId:voice.id,voicePackId:pack.id,voiceEngine:pack.engine,voiceLanguage:pack.language,
      voiceReferenceUrl:voice.sampleUrl,voiceReferenceText:voice.referenceText,voiceRightsConfirmed:true,
      voiceSettings:{...defaults,...(draft.voiceSettings||active?.voiceSettings||{})},
      voiceProfile:{id:voice.id,name:voice.name,tone:voice.tone,tags:voice.tags||[],language:pack.language,engine:pack.engine,referenceText:voice.referenceText,voiceSettings:{...defaults,...(draft.voiceSettings||active?.voiceSettings||{})}}
    };
    setDraft(previous=>({...previous,...binding}));onBind?.(binding);
    notify?.(`${voice.name} 已绑定到 ${draft.name||active?.name||'当前角色'}`);
  };
  const openEditor=voice=>{setPendingAudio(null);setEditing({...blankProfile(pack),...voice,packId:pack.id,tags:(voice?.tags||[]).join('，'),rightsConfirmed:Boolean(voice?.rightsConfirmed)})};
  const chooseAudio=async event=>{const file=event.target.files?.[0];if(!file)return;try{const duration=await audioDuration(file);setPendingAudio({name:file.name,duration,url:URL.createObjectURL(file)});notify?.(`已导入 ${file.name}，可立即试听`)}catch(error){setPendingAudio({name:file.name,duration:0,url:URL.createObjectURL(file)});notify?.(error.message)}};
  const play=voice=>{
    if(!voice.sampleUrl)return void openEditor(voice);
    if(playing===voice.id){audioRef.current?.pause();setPlaying('');return}
    audioRef.current?.pause();const audio=new Audio(voice.sampleUrl);audioRef.current=audio;audio.play().then(()=>setPlaying(voice.id)).catch(()=>notify?.('样音播放失败'));audio.onended=()=>setPlaying('');
  };
  const save=async()=>{
    const file=fileRef.current?.files?.[0];
    if(!editing.name.trim())return notify?.('请填写音色名称');
    if(!editing.rightsConfirmed)return notify?.('请先确认样音使用权');
    if(pack.language.startsWith('en')&&!editing.referenceText.trim())return notify?.('F5-TTS 需要填写与样音完全一致的英文文本');
    setSaving(true);
    try{
      let sampleUrl=editing.sampleUrl;let sampleDuration=Number(editing.sampleDuration||0);let sampleMetadata=editing.sampleMetadata||null;let sampleQuality=editing.sampleQuality||null;
      if(file){
        sampleDuration=Number(pendingAudio?.duration||await audioDuration(file).catch(()=>0));
        const asset=await uploadProjectMedia('voice-library',file,'voice-sample');sampleUrl=asset.url;sampleMetadata=asset.mediaMetadata||null;sampleQuality=asset.sampleQuality||null;
      }
      if(!sampleUrl)throw new Error('请选择参考音频。');
      const result=await saveVoiceProfile({...editing,packId:pack.id,sampleUrl,sampleDuration,sampleMetadata,sampleQuality,tags:editing.tags.split(/[，,]/).map(item=>item.trim()).filter(Boolean)});
      setLibrary(result.library);setEditing(null);setPendingAudio(null);if(fileRef.current)fileRef.current.value='';
      notify?.('音色已保存到本地语音库');
    }catch(error){notify?.(error.message)}finally{setSaving(false)}
  };

  return <section className="voice-library-panel">
    <header><div><Mic2/><span><b>声音生成方式</b><small>{localMode?'本地参数合成，不发送创作资料':'API 表演生成，使用剧情提示词'}</small></span></div>{localMode&&<button className="outline" onClick={()=>openEditor()}><Plus/>添加音色</button>}</header>
    <div className="voice-mode-tabs"><button className={localMode?'active':''} onClick={()=>selectRoute(pack?.engine||'index_tts_local')}><b>本地合成</b><small>IndexTTS / F5-TTS</small></button><button className={!localMode?'active':''} onClick={()=>selectRoute(apiRoutes[0]?.id||'eleven_v3')}><b>API 生成</b><small>剧情与表演提示词</small></button><select aria-label="选择声音生成模型" value={voiceRoute.route} onChange={event=>selectRoute(event.target.value)}>{(localMode?localRoutes:apiRoutes).map(item=><option value={item.id} key={item.id}>{item.provider} · {item.name}</option>)}</select></div>
    {!localMode&&<div className="api-voice-setup"><div><Bot/><span><b>{voiceRoute.selected?.name}</b><small>场景、人物目标、潜台词、情绪和停顿将组成表演提示词；API 才接收自然语言导演指令。</small></span></div><label>供应商 Voice ID<input value={draft.voiceId||active?.voiceId||''} onChange={event=>setDraft(previous=>({...previous,voiceId:event.target.value,voiceEngine:voiceRoute.route}))} placeholder="可留空并使用 API 页面默认 Voice ID"/></label><div className="api-performance-fields"><span>台词原文</span><span>场景上下文</span><span>角色目标</span><span>潜台词</span><span>情绪与强度</span><span>停顿与重音</span></div></div>}
    {localMode&&<><nav aria-label="语音包">{library.packs.map(item=><button key={item.id} className={packId===item.id?'active':''} onClick={()=>{setPackId(item.id);setEditing(null);selectRoute(item.engine)}}><b>{item.language.startsWith('zh')?'中文':'English'}</b><small>{item.engine==='index_tts_local'?'IndexTTS':'F5-TTS'}</small></button>)}</nav>
    <div className={`voice-service-state ${service.status}`}><span><i/>{service.label}<small>{service.base||'按项目配置地址'}</small></span><button disabled={service.checking} onClick={()=>checkService(false)}>{service.checking?<LoaderCircle className="spin"/>:<RefreshCw/>}检测</button></div>
    <div className="voice-library-list">{voices.map(voice=><article key={voice.id} className={`${selectedId===voice.id?'selected':''} ${voice.status==='ready'?'ready':'needs-sample'}`}>
      <button className="voice-sample-play" aria-label={`${playing===voice.id?'暂停':'试听'}${voice.name}`} onClick={()=>play(voice)}>{playing===voice.id?<Pause/>:voice.sampleUrl?<Play/>:<Upload/>}</button>
      <button className="voice-card-main" onClick={()=>bind(voice)}><b>{voice.name}</b><span>{voice.tone} · {voice.usage}</span><small>{voice.status==='ready'?'样音就绪':'待导入参考音频'}</small></button>
      <button className="voice-bind" onClick={()=>bind(voice)}>{selectedId===voice.id?<><Check/>已绑定</>:voice.status==='ready'?'选择':'配置'}</button>
    </article>)}</div>
    <p className="voice-rights-note"><ShieldCheck/>仅导入自有、明确授权、合成或公版声音；不内置影视演员未授权音色。</p>
    <details className="voice-engine-settings" open>
      <summary><span><SlidersHorizontal/>合成参数</span><small>{pack?.engine==='f5_tts_local'?'F5-TTS':'IndexTTS 2.5'}</small></summary>
      {pack?.engine==='f5_tts_local'?<div className="voice-setting-grid">
        <label><span>语速 <b>{Number(settings.speed).toFixed(1)}×</b></span><input type="range" min="0.5" max="2" step="0.1" value={settings.speed} onChange={event=>patchSettings({speed:Number(event.target.value)})}/></label>
        <label><span>NFE 步数 <b>{settings.nfeStep}</b></span><input type="range" min="8" max="64" step="4" value={settings.nfeStep} onChange={event=>patchSettings({nfeStep:Number(event.target.value)})}/></label>
        <label><span>引导强度 <b>{Number(settings.guidance).toFixed(1)}</b></span><input type="range" min="0.5" max="5" step="0.1" value={settings.guidance} onChange={event=>patchSettings({guidance:Number(event.target.value)})}/></label>
        <label><span>交叉淡化 <b>{Number(settings.crossFade).toFixed(2)}s</b></span><input type="range" min="0" max="0.5" step="0.01" value={settings.crossFade} onChange={event=>patchSettings({crossFade:Number(event.target.value)})}/></label>
        <label className="seed-field"><span>随机种子</span><input type="number" value={settings.seed} onChange={event=>patchSettings({seed:Number(event.target.value)})}/></label>
        <label className="voice-switch"><input type="checkbox" checked={Boolean(settings.removeSilence)} onChange={event=>patchSettings({removeSilence:event.target.checked})}/><span>去除首尾静音</span></label>
      </div>:<div className="voice-setting-grid index-settings">
        <label><span>时长系数 <b>{Number(settings.durationFactor).toFixed(2)}×</b></span><input type="range" min="0.5" max="2" step="0.05" value={settings.durationFactor} onChange={event=>patchSettings({durationFactor:Number(event.target.value)})}/></label>
      </div>}
      <label className="voice-switch auto-emotion"><input type="checkbox" checked={Boolean(settings.autoEmotion)} onChange={event=>patchSettings({autoEmotion:event.target.checked})}/><span>按当前剧情与台词情绪自动调整</span></label>
    </details>
    {editing&&<div className="voice-profile-editor">
      <header><div><FileAudio/><span><b>{editing.id?'配置音色':'添加音色'}</b><small>{pack.language} · {pack.engine}</small></span></div><button aria-label="关闭音色编辑" onClick={()=>setEditing(null)}><X/></button></header>
      <div className="voice-profile-grid">
        <label>音色名称<input value={editing.name} onChange={event=>setEditing(value=>({...value,name:event.target.value}))} placeholder="如：青年女声·清澈克制"/></label>
        <label>声音质感<input value={editing.tone} onChange={event=>setEditing(value=>({...value,tone:event.target.value}))} placeholder="音高、质感、节奏"/></label>
        <label>适用场景<input value={editing.usage} onChange={event=>setEditing(value=>({...value,usage:event.target.value}))} placeholder="主角对白 / 旁白"/></label>
        <label>标签<input value={editing.tags} onChange={event=>setEditing(value=>({...value,tags:event.target.value}))} placeholder="青年，女声，克制"/></label>
        <label className="full">样音原文<textarea value={editing.referenceText} onChange={event=>setEditing(value=>({...value,referenceText:event.target.value}))} placeholder={pack.language.startsWith('en')?'Required: exact transcript of the reference audio':'建议填写与样音完全一致的文字'}/></label>
        <label>来源<select value={editing.sourceType} onChange={event=>setEditing(value=>({...value,sourceType:event.target.value}))}><option value="owned">本人/团队录制</option><option value="licensed">已获授权</option><option value="synthetic">合成声音</option><option value="public-domain">公版素材</option></select></label>
        <label>授权说明<input value={editing.rightsNote} onChange={event=>setEditing(value=>({...value,rightsNote:event.target.value}))} placeholder="授权人、范围或来源"/></label>
      </div>
      <label className="voice-file-drop"><Upload/><span><b>{pendingAudio?.name||editing.sampleUrl?'可更换参考音频':'选择参考音频'}</b><small>WAV / MP3 / M4A / OGG · 不限时长，单人干声效果更稳定</small></span><input ref={fileRef} type="file" accept="audio/wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg" onChange={chooseAudio}/></label>
      {(pendingAudio?.url||editing.sampleUrl)&&<div className="voice-import-preview"><div><FileAudio/><span><b>{pendingAudio?.name||editing.name||'已保存参考音频'}</b><small>{pendingAudio?.duration?`${pendingAudio.duration.toFixed(1)} 秒`:'时长读取中或由浏览器决定'}</small></span></div><audio controls preload="metadata" src={pendingAudio?.url||editing.sampleUrl}/></div>}
      <label className="voice-consent"><input type="checkbox" checked={editing.rightsConfirmed} onChange={event=>setEditing(value=>({...value,rightsConfirmed:event.target.checked}))}/><span>我确认拥有该声音及样音的使用权，并获得必要的声音克隆同意。</span></label>
      <button className="primary full" disabled={saving} onClick={save}>{saving?<LoaderCircle className="spin"/>:<Save/>}保存到本地语音库</button>
    </div>}</>}
  </section>;
}
