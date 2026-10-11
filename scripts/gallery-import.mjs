import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { readCategories } from './photo-files.mjs';
import { sourceFiles, readGalleryContent, synchronizeContent, assertMatchingSources, readAndValidateBanners, writeGalleryContent } from './gallery-content.mjs';
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

export async function importPhotos(projectRoot, { synchronize = false, onComplete = () => {} } = {}) {
  const root = path.resolve(projectRoot);
  const release = await acquireImportLock(root);
  try { return await buildGallery(root, synchronize, onComplete); }
  finally { await release(); }
}

async function buildGallery(root, synchronize, onComplete) {
  const categories = await readCategories(root);
  const files = await sourceFiles(root, categories);
  const gallery = synchronize ? await synchronizeContent(root, categories, files) : await readGalleryContent(root, categories);
  assertMatchingSources(gallery, files);
  await readAndValidateBanners(root, gallery, categories);
  const bySource = new Map(files.map((file) => [file.sourcePath, file]));
  const publicDirectory = path.join(root, 'public');
  const outputDirectory = path.join(publicDirectory, 'gallery');
  const cacheDirectory = path.join(root, '.photo-cache');
  await mkdir(publicDirectory, { recursive: true });
  const stagingDirectory = await mkdtemp(path.join(publicDirectory, '.gallery-stage-'));
  assertGeneratedPath(publicDirectory, outputDirectory);
  assertGeneratedPath(publicDirectory, stagingDirectory);
  try {
    const photos = [];
    const statistics = { processed: 0, reused: 0 };
    for (const photo of gallery.photos) {
      if (photo.hidden) continue;
      const result = await processPhoto(bySource.get(photo.sourcePath), photo, stagingDirectory, cacheDirectory);
      photos.push(result.photo);
      statistics[result.reused ? 'reused' : 'processed']++;
    }
    const manifest = { photos };
    await writeFile(path.join(stagingDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    // Validate and process everything before changing the tracked registry.
    if (synchronize) await writeGalleryContent(root, gallery);
    await rm(outputDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    await publishGallery(stagingDirectory, outputDirectory);
    onComplete(statistics);
    return manifest;
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}
