import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle2, Link2, RefreshCw } from 'lucide-react';
import { summarizeAssetLinks, synchronizeAssetLinks } from './assetLinkage.js';

export default function ScriptAssetHandoff({ project, updateProject, onNavigate, notify }) {
  const summary = useMemo(() => summarizeAssetLinks(project), [project]);
  const healthy = summary.broken.length === 0 && summary.scenes > 0;
  const sync = () => {
    updateProject(previous => synchronizeAssetLinks(previous));
    notify?.('场景、台词、角色、道具与镜头引用已同步');
  };
  return <section className={`asset-handoff ${healthy ? 'ready' : 'warning'}`} aria-label="资产链路">
    <div className="asset-handoff-title"><span>{healthy ? <CheckCircle2/> : <Link2/>}<b>资产交接</b></span><small>{healthy ? '引用完整，可继续生产' : `${summary.broken.length} 处引用待修复`}</small></div>
    <div className="asset-handoff-flow">
      <button onClick={() => onNavigate('script')}><b>{summary.scenes}</b><span>场景</span></button><ArrowRight/>
      <button onClick={() => onNavigate('characters')}><b>{summary.dialogues}</b><span>台词与声音</span></button><ArrowRight/>
      <button onClick={() => onNavigate('characters')}><b>{summary.props}</b><span>角色与道具</span></button><ArrowRight/>
      <button onClick={() => onNavigate('storyboard')}><b>{summary.shots}</b><span>分镜</span></button>
    </div>
    <button className="asset-sync" onClick={sync}><RefreshCw/>同步引用</button>
  </section>;
}
