import configuration from '../../../content/banner.json';
import type { Photo } from '../gallery/types';

interface CategoryBanner {
  photoId: string | null;
  position?: string;
}

interface BannerConfiguration {
  defaultPhotoId: string;
  defaultPosition: string;
  categories: Record<string, CategoryBanner>;
}

const config: BannerConfiguration = configuration;

export function selectBanner(photos: Photo[], categoryId: string) {
  const choice = config.categories[categoryId];
  const categoryPhoto = photos.find((photo) => photo.id === choice?.photoId);
  const defaultPhoto = photos.find((photo) => photo.id === config.defaultPhotoId);
  return {
    photo: categoryPhoto ?? defaultPhoto ?? photos[0],
    position: categoryPhoto ? choice.position ?? config.defaultPosition : config.defaultPosition,
  };
}
