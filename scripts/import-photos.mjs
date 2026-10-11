import { fileURLToPath } from 'node:url';
import { appendFile } from 'node:fs/promises';
import { importPhotos } from './gallery-import.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
try {
  let statistics;
  const { photos } = await importPhotos(projectRoot, {
    synchronize: !process.argv.includes('--read-only'), onComplete: (result) => { statistics = result; },
  });
  console.log(`Gallery ready: ${photos.length} ${photos.length === 1 ? 'photograph' : 'photographs'} (${statistics.processed} processed, ${statistics.reused} reused).`);
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `processed=${statistics.processed}\nreused=${statistics.reused}\n`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
