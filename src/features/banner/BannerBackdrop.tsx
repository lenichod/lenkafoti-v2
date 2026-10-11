import { useEffect, useRef, useState } from 'react';
import { imageUrl, photoSources } from '../gallery/imageSources';
import type { ImageVariant, Photo } from '../gallery/types';
import styles from './PortfolioHero.module.css';

interface Frame {
  id: number;
  key: string;
  photo?: Photo;
  source?: ImageVariant;
  position: string;
  ready: boolean;
}

function frameFor(photo: Photo | undefined, position: string, id: number): Frame {
  const source = photo?.variants.find((variant) => variant.width >= 1600) ?? photo?.variants.at(-1);
  return { id, key: source ? `${source.src}:${position}` : 'gradient', photo, source, position, ready: !source };
}

export function BannerBackdrop({ photo, position }: { photo?: Photo; position: string }) {
  const nextId = useRef(1);
  const [frames, setFrames] = useState<Frame[]>(() => [frameFor(photo, position, 0)]);

  useEffect(() => {
    const next = frameFor(photo, position, nextId.current++);
    setFrames((current) => {
      if (current.at(-1)?.key === next.key) return current;
      // Cancel unloaded candidates, retaining visible layers during rapid changes.
      const visible = current.filter((frame) => frame.ready);
      return visible.at(-1)?.key === next.key ? visible : [...visible, next];
    });
  }, [photo, position]);

  function discard(id: number) {
    setFrames((current) => current.filter((frame) => frame.id !== id));
  }

  async function reveal(id: number, image: HTMLImageElement) {
    try { await image.decode(); }
    catch { discard(id); return; }
    setFrames((current) => {
      const candidate = current.at(-1);
      if (candidate?.id !== id || candidate.ready) return current;
      return current.map((frame) => frame.id === id ? { ...frame, ready: true } : frame);
    });
  }

  function finish(id: number) {
    setFrames((current) => {
      const index = current.findIndex((frame) => frame.id === id);
      // An opaque layer can replace those below it, while newer layers keep fading.
      return index > 0 ? current.slice(index) : current;
    });
  }

  return <div className={styles.backdrop} aria-hidden="true">
    {frames.map((frame) => <div key={frame.id} className={styles.frame} data-ready={frame.ready || undefined}
      onAnimationEnd={() => finish(frame.id)}>
      {frame.photo && frame.source && <img src={imageUrl(frame.source.src)} srcSet={photoSources(frame.photo)}
        sizes="100vw" width={frame.photo.width} height={frame.photo.height} alt=""
        style={{ objectPosition: frame.position }} fetchPriority="high" decoding="async"
        onLoad={(event) => { void reveal(frame.id, event.currentTarget); }} onError={() => discard(frame.id)} />}
    </div>)}
  </div>;
}
