import { readFile } from 'node:fs/promises';

const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

const contracts = {
  '编辑器使用可读字号令牌': /--editor-font-caption:11px;--editor-font-body:12px/.test(styles),
  '编辑器图标控件不小于 32px': /--editor-control:32px/.test(styles) && /min-width:var\(--editor-control\)/.test(styles),
  '素材卡具备可辨识画面高度': /\.editor \.media-item\{height:92px\}/.test(styles),
  '浅色素材卡保持封面文字对比': /data-theme="light"\] \.media-item p[\s\S]*color:#f5f8f1!important/.test(styles),
  '浅色编辑区使用低对比网格': /data-theme="light"\] \.editor-body[\s\S]*background-size:24px 24px/.test(styles),
  '窄屏编辑器改为纵向工作区': /@media\(max-width:900px\)[\s\S]*grid-template-rows:auto minmax\(650px,auto\) auto/.test(styles),
  '窄屏素材库支持横向浏览': /@media\(max-width:900px\)[\s\S]*\.editor \.media-grid\{display:flex;overflow-x:auto/.test(styles),
  '窄屏检查器保留完整操作高度': /@media\(max-width:900px\)[^\n]*\.editor \.edit-inspector\{min-width:0;min-height:480px;height:auto/.test(styles),
  '中等桌面素材卡改为单列': /@media\(max-width:1280px\)[^\n]*\.editor \.media-grid\{grid-template-columns:1fr\}/.test(styles),
  '中等桌面移除重复轨道快捷组': /@media\(max-width:1280px\)[^\n]*\.editor \.track-add-group\{display:none\}/.test(styles),
};

const failed = Object.entries(contracts).filter(([, passed]) => !passed).map(([name]) => name);
console.log(JSON.stringify({ ok: failed.length === 0, checks: Object.keys(contracts).length, failed }, null, 2));
if (failed.length) process.exitCode = 1;
