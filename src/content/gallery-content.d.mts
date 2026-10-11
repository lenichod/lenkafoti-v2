import type { Category, Photo } from '../features/gallery/types';

export interface SourcePhoto {
  id: string;
  sourcePath: string;
  categoryIds: string[];
  alt: string;
  hidden: boolean;
}
export interface GalleryContent { version: 1; photos: SourcePhoto[] }
export interface CategoryBanner { photoId: string | null; position?: string }
export interface BannerConfiguration {
  defaultPhotoId: string | null;
  defaultPosition: string;
  categories: Record<string, CategoryBanner>;
}
export function validateCategories(categories: unknown): Category[];
export function validateGallery(gallery: unknown, categories: Category[]): GalleryContent;
export function validateBanners(banners: unknown, gallery: GalleryContent, categories: Category[]): BannerConfiguration;
export function filterPhotos<T extends Pick<Photo, 'categoryIds'>>(photos: T[], categoryId: string): T[];
export function isFilm(photo: Pick<Photo, 'categoryIds'>): boolean;
export function applyCategories(photos: SourcePhoto[], selectedIds: Set<string>, categoryIds: string[], action: 'add' | 'remove' | 'set'): SourcePhoto[];
export function movePhoto<T extends { id: string }>(photos: T[], id: string, direction: number | 'first'): T[];
