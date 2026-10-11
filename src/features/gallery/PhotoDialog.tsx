import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { isFilm } from '../../content/gallery-content.mjs';
import { Icon } from '../../components/Icon';
import { largestSource, photoSources } from './imageSources';
import type { Photo } from './types';
import styles from './PhotoDialog.module.css';

interface Props {
  photos: Photo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function PhotoDialog({ photos, selectedId, onSelect, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const index = photos.findIndex((photo) => photo.id === selectedId);
  const photo = photos[index];
  const isOpen = Boolean(photo);
  const image = photo && <img className={styles.photo} key={photo.id} src={largestSource(photo)} srcSet={photoSources(photo)}
    data-film={isFilm(photo) || undefined}
    sizes="(max-width: 640px) calc(100vw - 24px), calc(100vw - 160px)"
    width={photo.width} height={photo.height} alt={photo.alt}
    onError={() => setFailedId(photo.id)} />;

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (isOpen && !dialog.open) {
      const trigger = document.activeElement as HTMLElement | null;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
      return () => { dialog.close(); document.body.style.overflow = previousOverflow; trigger?.focus(); };
    }
  }, [isOpen]);

  function move(direction: number) {
    const next = photos[index + direction];
    if (next) onSelect(next.id);
  }

  return <dialog ref={dialogRef} className={styles.dialog} aria-label="Photograph detail"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    onKeyDown={(event) => {
      if (event.key === 'Tab') {
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    }}>
    {photo && <>
      <button autoFocus className={`${styles.control} ${styles.close}`} type="button" onClick={onClose}
        aria-label="Close photograph"><Icon name="close" /></button>
      <button className={`${styles.control} ${styles.previous}`} type="button" disabled={index === 0}
        onClick={() => move(-1)} aria-label="Previous photograph"><Icon name="left" /></button>
      {failedId === photo.id ? <p className={styles.error} role="status">This photograph could not be loaded.</p> :
        isFilm(photo) && photo.showDescription ? <figure className={styles.captionedPhoto}
          style={{ '--photo-aspect-ratio': photo.width / photo.height } as CSSProperties}>
          {image}<figcaption className={styles.caption}>{photo.alt}</figcaption>
        </figure> : image}
      <button className={`${styles.control} ${styles.next}`} type="button" disabled={index === photos.length - 1}
        onClick={() => move(1)} aria-label="Next photograph"><Icon name="right" /></button>
    </>}
  </dialog>;
}
