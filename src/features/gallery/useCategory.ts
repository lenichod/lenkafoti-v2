import { useEffect, useState } from 'react';
import { ALL_CATEGORIES, CATEGORIES } from './categories';

function categoryFromUrl() {
  const value = new URL(window.location.href).searchParams.get('category');
  return CATEGORIES.some((category) => category.id === value) ? value! : ALL_CATEGORIES;
}

export function useCategory() {
  const [categoryId, setCategoryId] = useState(categoryFromUrl);

  useEffect(() => {
    const sync = () => setCategoryId(categoryFromUrl());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  function selectCategory(value: string) {
    if (value === categoryId) return;
    const url = new URL(window.location.href);
    if (value === ALL_CATEGORIES) url.searchParams.delete('category');
    else url.searchParams.set('category', value);
    window.history.pushState(null, '', url);
    setCategoryId(value);
  }

  return { categoryId, selectCategory };
}
