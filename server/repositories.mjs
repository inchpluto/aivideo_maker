// 可迁移的持久化边界：业务路由依赖这些接口，不直接依赖 JSON 文件布局。
// STORAGE_BACKEND=sqlite 时由项目/任务模块切换到本机 SQLite；默认仍兼容原子 JSON。
import { deleteProject, listProjects, readProject, saveAsset, saveBinaryAsset, saveProject, saveRemoteAsset } from './store.mjs';
import { deleteProjectJobs, listGenerationJobs, readGenerationJob, saveGenerationJob } from './jobs.mjs';
import { deleteVoice, listVoicePacks, upsertVoice } from './voiceLibrary.mjs';

export const repositories = Object.freeze({
  projects: Object.freeze({ save: saveProject, read: readProject, list: listProjects, remove: deleteProject }),
  jobs: Object.freeze({ save: saveGenerationJob, read: readGenerationJob, list: listGenerationJobs, removeByProject: deleteProjectJobs }),
  assets: Object.freeze({ save: saveAsset, saveBinary: saveBinaryAsset, saveRemote: saveRemoteAsset }),
  voices: Object.freeze({ list: listVoicePacks, save: upsertVoice, remove: deleteVoice }),
});

export const repositoryContract = Object.freeze({
  version: '1.0.0',
  storage: String(process.env.STORAGE_BACKEND || 'atomic-json').toLowerCase() === 'sqlite' ? 'sqlite' : 'atomic-json',
  entities: ['projects', 'jobs', 'assets', 'voices'],
  guarantees: ['atomic-replace', 'project-revision-check', 'job-write-serialization', 'media-probe-before-reference'],
  migrationTarget: 'sqlite',
});
