import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { importPhotos as buildPhotos } from '../scripts/gallery-import.mjs';
import { photoId } from '../scripts/photo-files.mjs';
import { isFilm, filterPhotos } from '../src/content/gallery-content.mjs';

const importPhotos = (root) => buildPhotos(root, { synchronize: true });

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'portfolio-import-test-'));
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content/photos/portraits-people'), { recursive: true });
  await mkdir(path.join(directory, 'content/photos/nature'), { recursive: true });
  await writeFile(path.join(directory, 'content/categories.json'), JSON.stringify([
    { id: 'portraits-people', label: 'Portraits & people' }, { id: 'nature', label: 'Nature' },
  ]));
  await writeFile(path.join(directory, 'content/banner.json'), JSON.stringify({ defaultPhotoId: null, defaultPosition: '50% 50%', categories: {} }));
  return directory;
}

async function image(directory, name, width = 30, height = 20, orientation) {
  let pipeline = sharp({ create: { width, height, channels: 3, background: '#768a63' } });
  if (orientation) pipeline = pipeline.withMetadata({ orientation });
  await pipeline.jpeg().toFile(path.join(directory, 'content/photos', name));
  const bannerPath = path.join(directory, 'content/banner.json');
  const banners = JSON.parse(await readFile(bannerPath, 'utf8'));
  if (banners.defaultPhotoId === null) {
    const [categoryId, filename] = name.split('/');
    banners.defaultPhotoId = photoId(categoryId, filename);
    await writeFile(bannerPath, JSON.stringify(banners));
  }
}

test('empty categories produce an empty manifest and ignore unsupported files', async (t) => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, 'content/photos/portraits-people/RAW.nef'), 'not an image');
  assert.deepEqual(await importPhotos(directory), { photos: [] });
});

test('natural ordering, unique IDs across categories, descriptive alt and no upscaling', async (t) => {
  const directory = await fixture(t);
  await image(directory, 'portraits-people/10-summer-portrait.JPG', 50, 20);
  await image(directory, 'portraits-people/02-summer-portrait.jpg');
  await image(directory, 'nature/02-summer-portrait.jpg');
  const { photos } = await importPhotos(directory);
  assert.equal(photos.length, 3);
  assert.equal(new Set(photos.map((photo) => photo.id)).size, 3);
  assert.equal(photos[0].alt, 'Summer portrait');
  assert.equal(photos[0].id, (await importPhotos(directory)).photos[0].id);
  assert.match(photos[0].variants[0].src, /^gallery\/[a-f0-9-]+\.webp$/);
  assert.equal(photos[0].variants[0].width, 30);
  assert.equal(photos[0].variants[0].height, 20);
  assert.equal(photos[0].variants.length, 1);
  assert.deepEqual(photos[0].categoryIds, ['portraits-people']);
  assert.equal(photos[1].width, 50);
  assert.deepEqual(photos[2].categoryIds, ['nature']);
});

test('EXIF orientation is applied and metadata is removed', async (t) => {
  const directory = await fixture(t);
  await image(directory, 'portraits-people/rotated.jpg', 40, 20, 6);
  const { photos } = await importPhotos(directory);
  assert.equal(photos[0].width, 20);
  assert.equal(photos[0].height, 40);
  const output = await sharp(await readFile(path.join(directory, 'public', photos[0].variants[0].src))).metadata();
  assert.equal(output.width, 20);
  assert.equal(output.height, 40);
  assert.equal(output.exif, undefined);
  assert.equal(output.orientation, undefined);
});

test('responsive widths are capped at 2560 and encoded dimensions match the manifest', async (t) => {
  const directory = await fixture(t);
  await image(directory, 'nature/wide.jpg', 3000, 1500);
  const { photos } = await importPhotos(directory);
  assert.deepEqual(photos[0].variants.map((variant) => variant.width), [480, 960, 1600, 2560]);
  for (const variant of photos[0].variants) {
    const metadata = await sharp(await readFile(path.join(directory, 'public', variant.src))).metadata();
    assert.equal(metadata.width, variant.width);
    assert.equal(metadata.height, variant.height);
  }
});

test('removing or replacing a photo removes stale generated images', async (t) => {
  const directory = await fixture(t);
  const name = 'portraits-people/portrait.jpg';
  await image(directory, name);
  const original = await importPhotos(directory);
  await image(directory, name, 60, 40);
  const changed = await importPhotos(directory);
  assert.equal(original.photos[0].id, changed.photos[0].id);
  assert.notEqual(original.photos[0].variants[0].src, changed.photos[0].variants[0].src);
  const oldOutput = path.join(directory, 'public', original.photos[0].variants[0].src);
  await assert.rejects(readFile(oldOutput), { code: 'ENOENT' });
  await rm(path.join(directory, 'content/photos', name));
  await writeFile(path.join(directory, 'content/banner.json'), JSON.stringify({ defaultPhotoId: null, defaultPosition: '50% 50%', categories: {} }));
  assert.deepEqual(await importPhotos(directory), { photos: [] });
  assert.deepEqual(await readdir(path.join(directory, 'public/gallery')), ['manifest.json']);
});

test('corrupt input names the file and retains the previous successful gallery', async (t) => {
  const directory = await fixture(t);
  await image(directory, 'portraits-people/valid.jpg');
  const original = await importPhotos(directory);
  await writeFile(path.join(directory, 'content/photos/portraits-people/broken.jpg'), 'broken');
  await assert.rejects(importPhotos(directory), /portraits-people\/broken\.jpg/);
  const manifest = JSON.parse(await readFile(path.join(directory, 'public/gallery/manifest.json'), 'utf8'));
  assert.deepEqual(manifest, original);
  assert.deepEqual(await readdir(path.join(directory, 'public')), ['gallery']);
});

test('PNG and WebP inputs preserve transparent pixels', async (t) => {
  const directory = await fixture(t);
  for (const extension of ['PNG', 'webp']) {
    await sharp({ create: { width: 20, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .toFile(path.join(directory, 'content/photos/portraits-people', `transparent.${extension}`));
  }
  await writeFile(path.join(directory, 'content/banner.json'), JSON.stringify({ defaultPhotoId: photoId('portraits-people', 'transparent.PNG'), defaultPosition: '50% 50%', categories: {} }));
  const { photos } = await importPhotos(directory);
  assert.equal(photos.length, 2);
  for (const photo of photos) {
    const metadata = await sharp(await readFile(path.join(directory, 'public', photo.variants[0].src))).metadata();
    assert.equal(metadata.hasAlpha, true);
  }
});

test('concurrent imports wait for each other and leave one complete gallery', async (t) => {
  const directory = await fixture(t);
  await image(directory, 'portraits-people/portrait.jpg', 1000, 600);
  const results = await Promise.all([importPhotos(directory), importPhotos(directory)]);
  assert.deepEqual(results[0], results[1]);
  await assert.rejects(readFile(path.join(directory, '.gallery-import.lock')), { code: 'ENOENT' });
  const manifest = JSON.parse(await readFile(path.join(directory, 'public/gallery/manifest.json'), 'utf8'));
  assert.deepEqual(manifest, results[0]);
});

test('synchronization preserves legacy IDs, banner selection, online edits and global order', async (t) => {
  const directory = await fixture(t);
  await image(directory, 'portraits-people/portrait.jpg');
  await image(directory, 'nature/trees.jpg');
  const original = await importPhotos(directory);
  const registryPath = path.join(directory, 'content/gallery.json');
  const gallery = JSON.parse(await readFile(registryPath, 'utf8'));
  gallery.photos.reverse();
  gallery.photos[0].alt = 'An edited English description';
  gallery.photos[0].categoryIds = ['nature', 'portraits-people'];
  gallery.photos[0].showDescription = true;
  await writeFile(registryPath, JSON.stringify(gallery, null, 2) + '\n');
  const banners = await readFile(path.join(directory, 'content/banner.json'), 'utf8');
  await image(directory, 'nature/01-new.jpg');
  const changed = await importPhotos(directory);
  assert.equal(original.photos[0].id, photoId('portraits-people', 'portrait.jpg'));
  assert.deepEqual(changed.photos.map((photo) => photo.id), [...gallery.photos.map((photo) => photo.id), photoId('nature', '01-new.jpg')]);
  assert.equal(changed.photos[0].alt, 'An edited English description');
  assert.deepEqual(changed.photos[0].categoryIds, ['nature', 'portraits-people']);
  assert.equal(changed.photos[0].showDescription, true);
  assert.equal(changed.photos.at(-1).showDescription, false);
  assert.equal(await readFile(path.join(directory, 'content/banner.json'), 'utf8'), banners);
  const synchronized = await readFile(registryPath, 'utf8');
  await importPhotos(directory);
  assert.equal(await readFile(registryPath, 'utf8'), synchronized);
});

test('production descriptions default off for old content and follow saved toggles without rewriting content', async (t) => {
  const directory = await fixture(t);
  await image(directory, 'nature/trees.jpg');
  await importPhotos(directory);
  const registryPath = path.join(directory, 'content/gallery.json');
  const gallery = JSON.parse(await readFile(registryPath, 'utf8'));
  delete gallery.photos[0].showDescription;
  for (const enabled of [undefined, true, false]) {
    if (enabled !== undefined) gallery.photos[0].showDescription = enabled;
    const saved = JSON.stringify(gallery);
    await writeFile(registryPath, saved);
    const { photos } = await buildPhotos(directory);
    assert.equal(photos[0].showDescription, enabled ?? false);
    assert.equal(await readFile(registryPath, 'utf8'), saved);
  }
});

test('read-only production imports reject unsynchronized sources and never change tracked content', async (t) => {
  const directory = await fixture(t);
  await image(directory, 'nature/trees.jpg');
  await assert.rejects(buildPhotos(directory), /Missing content\/gallery.json/);
  await importPhotos(directory);
  const registryPath = path.join(directory, 'content/gallery.json');
  const registry = await readFile(registryPath, 'utf8');
  await buildPhotos(directory);
  assert.equal(await readFile(registryPath, 'utf8'), registry);
  await image(directory, 'nature/new.jpg');
  await assert.rejects(buildPhotos(directory), /Unregistered photograph content\/photos\/nature\/new.jpg/);
  assert.equal(await readFile(registryPath, 'utf8'), registry);
  await importPhotos(directory);
  await rm(path.join(directory, 'content/photos/nature/new.jpg'));
  await assert.rejects(buildPhotos(directory), /Missing photograph content\/photos\/nature\/new.jpg/);
  await importPhotos(directory);
  assert.equal(JSON.parse(await readFile(registryPath, 'utf8')).photos.length, 1);
});

test('multiple categories share one image and film treatment follows the photograph', async (t) => {
  const directory = await fixture(t);
  const categoriesPath = path.join(directory, 'content/categories.json');
  const categories = JSON.parse(await readFile(categoriesPath, 'utf8'));
  categories.push({ id: 'on-film', label: 'On film' });
  await writeFile(categoriesPath, JSON.stringify(categories));
  await image(directory, 'nature/trees.jpg');
  await importPhotos(directory);
  const registryPath = path.join(directory, 'content/gallery.json');
  const gallery = JSON.parse(await readFile(registryPath, 'utf8'));
  gallery.photos[0].categoryIds = ['nature', 'on-film'];
  await writeFile(registryPath, JSON.stringify(gallery));
  const { photos } = await buildPhotos(directory);
  assert.equal(filterPhotos(photos, 'all').length, 1);
  assert.deepEqual(filterPhotos(photos, 'nature'), filterPhotos(photos, 'on-film'));
  assert.equal(isFilm(filterPhotos(photos, 'nature')[0]), true);
  assert.equal((await readdir(path.join(directory, 'public/gallery'))).filter((file) => file.endsWith('.webp')).length, 1);
});

test('hiding a banner requires an explicit replacement; hiding and restoring retain the source', async (t) => {
  const directory = await fixture(t);
  await image(directory, 'nature/trees.jpg');
  const original = await importPhotos(directory);
  const registryPath = path.join(directory, 'content/gallery.json');
  const gallery = JSON.parse(await readFile(registryPath, 'utf8'));
  gallery.photos[0].hidden = true;
  await writeFile(registryPath, JSON.stringify(gallery));
  await assert.rejects(buildPhotos(directory), /Choose a visible shared banner/);
  await writeFile(path.join(directory, 'content/banner.json'), JSON.stringify({ defaultPhotoId: null, defaultPosition: '50% 50%', categories: {} }));
  assert.deepEqual(await buildPhotos(directory), { photos: [] });
  assert.ok((await readFile(path.join(directory, 'content/photos/nature/trees.jpg'))).length);
  gallery.photos[0].hidden = false;
  await writeFile(registryPath, JSON.stringify(gallery));
  await writeFile(path.join(directory, 'content/banner.json'), JSON.stringify({ defaultPhotoId: gallery.photos[0].id, defaultPosition: '50% 50%', categories: {} }));
  assert.deepEqual(await buildPhotos(directory), original);
});

test('malformed content and corrupt new photographs never overwrite the registry or successful gallery', async (t) => {
  const directory = await fixture(t);
  await image(directory, 'nature/trees.jpg');
  const original = await importPhotos(directory);
  const registryPath = path.join(directory, 'content/gallery.json');
  const originalRegistry = await readFile(registryPath, 'utf8');
  await writeFile(registryPath, '{broken');
  await assert.rejects(importPhotos(directory), SyntaxError);
  assert.equal(await readFile(registryPath, 'utf8'), '{broken');
  await writeFile(registryPath, originalRegistry);
  await writeFile(path.join(directory, 'content/photos/nature/corrupt.jpg'), 'not an image');
  await assert.rejects(importPhotos(directory), /nature\/corrupt.jpg/);
  assert.equal(await readFile(registryPath, 'utf8'), originalRegistry);
  assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'public/gallery/manifest.json'), 'utf8')), original);
});
