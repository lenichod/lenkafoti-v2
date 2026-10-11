import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { applyCategories, isFilm, movePhoto, validateBanners, validateGallery } from '../../content/gallery-content.mjs';
import type { BannerConfiguration, SourcePhoto } from '../../content/gallery-content.mjs';
import { useTheme } from '../theme/useTheme';
import { GitHubError, GitHubPortfolio } from './github.mjs';
import type { PortfolioSnapshot } from './github.mjs';
import styles from './Admin.module.css';

const signature = (snapshot: PortfolioSnapshot) => JSON.stringify([snapshot.gallery, snapshot.banners]);
const repository = 'lenichod/lenkafoti-v2';
const branch = 'main';

export function Admin() {
  const { theme, toggleTheme } = useTheme();
  const client = useRef<GitHubPortfolio | null>(null);
  const working = useRef(false);
  const baseline = useRef('');
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: '', error: false });
  const [savedSha, setSavedSha] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [visibility, setVisibility] = useState('visible');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategories, setBulkCategories] = useState<string[]>([]);
  const [limit, setLimit] = useState(24);
  const dirty = snapshot !== null && signature(snapshot) !== baseline.current;
  const coolingDown = retryAt > now;
  const locked = busy || coolingDown;

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || working.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => {
      const time = Date.now(); setNow(time);
      if (time >= retryAt) setRetryAt(0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  useEffect(() => { setLimit(24); }, [search, category, visibility]);
  useEffect(() => () => { client.current?.disconnect(); }, []);

  function message(text: string, error = false) { setStatus({ text, error }); }
  function failure(error: unknown) {
    message(error instanceof Error ? error.message : 'Could not complete the request. Your draft is kept.', true);
    if (error instanceof GitHubError && error.retryAfter !== null) {
      const time = Date.now();
      setNow(time);
      setRetryAt(time + error.retryAfter * 1000);
    }
  }
  function start() {
    if (working.current || retryAt > Date.now()) return false;
    working.current = true; setBusy(true); return true;
  }
  function finish() { working.current = false; setBusy(false); }
  function adopt(next: PortfolioSnapshot) {
    baseline.current = signature(next);
    setSnapshot(next); setSelected(new Set()); setBulkCategories([]); setSavedSha(null);
  }
  function changePhotos(photos: SourcePhoto[]) {
    if (!snapshot || locked) return;
    setSnapshot({ ...snapshot, gallery: { ...snapshot.gallery, photos } });
    setSavedSha(null);
    message('Unsaved changes. Save to GitHub when you are ready.');
  }
  function changeBanners(banners: BannerConfiguration) {
    if (!snapshot || locked) return;
    setSnapshot({ ...snapshot, banners }); setSavedSha(null);
    message('Unsaved changes. Save to GitHub when you are ready.');
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const input = form.elements.namedItem('token') as HTMLInputElement;
    const token = String(values.get('token') ?? '').trim();
    input.value = '';
    if (!start()) return;
    let next: GitHubPortfolio | null = null;
    message('Connecting to GitHub…');
    try {
      next = new GitHubPortfolio(repository, branch, token);
      const loaded = await next.load();
      client.current = next;
      adopt(loaded);
      message('Connected. Your saved photographs are ready to edit.');
    } catch (error) { next?.disconnect(); failure(error); }
    finally { finish(); }
  }

  function disconnect() {
    if (locked || (dirty && !window.confirm('Discard the unsaved changes in this tab and sign out?'))) return;
    client.current?.disconnect(); client.current = null;
    setSnapshot(null); baseline.current = ''; setSelected(new Set()); setSavedSha(null); message('Signed out.');
  }

  async function reload() {
    if (locked || !client.current || (dirty && !window.confirm('Discard the unsaved changes in this tab and reload the saved version?')) || !start()) return;
    message('Loading the saved version…');
    try { adopt(await client.current.load()); message('The saved version is ready.'); }
    catch (error) { failure(error); }
    finally { finish(); }
  }

  async function save() {
    if (!snapshot || !client.current || !dirty || !start()) return;
    message('Saving your changes to GitHub…');
    try {
      validateGallery(snapshot.gallery, snapshot.categories);
      validateBanners(snapshot.banners, snapshot.gallery, snapshot.categories);
      const sha = await client.current.save(snapshot.gallery, snapshot.banners);
      baseline.current = signature(snapshot); setSavedSha(sha);
      message('Saved to GitHub. The website will update after its deployment finishes.');
    } catch (error) { failure(error); }
    finally { finish(); }
  }

  function assign(ids: Set<string>, categoryIds: string[], action: 'add' | 'remove' | 'set') {
    if (!snapshot) return;
    try { changePhotos(applyCategories(snapshot.gallery.photos, ids, categoryIds, action)); }
    catch (error) { failure(error); }
  }
  function hide(photo: SourcePhoto) {
    if (!snapshot) return;
    if (photo.hidden && !photo.categoryIds.length) { message('Choose at least one category before restoring this photograph.', true); return; }
    changePhotos(snapshot.gallery.photos.map((item) => item.id === photo.id ? { ...item, hidden: !item.hidden } : item));
    const used = snapshot.banners.defaultPhotoId === photo.id || Object.values(snapshot.banners.categories).some((choice) => choice.photoId === photo.id);
    if (!photo.hidden && used) message('This photograph is used as a banner. Replace the shared banner or clear the category selection before saving.', true);
  }

  const query = search.trim().toLocaleLowerCase('en');
  const results = snapshot?.gallery.photos.filter((photo) =>
    (visibility === 'all' || photo.hidden === (visibility === 'hidden')) &&
    (category === 'all' || photo.categoryIds.includes(category)) &&
    `${photo.alt} ${photo.sourcePath}`.toLocaleLowerCase('en').includes(query)) ?? [];
  const allResultsSelected = results.length > 0 && results.every((photo) => selected.has(photo.id));

  return <div className={styles.app}>
    <a className={styles.skip} href="#admin-main">Skip to content</a>
    <header className={styles.header}>
      <a className={styles.brand} href={import.meta.env.BASE_URL}>Lenka fotí<span>.</span></a>
      <div className={styles.actions}>
        <a href={import.meta.env.BASE_URL}>View website</a>
        <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? 'Dark mode' : 'Light mode'}</button>
        {snapshot && <button type="button" onClick={disconnect} disabled={locked}>Sign out</button>}
      </div>
    </header>
    <main id="admin-main" className={styles.main}>
      <div className={styles.title}><div><p>Your photo workspace</p><h1>Photo manager</h1></div>
        {snapshot && <span className={styles.draft}>{dirty ? 'Unsaved changes' : 'Saved version'}</span>}
      </div>
      <div className={styles.status} role={status.error ? 'alert' : 'status'} aria-live="polite" data-error={status.error || undefined}>
        {status.text}
        {coolingDown && <p>Try again in {Math.ceil((retryAt - now) / 1000)} seconds.</p>}
        {savedSha && client.current && <p>
          <a href={`https://github.com/${client.current.repository}/commit/${savedSha}`} target="_blank" rel="noreferrer">View saved changes</a>
          {' · '}<a href={`https://github.com/${client.current.repository}/actions`} target="_blank" rel="noreferrer">Check deployment</a>
        </p>}
      </div>
      {!snapshot ? <section className={styles.connection} aria-label="Connect to photo manager">
        <form onSubmit={connect}><fieldset disabled={locked} className={styles.fields}>
          <label>Password<input name="token" type="password" required autoComplete="off" spellCheck={false} /></label>
          <button className={styles.primary} type="submit">Connect</button>
        </fieldset></form>
      </section> : <>
        <div className={styles.toolbar}>
          <p>New photographs are imported locally. These edits update your GitHub portfolio.</p>
          <div className={styles.actions}><button type="button" disabled={locked} onClick={reload}>Reload saved version</button>
            <button className={styles.primary} type="button" disabled={locked || !dirty} onClick={save}>Save to GitHub</button></div>
        </div>
        <fieldset className={styles.workspace} disabled={locked}>
          <BannerSettings snapshot={snapshot} client={client.current!} onChange={changeBanners} />
          <div className={styles.filters}>
            <label>Search photographs<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search descriptions or filenames…" /></label>
            <label>Collection<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All collections</option>
              {snapshot.categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select></label>
            <label>Visibility<select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
              <option value="visible">In portfolio</option><option value="hidden">Removed from portfolio</option><option value="all">All photographs</option>
            </select></label>
          </div>
          <section className={styles.bulk} aria-labelledby="bulk-title">
            <div className={styles.bulkHeading}><h2 id="bulk-title">Edit selected photographs</h2>
              <label className={styles.check}><input type="checkbox" checked={allResultsSelected} disabled={!results.length} onChange={(event) => {
                const next = new Set(selected);
                for (const photo of results) { if (event.target.checked) next.add(photo.id); else next.delete(photo.id); }
                setSelected(next);
              }} />Select matching photographs</label>
              <button type="button" disabled={!selected.size} onClick={() => setSelected(new Set())}>Clear selection</button>
            </div>
            <div className={styles.categories}>
              {snapshot.categories.map((item) => <label key={item.id} className={styles.check} data-film={item.id === 'on-film' || undefined}>
                <input type="checkbox" checked={bulkCategories.includes(item.id)} onChange={(event) => setBulkCategories(event.target.checked ? [...bulkCategories, item.id] : bulkCategories.filter((id) => id !== item.id))} />{item.label}
              </label>)}
            </div>
            <div className={styles.actions}>
              <button type="button" disabled={!selected.size || !bulkCategories.length} onClick={() => assign(selected, bulkCategories, 'add')}>Add categories</button>
              <button type="button" disabled={!selected.size || !bulkCategories.length} onClick={() => assign(selected, bulkCategories, 'remove')}>Remove categories</button>
              <button type="button" disabled={!selected.size || !bulkCategories.length} onClick={() => assign(selected, bulkCategories, 'set')}>Set categories</button>
            </div><p>Category actions apply to all selected photographs, including selections outside the current filter. Reordering always changes the shared portfolio order.</p>
          </section>
          <div className={styles.grid}>
            {results.slice(0, limit).map((photo) => {
              const index = snapshot.gallery.photos.findIndex((item) => item.id === photo.id);
              return <article key={photo.id} className={styles.card} data-hidden={photo.hidden || undefined}>
                <PhotoPreview source={client.current!.imageURL(photo.sourcePath)} alt={photo.alt} film={isFilm(photo)} showDescription={photo.showDescription} />
                <div className={styles.cardBody}>
                  <div className={styles.cardHeading}><label className={styles.check}><input type="checkbox" aria-label={`Select ${photo.alt}`} checked={selected.has(photo.id)} onChange={(event) => {
                    const next = new Set(selected); if (event.target.checked) next.add(photo.id); else next.delete(photo.id); setSelected(next);
                  }} />Select</label><button type="button" disabled={index === 0} onClick={() => changePhotos(movePhoto(snapshot.gallery.photos, photo.id, 'first'))}>Move to first</button></div>
                  <p className={styles.filename}>{photo.sourcePath.split('/').at(-1)}{photo.hidden ? ' · Removed' : ''}</p>
                  <label>English description<textarea value={photo.alt} rows={3} maxLength={500} required onChange={(event) => changePhotos(snapshot.gallery.photos.map((item) => item.id === photo.id ? { ...item, alt: event.target.value } : item))} /></label>
                  <label className={`${styles.check} ${styles.toggle}`}><input type="checkbox" role="switch" checked={photo.showDescription ?? false} onChange={(event) => changePhotos(snapshot.gallery.photos.map((item) => item.id === photo.id ? { ...item, showDescription: event.target.checked } : item))} />Show description</label>
                  <fieldset className={styles.categoryFields}><legend>Collections</legend><div className={styles.categories}>
                    {snapshot.categories.map((item) => <label key={item.id} className={styles.check} data-film={item.id === 'on-film' || undefined}>
                      <input type="checkbox" checked={photo.categoryIds.includes(item.id)} onChange={(event) => assign(new Set([photo.id]), [item.id], event.target.checked ? 'add' : 'remove')} />{item.label}
                    </label>)}
                  </div></fieldset>
                  <div className={styles.cardActions}><div className={styles.actions}>
                    <button type="button" disabled={index === 0} onClick={() => changePhotos(movePhoto(snapshot.gallery.photos, photo.id, -1))}>Move up</button>
                    <button type="button" disabled={index === snapshot.gallery.photos.length - 1} onClick={() => changePhotos(movePhoto(snapshot.gallery.photos, photo.id, 1))}>Move down</button>
                  </div><button type="button" className={photo.hidden ? styles.primary : styles.remove} onClick={() => hide(photo)}>{photo.hidden ? 'Restore' : 'Remove from portfolio'}</button></div>
                </div>
              </article>;
            })}
          </div>
          {!results.length && <p className={styles.empty}>No photographs match these filters.</p>}
          {results.length > limit && <button type="button" className={styles.more} onClick={() => setLimit(limit + 24)}>Show more photographs</button>}
        </fieldset>
      </>}
    </main>
    <footer className={styles.footer} />
  </div>;
}

function PhotoPreview({ source, alt, film = false, showDescription = false, position }: { source: string; alt: string; film?: boolean; showDescription?: boolean; position?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  return <div className={position ? styles.bannerPreview : styles.preview} data-film={film || undefined} data-description={showDescription || undefined}>
    {failed ? <p role="status">This photograph could not be loaded.</p> :
      <img src={source} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" style={{ objectPosition: position }} onError={() => setFailed(true)} />}
    {showDescription && <span className={styles.caption}>{alt}</span>}
  </div>;
}

function BannerSettings({ snapshot, client, onChange }: { snapshot: PortfolioSnapshot; client: GitHubPortfolio; onChange: (banners: BannerConfiguration) => void }) {
  const { banners, gallery, categories } = snapshot;
  const visible = gallery.photos.filter((photo) => !photo.hidden);
  const slots = [{ id: 'shared', label: 'Shared banner' }, ...categories.map((category) => ({ id: category.id, label: category.label }))];
  return <details className={styles.banners}>
    <summary>Banner photographs</summary>
    <p>Choose the shared photograph and optional category banners. Categories without a selection use the shared banner. Crop positions do not change the original photograph.</p>
    <div className={styles.bannerGrid}>{slots.map((slot) => {
      const shared = slot.id === 'shared';
      const choice = shared ? { photoId: banners.defaultPhotoId, position: banners.defaultPosition } : banners.categories[slot.id] ?? { photoId: null };
      const selected = gallery.photos.find((photo) => photo.id === choice.photoId);
      const preview = selected ?? visible.find((photo) => photo.id === banners.defaultPhotoId);
      const position = choice.position ?? banners.defaultPosition;
      const [x, y] = position.split(' ').map(parseFloat);
      const update = (photoId: string | null, crop?: string) => onChange(shared ? {
        ...banners, defaultPhotoId: photoId, defaultPosition: crop ?? banners.defaultPosition,
      } : { ...banners, categories: { ...banners.categories, [slot.id]: { photoId, ...(crop ? { position: crop } : {}) } } });
      return <section key={slot.id} className={styles.bannerSlot} aria-label={`${slot.label} banner`}>
        <label>{slot.label}<select value={choice.photoId ?? ''} onChange={(event) => update(event.target.value || null, choice.position)}>
          <option value="" disabled={shared && visible.length > 0}>{shared ? 'No banner (empty portfolio)' : 'Use shared banner'}</option>
          {selected?.hidden && <option value={selected.id}>Unavailable — choose a replacement</option>}
          {visible.map((photo) => <option value={photo.id} key={photo.id}>{photo.alt} · {photo.sourcePath.split('/').at(-1)}</option>)}
        </select></label>
        {preview && <PhotoPreview source={client.imageURL(preview.sourcePath)} alt={preview.alt} position={choice.photoId ? position : banners.defaultPosition} />}
        <label>Horizontal crop<input type="range" min="0" max="100" step="1" value={x} disabled={!choice.photoId} onChange={(event) => update(choice.photoId, `${event.target.value}% ${y}%`)} /></label>
        <label>Vertical crop<input type="range" min="0" max="100" step="1" value={y} disabled={!choice.photoId} onChange={(event) => update(choice.photoId, `${x}% ${event.target.value}%`)} /></label>
        {!shared && choice.photoId && <button type="button" onClick={() => update(choice.photoId)}>Use shared crop position</button>}
      </section>;
    })}</div>
  </details>;
}
