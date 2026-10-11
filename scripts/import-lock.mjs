import { open, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';

export async function acquireImportLock(projectRoot) {
  const lockPath = path.join(path.resolve(projectRoot), '.gallery-import.lock');
  const deadline = Date.now() + 30_000;
  while (true) {
    try {
      const handle = await open(lockPath, 'wx');
      try { await handle.writeFile(String(process.pid)); }
      finally { await handle.close(); }
      return () => rm(lockPath, { force: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // Recover a lock left behind by a terminated importer.
      let owner;
      try { owner = await readFile(lockPath, 'utf8'); }
      catch (readError) { if (readError.code === 'ENOENT') continue; throw readError; }
      const pid = Number(owner);
      if (Number.isSafeInteger(pid) && pid > 0) {
        try { process.kill(pid, 0); }
        catch (probeError) {
          if (probeError.code === 'ESRCH') {
            if (await readFile(lockPath, 'utf8').catch(() => '') === owner) await rm(lockPath, { force: true });
            continue;
          }
        }
      }
      if (Date.now() >= deadline) throw new Error('Another import is still running. Wait for it to finish and try again.');
      await setTimeout(50);
    }
  }
}
