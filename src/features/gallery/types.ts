export interface Category {
  id: string;
  label: string;
}

export interface ImageVariant {
  src: string;
  width: number;
  height: number;
}

export interface Photo {
  id: string;
  categoryId: string;
  alt: string;
  width: number;
  height: number;
  variants: ImageVariant[];
}

export interface GalleryManifest {
  photos: Photo[];
}
