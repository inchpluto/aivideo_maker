export const CHARACTER_VIEW_SPECS = [['front','正面胸像'],['threeQuarter','3/4 侧面'],['profile','标准侧面'],['full','全身站姿'],['expression','表情近景']];
export const PROP_VIEW_SPECS = [['hero','主视图'],['reverse','侧后视图'],['detail','材质细节']];
export const ENVIRONMENT_VIEW_SPECS = [['establish','建立视角'],['reverse','反向视角'],['map','空间关系图']];
export const CONSISTENCY_MODES = { quick:{ label:'快速一致性', characterViews:['front','threeQuarter'], propViews:['hero'], environmentViews:['establish'], description:'优先完成可生成首帧的最小参考集。' }, standard:{ label:'标准一致性', characterViews:CHARACTER_VIEW_SPECS.map(item=>item[0]), propViews:PROP_VIEW_SPECS.map(item=>item[0]), environmentViews:ENVIRONMENT_VIEW_SPECS.map(item=>item[0]), description:'补齐多视角角色、道具和场景参考，供连续镜头复用。' } };
