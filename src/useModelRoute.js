import { useCallback, useEffect, useState } from 'react';
import { getModelPreferences, getModelSelection, modelOptions, saveModelPreferences } from './modelCatalog.js';

const EMPTY_OPTIONS = [];
const saveQueues = new Map();

// Serialize same-task saves across every mounted selector in this tab. A slow
// earlier PUT must not arrive after the user's newer choice and overwrite it.
function persistRoute(task, route) {
  const previous = saveQueues.get(task) || Promise.resolve();
  const request = previous.catch(() => {}).then(async () => {
    const response = await fetch('/api/config/providers', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routePreferences: { [task]: route } }),
    });
    if (!response.ok) throw new Error('模型路由保存失败，可在 API 中心重试。');
  });
  saveQueues.set(task, request);
  return request.finally(() => { if (saveQueues.get(task) === request) saveQueues.delete(task); });
}

export function useModelRoute(task) {
  const [selection, setSelection] = useState(() => ({ task, route: getModelSelection(task) }));
  const route = selection.task === task ? selection.route : getModelSelection(task);
  useEffect(() => {
    const refresh = () => setSelection({ task, route: getModelSelection(task) });
    const onStorage = event => { if (!event.key || event.key === 'xingmu-model-routes') refresh(); };
    refresh();
    window.addEventListener('xingmu-provider-configured', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('xingmu-provider-configured', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [task]);

  const setRoute = useCallback(async nextRoute => {
    if (!modelOptions[task]?.options?.some(item => item.id === nextRoute)) return { saved: false, invalid: true };
    const localStorage = saveModelPreferences({ ...getModelPreferences(), [task]: nextRoute });
    setSelection({ task, route: nextRoute });
    // Notify immediately, not only after the network request finishes.
    window.dispatchEvent(new CustomEvent('xingmu-provider-configured', { detail: { task, route: nextRoute } }));
    try {
      await persistRoute(task, nextRoute);
      return { saved: true, localStorage };
    } catch (error) {
      // Local selection remains usable and is sent explicitly with generation
      // tasks. Do not turn a storage failure into a skipped server request.
      return { saved: false, localStorage, error: error.message };
    }
  }, [task]);
  const options = modelOptions[task]?.options || EMPTY_OPTIONS;
  const selected = options.find(item => item.id === route) || options[0];
  return { route, setRoute, options, selected, label: selected ? `${selected.provider} · ${selected.name}` : '' };
}
