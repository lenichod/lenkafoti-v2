import { useEffect } from 'react';
import { useGallery } from '../gallery/useGallery';
import { useTheme } from '../theme/useTheme';
import { Icon } from '../../components/Icon';
import { BLEND_CONCEPTS, CONCEPTS, NAVIGATION_CONCEPTS, ORIGINAL_CONCEPTS, conceptUrl, findConcept, isNavigationConcept } from './concepts';
import { DesignCanvas } from './DesignCanvas';
import styles from './DesignLab.module.css';

export function DesignLab() {
  const { photos, status, retry } = useGallery();
  const { theme, toggleTheme } = useTheme();
  const requested = new URLSearchParams(window.location.search).get('design');
  const selected = findConcept(requested);
  // Every direction uses the same six source images, without adding demo assets.
  const sampleIndices = photos.length >= 20 ? [9, 1, 6, 4, 10, 19] : [0, 1, 2, 3, 4, 5];
  const samples = sampleIndices.map((index) => photos[index]).filter(Boolean);
  const groups = [
    { id: 'navigation', title: 'New navigation studies',
      description: 'One palette, four ways to explore. Switch between Mint light and Moonlit dark above.', concepts: NAVIGATION_CONCEPTS },
    { id: 'combinations', title: 'Earlier combinations',
      description: 'Photographic backdrops, playful folders and paper frames reserved for On film.', concepts: BLEND_CONCEPTS },
    { id: 'originals', title: 'Original studies',
      description: 'The first six directions, kept here for comparison.', concepts: ORIGINAL_CONCEPTS },
  ];

  useEffect(() => {
    document.title = `${selected?.name ?? 'Design directions'} — Photography`;
  }, [selected]);

  return <div className={styles.lab}>
    <a className={styles.skip} href="#concepts">Skip to design previews</a>
    <header className={styles.toolbar}>
      <a href={selected ? conceptUrl() : import.meta.env.BASE_URL} className={styles.back}>
        <span aria-hidden="true">←</span> {selected ? 'All directions' : 'Back to portfolio'}
      </a>
      <span className={styles.toolbarTitle}>Photography / Design studio</span>
      {(!selected || isNavigationConcept(selected.id)) && <button className={styles.themeToggle} type="button" onClick={toggleTheme}
        aria-label={theme === 'light' ? 'Preview Moonlit dark mode' : 'Preview Mint light mode'}>
        <Icon name={theme === 'light' ? 'moon' : 'sun'} />
        {theme === 'light' ? 'View Moonlit dark' : 'View Mint light'}
      </button>}
      {selected && <label className={styles.selector}>Direction
        <select value={selected.id} onChange={(event) => {
          const concept = findConcept(event.target.value);
          if (concept) window.location.assign(conceptUrl(concept.id));
        }}>{CONCEPTS.map(({ id, name }) => <option value={id} key={id}>{name}</option>)}</select>
      </label>}
    </header>
    <main id="concepts">
      {!selected && <div className={styles.intro}>
        <p className={styles.eyebrow}>Mint by day. Moonlit by night.</p>
        <h1>Same mood. New ways in<span>.</span></h1>
        <p>Four alternatives to folder tabs. Straight film prints and a peach On film accent in both themes.</p>
        <div className={styles.jumpLinks}><a href="#navigation">New navigation ↓</a><a href="#combinations">Earlier combinations ↓</a><a href="#originals">Original studies ↓</a></div>
        <span className={styles.annotation}>Visual studies · category navigation is illustrative · Floating palette is now the portfolio layout</span>
      </div>}
      {selected && <h1 className={styles.visuallyHidden}>{selected.name} design preview</h1>}
      {requested && !selected && <p className={styles.message}>That direction is unavailable. Choose one below.</p>}
      {status === 'loading' && <p className={styles.message} role="status">Loading your photographs…</p>}
      {status === 'error' && <div className={styles.message} role="alert">
        <p>Your photographs could not be loaded. The previews show placeholder blocks.</p>
        <button type="button" onClick={retry}>Try again</button>
      </div>}
      {selected ? <DesignCanvas concept={selected.id} photos={samples} expanded /> :
        groups.map((group) => <section id={group.id} className={styles.group} key={group.id}>
          <div className={styles.groupHeading}><h2>{group.title}</h2><p>{group.description}</p></div>
          <div className={styles.comparison}>
          {group.concepts.map((concept, index) => <article className={styles.card} key={concept.id}>
            <div className={styles.cardHeader}>
              <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
              <h3>{concept.name}</h3>
              <a href={conceptUrl(concept.id)} aria-label={`Explore ${concept.name}`} className={styles.open}>Explore <span aria-hidden="true">↗</span></a>
            </div>
            <div className={styles.preview}><DesignCanvas concept={concept.id} photos={samples} /></div>
            <p className={styles.description}>{concept.description}</p>
          </article>)}
          </div>
        </section>)}
    </main>
  </div>;
}
