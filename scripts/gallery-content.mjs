import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { categoryFiles, photoAlt, photoId } from './photo-files.mjs';
import { validateGallery, validateBanners } from '../src/content/gallery-content.mjs';

export async function sourceFiles(root, categories) {
  const files = [];
  for (const category of categories) {
    for (const file of await categoryFiles(root, category.id)) {
      files.push({ ...file, categoryId: category.id, sourcePath: `content/photos/${category.id}/${file.name}` });
    }
  }
  return files;
}

export async function readGalleryContent(root, categories) {
  try {
    return validateGallery(JSON.parse(await readFile(path.join(root, 'content/gallery.json'), 'utf8')), categories);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Missing content/gallery.json. Run npm run photos and commit the resulting content before building.');
    throw error;
  }
}

export async function synchronizeContent(root, categories, files) {
  const source = await readFile(path.join(root, 'content/gallery.json'), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  // Only initialize a genuinely absent registry, never overwrite malformed content.
  const previous = source === null ? { version: 1, photos: [] } : validateGallery(JSON.parse(source), categories);
  const sources = new Set(files.map((file) => file.sourcePath));
  const photos = previous.photos.filter((photo) => sources.has(photo.sourcePath));
  const known = new Set(photos.map((photo) => photo.sourcePath));
  for (const file of files) {
    if (!known.has(file.sourcePath)) photos.push({
      id: photoId(file.categoryId, file.name), sourcePath: file.sourcePath,
      categoryIds: [file.categoryId], alt: photoAlt(file.name), hidden: false, showDescription: false,
    });
  }
  const gallery = validateGallery({ version: 1, photos }, categories);
  return gallery;
}

export function assertMatchingSources(gallery, files) {
  const registered = new Set(gallery.photos.map((photo) => photo.sourcePath));
  const available = new Set(files.map((file) => file.sourcePath));
  for (const source of registered) if (!available.has(source)) throw new Error(`Missing photograph ${source}. Run npm run photos to synchronize local changes.`);
  for (const source of available) if (!registered.has(source)) throw new Error(`Unregistered photograph ${source}. Run npm run photos and commit content/gallery.json.`);
}

export async function readAndValidateBanners(root, gallery, categories) {
  const banners = JSON.parse(await readFile(path.join(root, 'content/banner.json'), 'utf8'));
  return validateBanners(banners, gallery, categories);
}

export async function writeGalleryContent(root, gallery) {
  const destination = path.join(root, 'content/gallery.json');
  const content = `${JSON.stringify(gallery, null, 2)}\n`;
  if (await readFile(destination, 'utf8').catch((error) => { if (error.code === 'ENOENT') return ''; throw error; }) === content) return;
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, content);
  await rename(temporary, destination);
}
