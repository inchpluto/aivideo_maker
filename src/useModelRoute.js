import { useEffect, useMemo, useState } from 'react';
import { getModelPreferences, getModelSelection, modelOptions, saveModelPreferences } from './modelCatalog.js';

export function useModelRoute(task) {
  const [route,setRouteState]=useState(()=>getModelSelection(task));
  useEffect(()=>{
    const refresh=()=>setRouteState(getModelSelection(task));
    window.addEventListener('xingmu-provider-configured',refresh);
    return()=>window.removeEventListener('xingmu-provider-configured',refresh);
  },[task]);
  const setRoute=async nextRoute=>{
    const allowed=modelOptions[task]?.options?.some(item=>item.id===nextRoute);
    if(!allowed)return;
    const preferences={...getModelPreferences(),[task]:nextRoute};
    saveModelPreferences(preferences);setRouteState(nextRoute);
    try{
      const response=await fetch('/api/config/providers',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({routePreferences:{[task]:nextRoute}})});
      if(!response.ok)throw new Error('模型路由保存失败');
      window.dispatchEvent(new CustomEvent('xingmu-provider-configured',{detail:{task,route:nextRoute}}));
    }catch{
      // 本地选择立即生效；服务恢复后 API 中心仍可再次保存。
    }
  };
  const options=modelOptions[task]?.options||[];
  const selected=useMemo(()=>options.find(item=>item.id===route)||options[0],[options,route]);
  return {route,setRoute,options,selected,label:selected?`${selected.provider} · ${selected.name}`:''};
}
