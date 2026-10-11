import type { Photo } from './types';
import { PhotoCard } from './PhotoCard';
import styles from './Gallery.module.css';

export function Gallery({ photos, onOpen }: { photos: Photo[]; onOpen: (id: string) => void }) {
  return <div className={styles.gallery} aria-label="Photo gallery">
    {photos.map((photo, index) => <PhotoCard key={photo.id} photo={photo}
      priority={index === 0} onOpen={() => onOpen(photo.id)} />)}
  </div>;
}
