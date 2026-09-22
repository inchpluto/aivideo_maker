const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)));
const clean=value=>String(value??'').trim();

const EMOTIONS=[
  {match:/愤怒|生气|暴怒|angry/i,label:'愤怒',intensity:82},
  {match:/惊讶|震惊|surpris/i,label:'惊讶',intensity:76},
  {match:/紧张|焦虑|恐惧|nervous|fear|anxious/i,label:'紧张',intensity:70},
  {match:/坚定|决绝|果断|determin/i,label:'坚定',intensity:66},
  {match:/哽咽|悲伤|难过|哭|sad|grief|cry/i,label:'悲伤',intensity:72},
  {match:/迟疑|犹豫|怀疑|hesitat|uncertain/i,label:'迟疑',intensity:50},
  {match:/喜悦|开心|兴奋|happy|joy|excited/i,label:'喜悦',intensity:68},
  {match:/平静|克制|冷静|calm|restrained/i,label:'平静',intensity:34}
];

const PACE=[
  {match:/极快|急促|冲刺|very fast/i,label:'急促',speed:1.18,duration:.86},
  {match:/偏快|较快|快速|加快|fast/i,label:'偏快',speed:1.10,duration:.92},
  {match:/极慢|拖长|very slow/i,label:'极慢',speed:.78,duration:1.24},
  {match:/偏慢|较慢|缓慢|慢速|slow/i,label:'偏慢',speed:.90,duration:1.12},
  {match:/短句|干脆|利落/i,label:'利落',speed:1.06,duration:.95}
];

function emotionProfile(value='自然',text=''){
  const source=`${clean(value)} ${clean(text)}`;
  const found=EMOTIONS.find(item=>item.match.test(source));
  return found||{label:clean(value)||'自然',intensity:50};
}

function paceProfile(value='中速'){
  const found=PACE.find(item=>item.match.test(clean(value)));
  return found||{label:clean(value)||'中速',speed:1,duration:1};
}

function pauseText(text,pauseStyle=''){
  const source=clean(text);const style=clean(pauseStyle);
  if(!source||!style)return source;
  const matched=style.match(/在[‘’“”"']?([^‘’“”"'，,。！？!?]{1,12})[‘’“”"']?后(?:短暂|稍作|明显|长)?停顿/);
  if(!matched)return source;
  const target=matched[1].trim();const index=source.indexOf(target);
  if(index<0)return source;
  const end=index+target.length;const following=source.slice(end,end+1);
  if(/[，,。！？!?；;…]/.test(following))return source;
  const mark=/长停|明显停顿/.test(style)?'……':'，';
  return `${source.slice(0,end)}${mark}${source.slice(end)}`;
}

export function compileVoicePerformance({line={},character={},engine='',overrides={}}={}){
  const emotion=emotionProfile(overrides.emotion||line.emotion||character.emotion||'自然',line.text);
  const pace=paceProfile(overrides.pace||line.pace||'中速');
  const punctuationBoost=/！|!/.test(clean(line.text))?7:/……|\.\.\./.test(clean(line.text))?-4:0;
  const intensity=clamp(overrides.emotionIntensity??line.emotionIntensity??emotion.intensity+punctuationBoost,10,100);
  const speedFactor=clamp(overrides.speedFactor??pace.speed,0.5,2);
  const durationFactor=clamp(overrides.durationFactor??pace.duration,0.5,2);
  const pauseStyle=clean(overrides.pauseStyle||line.pauseStyle||'按标点语义停顿');
  const originalText=clean(line.text);
  return {
    version:'1.0.0',engine:clean(engine),originalText,ttsText:pauseText(originalText,pauseStyle),
    intention:clean(line.intention||character.desire||'推进当前行动'),subtext:clean(line.subtext||'按人物关系表达'),
    emotion:emotion.label,emotionIntensity:intensity,pace:pace.label,pauseStyle,
    emphasis:clean(line.emphasis||''),speedFactor,durationFactor,
    parameterSource:{emotion:line.emotion?'dialogue':'character',pace:line.pace?'dialogue':'default',pause:line.pauseStyle?'dialogue':'default',emphasis:line.emphasis?'dialogue':'none'}
  };
}

export function voicePayloadFromPerformance(performance={}){
  return {
    text:performance.ttsText||performance.originalText||'',originalText:performance.originalText||'',
    intention:performance.intention||'',subtext:performance.subtext||'',emotion:performance.emotion||'自然',
    emotionIntensity:Number(performance.emotionIntensity||50),speed:performance.pace||'中速',pace:performance.pace||'中速',
    pauseStyle:performance.pauseStyle||'按标点语义停顿',emphasis:performance.emphasis||'',
    speedFactor:Number(performance.speedFactor||1),durationFactor:Number(performance.durationFactor||1),
    performanceVersion:performance.version||'1.0.0'
  };
}
