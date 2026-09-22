import assert from 'node:assert/strict';
import { providerRoutes } from '../server/providers.mjs';
import { getProviderContract } from '../server/providerContracts.mjs';
for (const [task, routes] of Object.entries(providerRoutes)) for (const route of routes) { const contract=getProviderContract(route.adapter); assert(contract,`${task}/${route.id} 缺少 adapter contract`); for (const operation of ['validate','estimate','submit','poll','cancel','normalize']) assert.equal(typeof contract[operation],'boolean',`${route.adapter}.${operation}`); if(route.accessMode==='manual') assert.equal(contract.submit,false); }
assert.equal(providerRoutes.keyframe[0].inheritedTask,'environment'); assert.notEqual(providerRoutes.keyframe,providerRoutes.environment);
console.log(JSON.stringify({ok:true,tasks:Object.keys(providerRoutes).length,routes:Object.values(providerRoutes).reduce((n,list)=>n+list.length,0),manual:'explicit-no-submit',keyframe:'explicit-inherit'}));
