import { fileURLToPath } from 'node:url';
import { importPhotos } from './gallery-import.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
try {
  const { photos } = await importPhotos(projectRoot);
  console.log(`Gallery ready: ${photos.length} ${photos.length === 1 ? 'photograph' : 'photographs'}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
