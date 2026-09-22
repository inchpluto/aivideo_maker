import { createZip } from './projectPackage.mjs';

const eventSummary = event => ({ at:event?.at, type:event?.type, stage:event?.stage, code:event?.code, status:event?.status });
const jobSummary = job => ({
  id: job?.id,
  type: job?.type || 'generation',
  task: job?.task,
  projectId: job?.projectId,
  status: job?.status,
  progress: job?.progress,
  code: job?.code,
  failure: job?.failure,
  provider: job?.provider,
  providerTaskId: job?.providerTaskId ? '[已记录]' : '',
  createdAt: job?.createdAt,
  updatedAt: job?.updatedAt,
  events: Array.isArray(job?.events) ? job.events.slice(-30).map(eventSummary) : []
});

export function createDiagnosticsPackage({ diagnostics, metrics, projects = [], jobs = [], backups = [] }) {
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    scope: '本地脱敏诊断；不包含项目正文、媒体、请求体、密钥或上游响应原文。',
    metrics,
    recentRequests: diagnostics.recent(),
    projects: projects.map(project => ({ id:project.id, title:project.title, type:project.type, revision:project.revision, updatedAt:project.updatedAt, completion:project.completion })),
    jobs: jobs.map(jobSummary),
    backups: backups.map(item => ({ projectId:item.projectId, backupId:item.backupId, bytes:item.bytes, files:item.files, createdAt:item.createdAt, ok:item.ok }))
  };
  const data = Buffer.from(JSON.stringify(report, null, 2), 'utf8');
  const readme = Buffer.from('星幕本地诊断包\n\n此包仅含脱敏请求记录、运行指标、项目摘要、任务摘要和备份摘要，不包含项目正文、媒体文件、请求体或密钥。\n', 'utf8');
  return { buffer:createZip([{ path:'README.txt', data:readme }, { path:'diagnostics.json', data }]), report };
}
