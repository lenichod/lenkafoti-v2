import { useEffect, useState } from 'react';
import type { GalleryManifest, Photo } from './types';

export function useGallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    async function load() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}gallery/manifest.json`, {
          signal: controller.signal,
          cache: 'no-cache',
        });
        if (!response.ok) throw new Error('The gallery could not be loaded.');
        const manifest: GalleryManifest = await response.json();
        if (!Array.isArray(manifest.photos)) throw new Error('Invalid gallery manifest.');
        setPhotos(manifest.photos);
        setStatus('ready');
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  return { photos, status, retry: () => setAttempt((value) => value + 1) };
}
