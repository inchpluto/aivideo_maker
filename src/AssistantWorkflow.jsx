// 混合补全工作台：优先按当前模型路由生成，无法自动执行时保留提示词与回填闭环。
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronDown, Copy, FileText,
  Image as ImageIcon, LoaderCircle, MonitorPlay, Music2, Upload, WandSparkles
} from 'lucide-react';
import { generateTask, applyProjectTask, uploadProjectAsset, uploadProjectMedia } from './workflow.js';
import { compilePromptTask } from '../server/prompts.mjs';
import { buildProductionPlan } from './productionPlan.js';
import { CONSISTENCY_MODES } from '../shared/assetPolicy.mjs';
import { useModelRoute } from './useModelRoute.js';
import { compileVoicePerformance, voicePayloadFromPerformance } from '../shared/voicePerformance.mjs';

const STAGE_LABEL = { '剧本':'剧本', '人物':'人物', '道具':'道具', '场景':'场景', '声音':'声音', '首帧':'首帧', '视频':'视频', '剪辑':'剪辑' };
const COST_META = {
  text:   { label:'文本 · 当前剧本模型', icon:FileText, hint:'按模型中心当前选择生成并写回' },
  image:  { label:'图片 · 外部平台生成后上传', icon:ImageIcon, hint:'复制提示词 → 免费平台生成 → 上传回填' },
  voice:  { label:'声音 · 自动或手动', icon:Music2, hint:'当前声音模型合成，或复制提示词后回填' },
  video:  { label:'视频 · 外部平台生成后上传', icon:MonitorPlay, hint:'用首帧图生视频 → 上传回填' },
};

// 为某个任务构造生成所需的 values（与手动工作台 buildManualPromptPack 同源，这里精简用于提示词/生成）
function taskValues(project, task) {
  const t = task.task;
  const characters = project.characters || [];
  const scenes = (project.episodes || []).flatMap(ep => ep.scenes || []);
  const productionScenes = scenes.length ? scenes : [{ id:'main', heading: project.synopsis || '主场景' }];
  const dialogues = (project.episodes || []).flatMap(ep => ep.dialogues || []);
  const shots = project.shots || [];
  const sceneForShot = shot => productionScenes.find(s => String(s.id||'').endsWith(String(shot?.sceneRef||''))) || productionScenes.find(s => String(s.id||'').includes(`scene-${shot?.sceneRef}`)) || productionScenes[0];

  if (t === 'story') {
    const context = project.creativeBrief || {};
    return {
      title: project.title, type: project.type, synopsis: project.synopsis,
      sourceType: context.sourceType || 'project', creativeMode: context.mode || 'adapt',
      designConstraints: context.designConstraints || '', mustKeep: context.mustKeep || '',
      avoid: context.avoid || '人物身份漂移、无因果转折、重复对白、不可拍摄的抽象描述',
      targetEnding: context.targetEnding || '', theme: project.theme || '请提炼',
      structure: project.structure || '三幕式', episodeCount: project.episodes?.length || 1,
      episodeLength: project.workflow?.episodeLength || 90, aspectRatio: project.settings?.aspectRatio || '9:16',
      genre: project.storyBible?.genre || '待确定', audience: project.storyBible?.audience || '短视频观众',
      visualStyle: project.storyBible?.visualStyle || '电影级写实',
      adaptation: context.mode === 'planned' ? '严格遵守已确认方案，只补全可拍摄结构' : '忠于核心冲突',
      publishPlatform: project.platformPlan?.targetPlatform || 'YouTube Shorts / Bilibili',
      performanceGoal: '提高选择观看率、相对留存与完播，同时兑现故事承诺',
      retentionLessons: '暂无历史数据，不得伪造', characters: characters.map(c => c.name).join('、'),
      existingEpisodes: project.episodes || [], sourceText: project.source?.excerpt || project.synopsis
    };
  }
  if (t === 'editing') {
    const timeline = project.timeline || [];
    return {
      instruction: '压缩无效停顿；兑现开场承诺；对白与字幕先对齐；使用动作匹配和 J/L Cut；统一响度',
      deliveryPlatform: project.platformPlan?.targetPlatform || 'YouTube Shorts / Bilibili',
      targetDuration: `${timeline.reduce((n,i)=>Math.max(n,Number(i.start||0)+Number(i.duration||0)),0) || project.workflow?.episodeLength || 90} 秒`,
      aspectRatio: project.settings?.aspectRatio || '9:16', fps: project.settings?.fps || 24,
      shots: shots.map(s=>`${s.id} ${s.name} ${s.duration}s ${s.type}/${s.move}/${s.composition||'三分法'}`),
      dialogues: dialogues.map(d=>`${d.character}（${d.emotion||'自然'}）：${d.text}`),
      timeline, platformProfile: '竖屏使用 9:16 与 UI 安全区；不套用固定最佳时长',
      retentionData: '暂无真实数据，不得伪造', musicPlan: '音乐为对白让位，确认版权',
      soundPlan: '环境底声连续，在动作点配置克制音效'
    };
  }
  if (t === 'keyframe') {
    const shot = shots.find(s => s.id === task.target?.shotId) || shots[0] || {};
    const shotScene = sceneForShot(shot);
    const sceneProps = project.assets?.props || [];
    return {
      shotId: shot.id, shotName: shot.name, scene: shotScene.heading || project.synopsis,
      sceneAnchor: `时间天气=${shotScene.sceneBible?.timeWeather || ''}；布局=${shotScene.sceneBible?.layout || shotScene.heading || ''}；轴线=${shotScene.sceneBible?.axis || ''}；光向=${shotScene.sceneBible?.lighting || shot.lighting || ''}；色板=${shotScene.sceneBible?.palette || project.storyBible?.visualStyle || ''}`,
      propReferences: sceneProps.map(p=>p.name + ':' + (p.appearance||'')).join('；') || '无关键道具',
      ratio: project.settings?.aspectRatio || '9:16',
      identityReferences: characters.filter(c=>!shot.characters?.length || shot.characters.includes(c.name)).map(c=>`${c.name}：${c.appearance||''}`).join('；'),
      environmentReference: shotScene.heading || project.synopsis,
      subjectAction: shot.subjectAction || shot.prompt || '', environmentAction: shot.environmentAction || '环境保持动作前稳定状态',
      type: shot.type || '中景', angle: shot.angle || '平视', composition: shot.composition || '三分法',
      move: shot.move || '固定镜头', lighting: shot.lighting || shot.tone || '', continuity: shot.continuity,
      negativePrompt: shot.negativePrompt || '多余人物，服装变化，空间跳轴'
    };
  }
  if (t === 'voice') {
    const character = characters.find(c => c.id === task.target?.characterId) || characters[0] || {};
    const line = dialogues.find(d => d.id === task.target?.lineId) || { text:'故事现在开始。', emotion: character.emotion || '自然' };
    const scene = productionScenes.find(s => s.id === task.target?.sceneId) || productionScenes[0] || {};
    const performance=compileVoicePerformance({line,character,engine:character.voiceEngine});
    return {
      name: character.name, voice: character.voice || '待补全声音档案', voiceProfile: character.voiceProfile || {},
      personality: character.personality || '', performanceRules: character.performanceRules || [],
      age: character.age, scene: scene.heading || '当前场景', sceneContext: scene.action || project.synopsis || '',
      actingBeat: `目标：${performance.intention}；潜台词：${performance.subtext}`,...voicePayloadFromPerformance(performance),
      voiceId: character.voiceId || '', voiceProfileId: character.voiceProfileId || '',
      language: character.voiceLanguage || 'zh-CN', referenceAudio: character.voiceReferenceUrl || '',
      referenceText: character.voiceReferenceText || '', rightsConfirmed: Boolean(character.voiceRightsConfirmed),
      voiceSettings: character.voiceSettings || character.voiceProfile?.voiceSettings || {}
    };
  }
  if (t === 'environment') {
    const scene = productionScenes.find(s => s.id === task.target?.sceneId || s.heading === task.target?.scene) || productionScenes[0] || {};
    return {
      scene: scene.heading || project.synopsis, weather: scene.sceneBible?.timeWeather || '按剧情设定',
      ratio: project.settings?.aspectRatio || '16:9', visualStyle: project.storyBible?.visualStyle || '电影级写实',
      viewAngle: task.target?.viewLabel || '建立视角', sceneAnchor: `空间布局=${scene.sceneBible?.layout||''}；入口动线=${scene.sceneBible?.entrances||''}；轴线=${scene.sceneBible?.axis||''}；时间天气=${scene.sceneBible?.timeWeather||''}`,
      lighting: scene.sceneBible?.lighting || '电影主光，方向稳定', palette: scene.sceneBible?.palette || project.storyBible?.tone || '遵循故事圣经',
      props: (project.assets?.props||[]).map(p=>p.name).join('；') || '无关键道具'
    };
  }
  if (t === 'character') {
    const character = characters.find(c => c.id === task.target?.characterId) || characters[0] || {};
    return { ...character, viewAngle: task.target?.viewLabel || '正面胸像', referenceSet: '正面、3/4、侧面、全身、表情', identityAnchor: (character.imageReferences||[]).find(v=>v.url)?.url || character.imageAsset || '首轮生成', backstory: character.backstory || '根据当前人物动机推断但不增加新事实', wardrobe: character.wardrobe || character.appearance, palette: project.storyBible?.visualStyle || '遵循项目色板', visualStyle: project.storyBible?.visualStyle || '电影级写实' };
  }
  if (t === 'video') {
    const shot = shots.find(s => s.id === task.target?.shotId) || shots[0] || {};
    const shotScene = sceneForShot(shot);
    return {
      sceneAnchor: `布局=${shotScene.heading||''}；光向=${shot.lighting||''}；色板=${project.storyBible?.visualStyle||''}`,
      propState: '无关键道具', previousShotTail: '上一镜稳定尾帧', generationMode: shot.imageUrl ? 'image-to-video' : 'image-first',
      performanceMode: '无对白单镜头', imageReference: shot.imageUrl || `先完成镜头 ${shot.id} 首帧任务`,
      dialogue: '', performanceEmotion: shot.performanceEmotion || '自然',
      characterContext: characters.map(c=>c.name+'：'+(c.appearance||'')).join('；'), continuity: shot.continuity,
      subjectAction: shot.subjectAction || shot.prompt, environmentAction: shot.environmentAction || '环境产生细微、连续的物理变化',
      type: shot.type, angle: shot.angle || '平视', move: shot.move || '缓慢推进', cameraPath: `${shot.move||'缓慢推进'}；运镜路径稳定，尾帧停稳`,
      composition: shot.composition || '三分法', intensity: shot.cameraIntensity || 24, lighting: shot.lighting || shot.tone,
      visualStyle: project.storyBible?.visualStyle, audio: '环境声连续', duration: Math.max(1,Math.min(10,Number(shot.duration)||3)),
      ratio: project.settings?.aspectRatio || '16:9', startFrame: shot.startFrame, endFrame: shot.endFrame, negativePrompt: shot.negativePrompt
    };
  }
  return {};
}

export default function AssistantWorkflow({ project, updateProject, notify, onNavigate }) {
  const storyRoute = useModelRoute('story');
  const voiceRoute = useModelRoute('voice');
  const plan = useMemo(() => buildProductionPlan(project || {}), [project]);
  const [openId, setOpenId] = useState(plan.tasks[0]?.id || '');
  const [runningId, setRunningId] = useState('');
  const [promptMap, setPromptMap] = useState({});
  const [uploadingId, setUploadingId] = useState('');
  const fileRef = useRef(null);
  const uploadTargetRef = useRef(null);

  const tasks = plan.tasks || [];
  const counts = plan.counts || { text:0, image:0, voice:0, video:0 };
  const consistencyMode = plan.consistencyMode || 'standard';
  const setConsistencyMode = event => updateProject(previous => previous ? { ...previous, workflow:{ ...(previous.workflow || {}), consistencyMode:event.target.value }, updatedAt:new Date().toISOString() } : previous);

  // 打开卡片时预生成提示词（媒体类）
  const ensurePrompt = async task => {
    if (promptMap[task.id] || task.costClass === 'text') return;
    const values = taskValues(project || {}, task);
    try {
      const pack = compilePromptTask(task.task, values);
      setPromptMap(m => ({ ...m, [task.id]: pack.prompt }));
    } catch { setPromptMap(m => ({ ...m, [task.id]: '（该项目信息不足以生成提示词，请先补全上游文本任务）' })); }
  };
  useEffect(() => { if (openId) void ensurePrompt(tasks.find(t=>t.id===openId)); }, [openId, tasks]);

  // 文本与声音任务按模型中心当前路由执行。
  const runAutomatic = async task => {
    if (runningId) return;
    setRunningId(task.id);
    const route = task.task === 'voice' ? voiceRoute : storyRoute;
    notify(`${route.label} 正在处理「${task.label}」…`);
    try {
      const payload = taskValues(project || {}, task);
      const response = await generateTask(task.task, { ...payload, projectId: project?.id }, { route: route.route });
      updateProject(previous => {
        if (!previous) return previous;
        const target = task.task === 'story' ? {} : task.target || {};
        return applyProjectTask(previous, task.task, response, target);
      });
      notify(`已补全「${task.label}」`);
    } catch (error) {
      const msg = String(error?.message || error);
      if (/未配置|PROVIDER|密钥|key/i.test(msg)) notify(`${route.label} 尚不可用：可配置模型，或复制下方提示词手动生成`);
      else notify(`补全失败：${msg}`);
    } finally { setRunningId(''); }
  };

  // 上传媒体回填
  const pickUpload = task => { uploadTargetRef.current = task; fileRef.current?.click(); };
  const onFile = async event => {
    const task = uploadTargetRef.current;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !task || !project) return;
    setUploadingId(task.id);
    try {
      const isImage = task.costClass === 'image';
      const asset = isImage
        ? await uploadProjectAsset(project.id, file, `fill-${task.task}-${task.target?.shotId || task.target?.characterId || ''}`)
        : await uploadProjectMedia(project.id, file, `fill-${task.task}-${task.target?.shotId || ''}`);
      updateProject(previous => {
        if (!previous) return previous;
        if (isImage) {
          const response = { provider: '手动上传', model: '外部平台', mode: 'manual', result: { imageUrl: asset.url, url: asset.url } };
          return applyProjectTask(previous, task.task, response, task.target || {});
        }
        if (task.task === 'voice') {
          const response = { provider: '手动上传', model: '外部平台', mode: 'manual', result: { audioUrl: asset.url, url: asset.url } };
          return applyProjectTask(previous, 'voice', response, task.target || {});
        }
        if (task.task === 'video') {
          const response = { provider: '手动上传', model: '外部平台', mode: 'manual', result: { videoUrl: asset.url, url: asset.url, status: 'generated', probeStatus: asset.probeStatus, mediaMetadata: asset.mediaMetadata } };
          return { ...applyProjectTask(previous, 'video', response, task.target || {}), manualWorkflow: { ...(previous.manualWorkflow || {}), mode: 'manual-media' } };
        }
        return previous;
      });
      notify(`「${task.label}」已回填，请继续下一步`);
    } catch (error) { notify(`回填失败：${error.message || error}`); }
    finally { setUploadingId(''); uploadTargetRef.current = null; }
  };

  return (
    <main className="assistant-workflow page-scroll">
      <header className="assistant-head">
        <div>
          <span className="section-kicker">HYBRID PIPELINE</span>
          <h1>智能补全工作台</h1>
          <p>可用模型自动生成；无密钥任务提供提示词与回填入口。</p>
        </div>
        <div className="assistant-overview">
          <div className="assistant-counts">
            {Object.entries(counts).filter(([,n])=>n>0).map(([k,n])=>{
              const meta = COST_META[k] || {};
              const Icon = meta.icon || FileText;
              return <div key={k} className={`count ${k}`}><Icon size={18}/><b>{n}</b><span>{meta.label?.split('·')[0]}</span></div>;
            })}
            {!tasks.length && <div className="all-done"><CheckCircle2 size={20}/><b>全部就绪</b></div>}
          </div>
          <div className="assistant-progress"><i><em style={{width:`${tasks.length?0:100}%`}}/></i><span>{tasks.length?(counts.text?`先补齐 ${counts.text} 项剧本信息`:`还有 ${tasks.length} 项资产待完成`):'资产齐备，可进入剪辑台'}</span></div>
        </div>
      </header>

      <section className="assistant-consistency" aria-label="一致性档位">
        <div><b>素材一致性</b><span>{plan.consistencyPolicy?.description || CONSISTENCY_MODES.standard.description}</span></div>
        <label>生成范围<select aria-label="素材一致性档位" value={consistencyMode} onChange={setConsistencyMode}>{Object.entries(CONSISTENCY_MODES).map(([id,mode]) => <option value={id} key={id}>{mode.label}</option>)}</select></label>
      </section>

      <section className="assistant-steps" aria-label="工作方式">
        <span><i>1</i><b>检查缺口</b><small>定位上游缺失信息</small></span>
        <span><i>2</i><b>自动或手动生成</b><small>按当前模型路由执行</small></span>
        <span><i>3</i><b>回填并解锁</b><small>资产写回下游模块</small></span>
      </section>

      <section className="assistant-list">
        {tasks.length === 0 && (
          <div className="assistant-empty">
            <CheckCircle2 size={40}/>
            <h3>当前项目所有资产已齐</h3>
            <p>剧本、人物、场景、声音、首帧、视频与剪辑决策都已完成。</p>
            <button className="primary" onClick={() => onNavigate?.('editor')}>进入剪辑台 <span>→</span></button>
          </div>
        )}
        {tasks.map((task, index) => {
          const meta = COST_META[task.costClass] || {};
          const Icon = meta.icon || FileText;
          const isText = task.costClass === 'text';
          const isVoice = task.task === 'voice';
          const activeRoute = isVoice ? voiceRoute : storyRoute;
          const open = openId === task.id;
          const running = runningId === task.id;
          const uploading = uploadingId === task.id;
          const prompt = promptMap[task.id];
          return (
            <article key={task.id} className={`assistant-task ${open ? 'open' : ''} ${task.costClass}`}>
              <button className="assistant-task-head" onClick={() => { setOpenId(open ? '' : task.id); if (!open && !isText) void ensurePrompt(task); }}>
                <span className="task-index">{index + 1}</span>
                <span className={`task-icon ${task.costClass}`}><Icon size={18}/></span>
                <div className="task-title"><b>{task.label}</b><span>{meta.label}</span></div>
                <em>{task.stage || task.task}</em>
                <ChevronDown size={18} className="chevron"/>
              </button>
              {open && (
                <div className="assistant-task-body">
                  <p className="task-hint"><AlertCircle size={14}/> {meta.hint}</p>
                  {isText ? (
                    <div className="assistant-actions">
                      <button className="primary" disabled={!!runningId} onClick={() => runAutomatic(task)}>
                        {running ? <><LoaderCircle className="spin" size={16}/> 补全中…</> : <><WandSparkles size={16}/> 用 {activeRoute.selected?.name} 补全</>}
                      </button>
                      <p className="task-note">结果自动写回项目。</p>
                    </div>
                  ) : (
                    <>
                      <div className="assistant-actions">
                        {isVoice&&<button className="primary" disabled={!!runningId} onClick={() => runAutomatic(task)}>{running?<><LoaderCircle className="spin" size={15}/> 合成中…</>:<><WandSparkles size={15}/> 用 {activeRoute.selected?.name} 合成</>}</button>}
                        <button className="outline" onClick={() => { navigator.clipboard?.writeText(prompt || ''); notify('提示词已复制，去免费平台生成'); }}>
                          <Copy size={15}/> 复制提示词
                        </button>
                        <button className="primary" disabled={uploading} onClick={() => pickUpload(task)}>
                          {uploading ? <><LoaderCircle className="spin" size={15}/> 上传中…</> : <><Upload size={15}/> 上传回填</>}
                        </button>
                      </div>
                      <div className="assistant-prompt">
                        <div><span>提示词 <em>{task.task} · 可复制到免费平台</em></span></div>
                        <pre>{prompt || '生成中…'}</pre>
                      </div>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <input ref={fileRef} className="visually-hidden" type="file"
        accept="image/png,image/jpeg,image/webp,audio/mpeg,audio/wav,audio/mp4,audio/ogg,video/mp4,video/webm,video/quicktime"
        onChange={onFile} />
    </main>
  );
}
