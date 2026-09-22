import { readFile } from 'node:fs/promises';

const [main, timeline, styles] = await Promise.all([
  readFile(new URL('../src/main.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/Timeline.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
]);
const timelineSource = `${main}\n${timeline}`;

const contracts = {
  '轨道重排使用 FLIP 位移动画': /useLayoutEffect[\s\S]*trackRects[\s\S]*node\.animate\(\[\{transform:`translateY/.test(timelineSource),
  '片段落位使用 FLIP 坐标动画': /clipRects[\s\S]*deltaX[\s\S]*node\.animate\(\[\{transform:`translate\(/.test(timelineSource),
  '拖拽保留鼠标抓取偏移': /timelineTimeFromPointer\([\s\S]*grabOffset:clipId\?grabOffset\.current/.test(timelineSource),
  '轨道片段使用统一指针拖拽': /beginPointerClipDrag/.test(timelineSource) && /onPointerMove=\{movePointerClip\}/.test(timelineSource) && /data-track-id=\{track\.id\}/.test(timelineSource),
  '轨道拖拽仅标记当前落点': /trackDropTarget===track\.id\?'track-drop-target'/.test(timelineSource),
  '片段拖拽显示时间落点': /clip-drop-preview/.test(timelineSource) && /dropPreview\.start\.toFixed\(2\)/.test(timelineSource),
  '片段落位具备收束反馈': /settledClip/.test(timelineSource) && /clip-settle/.test(styles),
  '视频播放头跟随媒体时钟': /requestAnimationFrame/.test(main) && /media\.currentTime/.test(main) && /setPlayheadTime/.test(main),
  '动效使用统一时长令牌': /--dur-slow:420ms/.test(styles) && /--dur-base:220ms/.test(styles) && /--dur-fast:120ms/.test(styles),
  '支持系统减弱动态效果': /prefers-reduced-motion:reduce/.test(styles) && /animation-duration:\.01ms!important/.test(styles),
  '浅色主题包含拖拽反馈': /data-theme="light"[^\n]*track\.track-drop-target/.test(styles),
  '素材卡包含视频画面与剧情标记': /media-thumb/.test(main) && /media-story/.test(main),
};

const failed = Object.entries(contracts).filter(([, passed]) => !passed).map(([name]) => name);
console.log(JSON.stringify({ ok: failed.length === 0, checks: Object.keys(contracts).length, failed }, null, 2));
if (failed.length) process.exitCode = 1;
