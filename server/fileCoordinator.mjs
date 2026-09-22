import { mkdir, open, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// 进程内队列只能解决同一 Node 进程的竞态；这个锁文件让配置、音色库和 JSON 任务
// 的 read-modify-write 在多个 Node 进程/worker 间也有一个可恢复的临界区。
export async function withFileLock(lockPath, operation, { timeoutMs = 10_000, staleMs = 30_000, pollMs = 15 } = {}) {
  const absolute = path.resolve(lockPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  const startedAt = Date.now();
  let handle = null;
  while (!handle) {
    try {
      handle = await open(absolute, 'wx');
      await handle.writeFile(JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }), 'utf8');
    } catch (error) {
      if (handle) await handle.close().catch(() => undefined);
      handle = null;
      // Windows can report EPERM/EACCES/EBUSY for the short interval in
      // which another process is closing or removing the lock file. Treat
      // those codes like EEXIST and retry within the same bounded wait.
      if (!['EEXIST', 'EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      const existing = await stat(absolute).catch(() => null);
      if (existing && Date.now() - existing.mtimeMs > Math.max(1_000, staleMs)) {
        await unlink(absolute).catch(() => undefined);
        continue;
      }
      if (Date.now() - startedAt >= Math.max(100, timeoutMs)) {
        const lockError = new Error(`文件锁等待超时：${absolute}`);
        lockError.code = 'FILE_LOCK_TIMEOUT';
        throw lockError;
      }
      await wait(Math.max(1, pollMs) + Math.floor(Math.random() * 8));
    }
  }
  try {
    return await operation();
  } finally {
    await handle.close().catch(() => undefined);
    await unlink(absolute).catch(() => undefined);
  }
}
