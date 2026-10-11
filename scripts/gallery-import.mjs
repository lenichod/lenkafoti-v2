import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { categoryFiles, readCategories } from './photo-files.mjs';
import { processPhoto } from './process-photo.mjs';
import { acquireImportLock } from './import-lock.mjs';

// Only generated directories directly inside this project's public folder can be removed.
function assertGeneratedPath(publicDirectory, target) {
  const resolved = path.resolve(target);
  if (path.dirname(resolved) !== path.resolve(publicDirectory) ||
    !(path.basename(resolved) === 'gallery' || path.basename(resolved).startsWith('.gallery-stage-'))) {
    throw new Error(`Unsafe generated file path: ${target}`);
  }
}

// Windows file watchers can briefly hold generated folders open.
async function publishGallery(stagingDirectory, outputDirectory) {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(stagingDirectory, outputDirectory);
      return;
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 6) throw error;
      await setTimeout(100 * 2 ** attempt);
    }
  }
}

export async function importPhotos(projectRoot) {
  const root = path.resolve(projectRoot);
  const release = await acquireImportLock(root);
  try { return await buildGallery(root); }
  finally { await release(); }
}

async function buildGallery(root) {
  const categories = await readCategories(root);
  const publicDirectory = path.join(root, 'public');
  const outputDirectory = path.join(publicDirectory, 'gallery');
  await mkdir(publicDirectory, { recursive: true });
  const stagingDirectory = await mkdtemp(path.join(publicDirectory, '.gallery-stage-'));
  assertGeneratedPath(publicDirectory, outputDirectory);
  assertGeneratedPath(publicDirectory, stagingDirectory);
  try {
    const photos = [];
    for (const category of categories) {
      const files = await categoryFiles(root, category.id);
      for (const file of files) photos.push(await processPhoto(file, category.id, stagingDirectory));
    }
    const manifest = { photos };
    await writeFile(path.join(stagingDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await rm(outputDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    await publishGallery(stagingDirectory, outputDirectory);
    return manifest;
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}
