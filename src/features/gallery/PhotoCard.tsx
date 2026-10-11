import { useState } from 'react';
import { isFilm } from '../../content/gallery-content.mjs';
import { imageUrl, photoSources } from './imageSources';
import type { Photo } from './types';
import styles from './Gallery.module.css';

export function PhotoCard({ photo, priority, onOpen }: {
  photo: Photo;
  priority: boolean;
  onOpen: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const source = photo.variants.find((variant) => variant.width >= 960) ?? photo.variants.at(-1)!;
  return <button className={styles.card} type="button" onClick={onOpen}
    data-film={isFilm(photo) || undefined}
    aria-label={`Open photograph: ${photo.alt}`}>
    {failed ? <span className={styles.failed} style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>This photograph could not be loaded.</span> :
      <img src={imageUrl(source.src)} srcSet={photoSources(photo)}
        sizes="(min-width: 1440px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        width={photo.width} height={photo.height} alt={photo.alt}
        loading={priority ? 'eager' : 'lazy'} decoding="async"
        fetchPriority={priority ? 'high' : 'auto'} onError={() => setFailed(true)} />}
  </button>;
}
