import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, Bot, CheckCircle2, Clapperboard, Download, FileText, Image,
  Keyboard, Lock, Mic2, MonitorPlay, Play, RefreshCw, Scissors, Sparkles, Type,
  Undo2, Redo2, Upload, Users, ZoomIn, ZoomOut,
} from 'lucide-react';
import { CANVAS_TEMPLATES, canvasImpactedNodes, deriveCanvasGraph } from './canvasWorkflow.js';
import FreeformCanvas from './FreeformCanvas.jsx';

const DEFAULT_POSITIONS={source:{x:24,y:150},bible:{x:214,y:150},script:{x:404,y:150},refs:{x:594,y:42},voice:{x:794,y:28},board:{x:594,y:252},prompt:{x:794,y:224},keyframe:{x:994,y:224},video:{x:1194,y:126},edit:{x:1394,y:126}};
const TARGETS={source:null,bible:'script',script:'script',refs:'characters',voice:'characters',board:'storyboard',prompt:'storyboard',keyframe:'storyboard',video:'storyboard',edit:'editor'};
const ICONS={source:BookOpen,bible:FileText,script:Type,refs:Users,voice:Mic2,board:Clapperboard,prompt:Bot,keyframe:Image,video:MonitorPlay,edit:Scissors};
const WORLD={width:1600,height:420};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const stateLabel=status=>status==='done'?'已完成':status==='ready'?'可执行':status==='stale'?'需刷新':'待前置';
const editableTarget=target=>['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)||target?.isContentEditable;

export default function ProductionCanvas({ project, onNavigate, onImport, onSaveLayout, onSaveCreative, notify }) {
  const graph=useMemo(()=>deriveCanvasGraph(project||{}),[project]);
  const saved=project?.canvas?.layout||{};
  const firstActive=graph.find(node=>node.status!=='done')?.id||'edit';
  const [template,setTemplate]=useState(saved.template||'full');
  const [view,setView]=useState(saved.view||'production');
  const [zoom,setZoom]=useState(Number(saved.zoom)||90);
  const [positions,setPositions]=useState(()=>({...DEFAULT_POSITIONS,...(saved.positions||{})}));
  const [selectedIds,setSelectedIds]=useState([firstActive]);
  const [viewport,setViewport]=useState({left:0,top:0,width:0,height:0});
  const positionsRef=useRef(positions);
  const dragRef=useRef(null);
  const suppressClickRef=useRef(false);
  const historyRef=useRef({past:[],future:[]});
  const stageRef=useRef(null);
  const importRef=useRef(null);

  useEffect(()=>{
    const layout=project?.canvas?.layout||{};
    const next={...DEFAULT_POSITIONS,...(layout.positions||{})};
    positionsRef.current=next;
    setPositions(next);
    setZoom(Number(layout.zoom)||90);
    setTemplate(layout.template||'full');
    setView(layout.view||'production');
    setSelectedIds([deriveCanvasGraph(project||{}).find(node=>node.status!=='done')?.id||'edit']);
    historyRef.current={past:[],future:[]};
  },[project?.id]);

  const visibleIds=CANVAS_TEMPLATES[template]?.nodes||CANVAS_TEMPLATES.full.nodes;
  const visible=graph.filter(node=>visibleIds.includes(node.id));
  const activeIds=selectedIds.filter(id=>visibleIds.includes(id));
  const selectedNodes=activeIds.map(id=>graph.find(node=>node.id===id)).filter(Boolean);
  const selected=selectedNodes.at(-1)||visible[0];
  const impacted=[...new Set(selectedNodes.flatMap(node=>canvasImpactedNodes(graph,node.id)))];
  const pendingImpacted=graph.filter(node=>impacted.includes(node.id)&&node.status!=='done');
  const upstream=selectedNodes.length===1?(selected?.deps||[]).map(id=>graph.find(node=>node.id===id)).filter(Boolean):[];
  const downstream=graph.filter(node=>selectedNodes.some(selectedNode=>node.deps.includes(selectedNode.id)));
  const executable=selectedNodes.some(node=>node.status!=='blocked');

  const saveLayout=(nextPositions=positionsRef.current,nextZoom=zoom,nextTemplate=template,nextView=view)=>onSaveLayout?.({positions:nextPositions,zoom:nextZoom,template:nextTemplate,view:nextView,updatedAt:new Date().toISOString()});
  const remember=before=>{historyRef.current={past:[...historyRef.current.past.slice(-29),before],future:[]}};
  const applyPositions=(next,{save=true}={})=>{positionsRef.current=next;setPositions(next);if(save)saveLayout(next)};
  const updateViewport=()=>{const stage=stageRef.current;if(!stage)return;setViewport({left:stage.scrollLeft,top:stage.scrollTop,width:stage.clientWidth,height:stage.clientHeight})};
  useLayoutEffect(()=>{updateViewport()},[zoom,template]);

  const selectNode=(event,id)=>{
    if(suppressClickRef.current)return;
    if(event.shiftKey||event.metaKey||event.ctrlKey)setSelectedIds(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
    else setSelectedIds([id]);
  };
  const beginDrag=(event,id)=>{
    if(event.button!==0)return;
    const additive=event.shiftKey||event.metaKey||event.ctrlKey;
    const nextSelection=additive?[...new Set([...activeIds,id])]:(activeIds.includes(id)?activeIds:[id]);
    if(!additive)setSelectedIds(nextSelection);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current={id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,selection:nextSelection,additive,origins:Object.fromEntries(nextSelection.map(nodeId=>[nodeId,{...(positionsRef.current[nodeId]||{x:0,y:0})}])),before:{...positionsRef.current},moved:false};
  };
  const moveDrag=event=>{
    const active=dragRef.current;if(!active)return;
    const dx=(event.clientX-active.startX)/(zoom/100),dy=(event.clientY-active.startY)/(zoom/100);
    if(!active.moved&&Math.hypot(dx,dy)<3)return;
    active.moved=true;if(active.additive)setSelectedIds(active.selection);
    const next={...positionsRef.current};
    for(const id of active.selection){const origin=active.origins[id];next[id]={x:clamp(origin.x+dx,8,1440),y:clamp(origin.y+dy,8,328)}}
    positionsRef.current=next;setPositions(next);
  };
  const endDrag=event=>{
    const active=dragRef.current;if(!active)return;
    event.currentTarget.releasePointerCapture?.(active.pointerId);dragRef.current=null;
    if(active.moved){remember(active.before);saveLayout();suppressClickRef.current=true;window.setTimeout(()=>{suppressClickRef.current=false},0)}
  };

  const openNode=node=>{const target=TARGETS[node.id];target?onNavigate(target):onImport()};
  const runBranch=()=>{
    if(!project)return onImport();
    if(!executable)return notify?.(`先完成：${[...new Set(selectedNodes.flatMap(node=>node.missingDeps).map(id=>graph.find(node=>node.id===id)?.label))].join('、')}`);
    if(!pendingImpacted.length){openNode(selected);return notify?.('所选分支资产已齐')}
    window.dispatchEvent(new CustomEvent('xingmu-run-pipeline',{detail:{startNode:selected.id,selectedNodes:activeIds,impacted}}));
    notify?.(`将补齐 ${pendingImpacted.length} 个相关节点`);
  };
  const resetLayout=()=>{remember({...positionsRef.current});const next={...DEFAULT_POSITIONS};setZoom(90);setSelectedIds([firstActive]);applyPositions(next,{save:false});saveLayout(next,90,template);stageRef.current?.scrollTo({left:0,top:0,behavior:'smooth'});notify?.('画布已整理')};
  const focusSelection=()=>{
    if(!selectedNodes.length||!stageRef.current)return;
    const points=selectedNodes.map(node=>positions[node.id]||DEFAULT_POSITIONS[node.id]);
    const centerX=(Math.min(...points.map(item=>item.x))+Math.max(...points.map(item=>item.x+154)))/2;
    const centerY=(Math.min(...points.map(item=>item.y))+Math.max(...points.map(item=>item.y+84)))/2;
    stageRef.current.scrollTo({left:centerX*zoom/100-stageRef.current.clientWidth/2,top:centerY*zoom/100-stageRef.current.clientHeight/2,behavior:'smooth'});
  };
  const moveSelectionBy=(dx,dy)=>{
    if(!activeIds.length)return;remember({...positionsRef.current});const next={...positionsRef.current};
    for(const id of activeIds){const current=next[id]||DEFAULT_POSITIONS[id];next[id]={x:clamp(current.x+dx,8,1440),y:clamp(current.y+dy,8,328)}}applyPositions(next);
  };
  const undo=()=>{const history=historyRef.current;if(!history.past.length)return;const previous=history.past.at(-1);historyRef.current={past:history.past.slice(0,-1),future:[{...positionsRef.current},...history.future].slice(0,30)};applyPositions(previous);notify?.('已撤销布局')};
  const redo=()=>{const history=historyRef.current;if(!history.future.length)return;const next=history.future[0];historyRef.current={past:[...history.past,{...positionsRef.current}].slice(-30),future:history.future.slice(1)};applyPositions(next);notify?.('已重做布局')};
  const changeZoom=delta=>{const next=clamp(zoom+delta,65,120);setZoom(next);saveLayout(positionsRef.current,next,template)};
  const handleKeyDown=event=>{
    if(editableTarget(event.target))return;
    const command=event.ctrlKey||event.metaKey;
    if(command&&event.key.toLowerCase()==='a'){event.preventDefault();setSelectedIds(visibleIds);return}
    if(command&&event.key.toLowerCase()==='s'){event.preventDefault();saveLayout();notify?.('画布已保存');return}
    if(command&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();return}
    if(command&&event.key.toLowerCase()==='y'){event.preventDefault();redo();return}
    if(event.key==='Escape'){setSelectedIds([selected?.id||visible[0]?.id]);return}
    if(event.key==='.'&&!command){event.preventDefault();focusSelection();return}
    if(['+','='].includes(event.key)){event.preventDefault();changeZoom(10);return}
    if(event.key==='-'){event.preventDefault();changeZoom(-10);return}
    const arrows={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]};if(arrows[event.key]){event.preventDefault();moveSelectionBy(...arrows[event.key])}
  };

  const exportWorkflow=()=>{
    const payload={kind:'xingmu-production-canvas',version:'2.0.0',projectId:project?.id||'',projectTitle:project?.title||'',template,layout:{positions:positionsRef.current,zoom},nodes:graph.map(({id,label,deps,status})=>({id,label,deps,status})),exportedAt:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${String(project?.title||'星幕').replace(/[\\/:*?"<>|]/g,'-')}-画布.json`;link.click();URL.revokeObjectURL(url);notify?.('画布工作流已导出');
  };
  const importWorkflow=async event=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{const payload=JSON.parse(await file.text());const layout=payload.layout||payload.canvas?.layout||payload;const source=layout.positions;if(!source||typeof source!=='object')throw new Error('文件中没有画布布局');const allowed=new Set(graph.map(node=>node.id));const next={...DEFAULT_POSITIONS};for(const [id,point] of Object.entries(source))if(allowed.has(id)&&Number.isFinite(Number(point?.x))&&Number.isFinite(Number(point?.y)))next[id]={x:clamp(Number(point.x),8,1440),y:clamp(Number(point.y),8,328)};const nextZoom=clamp(Number(layout.zoom)||90,65,120);const nextTemplate=CANVAS_TEMPLATES[payload.template||layout.template]?payload.template||layout.template:'full';remember({...positionsRef.current});positionsRef.current=next;setPositions(next);setZoom(nextZoom);setTemplate(nextTemplate);saveLayout(next,nextZoom,nextTemplate);notify?.('画布工作流已导入')}catch(error){notify?.(`导入失败：${error.message}`)}
  };
  const navigateMiniMap=event=>{const rect=event.currentTarget.getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width*WORLD.width;const y=(event.clientY-rect.top)/rect.height*WORLD.height;stageRef.current?.scrollTo({left:x*zoom/100-(stageRef.current?.clientWidth||0)/2,top:y*zoom/100-(stageRef.current?.clientHeight||0)/2,behavior:'smooth'})};

  if(view==='creative')return <FreeformCanvas project={project} notify={notify} onChange={onSaveCreative} onSwitchProduction={()=>{setView('production');saveLayout(positionsRef.current,zoom,template,'production')}}/>;

  return <section className="creative-canvas production-canvas-v2" tabIndex={0} onKeyDown={handleKeyDown} aria-label="创作导演画布">
    <div className="canvas-head"><div><span>PRODUCTION GRAPH</span><b>创作导演画布</b></div><div><i/> 自动保存 · 局部执行</div></div>
    <div className="canvas-toolbar">
      <div className="canvas-view-switch"><button className="active">生产流程</button><button onClick={()=>{setView('creative');saveLayout(positionsRef.current,zoom,template,'creative')}}><Sparkles/>自由创作</button></div>
      <select aria-label="画布模板" value={template} onChange={event=>{const next=event.target.value;setTemplate(next);setSelectedIds([CANVAS_TEMPLATES[next].nodes[0]]);saveLayout(positionsRef.current,zoom,next)}}>{Object.entries(CANVAS_TEMPLATES).map(([id,item])=><option value={id} key={id}>{item.label}</option>)}</select>
      <div className="canvas-history"><button title="撤销布局（Ctrl+Z）" onClick={undo} disabled={!historyRef.current.past.length}><Undo2/></button><button title="重做布局（Ctrl+Y）" onClick={redo} disabled={!historyRef.current.future.length}><Redo2/></button></div>
      <div className="canvas-tools"><button title="快捷键：Shift 多选，方向键移动，. 定位" onClick={()=>notify?.('Shift 多选 · 方向键移动 · Ctrl+Z 撤销 · . 定位')}><Keyboard/></button><button title="导入画布工作流" onClick={()=>importRef.current?.click()}><Upload/></button><input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importWorkflow}/><button title="导出画布工作流" onClick={exportWorkflow}><Download/></button><button title="缩小画布" onClick={()=>changeZoom(-10)}><ZoomOut/></button><b>{zoom}%</b><button title="放大画布" onClick={()=>changeZoom(10)}><ZoomIn/></button><button title="定位所选节点" onClick={focusSelection}>定位</button><button title="自动整理画布" onClick={resetLayout}><RefreshCw/>整理</button></div>
    </div>
    <div className="canvas-stage" ref={stageRef} onScroll={updateViewport} onPointerDown={event=>{if(event.target===event.currentTarget)setSelectedIds([selected?.id||visible[0]?.id])}}>
      {activeIds.length>1&&<div className="canvas-selection-count">已选 {activeIds.length}</div>}
      <div className="canvas-world" style={{width:WORLD.width*zoom/100,height:WORLD.height*zoom/100}}><div className="canvas-transform" style={{transform:`scale(${zoom/100})`}}>
        <svg className="canvas-wires" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} aria-hidden="true">{visible.flatMap(node=>node.deps.filter(id=>visibleIds.includes(id)).map(id=>{const from=positions[id],to=positions[node.id];if(!from||!to)return null;const x1=from.x+154,y1=from.y+42,x2=to.x,y2=to.y+42,mid=(x1+x2)/2;return <path className={`${node.status} ${impacted.includes(id)&&impacted.includes(node.id)?'impacted':''}`} key={`${id}-${node.id}`} d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}/> }))}</svg>
        {visible.map((node,index)=>{const Icon=ICONS[node.id];const position=positions[node.id]||DEFAULT_POSITIONS[node.id];return <button type="button" aria-label={`${node.label}，${stateLabel(node.status)}`} aria-pressed={activeIds.includes(node.id)} key={node.id} style={{left:position.x,top:position.y}} className={`canvas-node ${node.status} ${activeIds.includes(node.id)?'selected':''} ${impacted.includes(node.id)?'impacted':''}`} onPointerDown={event=>beginDrag(event,node.id)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={()=>{dragRef.current=null}} onClick={event=>selectNode(event,node.id)} onDoubleClick={()=>openNode(node)}><i className="canvas-port input"/><span><Icon/></span><div><b>{node.label}</b><small>{node.meta}</small></div><em>{node.status==='done'?<CheckCircle2/>:node.status==='ready'?<Play/>:node.status==='stale'?<RefreshCw/>:index+1}</em><i className="canvas-port output"/></button>})}
      </div></div>
      <button className="canvas-minimap" aria-label="画布缩略导航" title="点击缩略图快速定位" onClick={navigateMiniMap}>{visible.map(node=>{const point=positions[node.id]||DEFAULT_POSITIONS[node.id];return <i className={node.status} key={node.id} style={{left:`${point.x/WORLD.width*100}%`,top:`${point.y/WORLD.height*100}%`}}/>})}<span style={{left:`${viewport.left/(zoom/100)/WORLD.width*100}%`,top:`${viewport.top/(zoom/100)/WORLD.height*100}%`,width:`${viewport.width/(zoom/100)/WORLD.width*100}%`,height:`${viewport.height/(zoom/100)/WORLD.height*100}%`}}/></button>
    </div>
    <aside className="canvas-detail"><div><span className={`canvas-state ${selectedNodes.length>1?'multi':selected.status}`}>{selectedNodes.length>1?`已选 ${selectedNodes.length}`:stateLabel(selected.status)}</span><b>{selectedNodes.length>1?selectedNodes.map(node=>node.label).join(' · '):selected.label}</b><small>{selectedNodes.length>1?'批量移动或执行相关分支':selected.output}</small></div><div className="canvas-io"><span>输入<b>{selectedNodes.length>1?`${selectedNodes.length} 个节点`:upstream.map(node=>node.label).join(' · ')||'创作简报'}</b></span><span>下游<b>{downstream.map(node=>node.label).join(' · ')||'交付'}</b></span><span>影响<b>{pendingImpacted.length} 个待处理节点</b></span></div><div className="canvas-actions"><button onClick={()=>openNode(selected)}>打开模块</button><button className="primary" disabled={!executable} onClick={runBranch}><Play/>{selectedNodes.length>1?'执行所选分支':'继续此分支'}</button></div></aside>
    <div className="canvas-refs"><span><Lock/>角色身份</span><span><Lock/>服装道具</span><span><Lock/>场景轴线</span><span><Lock/>色板光向</span><span><Lock/>首尾帧承接</span></div>
  </section>;
}
