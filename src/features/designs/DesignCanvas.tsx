import { CATEGORIES } from '../gallery/categories';
import { imageUrl, photoSources } from '../gallery/imageSources';
import type { Photo } from '../gallery/types';
import { isBlendConcept, isNavigationConcept, type ConceptId, type OriginalConceptId } from './concepts';
import { BlendCanvas } from './BlendCanvas';
import styles from './DesignCanvas.module.css';
import themes from './DesignThemes.module.css';

const HEADLINES: Record<OriginalConceptId, React.ReactNode> = {
  editorial: <>The art of<br /><em>noticing.</em></>,
  index: <>EVERYDAY,<br />IN FOCUS.</>,
  cinematic: <>Ordinary life.<br /><em>Extraordinary light.</em></>,
  contact: <>Life, as<br /><em>it happens.</em></>,
  archive: <>Filed with<br /><em>feeling.</em></>,
  atelier: <>A little<br /><em>closer.</em></>,
};

interface Props {
  concept: ConceptId;
  photos: Photo[];
  expanded?: boolean;
}

export function DesignCanvas({ concept, photos, expanded = false }: Props) {
  if (isNavigationConcept(concept)) return <BlendCanvas concept="mint" navigation={concept} photos={photos} expanded={expanded} />;
  if (isBlendConcept(concept)) return <BlendCanvas concept={concept} photos={photos} expanded={expanded} />;
  return <div className={`${styles.canvas} ${themes[concept]} ${expanded ? styles.expanded : ''}`}>
    <div className={styles.paper} data-slot="paper">
      <header className={styles.header} data-slot="header">
        <span className={styles.brand} data-slot="brand">Photography<span className={styles.dot}>.</span></span>
        <span className={styles.headerNote}>People, places & everything in between</span>
        <span className={styles.mark} data-slot="mark" aria-hidden="true">✳</span>
      </header>
      <div className={styles.navigation} data-slot="navigation" role="group" aria-label="Illustrative category navigation">
        {['All photographs', ...CATEGORIES.map(({ label }) => label)].map((label, index) =>
          <span className={index === 0 ? styles.active : undefined} data-active={index === 0 || undefined} key={label}>{label}</span>)}
      </div>
      <div className={styles.intro} data-slot="intro">
        <p className={styles.eyebrow} data-slot="eyebrow">A collection of small moments</p>
        <h2 className={styles.title} data-slot="title">{HEADLINES[concept]}</h2>
        <p className={styles.note} data-slot="note">A personal perspective on the things<br />we might otherwise walk past.</p>
        <span className={styles.introMark} data-slot="introMark" aria-hidden="true">↘</span>
      </div>
      <div className={styles.gallery} data-slot="gallery">
        {Array.from({ length: 6 }, (_, index) => {
          const photo = photos[index];
          return <figure className={styles.print} data-slot="print" key={photo?.id ?? index}>
            {photo ? <img src={imageUrl(photo.variants[0].src)} srcSet={photoSources(photo)}
              sizes={expanded ? '(max-width: 700px) 90vw, 45vw' : '(max-width: 700px) 45vw, 22vw'}
              width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" /> :
              <div className={styles.placeholder} aria-label="Photograph placeholder" />}
          </figure>;
        })}
      </div>
      <footer className={styles.footer} />
    </div>
  </div>;
}
