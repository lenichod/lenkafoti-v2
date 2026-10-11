import { useEffect, useState } from 'react';
import { filterPhotos } from '../content/gallery-content.mjs';
import { Navbar } from '../components/Navbar';
import { PortfolioHero } from '../features/banner/PortfolioHero';
import { selectBanner } from '../features/banner/banner';
import { ALL_CATEGORIES, CATEGORIES } from '../features/gallery/categories';
import { EmptyGallery } from '../features/gallery/EmptyGallery';
import { Gallery } from '../features/gallery/Gallery';
import { PhotoDialog } from '../features/gallery/PhotoDialog';
import { useCategory } from '../features/gallery/useCategory';
import { useGallery } from '../features/gallery/useGallery';
import { useTheme } from '../features/theme/useTheme';
import styles from './App.module.css';

export function App() {
  const { categoryId, selectCategory } = useCategory();
  const { theme, toggleTheme } = useTheme();
  const { photos, status, retry } = useGallery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = filterPhotos(photos, categoryId);
  const categoryLabel = CATEGORIES.find((category) => category.id === categoryId)?.label;
  const banner = selectBanner(photos, categoryId);

  useEffect(() => { setSelectedId(null); }, [categoryId]);

  function changeCategory(id: string) {
    setSelectedId(null);
    selectCategory(id);
  }

  return <div className={styles.app}>
    <a className={styles.skipLink} href="#gallery">Skip to gallery</a>
    <PortfolioHero photo={banner.photo} position={banner.position} theme={theme} onThemeToggle={toggleTheme}
      onHome={() => changeCategory(ALL_CATEGORIES)} />
    <Navbar categoryId={categoryId} onCategoryChange={changeCategory} />
    <main id="gallery" className={styles.main} aria-label={categoryLabel ? `${categoryLabel} photographs` : 'Photographs'}>
      {status === 'loading' && <p className={styles.status} role="status">Loading photographs…</p>}
      {status === 'error' && <div className={styles.status} role="alert">
        <p>The gallery could not be loaded.</p><button type="button" onClick={retry}>Try again</button>
      </div>}
      {status === 'ready' && (filtered.length ? <Gallery photos={filtered} onOpen={setSelectedId} /> :
        <EmptyGallery categoryLabel={categoryLabel} />)}
    </main>
    <footer className={styles.footer} />
    <PhotoDialog photos={filtered} selectedId={selectedId} onSelect={setSelectedId} onClose={() => setSelectedId(null)} />
  </div>;
}
