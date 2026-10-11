import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCategories, movePhoto, validateGallery, validateBanners } from '../src/content/gallery-content.mjs';

const categories = [{ id: 'travel', label: 'Travel' }, { id: 'on-film', label: 'On film' }];
const photo = (id, extra = {}) => ({ id: id.repeat(16), sourcePath: `content/photos/travel/${id}.jpg`, categoryIds: ['travel'], alt: 'A landscape', hidden: false, ...extra });

test('bulk categories preserve order and reject removing the last visible category atomically', () => {
  const photos = [photo('a'), photo('b')];
  const selected = new Set([photos[0].id]);
  const added = applyCategories(photos, selected, ['on-film'], 'add');
  assert.deepEqual(added[0].categoryIds, ['travel', 'on-film']);
  assert.equal(added[1], photos[1]);
  assert.deepEqual(applyCategories(added, selected, ['travel'], 'remove')[0].categoryIds, ['on-film']);
  assert.deepEqual(applyCategories(added, selected, ['on-film'], 'set')[0].categoryIds, ['on-film']);
  assert.throws(() => applyCategories(photos, selected, ['travel'], 'remove'), /Keep at least one category/);
  assert.deepEqual(photos[0].categoryIds, ['travel']);
});

test('move operations use the complete shared order, including photos outside a category filter', () => {
  const photos = [photo('a'), photo('b', { categoryIds: ['on-film'] }), photo('c')];
  assert.deepEqual(movePhoto(photos, photos[2].id, -1).map((photo) => photo.id), [photos[0].id, photos[2].id, photos[1].id]);
  assert.deepEqual(movePhoto(photos, photos[2].id, 'first').map((photo) => photo.id), [photos[2].id, photos[0].id, photos[1].id]);
  assert.equal(movePhoto(photos, photos[0].id, -1), photos);
  assert.equal(movePhoto(photos, 'missing', 1), photos);
});

test('content validation rejects duplicate IDs, path traversal, empty descriptions and invalid categories', () => {
  const valid = photo('a');
  const validate = (photos) => validateGallery({ version: 1, photos }, categories);
  assert.throws(() => validate([valid, valid]), /duplicate/);
  assert.throws(() => validate([photo('a', { sourcePath: 'content/photos/travel/../a.jpg' })]), /source path/);
  assert.throws(() => validate([photo('a', { alt: ' ' })]), /English description/);
  assert.throws(() => validate([photo('a', { categoryIds: ['unknown'] })]), /valid category/);
  assert.throws(() => validate([photo('a', { categoryIds: [] })]), /valid category/);
  assert.ok(validate([photo('a', { hidden: true, categoryIds: [] })]));
});

test('description visibility is optional for existing content and only accepts booleans', () => {
  const validate = (extra) => validateGallery({ version: 1, photos: [photo('a', extra)] }, categories);
  assert.equal(validate({}).photos[0].showDescription, undefined);
  assert.equal(validate({ showDescription: true }).photos[0].showDescription, true);
  assert.equal(validate({ showDescription: false }).photos[0].showDescription, false);
  for (const value of ['false', 1, null]) assert.throws(() => validate({ showDescription: value }), /Show description/);
});

test('banners retain manual selections, allow shared fallback and validate hidden references and crops', () => {
  const gallery = { version: 1, photos: [photo('a'), photo('b', { hidden: true })] };
  const banners = { defaultPhotoId: gallery.photos[0].id, defaultPosition: '50% 58%', categories: { 'on-film': { photoId: null } } };
  assert.equal(validateBanners(banners, gallery, categories), banners);
  assert.throws(() => validateBanners({ ...banners, categories: { travel: { photoId: gallery.photos[1].id } } }, gallery, categories), /Replace or clear/);
  assert.throws(() => validateBanners({ ...banners, defaultPosition: '100.1% 50%' }, gallery, categories), /valid crop/);
  assert.throws(() => validateBanners({ ...banners, defaultPhotoId: null }, gallery, categories), /shared banner/);
  assert.ok(validateBanners({ defaultPhotoId: null, defaultPosition: '50% 50%', categories: {} }, { version: 1, photos: [] }, categories));
});
