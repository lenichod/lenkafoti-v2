import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const variantSizes = (width) => {
  const maximum = Math.min(width, 2560);
  return [...new Set([480, 960, 1600, maximum].filter((size) => size <= maximum))].sort((a, b) => a - b);
};

export async function readCachedPhoto(cacheDirectory, fingerprint) {
  const directory = path.join(cacheDirectory, fingerprint);
  try {
    const { checksum, ...entry } = JSON.parse(await readFile(path.join(directory, 'metadata.json'), 'utf8'));
    if (digest(JSON.stringify(entry)) !== checksum) return null;
    if (entry.fingerprint !== fingerprint || !Number.isSafeInteger(entry.width) || entry.width < 1 ||
        !Number.isSafeInteger(entry.height) || entry.height < 1 || !Array.isArray(entry.variants)) return null;
    const sizes = variantSizes(entry.width);
    if (entry.variants.length !== sizes.length) return null;
    const variants = [];
    for (const [index, variant] of entry.variants.entries()) {
      if (!variant || variant.width !== sizes[index] || !Number.isSafeInteger(variant.height) || variant.height < 1 ||
          !/^[a-f0-9]{64}$/.test(variant.digest)) return null;
      const bytes = await readFile(path.join(directory, `${variant.width}.webp`));
      if (digest(bytes) !== variant.digest) return null;
      variants.push({ width: variant.width, height: variant.height, bytes });
    }
    return { width: entry.width, height: entry.height, variants };
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError || error instanceof TypeError) return null;
    throw error;
  }
}

export async function cachePhoto(cacheDirectory, fingerprint, photo) {
  const directory = path.join(cacheDirectory, fingerprint);
  await mkdir(directory, { recursive: true });
  const variants = [];
  for (const variant of photo.variants) {
    await writeFile(path.join(directory, `${variant.width}.webp`), variant.bytes);
    variants.push({ width: variant.width, height: variant.height, digest: digest(variant.bytes) });
  }
  // Publish metadata last. Interrupted or corrupt entries are regenerated next time.
  const temporary = path.join(directory, 'metadata.json.tmp');
  const entry = { fingerprint, width: photo.width, height: photo.height, variants };
  await writeFile(temporary, JSON.stringify({ ...entry, checksum: digest(JSON.stringify(entry)) }));
  await rename(temporary, path.join(directory, 'metadata.json'));
}
