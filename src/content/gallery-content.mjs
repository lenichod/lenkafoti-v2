const SOURCE = /^content\/photos\/[a-z0-9]+(?:-[a-z0-9]+)*\/[^/\\\x00-\x1f]+\.(?:jpe?g|png|webp)$/i;
const POSITION = /^(?:100|\d{1,2})(?:\.\d+)?% (?:100|\d{1,2})(?:\.\d+)?%$/;

export function validateCategories(categories) {
  if (!Array.isArray(categories) || !categories.length) throw new Error('Missing category configuration.');
  const ids = new Set();
  for (const category of categories) {
    if (!category || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.id) || category.id === 'all' ||
        typeof category.label !== 'string' || !category.label.trim() || ids.has(category.id)) {
      throw new Error('Invalid or duplicate category.');
    }
    ids.add(category.id);
  }
  return categories;
}

export function validateGallery(gallery, categories) {
  const categoryIds = new Set(validateCategories(categories).map((category) => category.id));
  if (!gallery || gallery.version !== 1 || !Array.isArray(gallery.photos)) throw new Error('Invalid gallery configuration.');
  const ids = new Set();
  const paths = new Set();
  for (const photo of gallery.photos) {
    if (!photo || typeof photo.id !== 'string' || !/^[a-f0-9]{16}$/.test(photo.id) || ids.has(photo.id) ||
        typeof photo.sourcePath !== 'string' || !SOURCE.test(photo.sourcePath) || paths.has(photo.sourcePath) ||
        photo.sourcePath.split('/').some((part) => part === '.' || part === '..') ||
        !categoryIds.has(photo.sourcePath.split('/')[2])) throw new Error('Invalid or duplicate photograph ID or source path.');
    if (!Array.isArray(photo.categoryIds) || (!photo.hidden && !photo.categoryIds.length) ||
        new Set(photo.categoryIds).size !== photo.categoryIds.length || photo.categoryIds.some((id) => !categoryIds.has(id))) {
      throw new Error(`Choose at least one valid category for ${photo.sourcePath}.`);
    }
    if (typeof photo.alt !== 'string' || !photo.alt.trim() || photo.alt.length > 500 || typeof photo.hidden !== 'boolean') {
      throw new Error(`Enter an English description (up to 500 characters) for ${photo.sourcePath}.`);
    }
    ids.add(photo.id);
    paths.add(photo.sourcePath);
  }
  return gallery;
}

export function validateBanners(banners, gallery, categories) {
  validateGallery(gallery, categories);
  const visible = new Set(gallery.photos.filter((photo) => !photo.hidden).map((photo) => photo.id));
  const categoryIds = new Set(categories.map((category) => category.id));
  const validPhoto = (id) => id === null || (typeof id === 'string' && visible.has(id));
  const validPosition = (value) => typeof value === 'string' && POSITION.test(value) &&
    value.split(' ').every((part) => parseFloat(part) <= 100);
  if (!banners || !validPhoto(banners.defaultPhotoId) || !validPosition(banners.defaultPosition) ||
      (visible.size > 0 && banners.defaultPhotoId === null) || !banners.categories ||
      typeof banners.categories !== 'object' || Array.isArray(banners.categories)) {
    throw new Error('Choose a visible shared banner and a valid crop position. Empty portfolios can have no shared banner.');
  }
  for (const [categoryId, choice] of Object.entries(banners.categories)) {
    if (!categoryIds.has(categoryId) || !choice || !validPhoto(choice.photoId) ||
        (choice.position !== undefined && !validPosition(choice.position))) {
      throw new Error(`Replace or clear the unavailable banner for ${categoryId}.`);
    }
  }
  return banners;
}

export function filterPhotos(photos, categoryId) {
  return categoryId === 'all' ? photos : photos.filter((photo) => photo.categoryIds.includes(categoryId));
}

export function isFilm(photo) { return photo.categoryIds.includes('on-film'); }

export function applyCategories(photos, selectedIds, categoryIds, action) {
  return photos.map((photo) => {
    if (!selectedIds.has(photo.id)) return photo;
    const next = action === 'set' ? [...categoryIds] : action === 'add' ? [...new Set([...photo.categoryIds, ...categoryIds])] :
      photo.categoryIds.filter((id) => !categoryIds.includes(id));
    if (!photo.hidden && !next.length) throw new Error(`Keep at least one category for ${photo.sourcePath}.`);
    return { ...photo, categoryIds: next };
  });
}

export function movePhoto(photos, id, direction) {
  const index = photos.findIndex((photo) => photo.id === id);
  const target = direction === 'first' ? 0 : index + direction;
  if (index < 0 || target < 0 || target >= photos.length || target === index) return photos;
  const next = [...photos];
  const [photo] = next.splice(index, 1);
  next.splice(target, 0, photo);
  return next;
}
