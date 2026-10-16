import { useCallback, useEffect, useRef, useState } from 'react';

const idle = { checking: false, status: 'unknown', label: '等待检测', base: '', error: '' };
const localEngines = new Set(['index_tts_local', 'f5_tts_local']);

export function describeTtsService(current) {
  if (current?.state === 'failed') return { ...idle, status: 'failed', label: '启动失败', base: current.base || '', error: current.message || '本地语音服务启动失败，请检查配置。' };
  const starting = current?.state === 'loading' || current?.managed;
  return {
    ...idle, base: current?.base || '',
    status: current?.ready ? 'ready' : starting ? 'starting' : 'offline',
    label: current?.ready ? '服务已就绪' : starting ? '模型加载中' : '服务未启动',
  };
}

export function useLocalTtsService(engine, enabled, { pollMs = 2000, timeoutMs = 15000 } = {}) {
  const [snapshot, setSnapshot] = useState({ engine, ...idle });
  const sessionRef = useRef(null);

  useEffect(() => {
    if (!enabled || !localEngines.has(engine)) return;
    const session = { active: true, flight: null, controller: null, timer: null, timeout: null };
    sessionRef.current = session;
    const current = () => session.active && sessionRef.current === session;
    const publish = state => { if (current()) setSnapshot({ engine, ...state }); };

    session.run = start => {
      if (!current()) return Promise.resolve(null);
      if (session.flight) return session.flight;
      clearTimeout(session.timer);
      const controller = new AbortController();
      session.controller = controller;
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      session.timeout = timeout;
      publish({ ...idle, checking: true, status: start ? 'starting' : 'unknown', label: start ? '正在启动' : '正在检测' });
      const request = async (url, options) => {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `语音服务请求失败（${response.status}）`);
        return data;
      };
      session.flight = (async () => {
        try {
          if (start) {
            await request('/api/tts/services/start', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ engine, waitMs: 0 }),
            });
            if (!current()) return null;
            if (timedOut) throw new Error('启动请求超时，请检查服务状态。');
          }
          const data = await request('/api/tts/services');
          if (!current()) return null;
          if (timedOut) throw new Error('状态读取超时，请重试。');
          const next = describeTtsService(data.services?.[engine]);
          publish(next);
          // Schedule only after the previous read completes: slow health probes
          // cannot accumulate overlapping requests or replace a new engine.
          if (next.status === 'starting') session.timer = setTimeout(() => { void session.run(false); }, pollMs);
          return next;
        } catch (error) {
          if (!current()) return null;
          const next = { ...idle, status: 'error', label: timedOut ? '检测超时' : start ? '启动失败' : '状态读取失败', error: timedOut ? '语音服务响应超时，请检查服务后重试。' : error.message };
          publish(next);
          return next;
        } finally {
          clearTimeout(timeout);
          session.flight = null;
        }
      })();
      return session.flight;
    };
    // Merely opening the voice library must not start a Python/GPU process.
    void session.run(false);
    return () => {
      session.active = false;
      clearTimeout(session.timer);
      clearTimeout(session.timeout);
      session.controller?.abort();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [engine, enabled, pollMs, timeoutMs]);

  const refresh = useCallback(() => sessionRef.current?.run(false) || Promise.resolve(null), []);
  const start = useCallback(() => sessionRef.current?.run(true) || Promise.resolve(null), []);
  const service = enabled && snapshot.engine === engine ? snapshot : idle;
  return { service, refresh, start };
}
