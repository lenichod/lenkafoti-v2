import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export async function readCategories(projectRoot) {
  const categories = JSON.parse(await readFile(path.join(projectRoot, 'content/categories.json'), 'utf8'));
  const ids = new Set();
  if (!Array.isArray(categories) || categories.length === 0) throw new Error('Missing category configuration.');
  for (const category of categories) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.id) || !category.label?.trim() || ids.has(category.id)) {
      throw new Error(`Invalid or duplicate category: ${category.id}`);
    }
    ids.add(category.id);
  }
  return categories;
}

export async function categoryFiles(projectRoot, categoryId) {
  const directory = path.join(projectRoot, 'content/photos', categoryId);
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return entries.filter((entry) => entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({ name: entry.name, path: path.join(directory, entry.name) }))
    .sort((a, b) => collator.compare(a.name, b.name) || a.name.localeCompare(b.name));
}

export function photoId(categoryId, name) {
  return createHash('sha256').update(`${categoryId}/${name}`).digest('hex').slice(0, 16);
}

export function photoAlt(name) {
  const text = path.parse(name).name.replace(/^\d+[\s_-]+/, '').replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toLocaleUpperCase('en') + text.slice(1) : 'Photograph';
}
