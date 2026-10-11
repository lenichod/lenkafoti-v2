import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { cachePhoto, readCachedPhoto, variantSizes } from './photo-cache.mjs';

// Changes to the encoder, cache format or Sharp invalidate existing image entries.
const recipe = Promise.all([
  readFile(new URL('./process-photo.mjs', import.meta.url)),
  readFile(new URL('./photo-cache.mjs', import.meta.url)),
]).then((sources) => createHash('sha256').update(sources[0]).update(sources[1])
  .update(JSON.stringify(sharp.versions)).update(process.platform).update(process.arch).digest('hex'));

export async function processPhoto(file, photo, outputDirectory, cacheDirectory) {
  try {
    const input = await readFile(file.path);
    const fingerprint = createHash('sha256').update(await recipe).update(input).digest('hex');
    let image = await readCachedPhoto(cacheDirectory, fingerprint);
    const reused = image !== null;
    if (!image) {
      const metadata = await sharp(input).metadata();
      if ((metadata.pages ?? 1) > 1) throw new Error('Animated images are not supported.');
      const rotated = metadata.orientation >= 5 && metadata.orientation <= 8;
      const width = rotated ? metadata.height : metadata.width;
      const height = rotated ? metadata.width : metadata.height;
      if (!width || !height) throw new Error('Image dimensions could not be determined.');
      image = { width, height, variants: [] };
      for (const size of variantSizes(width)) {
        const { data, info } = await sharp(input).rotate()
          .resize({ width: size, withoutEnlargement: true }).webp({ quality: 85 })
          .toBuffer({ resolveWithObject: true });
        image.variants.push({ width: info.width, height: info.height, bytes: data });
      }
      await cachePhoto(cacheDirectory, fingerprint, image);
    }
    const variants = [];
    for (const variant of image.variants) {
      const filename = `${photo.id}-${fingerprint.slice(0, 12)}-${variant.width}.webp`;
      await writeFile(path.join(outputDirectory, filename), variant.bytes);
      variants.push({ src: `gallery/${filename}`, width: variant.width, height: variant.height });
    }
    return { reused, photo: { id: photo.id, categoryIds: photo.categoryIds, alt: photo.alt,
      showDescription: photo.showDescription ?? false, width: image.width, height: image.height, variants } };
  } catch (error) {
    throw new Error(`Could not process photograph ${photo.sourcePath}: ${error.message}`, { cause: error });
  }
}
