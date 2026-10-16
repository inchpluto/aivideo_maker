import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { build } from 'esbuild';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { useLocalTtsService } from '../src/useLocalTtsService.js';
import { useModelRoute } from '../src/useModelRoute.js';
import { useProjectOperations } from '../src/useProjectOperations.js';
import { uploadProjectAsset } from '../src/workflow.js';

const originals = Object.fromEntries(['fetch', 'window', 'localStorage', 'navigator', 'FileReader', 'setTimeout', 'clearTimeout', 'Audio'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const stored = new Map();
globalThis.window = new globalThis.EventTarget();
globalThis.localStorage = { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) };
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const requests = [];
const intercept = () => {
  requests.length = 0;
  globalThis.fetch = (url, options = {}) => {
    const pending = deferred();
    requests.push({ url, options, ...pending });
    return pending.promise; // deliberately ignores abort to exercise stale results
  };
};
let renderer;
let value;
const mountHook = async (hook, props) => {
  function Harness(current) { value = hook(current); return null; }
  await act(async () => { renderer = create(React.createElement(Harness, props)); });
  return async next => { await act(async () => { renderer.update(React.createElement(Harness, next)); }); };
};
const unmount = async () => { if (renderer) await act(async () => { renderer.unmount(); renderer = null; }); };

let scratch;
let checks = 0;
try {
  // Project generations are guarded even for A → B → A and two same-tick clicks.
  const changeProject = await mountHook(({ id }) => useProjectOperations(id), { id: 'A' });
  const first = value('generate');
  assert.ok(first.isCurrent());
  assert.equal(value('generate'), null);
  await changeProject({ id: 'B' });
  assert.equal(first.signal.aborted, true);
  await changeProject({ id: 'A' });
  assert.equal(first.isActive(), false);
  const next = value('generate');
  next.finish();
  assert.equal(next.isCurrent(), false);
  assert.equal(next.isActive(), true, 'queued React updaters remain valid after normal completion');
  const active = value('upload');
  await unmount();
  assert.equal(active.signal.aborted, true);
  checks += 4;

  // Fake clock makes slow polling, timeouts and cleanup deterministic.
  const timers = new Map();
  let now = 0, timerId = 0;
  globalThis.setTimeout = (fn, delay) => { timers.set(++timerId, { fn, at: now + delay }); return timerId; };
  globalThis.clearTimeout = id => timers.delete(id);
  const advance = async ms => {
    now += ms;
    await act(async () => {
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    });
  };
  const status = (engine, detail) => response({ services: { [engine]: detail } });
  intercept();
  const changeEngine = await mountHook(({ engine, enabled = true }) => useLocalTtsService(engine, enabled), { engine: 'index_tts_local' });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.method, undefined, 'mount only reads status; never starts a GPU process');
  const oldRead = requests[0];
  await changeEngine({ engine: 'f5_tts_local' });
  assert.equal(oldRead.options.signal.aborted, true);
  await act(async () => { requests[1].resolve(status('f5_tts_local', { ready: true, base: '/f5' })); });
  await act(async () => { oldRead.resolve(status('index_tts_local', { ready: false, managed: true })); });
  assert.equal(value.service.status, 'ready');
  assert.equal(value.service.base, '/f5');
  await advance(5000);
  assert.equal(requests.length, 2, 'old engine cannot restart polling');
  checks += 3;

  let startPromise, duplicateStart;
  await act(async () => { startPromise = value.start(); duplicateStart = value.start(); });
  assert.equal(startPromise, duplicateStart);
  assert.equal(requests.length, 3);
  assert.equal(requests[2].url, '/api/tts/services/start');
  assert.equal(JSON.parse(requests[2].options.body).engine, 'f5_tts_local');
  await act(async () => { requests[2].resolve(response({ label: 'F5' })); });
  assert.equal(requests.length, 4);
  await act(async () => { requests[3].resolve(status('f5_tts_local', { state: 'loading', managed: true })); await startPromise; });
  await advance(2000);
  assert.equal(requests.length, 5);
  await advance(4000);
  assert.equal(requests.length, 5, 'a slow health request must not overlap with another poll');
  await act(async () => { requests[4].resolve(status('f5_tts_local', { state: 'failed', managed: true, message: 'CUDA out of memory' })); });
  assert.equal(value.service.status, 'failed', 'failed takes precedence over managed');
  assert.match(value.service.error, /CUDA/);
  await advance(4000);
  assert.equal(requests.length, 5);
  checks += 3;

  await act(async () => { void value.refresh(); });
  const timed = requests.at(-1);
  await advance(15000);
  assert.equal(timed.options.signal.aborted, true);
  await act(async () => { timed.reject(new Error('aborted')); });
  assert.equal(value.service.status, 'error');
  assert.match(value.service.label, /超时/);
  await act(async () => { void value.refresh(); });
  const beforeUnmount = requests.at(-1);
  await unmount();
  assert.equal(beforeUnmount.options.signal.aborted, true);
  assert.equal(timers.size, 0, 'cleanup cancels the deadline even when fetch ignores abort');
  await act(async () => { beforeUnmount.resolve(status('f5_tts_local', { managed: true })); });
  assert.equal(timers.size, 0);
  await mountHook(() => useLocalTtsService('f5_tts_local', false), {});
  assert.equal(requests.at(-1), beforeUnmount, 'API mode does not probe local services');
  await unmount();
  checks += 3;
  Object.defineProperty(globalThis, 'setTimeout', originals.setTimeout);
  Object.defineProperty(globalThis, 'clearTimeout', originals.clearTimeout);

  // Real mounted selectors share optimistic state, refresh on task change,
  // survive quota failures, and serialize PUTs even if the first save fails.
  intercept();
  let left, right;
  function Selector({ task, side }) { const result = useModelRoute(task); if (side === 'left') left = result; else right = result; return null; }
  const selectors = task => React.createElement(React.Fragment, null,
    React.createElement(Selector, { task, side: 'left' }), React.createElement(Selector, { task, side: 'right' }));
  await act(async () => { renderer = create(selectors('voice')); });
  let saveOne, saveTwo;
  globalThis.localStorage.setItem = () => { throw new Error('quota exceeded'); };
  await act(async () => { saveOne = left.setRoute('f5_tts_local'); saveTwo = right.setRoute('eleven_v3'); });
  assert.equal(left.route, 'eleven_v3');
  assert.equal(right.route, 'eleven_v3');
  assert.equal(requests.length, 1);
  assert.equal(JSON.parse(requests[0].options.body).routePreferences.voice, 'f5_tts_local');
  await act(async () => { requests[0].resolve(response({}, 503)); });
  assert.equal(requests.length, 2);
  assert.equal(JSON.parse(requests[1].options.body).routePreferences.voice, 'eleven_v3');
  await act(async () => { requests[1].resolve(response({})); });
  assert.equal((await saveOne).saved, false);
  assert.deepEqual(await saveTwo, { saved: true, localStorage: false });
  await act(async () => { renderer.update(selectors('story')); });
  assert.equal(left.route, 'gpt-5.6');
  await act(async () => { await left.setRoute('not-a-model'); });
  assert.equal(requests.length, 2);
  globalThis.localStorage.setItem = (key, content) => stored.set(key, content);
  await act(async () => { saveOne = left.setRoute('deepseek-v4-pro'); });
  await act(async () => { requests[2].resolve(response({})); await saveOne; });
  stored.set('xingmu-model-routes', JSON.stringify({ story: 'claude-opus-5' }));
  await act(async () => { globalThis.window.dispatchEvent(Object.assign(new globalThis.Event('storage'), { key: 'xingmu-model-routes' })); });
  assert.equal(left.route, 'claude-opus-5');
  await unmount();
  checks += 5;

  // FileReader cancellation prevents the request entirely; cancellation after
  // reading is forwarded to fetch for image uploads too, not only videos.
  intercept();
  let reader;
  globalThis.FileReader = class {
    constructor() { reader = this; }
    readAsDataURL() {}
    abort() { this.aborted = true; }
  };
  const controller = new globalThis.AbortController();
  const uploading = uploadProjectAsset('A', { size: 3 }, 'reference', { signal: controller.signal });
  controller.abort();
  await assert.rejects(uploading, { name: 'AbortError' });
  assert.equal(reader.aborted, true);
  assert.equal(requests.length, 0);
  const secondController = new globalThis.AbortController();
  const secondUpload = uploadProjectAsset('A', { size: 3 }, 'reference', { signal: secondController.signal });
  reader.result = 'data:image/png;base64,AAAA';
  reader.onload();
  await Promise.resolve();
  assert.equal(requests[0].options.signal, secondController.signal);
  requests[0].resolve(response({ asset: { url: '/sample.png' } }));
  assert.deepEqual(await secondUpload, { url: '/sample.png' });
  checks += 2;

  // Compile the real JSX component and exercise its handlers with a mounted
  // React tree (not source-code regexes or a reimplementation of the logic).
  await mkdir('.audit-build', { recursive: true });
  scratch = await mkdtemp(path.resolve('.audit-build', 'frontend-lifecycle-'));
  await build({ entryPoints: ['src/AssistantWorkflow.jsx'], outfile: path.join(scratch, 'assistant.mjs'), bundle: true, format: 'esm', platform: 'node', packages: 'external', logLevel: 'silent' });
  const { default: Assistant } = await import(pathToFileURL(path.join(scratch, 'assistant.mjs')));
  const notes = [], updaters = [];
  let project = { id: 'A', title: 'project A' };
  const renderAssistant = () => React.createElement(Assistant, { project, notify: message => notes.push(message), updateProject: updater => updaters.push(updater) });
  intercept();
  await act(async () => { renderer = create(renderAssistant()); });
  const generate = renderer.root.findAllByType('button').find(node => node.props.className === 'primary');
  let running;
  await act(async () => { running = generate.props.onClick(); void generate.props.onClick(); });
  assert.equal(requests.length, 1, 'same-tick duplicate clicks are suppressed');
  const oldGenerate = requests[0];
  project = { id: 'B', title: 'project B' };
  await act(async () => { renderer.update(renderAssistant()); });
  assert.equal(oldGenerate.options.signal.aborted, true);
  assert.equal(renderer.root.findAllByType('button').find(node => node.props.className === 'primary').props.disabled, false);
  await act(async () => { oldGenerate.resolve(response({ result: {} })); await running; });
  assert.equal(updaters.length, 0);
  assert.equal(notes.length, 1, 'stale completion must not announce success on the new project');
  await unmount();
  checks += 3;

  project = { id: 'A', title: 'scene project', synopsis: '旧灯塔', generation: { story: { status: 'done' } }, characters: [], episodes: [], shots: [], assets: { props: [], environments: [] } };
  await act(async () => { renderer = create(renderAssistant(), { createNodeMock: () => ({ click() {} }) }); });
  assert.match(renderer.root.findByType('pre').children.join(''), /旧灯塔/);
  project = { ...project, synopsis: '新车站' };
  await act(async () => { renderer.update(renderAssistant()); });
  assert.match(renderer.root.findByType('pre').children.join(''), /新车站/);
  assert.doesNotMatch(renderer.root.findByType('pre').children.join(''), /旧灯塔/);
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async () => { throw new Error('permission denied'); } } } });
  const copy = renderer.root.findAllByType('button').find(node => node.props.className === 'outline');
  await act(async () => { await copy.props.onClick(); });
  assert.match(notes.at(-1), /复制失败.*permission denied/);
  checks += 2;

  intercept();
  globalThis.FileReader = class { readAsDataURL() { this.result = 'data:image/png;base64,AAAA'; this.onload(); } abort() {} };
  const uploadButton = renderer.root.findAllByType('button').find(node => node.props.className === 'primary');
  await act(async () => { uploadButton.props.onClick(); });
  let pendingUpload;
  await act(async () => { pendingUpload = renderer.root.findByType('input').props.onChange({ target: { files: [{ size: 3, type: 'image/png' }], value: '' } }); });
  assert.equal(requests[0].url, '/api/assets/upload');
  await act(async () => { requests[0].resolve(response({ asset: { url: '/new.png' } })); await pendingUpload; });
  assert.equal(updaters.length, 1);
  const updated = updaters[0](project);
  assert.ok(updated.assets.environments.some(asset => asset.imageUrl === '/new.png'));
  const otherProject = { ...project, id: 'B' };
  assert.equal(updaters[0](otherProject), otherProject, 'deferred state updater must re-check project identity');
  await act(async () => { uploadButton.props.onClick(); });
  await act(async () => { pendingUpload = renderer.root.findByType('input').props.onChange({ target: { files: [{ size: 3, type: 'image/png' }], value: '' } }); });
  const lateUpload = requests[1];
  project = otherProject;
  await act(async () => { renderer.update(renderAssistant()); });
  assert.equal(lateUpload.options.signal.aborted, true);
  await act(async () => { lateUpload.resolve(response({ asset: { url: '/old.png' } })); await pendingUpload; });
  assert.equal(updaters.length, 1, 'old upload cannot enqueue an update for project B');
  await unmount();
  checks += 3;

  await build({ entryPoints: ['src/VoiceLibraryPanel.jsx'], outfile: path.join(scratch, 'voices.mjs'), bundle: true, format: 'esm', platform: 'node', packages: 'external', logLevel: 'silent' });
  const { default: Voices } = await import(pathToFileURL(path.join(scratch, 'voices.mjs')));
  intercept();
  const packs = [
    { id: 'zh-cinematic', engine: 'index_tts_local', language: 'zh-CN', voices: [{ id: 'sample', name: '样音', sampleUrl: '/voice.wav', rightsConfirmed: true }] },
    { id: 'en-cinematic', engine: 'f5_tts_local', language: 'en', voices: [] },
  ];
  await act(async () => { renderer = create(React.createElement(Voices, { draft: {}, setDraft() {}, notify: message => notes.push(message) })); });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/voices');
  assert.equal(renderer.root.findAllByType('button').find(node => node.props.className === 'outline').props.disabled, true);
  await act(async () => { requests[0].resolve(response({ packs })); });
  assert.equal(requests[1].url, '/api/tts/services');
  await act(async () => { requests[1].resolve(status('index_tts_local', { ready: false })); });
  assert.equal(requests.some(item => item.url.endsWith('/start')), false);
  let audio;
  globalThis.Audio = class {
    constructor() { audio = this; }
    play() { return Promise.resolve(); }
    pause() { this.paused = true; }
  };
  await act(async () => { renderer.root.findByProps({ 'aria-label': '试听样音' }).props.onClick(); });
  assert.ok(audio);
  await act(async () => { renderer.root.findAllByType('button').find(node => node.props.className === 'outline').props.onClick(); });
  assert.equal(renderer.root.findAllByProps({ className: 'voice-profile-editor' }).length, 1);
  await act(async () => { renderer.root.findByProps({ 'aria-label': '选择声音生成模型' }).props.onChange({ target: { value: 'f5_tts_local' } }); });
  assert.equal(audio.paused, true, 'changing the pack stops its old audio');
  assert.equal(renderer.root.findAllByProps({ className: 'voice-profile-editor' }).length, 0);
  const reads = requests.filter(item => item.url === '/api/tts/services');
  await act(async () => { reads.at(-1).resolve(status('f5_tts_local', { ready: true, base: '/f5-ui' })); });
  assert.match(JSON.stringify(renderer.toJSON()), /f5-ui/);
  assert.equal(renderer.root.findByProps({ 'aria-label': '语音包' }).findAllByType('button')[1].props.className, 'active');
  const routeSave = requests.find(item => item.url === '/api/config/providers');
  await act(async () => { routeSave.resolve(response({})); });
  assert.equal(requests.some(item => item.url.endsWith('/start')), false, 'switching the local model only probes status');
  await unmount();
  checks += 3;

  console.log(JSON.stringify({ ok: true, checks, mountedReact: true, projectIsolation: true, promptInvalidation: true, ttsExplicitStart: true, ttsPollingSerialized: true, routeSavesSerialized: true, imageUploadAbort: true }));
} finally {
  await unmount();
  if (scratch) await rm(scratch, { recursive: true, force: true });
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
