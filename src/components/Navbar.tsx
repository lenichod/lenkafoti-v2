import { CATEGORIES, ALL_CATEGORIES } from '../features/gallery/categories';
import styles from './Navbar.module.css';

interface Props {
  categoryId: string;
  onCategoryChange: (id: string) => void;
}

export function Navbar({ categoryId, onCategoryChange }: Props) {
  const links = [{ id: ALL_CATEGORIES, label: 'All photographs' }, ...CATEGORIES];
  return <nav className={styles.categories} aria-label="Photography categories">
      {links.map(({ id, label }) => {
        const href = id === ALL_CATEGORIES ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}?category=${id}`;
        return <a key={id} href={href} aria-current={categoryId === id ? 'page' : undefined}
          data-film={id === 'on-film' || undefined}
          className={styles.category} onClick={(event) => {
            if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
              event.preventDefault();
              onCategoryChange(id);
            }
          }}>{label}</a>;
      })}
  </nav>;
}
