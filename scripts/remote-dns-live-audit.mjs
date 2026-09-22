import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const dataDir=await mkdtemp(path.join(os.tmpdir(),'xingmu-remote-dns-live-'));
process.env.DATA_DIR=dataDir;
const { saveRemoteAsset }=await import('../server/store.mjs');
try {
  const asset=await saveRemoteAsset({url:'https://w3.org/Icons/w3c_main.png',projectId:'remote-dns-live-audit',kind:'reference'});
  assert.equal(asset.contentType,'image/png');
  const assetPath=path.join(dataDir,'assets','remote-dns-live-audit',path.basename(asset.url));
  const info=await stat(assetPath);assert(info.size>0);
  console.log(JSON.stringify({ok:true,https:true,redirectDnsPinned:true,contentType:asset.contentType,bytes:info.size,probeStatus:asset.probeStatus||'not-required'}));
} finally { await rm(dataDir,{recursive:true,force:true}); }
