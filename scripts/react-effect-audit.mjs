import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

const violations=[];
for await (const file of glob('src/**/*.{js,jsx}')) {
  const source=await readFile(file,'utf8');
  const directNamed=[...source.matchAll(/use(?:Layout)?Effect\(\s*([A-Za-z_$][\w$]*)\s*,/g)];
  const directAsync=[...source.matchAll(/use(?:Layout)?Effect\(\s*async\b/g)];
  for(const match of [...directNamed,...directAsync])violations.push({file,index:match.index,code:match[0]});
}

console.log(JSON.stringify({ok:violations.length===0,checks:'React effect cleanup contract',violations},null,2));
if(violations.length)process.exitCode=1;
