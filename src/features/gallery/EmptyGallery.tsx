import { Icon } from '../../components/Icon';
import styles from './EmptyGallery.module.css';

export function EmptyGallery({ categoryLabel }: { categoryLabel?: string }) {
  return <section className={styles.empty} aria-labelledby="empty-title">
    <div className={styles.symbol}><Icon name="frame" width="30" height="30" /></div>
    <p className={styles.eyebrow}>Room for a new perspective</p>
    <h2 id="empty-title">{categoryLabel ? 'No photographs in this collection yet.' : 'Every photograph tells a story.'}</h2>
    <p className={styles.description}>The first photographs are coming soon.<br />In the meantime, explore the collections.</p>
    <span className={styles.line} aria-hidden="true" />
  </section>;
}
