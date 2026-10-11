import { CATEGORIES } from '../gallery/categories';
import { imageUrl, photoSources } from '../gallery/imageSources';
import type { Photo } from '../gallery/types';
import type { BlendConceptId, NavigationConceptId } from './concepts';
import styles from './BlendCanvas.module.css';
import navigationStyles from './NavigationVariants.module.css';

const HEADLINES: Record<BlendConceptId, React.ReactNode> = {
  moonlit: <>Little moments.<br /><em>After hours.</em></>,
  sunset: <>Keep the<br /><em>good bits.</em></>,
  lavender: <>Life in<br /><em>full colour.</em></>,
  mint: <>Somewhere<br /><em>in the moment.</em></>,
};

interface Props {
  concept: BlendConceptId;
  photos: Photo[];
  expanded?: boolean;
  navigation?: NavigationConceptId;
}

export function BlendCanvas({ concept, photos, expanded = false, navigation }: Props) {
  const [cover, ...collection] = photos;
  const categories = [{ id: 'all', label: 'All photographs' }, ...CATEGORIES];

  return <div className={`${styles.canvas} ${styles[concept]} ${expanded ? styles.expanded : ''} ${navigation ? navigationStyles.palette : ''}`}
    data-navigation={navigation}>
    <div className={styles.hero} data-slot="hero">
      <div className={styles.backdrop} data-slot="backdrop">
        {cover && <img src={imageUrl(cover.variants[0].src)} srcSet={photoSources(cover)}
          sizes={expanded ? '100vw' : '(max-width: 1000px) 90vw, 45vw'}
          width={cover.width} height={cover.height} alt={cover.alt} loading="lazy" />}
      </div>
      <header className={styles.header} data-slot="header">
        <span className={styles.brand}>Photography<span>.</span></span>
        <span className={styles.headerNote}>A little collection of life</span>
        <span className={styles.flower} aria-hidden="true">✳</span>
      </header>
      <div className={styles.intro} data-slot="intro">
        <p className={styles.eyebrow}>People, places & little things</p>
        <h2>{HEADLINES[concept]}</h2>
        <p className={styles.note}>The everyday, worth keeping.</p>
      </div>
      <span className={styles.heroFlower} aria-hidden="true">✳</span>
    </div>
    <div className={styles.folders} data-slot="navigation" role="group" aria-label="Illustrative category navigation">
      {navigation === 'rail' && <span data-slot="railTitle">The collection</span>}
      {categories.map(({ id, label }) => <span className={styles.tab} data-active={id === 'all' || undefined}
        data-film={id === 'on-film' || undefined} data-slot="category" key={id}>{label}</span>)}
    </div>
    <div className={styles.collection} data-slot="collection">
      <div className={styles.collectionHeading}>
        <span>Collected along the way</span>
        <span className={styles.collectionFlower} aria-hidden="true">✳</span>
      </div>
      <div className={styles.gallery} data-slot="gallery">
        {Array.from({ length: 5 }, (_, index) => {
          const photo = collection[index];
          return <figure className={styles.print} data-film={photo?.categoryId === 'on-film' || undefined}
            key={photo?.id ?? index}>
            {photo ? <img src={imageUrl(photo.variants[0].src)} srcSet={photoSources(photo)}
              sizes={expanded ? '(max-width: 700px) 85vw, 40vw' : '(max-width: 1000px) 40vw, 20vw'}
              width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" /> :
              <div className={styles.placeholder} aria-label="Photograph placeholder" />}
          </figure>;
        })}
      </div>
      <footer className={styles.footer} />
    </div>
  </div>;
}
