import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { photoAlt, photoId } from './photo-files.mjs';

export async function processPhoto(file, categoryId, outputDirectory) {
  try {
    const input = await readFile(file.path);
    const metadata = await sharp(input).metadata();
    if ((metadata.pages ?? 1) > 1) throw new Error('Animated images are not supported.');
    const rotated = metadata.orientation >= 5 && metadata.orientation <= 8;
    const width = rotated ? metadata.height : metadata.width;
    const height = rotated ? metadata.width : metadata.height;
    if (!width || !height) throw new Error('Image dimensions could not be determined.');
    const id = photoId(categoryId, file.name);
    const hash = createHash('sha256').update(input).digest('hex').slice(0, 12);
    const maximumWidth = Math.min(width, 2560);
    const sizes = [...new Set([480, 960, 1600, maximumWidth].filter((size) => size <= maximumWidth))].sort((a, b) => a - b);
    const variants = [];
    for (const size of sizes) {
      const filename = `${id}-${hash}-${size}.webp`;
      const { width: actualWidth, height: actualHeight } = await sharp(input).rotate()
        .resize({ width: size, withoutEnlargement: true }).webp({ quality: 85 })
        .toFile(path.join(outputDirectory, filename));
      variants.push({ src: `gallery/${filename}`, width: actualWidth, height: actualHeight });
    }
    return { id, categoryId, alt: photoAlt(file.name), width, height, variants };
  } catch (error) {
    throw new Error(`Could not process photograph ${categoryId}/${file.name}: ${error.message}`, { cause: error });
  }
}
