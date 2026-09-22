export const CAMERA_KNOWLEDGE_VERSION = '1.0.0';

const movement = (id, label, aliases, category, description, execution, bestFor, avoid, duration = [2, 6], risk = 'medium') => ({
  id, label, aliases, category, description, execution, bestFor, avoid, duration, risk,
  continuityLocks: ['主体身份与服装', '场景空间拓扑', '180 度轴线', '主光方向', '道具位置'],
  promptTemplate: `{{shotSize}}，{{angle}}。{{subjectAction}}；{{environmentAction}}。摄影机${execution}。{{timing}}。尾帧稳定并承接下一镜。`
});

export const CAMERA_MOVEMENTS = [
  movement('locked','固定镜头',['静态','锁定机位','三脚架'], '基础', '摄影机完全锁定，只保留画内运动', '三脚架锁定，无平移、旋转或变焦；主体在画内完成动作，地平线与构图中心不变', '对白、悬念、环境异动、需要稳定口型的镜头', '不要同时写推进、摇摄或缩放', [2,10], 'low'),
  movement('push-in','缓慢推进',['推进','推近','dolly in','push in'], '基础', '沿镜头光轴接近主体，增强关注或压迫', '从当前机位沿光轴平稳向主体推进，主体尺寸均匀增加，接近动作点后减速停止', '发现、决心、情绪聚焦、线索揭示', '避免推进同时大幅转身或复杂表演', [2,6], 'low'),
  movement('extreme-push','极慢推近',['微推','极慢推进'], '基础', '几乎不可察觉的接近，用于情绪变化', '沿光轴做小幅匀速推进，主体尺寸缓慢增加，地平线和构图中心锁定，最后 0.5 秒停止', '大特写、眼神变化、克制对白', '短于 2 秒时效果不明显', [3,8], 'low'),
  movement('pull-back','缓慢拉远',['拉远','后撤','dolly out','pull out'], '基础', '沿光轴后撤，逐步揭示空间或关系', '从近景沿光轴平稳后撤，先保持主体居中，再揭示环境与人物关系，尾帧锁定', '真相揭示、孤独感、环境规模、结尾留白', '避免后撤过程中新增不受控人物', [3,8], 'low'),
  movement('pan','摇镜',['横摇','pan left','pan right'], '基础', '机位固定，摄影机水平旋转', '机位固定，仅做一次水平摇摄；从明确起始主体转向明确结束主体，中途不平移、不变焦', '视线揭示、连接两个主体、展示环境', '不要把横摇写成横移；避免超过一次方向反转', [2,6], 'medium'),
  movement('tilt','俯仰摇摄',['仰摇','俯摇','tilt up','tilt down'], '基础', '机位固定，摄影机上下旋转', '机位固定，从明确起点做单次向上或向下俯仰旋转，结束时锁定目标', '人物登场、建筑高度、从道具揭示人物', '不与升降混用；避免起止目标不明确', [2,6], 'medium'),
  movement('truck','横移跟拍',['横移','侧移','truck','parallel tracking'], '基础', '摄影机与主体运动方向平行横移', '与主体保持固定侧向距离平行横移，主体画面位置和地平线稳定，速度与主体匹配', '行走、奔跑、空间穿越、横向调度', '避免横移穿过遮挡物导致身份漂移', [3,8], 'medium'),
  movement('follow','前跟拍',['跟随','follow shot','steadicam follow'], '基础', '沿主体运动方向从前或后跟随', '以稳定器贴近跟随主体，距离和高度基本不变，只保留低幅自然呼吸感', '人物行动、进入场景、沉浸式叙事', '不要剧烈手抖、滚转或突然改变距离', [3,10], 'medium'),
  movement('side-follow','侧跟镜头',['侧跟','parallel follow'], '基础', '侧面保持人物位置并展示行进背景', '摄影机在主体侧面同速跟随，人物保持三分线位置，背景产生连续视差', '步行对白、行动蒙太奇、运动展示', '保持轴线，不从人物一侧穿越到另一侧', [3,8], 'medium'),
  movement('orbit','环绕',['环绕拍摄','orbit','arc'], '空间', '以主体为圆心的小弧度移动', '以主体为圆心保持半径和高度，沿单一方向完成 20–45 度小弧线环绕，尾帧稳定', '英雄时刻、关系转折、产品或道具展示', '避免 360 度大环绕、越轴、人物面部重绘', [3,8], 'high'),
  movement('crane-up','升降',['升起','pedestal up','crane up','jib up'], '空间', '摄影机垂直升高或降低', '摄影机沿垂直轴平稳升高，水平位置与俯仰角不变，逐步揭示空间规模', '场景建立、人物离开、宏观揭示', '不要同时旋转或改变焦段', [3,8], 'medium'),
  movement('crane-down','环绕下降',['下降','crane down','jib down'], '空间', '环绕或垂直下降，用于落点与结尾', '先保持小弧度环绕，再沿垂直轴缓慢下降到目标高度；两段动作依次执行，尾帧锁定', '落点揭示、悬念结束、宏观转局部', '复杂场景优先拆成两镜，避免同时多轴高速运动', [4,10], 'high'),
  movement('drone','无人机航拍',['航拍','drone','aerial'], '空间', '从高空展示地理关系和规模', '高空稳定前飞或缓慢下降，地平线平直，主体保持可辨认，路径不突然折返', '建立场景、追逐地理关系、史诗规模', '角色面部细节不作为主要信息', [3,10], 'medium'),
  movement('fpv','第一人称航拍',['穿越机','FPV','无人机穿越'], '空间', '第一人称快速穿越空间', '第一人称沿单一路径前飞，依次穿过明确入口、中段空间和目标落点，转向连续且速度不突变', '空间穿越、转场、动作场景', '避免狭窄路径内多次急转和身份表演', [3,8], 'high'),
  movement('pov','主观镜头',['第一人称','POV'], '叙事', '模拟角色视线与身体感受', '摄影机位于角色眼位，按视线方向移动；只保留轻微身体起伏，看到的手部和道具位置稳定', '代入感、发现、恐惧、交互', '不要无依据漂浮或大幅滚转', [2,8], 'high'),
  movement('over-shoulder','过肩跟拍',['过肩','OTS'], '叙事', '从人物肩后观察对方或前方空间', '保持前景肩线占画面一侧，焦点锁定对方或目标；移动时肩线比例与视线轴稳定', '对话、跟随、关系压迫', '正反打必须保持同一轴线与眼神方向', [2,8], 'medium'),
  movement('handheld','手持轻晃',['手持','手持跟随','handheld'], '质感', '加入克制的不稳定感和临场性', '贴近主体，仅保留低幅自然呼吸与步态反馈；不滚转、不突降、不改变主体画面位置', '纪录感、紧张、冲突、追踪', '避免用“剧烈抖动”掩盖动作与身份', [2,8], 'high'),
  movement('whip-pan','甩镜',['快速摇镜','whip pan'], '转场', '高速摇摄产生运动模糊并连接两个目标', '从起始目标快速单向摇向结束目标，中段允许短暂方向性模糊，结束后立即锁定', '喜剧反应、动作连接、场景内快速转场', '只做一次甩镜；目标位置必须明确', [1,3], 'high'),
  movement('focus-pull','焦点转移',['拉焦','rack focus'], '焦点', '机位不动，只改变前后景焦点', '机位、焦段与构图完全锁定，焦点从明确前景平滑转到明确后景主体，或反向执行', '线索揭示、人物反应、关系转换', '不要同时移动摄影机或改变构图', [2,5], 'low'),
  movement('dolly-zoom','滑动变焦',['推拉变焦','dolly zoom','vertigo'], '光学', '机位移动与反向变焦结合，主体大小近似不变、背景透视改变', '摄影机沿光轴推进并同步拉远焦段，主体画面尺寸保持近似不变，背景透视明显伸展，尾帧稳定', '震惊、眩晕、心理转折', '高风险效果，先用低成本短样；不要加入其他运镜', [3,6], 'high'),
  movement('zoom','变焦',['镜头变焦','optical zoom'], '光学', '只改变焦段，不改变机位', '机位固定，焦段单向平滑变化，主体位置稳定；说明从何种景别变到何种景别', '快速强调、信息揭示、复古风格', '不要与推进混写；避免数字跳变', [2,5], 'medium'),
  movement('crash-zoom','快速变焦',['急推变焦','crash zoom'], '光学', '快速改变焦段形成强烈强调', '机位固定，在动作点做一次快速变焦到目标细节，随后立即锁定', '喜剧、惊吓、关键证据', '每镜只使用一次，避免对白中使用', [1,3], 'high'),
  movement('dutch-orbit','旋转镜头',['滚转','roll','dutch roll'], '特殊', '绕光轴滚转或倾斜构图', '主体中心保持锁定，摄影机沿光轴做小角度单向滚转，速度均匀，尾帧停在明确角度', '失衡、梦境、心理异常', '避免完整多圈旋转导致场景重绘', [2,5], 'high'),
  movement('top-down','鸟瞰跟拍',['俯拍跟随','top-down tracking'], '角度', '正上方俯拍并跟随主体', '摄影机保持垂直俯视，沿地面平行跟随主体，比例、朝向和高度稳定', '动线、队形、地理关系、几何构图', '避免俯仰角漂移和主体比例变化', [3,8], 'medium'),
  movement('low-follow','低角度跟拍',['低机位跟拍','低机位推轨','low angle tracking'], '角度', '贴近地面跟随主体移动', '摄影机保持低机位和固定仰角，沿主体路径同速移动，前景视差连续', '力量感、脚步、车辆、运动', '避免高度突然上升和地面穿插', [2,6], 'medium'),
  movement('high-follow','高角度跟拍',['高机位跟拍','high angle tracking'], '角度', '从较高机位跟随主体', '摄影机保持高机位与固定俯角，平稳跟随主体，场景路线清晰可见', '脆弱感、迷失、群体调度', '避免变成垂直鸟瞰或突然下降', [3,8], 'medium'),
  movement('through-window','穿越镜头',['穿窗','穿墙','portal move'], '转场', '摄影机穿过窗口、门洞或前景遮挡完成空间转换', '沿单一直线路径接近明确开口，穿过遮挡后进入新空间并稳定落点；开口尺寸和方位保持连续', '场景转场、空间揭示、梦境转换', '一次只穿越一个边界，避免同时变形与换场', [3,8], 'high'),
  movement('mask-transition','遮挡转场',['遮罩转场','occlusion transition'], '转场', '利用前景物体短暂遮满画面完成切换', '摄影机或前景物体单向运动，在中段完全遮满画面；切换后保持运动方向、速度和构图关系连续', '跨场景匹配、时间跳跃、隐藏剪切', '遮挡前后主体运动方向必须一致', [1,4], 'medium'),
  movement('snake','蛇形运镜',['S形','snake move'], '特殊', '沿平缓 S 形路径穿梭', '摄影机沿平缓 S 形前进，最多两次柔和换向，速度稳定，最终落在明确主体上', '复杂空间探索、群像穿梭', '避免狭窄空间、高速、多次换向', [4,10], 'high'),
  movement('spiral-up','螺旋上升',['环绕上升','spiral rise'], '特殊', '环绕主体同时升高', '以主体为圆心保持半径，沿单方向小弧度环绕并缓慢升高，主体始终可辨认，尾帧揭示空间', '高潮、场景大揭示、角色孤立', '高风险多轴运动，优先 5 秒以上并限制弧度', [5,10], 'high'),
  movement('spiral-down','螺旋下降',['环绕下降','spiral descend'], '特殊', '环绕主体同时降低', '以主体为圆心保持半径，沿单方向小弧度环绕并缓慢下降到中近景，尾帧锁定主体', '从宏观进入人物、悬念落点', '避免主体被遮挡或越过轴线', [5,10], 'high'),
  movement('bullet-time','子弹时间',['时间冻结','bullet time'], '特殊', '主体动作近似冻结，视角快速改变', '主体动作保持近似冻结，摄影机沿小弧线快速改变视角，背景透视连续，结束后恢复正常时间', '动作高潮、关键瞬间、超现实效果', '成本与失败率高，不用于连续对白或复杂群像', [2,5], 'high')
];

const normalize = value => String(value || '').trim().toLowerCase().replace(/[·\s_-]+/g, '');

export function findCameraMovement(value = '固定镜头') {
  const key = normalize(value);
  return CAMERA_MOVEMENTS.find(item => normalize(item.id) === key || normalize(item.label) === key || item.aliases.some(alias => normalize(alias) === key)) || CAMERA_MOVEMENTS[0];
}

export function cameraMotionPlan(move = '固定镜头', intensity = 35) {
  const item = findCameraMovement(move);
  const level = Number(intensity) < 25 ? '极慢、几乎不可察' : Number(intensity) < 55 ? '平稳中慢速' : '明确但不突变';
  return `${item.execution}；运动强度 ${Math.max(0, Math.min(100, Number(intensity) || 0))}/100，${level}`;
}

export function compileCameraPrompt({ move = '固定镜头', intensity = 35, shotSize = '中景', angle = '平视', subjectAction = '主体完成一个连续动作', environmentAction = '环境保持连续的细微运动', duration = 3, startFrame = '稳定建立主体位置', endFrame = '动作完成并稳定收尾' } = {}) {
  const item = findCameraMovement(move);
  const safeDuration = Math.max(1, Math.min(10, Number(duration) || 3));
  const timing = safeDuration <= 3 ? `0–0.5 秒建立，0.5–${Math.max(1, safeDuration - .5)} 秒完成运动，最后 0.5 秒稳定` : `前 20% 建立，中间 60% 完成运动，最后 20% 减速稳定`;
  return `${shotSize}，${angle}。${subjectAction}；${environmentAction}。摄影机${cameraMotionPlan(item.label, intensity)}。${timing}。首帧：${startFrame}。尾帧：${endFrame}。`;
}

export function publicCameraKnowledge() {
  return { version: CAMERA_KNOWLEDGE_VERSION, updatedAt: '2026-08-24', defaultDuration: 3, maxDuration: 10, movements: CAMERA_MOVEMENTS };
}
