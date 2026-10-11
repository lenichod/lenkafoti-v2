import type { Photo } from './types';

export function imageUrl(src: string) {
  return `${import.meta.env.BASE_URL}${src}`;
}

export function photoSources(photo: Photo) {
  return photo.variants.map((variant) => `${imageUrl(variant.src)} ${variant.width}w`).join(', ');
}

export function largestSource(photo: Photo) {
  return imageUrl(photo.variants[photo.variants.length - 1].src);
}
