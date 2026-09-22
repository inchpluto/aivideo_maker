// 通用交付验收：由项目 manifest 声明媒体与技术目标，不依赖示例项目名称或固定文件名。
// 用法：node scripts/validate-delivery.mjs --manifest <manifest.json> [--root <目录>] [--strict] [--preview|--apply|--undo]
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyDeliveryPatch, previewDeliveryPatch, undoDeliveryPatch, validateDeliveryManifest } from '../server/deliveryValidator.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2); const valueOf=name=>{const index=args.indexOf(name);return index>=0?args[index+1]:''};
const manifestPath=path.resolve(root,valueOf('--manifest')||'ai-delivery/delivery-manifest.json');
const baseRoot=path.resolve(root,valueOf('--root')||path.dirname(manifestPath));
const mode=args.includes('--apply')?'apply':args.includes('--undo')?'undo':'preview';
const strict=args.includes('--strict');

async function main(){
  if(mode==='undo'){const result=await undoDeliveryPatch(manifestPath);console.log(JSON.stringify(result,null,2));return;}
  const input=JSON.parse(await readFile(manifestPath,'utf8')); const report=await validateDeliveryManifest(input,{root:baseRoot}); const preview=previewDeliveryPatch(input,report);
  console.log(JSON.stringify({manifest:manifestPath,root:baseRoot,mode,report,changes:preview.changes},null,2));
  if(mode==='apply'){const applied=await applyDeliveryPatch(manifestPath,input,report);console.log(JSON.stringify({applied:true,backupPath:applied.backupPath},null,2));}
  if(strict&&!report.ok)process.exitCode=1;
}

main().catch(error=>{console.error(JSON.stringify({ok:false,code:error.code||'DELIVERY_VALIDATION_ERROR',error:error.message},null,2));process.exitCode=2;});
