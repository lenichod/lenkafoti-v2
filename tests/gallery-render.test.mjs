import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('gallery captions are opt-in, escaped and retain film treatment in other collections', async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  t.after(() => server.close());
  const { PhotoCard } = await server.ssrLoadModule('/src/features/gallery/PhotoCard.tsx');
  const photo = { id: 'a', categoryIds: ['travel'], alt: 'A <quiet> coast', width: 60, height: 40,
    variants: [{ src: 'gallery/test.webp', width: 60, height: 40 }] };
  const render = (extra) => renderToStaticMarkup(createElement(PhotoCard, { photo: { ...photo, ...extra }, priority: false, onOpen() {} }));
  for (const extra of [{}, { showDescription: false }]) {
    assert.doesNotMatch(render(extra), /data-description|<span/);
    assert.match(render(extra), /alt="A &lt;quiet&gt; coast"/);
  }
  const digital = render({ showDescription: true });
  assert.match(digital, /data-description="true"/);
  assert.doesNotMatch(digital, /data-film/);
  assert.match(digital, /<span[^>]*>A &lt;quiet&gt; coast<\/span>/);
  const film = render({ showDescription: true, categoryIds: ['travel', 'on-film'] });
  assert.match(film, /data-film="true"/);
  assert.match(film, /<span[^>]*>A &lt;quiet&gt; coast<\/span>/);
});

test('film lightbox captions follow the saved toggle even when opened from another collection', async (t) => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  t.after(() => server.close());
  const { PhotoDialog } = await server.ssrLoadModule('/src/features/gallery/PhotoDialog.tsx');
  const photo = { id: 'a', categoryIds: ['travel', 'on-film'], alt: 'A <quiet> coast', width: 60, height: 40,
    variants: [{ src: 'gallery/test.webp', width: 60, height: 40 }] };
  const render = (extra) => renderToStaticMarkup(createElement(PhotoDialog, {
    photos: [{ ...photo, ...extra }], selectedId: photo.id, onSelect() {}, onClose() {},
  }));
  assert.doesNotMatch(render({}), /<figcaption/);
  assert.doesNotMatch(render({ showDescription: false }), /<figcaption/);
  const enabled = render({ showDescription: true });
  assert.match(enabled, /<figure/);
  assert.match(enabled, /data-film="true"/);
  assert.match(enabled, /<figcaption[^>]*>A &lt;quiet&gt; coast<\/figcaption>/);
  assert.doesNotMatch(render({ showDescription: true, categoryIds: ['travel'] }), /<figcaption/);
});
