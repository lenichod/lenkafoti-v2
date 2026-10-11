import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { importPhotos } from '../scripts/gallery-import.mjs';

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'portfolio-import-test-'));
  assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'content/photos/portraits-people'), { recursive: true });
  await mkdir(path.join(directory, 'content/photos/nature'), { recursive: true });
  await writeFile(path.join(directory, 'content/categories.json'), JSON.stringify([
    { id: 'portraits-people', label: 'Portraits & people' }, { id: 'nature', label: 'Nature' },
  ]));
  return directory;
}

async function image(directory, name, width = 30, height = 20, orientation) {
  let pipeline = sharp({ create: { width, height, channels: 3, background: '#768a63' } });
  if (orientation) pipeline = pipeline.withMetadata({ orientation });
  await pipeline.jpeg().toFile(path.join(directory, 'content/photos', name));
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
  assert.equal(photos[0].categoryId, 'portraits-people');
  assert.equal(photos[1].width, 50);
  assert.equal(photos[2].categoryId, 'nature');
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
