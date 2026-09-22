const full = Object.freeze({ validate:true, estimate:true, submit:true, poll:true, cancel:true, normalize:true });
export const adapterContracts = Object.freeze({
  openai:{...full,cancel:false}, anthropic:{...full,cancel:false}, qwen:{...full,cancel:false}, deepseek:{...full,cancel:false}, 'custom-openai':{...full,cancel:false}, 'gemini-text':{...full,cancel:false}, 'gemini-image':{...full,cancel:false}, 'openai-image':{...full,cancel:false}, 'custom-openai-image':{...full,cancel:false}, elevenlabs:{...full,cancel:false}, 'local-tts':{...full,cancel:false}, 'gemini-omni-video':{...full,cancel:false}, 'gemini-veo':{...full,cancel:false}, runway:full, manual:{validate:true,estimate:true,submit:false,poll:false,cancel:false,normalize:true},
});
export function getProviderContract(adapter) { return adapterContracts[adapter] || null; }
