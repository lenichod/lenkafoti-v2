import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { imageUrl, photoSources } from '../gallery/imageSources';
import type { Photo } from '../gallery/types';
import styles from './PortfolioHero.module.css';

interface Props {
  photo?: Photo;
  position: string;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onHome: () => void;
}

export function PortfolioHero({ photo, position, theme, onThemeToggle, onHome }: Props) {
  const [failedId, setFailedId] = useState<string | null>(null);
  const source = photo?.variants.find((variant) => variant.width >= 1600) ?? photo?.variants.at(-1);

  return <section className={styles.hero} aria-labelledby="portfolio-title">
    <div className={styles.backdrop} aria-hidden="true">
      {photo && source && failedId !== photo.id && <img key={photo.id} src={imageUrl(source.src)}
        srcSet={photoSources(photo)} sizes="100vw" width={photo.width} height={photo.height} alt=""
        style={{ objectPosition: position }} fetchPriority="high" decoding="async"
        onError={() => setFailedId(photo.id)} />}
    </div>
    <header className={styles.header}>
      <a className={styles.brand} href={import.meta.env.BASE_URL} onClick={(event) => {
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          onHome();
        }
      }}>Lenka fotí<span>.</span></a>
      <span className={styles.headerNote}>A little collection of life</span>
      <span className={styles.flower} aria-hidden="true">✳</span>
      <button className={styles.theme} type="button" onClick={onThemeToggle}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
        <Icon name={theme === 'light' ? 'moon' : 'sun'} />
      </button>
    </header>
    <div className={styles.intro}>
      <p className={styles.eyebrow}>People, places & little things</p>
      <h1 id="portfolio-title">Somewhere<br /><em>in the moment.</em></h1>
      <p className={styles.note}>The everyday, worth keeping.</p>
    </div>
  </section>;
}
