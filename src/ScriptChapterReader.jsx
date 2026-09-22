import React from 'react';
import { FileText, Pencil } from 'lucide-react';

export default function ScriptChapterReader({ episodes = [], onOpen }) {
  if (!episodes.length) return <div className="workspace-empty"><FileText/><b>尚无生成章节</b><span>选择模型并点击“生成剧本”，结果会写入这里。</span></div>;
  return <div className="script-chapter-reader" aria-label="小说章节全文">
    <header><div><b>章节全文</b><span>AI 生成内容已按集、章节和对白写入，可逐章打开修改。</span></div><em>{episodes.reduce((sum,item)=>sum+(item.scenes||[]).length,0)} 章</em></header>
    {episodes.map((episode, episodeIndex)=><section className="reader-episode" key={episode.id||episodeIndex}>
      <div className="reader-episode-title"><span>第 {episodeIndex+1} 集</span><h3>{episode.title||`第 ${episodeIndex+1} 集`}</h3>{episode.hook&&<p>{episode.hook}</p>}</div>
      {(episode.scenes||[]).map((scene, sceneIndex)=>{
        const lines=(episode.dialogues||[]).filter(line=>String(line.sceneRef)===String(scene.id));
        return <article className="reader-chapter" key={scene.id||sceneIndex}>
          <div className="reader-chapter-head"><span>{String(sceneIndex+1).padStart(2,'0')}</span><div><h4>{scene.heading||`章节 ${sceneIndex+1}`}</h4><small>{scene.purpose||'推进剧情'}{scene.beat?` · ${scene.beat}`:''}</small></div><button onClick={()=>onOpen?.(episodeIndex,sceneIndex)}><Pencil/>打开编辑</button></div>
          {scene.action&&<p className="reader-action">{scene.action}</p>}
          {(scene.conflict||scene.visualHook)&&<div className="reader-notes">{scene.conflict&&<span><b>冲突</b>{scene.conflict}</span>}{scene.visualHook&&<span><b>视觉</b>{scene.visualHook}</span>}</div>}
          {lines.map((line,index)=><div className="reader-dialogue" key={line.id||index}><b>{line.character||'角色'}</b><em>{line.emotion||'自然'}</em><p>{line.text}</p>{line.subtext&&<small>潜台词：{line.subtext}</small>}</div>)}
        </article>;
      })}
    </section>)}
  </div>;
}
