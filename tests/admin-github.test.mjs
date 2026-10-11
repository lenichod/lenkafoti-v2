import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GitHubPortfolio, GitHubError } from '../src/features/admin/github.mjs';

const categories = [{ id: 'travel', label: 'Travel' }, { id: 'on-film', label: 'On film' }];
const gallery = { version: 1, photos: [{ id: 'a'.repeat(16), sourcePath: 'content/photos/travel/café sunset.jpg', categoryIds: ['travel'], alt: 'Café at sunset', hidden: false }] };
const banners = { defaultPhotoId: gallery.photos[0].id, defaultPosition: '50% 58%', categories: { travel: { photoId: null } } };
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

function fakeGitHub() {
  const state = { head: 'original', requests: [], trees: [], commits: [], losePatch: null, race: false, error: null };
  const fetcher = async (url, options) => {
    assert.ok(url.startsWith('https://api.github.com/repos/lenichod/lenkafoti-v2'));
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    const path = url.replace('https://api.github.com/repos/lenichod/lenkafoti-v2', '');
    const body = options.body ? JSON.parse(options.body) : undefined;
    state.requests.push({ path, method: options.method, body });
    if (state.error) return response({}, state.error.status, state.error.headers);
    if (!path) return response({ private: false, permissions: { push: true } });
    if (path === '/git/ref/heads/main') return response({ object: { sha: state.head } });
    if (path.startsWith('/git/commits/') && options.method === 'GET') return response({ tree: { sha: 'original-tree' } });
    if (path.startsWith('/contents/')) {
      assert.ok(path.endsWith('?ref=original'), 'All content must be loaded from the same pinned commit.');
      const data = path.includes('categories.json') ? categories : path.includes('gallery.json') ? gallery : banners;
      return response({ encoding: 'base64', content: Buffer.from(JSON.stringify(data)).toString('base64') });
    }
    if (path === '/git/trees') { state.trees.push(body); return response({ sha: `tree-${state.trees.length}` }); }
    if (path === '/git/commits') { state.commits.push(body); return response({ sha: `commit-${state.commits.length}` }); }
    if (path === '/git/refs/heads/main') {
      assert.equal(body.force, false);
      if (state.race) state.head = 'concurrent';
      const index = Number(body.sha.split('-')[1]) - 1;
      if (state.commits[index].parents[0] !== state.head) return response({}, 422);
      const loss = state.losePatch;
      state.losePatch = null;
      if (loss === 'before') throw new Error('lost request');
      state.head = body.sha;
      if (loss === 'after') throw new Error('lost response');
      return response({ object: { sha: state.head } });
    }
    throw new Error(`Unexpected API request ${path}`);
  };
  return { state, client: new GitHubPortfolio('lenichod/lenkafoti-v2', 'main', 'test-key', fetcher) };
}

test('loads a pinned snapshot with Unicode and commits only both content files together', async () => {
  const { state, client } = fakeGitHub();
  const loaded = await client.load();
  assert.deepEqual(loaded, { gallery, banners, categories });
  assert.equal(client.imageURL(gallery.photos[0].sourcePath), 'https://raw.githubusercontent.com/lenichod/lenkafoti-v2/original/content/photos/travel/caf%C3%A9%20sunset.jpg');
  const edited = structuredClone(loaded.gallery);
  edited.photos[0].alt = 'A new description';
  assert.equal(await client.save(edited, loaded.banners), 'commit-1');
  assert.equal(state.commits.length, 1);
  assert.equal(state.trees[0].base_tree, 'original-tree');
  assert.deepEqual(state.trees[0].tree.map((item) => item.path), ['content/gallery.json', 'content/banner.json']);
  assert.deepEqual(JSON.parse(state.trees[0].tree[0].content), edited);
  assert.deepEqual(JSON.parse(state.trees[0].tree[1].content), loaded.banners);
  assert.deepEqual(state.commits[0].parents, ['original']);
});

test('changes before saving prevent any write and preserve the draft', async () => {
  const { state, client } = fakeGitHub();
  const loaded = await client.load();
  const draft = structuredClone(loaded);
  state.head = 'concurrent';
  await assert.rejects(client.save(loaded.gallery, loaded.banners), (error) => error.code === 'conflict');
  assert.equal(state.trees.length, 0);
  assert.deepEqual(loaded, draft);
});

test('a race during saving rejects the branch update without overwriting concurrent work', async () => {
  const { state, client } = fakeGitHub();
  const loaded = await client.load();
  state.race = true;
  await assert.rejects(client.save(loaded.gallery, loaded.banners), (error) => error.code === 'conflict');
  assert.equal(state.head, 'concurrent');
  assert.equal(client.head, 'original');
});

for (const loss of ['before', 'after']) {
  test(`retry after a network loss ${loss} PATCH does not create a duplicate commit`, async () => {
    const { state, client } = fakeGitHub();
    const loaded = await client.load();
    state.losePatch = loss;
    await assert.rejects(client.save(loaded.gallery, loaded.banners), (error) => error.code === 'network');
    assert.equal(await client.save(loaded.gallery, loaded.banners), 'commit-1');
    assert.equal(state.commits.length, 1);
    assert.equal(state.trees.length, 1);
    assert.equal(state.head, 'commit-1');
  });
}

test('editing the draft after a lost successful response saves the latest draft with the correct parent', async () => {
  const { state, client } = fakeGitHub();
  const loaded = await client.load();
  state.losePatch = 'after';
  await assert.rejects(client.save(loaded.gallery, loaded.banners));
  loaded.gallery.photos[0].alt = 'Updated after network loss';
  assert.equal(await client.save(loaded.gallery, loaded.banners), 'commit-2');
  assert.deepEqual(state.commits[1].parents, ['commit-1']);
  assert.equal(JSON.parse(state.trees[1].tree[0].content).photos[0].alt, 'Updated after network loss');
});

for (const [status, code] of [[401, 'invalidKey'], [403, 'permission'], [404, 'notFound']]) {
  test(`handles GitHub ${status} without exposing the key`, async () => {
    const { state, client } = fakeGitHub();
    state.error = { status, headers: {} };
    await assert.rejects(client.load(), (error) => error instanceof GitHubError && error.code === code && !error.message.includes('test-key'));
  });
}

test('handles rate limits, validates drafts before writes and clears credentials on sign out', async () => {
  const { state, client } = fakeGitHub();
  const loaded = await client.load();
  state.error = { status: 403, headers: { 'retry-after': '120', 'x-ratelimit-remaining': '0' } };
  await assert.rejects(client.save(loaded.gallery, loaded.banners), (error) => error.code === 'rateLimit' && error.retryAfter === 120);
  state.error = null;
  const invalid = structuredClone(loaded.gallery);
  invalid.photos[0].alt = '';
  const requests = state.requests.length;
  await assert.rejects(client.save(invalid, loaded.banners), /English description/);
  assert.equal(state.requests.length, requests);
  client.disconnect();
  assert.equal(client.token, '');
  assert.equal(client.head, null);
  await assert.rejects(client.save(loaded.gallery, loaded.banners), (error) => error.code === 'signedOut');
});
