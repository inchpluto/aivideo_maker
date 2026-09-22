import { synchronizeAssetVersions } from '../shared/assetVersions.mjs';
const clean = value => String(value ?? '').trim();

export function synchronizeAssetLinks(project = {}) {
  const episodes = (project.episodes || []).map((episode, episodeIndex) => {
    const scenes = (episode.scenes || []).map((scene, sceneIndex) => ({
      ...scene,
      id: clean(scene.id) || `ep${episodeIndex + 1}-scene-${sceneIndex + 1}`
    }));
    const sceneById = new Map(scenes.map(scene => [scene.id, scene]));
    const dialogues = (episode.dialogues || []).map((line, lineIndex) => {
      const inferredScene = scenes[Math.min(lineIndex, Math.max(0, scenes.length - 1))];
      const sceneRef = sceneById.has(clean(line.sceneRef)) ? clean(line.sceneRef) : inferredScene?.id || '';
      return {
        intention: '推动当前场景目标', pauseStyle: '按语义自然停顿', pace: '中速', emphasis: '',
        ...line,
        id: clean(line.id) || `ep${episodeIndex + 1}-dialogue-${lineIndex + 1}`,
        sceneRef
      };
    });
    const speakersByScene = dialogues.reduce((map, line) => {
      if (!map.has(line.sceneRef)) map.set(line.sceneRef, new Set());
      if (line.character) map.get(line.sceneRef).add(line.character);
      return map;
    }, new Map());
    return {
      ...episode,
      id: clean(episode.id) || `ep-${String(episodeIndex + 1).padStart(2, '0')}`,
      scenes: scenes.map(scene => ({
        ...scene,
        characters: [...new Set([...(scene.characters || []), ...(speakersByScene.get(scene.id) || [])])]
      })),
      dialogues
    };
  });

  const scenes = episodes.flatMap(episode => episode.scenes || []);
  const dialogues = episodes.flatMap(episode => episode.dialogues || []);
  const sceneById = new Map(scenes.map(scene => [scene.id, scene]));
  const props = ((project.assets || {}).props || []).map((prop, index) => ({
    ...prop,
    id: clean(prop.id) || `prop-${index + 1}`,
    sceneRefs: (prop.sceneRefs || []).map(ref => clean(ref)).filter(ref => sceneById.has(ref))
  }));
  const shots = (project.shots || []).map((shot, index) => {
    const scene = sceneById.get(clean(shot.sceneRef)) || scenes[Math.min(index, Math.max(0, scenes.length - 1))];
    const sceneLines = dialogues.filter(line => line.sceneRef === scene?.id);
    const dialogue = dialogues.find(line => line.id === shot.dialogueRef)
      || sceneLines.find(line => clean(line.text) === clean(shot.dialogue))
      || sceneLines[0];
    return {
      ...shot,
      id: clean(shot.id) || String(index + 1).padStart(2, '0'),
      sceneRef: scene?.id || clean(shot.sceneRef),
      scene: scene?.heading || shot.scene || '',
      dialogueRef: dialogue?.id || '',
      dialogue: shot.dialogue || dialogue?.text || '',
      characters: [...new Set([...(shot.characters || []), ...(scene?.characters || []), dialogue?.character].filter(Boolean))]
    };
  });
  const next = {
    ...project,
    episodes,
    shots,
    assets: { ...(project.assets || {}), props },
    assetLinkage: { status: 'synced', syncedAt: new Date().toISOString(), scenes: scenes.length, dialogues: dialogues.length, shots: shots.length, props: props.length },
    updatedAt: new Date().toISOString()
  };
  return synchronizeAssetVersions(next);
}

export function summarizeAssetLinks(project = {}) {
  const scenes = (project.episodes || []).flatMap(episode => episode.scenes || []);
  const dialogues = (project.episodes || []).flatMap(episode => episode.dialogues || []);
  const shots = project.shots || [];
  const props = (project.assets || {}).props || [];
  const sceneIds = new Set(scenes.map(scene => clean(scene.id)).filter(Boolean));
  const dialogueIds = new Set(dialogues.map(line => clean(line.id)).filter(Boolean));
  const broken = [
    ...dialogues.filter(line => !clean(line.id) || !sceneIds.has(clean(line.sceneRef))).map(line => `台词：${line.character || '未命名'}`),
    ...shots.filter(shot => !sceneIds.has(clean(shot.sceneRef)) || (shot.dialogueRef && !dialogueIds.has(clean(shot.dialogueRef)))).map(shot => `镜头：${shot.id || '未编号'}`)
  ];
  return { scenes: scenes.length, dialogues: dialogues.length, shots: shots.length, props: props.length, broken };
}
