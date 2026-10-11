import { validateCategories, validateGallery, validateBanners } from '../../content/gallery-content.mjs';

export class GitHubError extends Error {
  constructor(code, message, retryAfter = null) { super(message); this.code = code; this.retryAfter = retryAfter; }
}

export class GitHubPortfolio {
  constructor(repository, branch, token, fetcher = fetch) {
    if (!/^[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(repository) || !token.trim() ||
        !/^[a-zA-Z0-9._/-]+$/.test(branch) || branch.includes('..') || branch.includes('//') ||
        branch.startsWith('/') || branch.endsWith('/') || branch.endsWith('.lock')) {
      throw new GitHubError('connection', 'Enter a valid repository, branch and GitHub access key.');
    }
    this.repository = repository;
    this.branch = branch;
    this.token = token;
    this.fetcher = fetcher;
    this.base = `https://api.github.com/repos/${repository}`;
    this.ref = branch.split('/').map(encodeURIComponent).join('/');
    this.head = null;
    this.tree = null;
    this.categories = null;
    this.pending = null;
  }

  async request(path, method = 'GET', body) {
    if (!this.token) throw new GitHubError('signedOut', 'Connect GitHub before saving.');
    let response;
    try {
      response = await this.fetcher(this.base + path, {
        method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2026-03-10', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined, credentials: 'omit', redirect: 'error', cache: 'no-store',
      });
    } catch { throw new GitHubError('network', 'Could not reach GitHub. Your draft is kept in this tab. Check your connection and retry.'); }
    if (!response.ok) {
      const retry = response.headers.get('retry-after');
      if (response.status === 429 || (response.status === 403 &&
          (response.headers.get('x-ratelimit-remaining') === '0' || retry !== null))) {
        const reset = response.headers.get('x-ratelimit-reset');
        const seconds = retry ? Number(retry) : reset ? Math.max(1, Math.ceil(Number(reset) - Date.now() / 1000)) : 60;
        throw new GitHubError('rateLimit', 'GitHub is limiting requests. Your draft is kept; wait before retrying.', Number.isFinite(seconds) ? seconds : 60);
      }
      const failures = {
        401: ['invalidKey', 'GitHub did not accept the access key. Check it or create a new key.'],
        403: ['permission', 'GitHub did not allow this action. The key needs Contents: read and write for this repository.'],
        404: ['notFound', 'Repository, branch or content configuration not found. Check the connection and publish the initial local import first.'],
        409: ['conflict', 'The repository changed or GitHub blocked the update. Your draft is kept.'],
        422: ['conflict', 'GitHub blocked the update. Check branch rules or reload the saved version. Your draft is kept.'],
      };
      const [code, message] = failures[response.status] ?? ['github', 'GitHub could not complete the request. Your draft is kept; try again later.'];
      throw new GitHubError(code, message);
    }
    try { return await response.json(); }
    catch { throw new GitHubError('network', 'GitHub returned an incomplete response. Your draft is kept; retry to verify the result.'); }
  }

  async readJSON(path, sha) {
    const file = await this.request(`/contents/${path}?ref=${encodeURIComponent(sha)}`);
    if (file.encoding !== 'base64' || typeof file.content !== 'string') throw new GitHubError('data', `Could not read ${path}.`);
    try {
      const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, '')), (character) => character.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch { throw new GitHubError('data', `Invalid JSON in ${path}. Fix the configuration locally before editing.`); }
  }

  async load() {
    const repository = await this.request('');
    if (repository.private) throw new GitHubError('private', 'This editor supports the public portfolio repository.');
    if (repository.permissions?.push === false) throw new GitHubError('permission', 'Your GitHub account needs write access to this repository.');
    const ref = await this.request(`/git/ref/heads/${this.ref}`);
    const sha = ref.object.sha;
    const [commit, categoryData, galleryData, bannerData] = await Promise.all([
      this.request(`/git/commits/${sha}`), this.readJSON('content/categories.json', sha),
      this.readJSON('content/gallery.json', sha), this.readJSON('content/banner.json', sha),
    ]);
    const categories = validateCategories(categoryData);
    const gallery = validateGallery(galleryData, categories);
    const banners = validateBanners(bannerData, gallery, categories);
    this.head = sha;
    this.tree = commit.tree.sha;
    this.categories = categories;
    this.pending = null;
    return { gallery, banners, categories };
  }

  imageURL(sourcePath) {
    return `https://raw.githubusercontent.com/${this.repository}/${this.head}/${sourcePath.split('/').map(encodeURIComponent).join('/')}`;
  }

  async save(gallery, banners) {
    if (!this.head || !this.tree || !this.categories) throw new GitHubError('signedOut', 'Connect GitHub before saving.');
    validateGallery(gallery, this.categories);
    validateBanners(banners, gallery, this.categories);
    const serialized = [JSON.stringify(gallery, null, 2) + '\n', JSON.stringify(banners, null, 2) + '\n'];
    const signature = JSON.stringify(serialized);
    const ref = await this.request(`/git/ref/heads/${this.ref}`);
    // A lost PATCH response may already have saved the previous draft.
    if (this.pending && ref.object.sha === this.pending.sha) {
      const pending = this.pending;
      this.head = pending.sha;
      this.tree = pending.tree;
      this.pending = null;
      if (pending.signature === signature) return this.head;
    }
    if (ref.object.sha !== this.head) throw new GitHubError('conflict', 'The repository changed elsewhere. Your draft is kept. Reload the saved version when you are ready to discard it.');
    if (!this.pending || this.pending.signature !== signature) {
      const built = await this.request('/git/trees', 'POST', { base_tree: this.tree, tree: [
        { path: 'content/gallery.json', mode: '100644', type: 'blob', content: serialized[0] },
        { path: 'content/banner.json', mode: '100644', type: 'blob', content: serialized[1] },
      ] });
      const commit = await this.request('/git/commits', 'POST', {
        message: 'Update portfolio photographs and banners', tree: built.sha, parents: [this.head],
      });
      this.pending = { sha: commit.sha, tree: built.sha, signature };
    }
    await this.request(`/git/refs/heads/${this.ref}`, 'PATCH', { sha: this.pending.sha, force: false });
    this.head = this.pending.sha;
    this.tree = this.pending.tree;
    this.pending = null;
    return this.head;
  }

  disconnect() { this.token = ''; this.head = null; this.tree = null; this.categories = null; this.pending = null; }
}
