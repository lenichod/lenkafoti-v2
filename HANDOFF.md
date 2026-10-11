# Lenka fotí — handoff for the next chat

Snapshot: 2026-10-11. Read `AGENTS.md` first; it governs this repository. This file records context, not authorization to commit, push, deploy or run browser automation. Check current Git state and content before making changes; online admin saves can advance `main` independently.

## Project and current state

- Workspace: `C:\lenka-portfolio-v2`, PowerShell, Node.js 24.
- Repository: `https://github.com/lenichod/lenkafoti-v2.git`, branch `main`.
- Public website: `https://lenkafoti.cz/`.
- Photo manager: `/spalena-kyticka/`; local URL normally `http://localhost:5173/spalena-kyticka/`. There is no public navigation link. The old `/admin/` URL is obsolete.
- React 19, TypeScript, Vite, CSS Modules, Sharp; static GitHub Pages hosting without a backend or database.
- Last application commit: `9f03195` — `Animate banner transitions and show film lightbox captions`. It was pushed to `origin/main` at the user's explicit request. Deployment completion was not subsequently verified.
- No unfinished application change at handoff. This document and its reference in `AGENTS.md` are local documentation changes, not committed. A pre-existing user edit in `AGENTS.md` changes the affirmative response to `Hej...`; preserve it.

## User preferences and authorization

- Respond in Czech/Slovak naturally. The current local `AGENTS.md` specifies `Hej...` for an affirmative reply; do not revive the older `hej.... HEJ` wording.
- Implement requested work without unnecessary confirmation. Avoid speculative fixes when data synchronization explains the symptom.
- Do not create commits automatically. An explicit commit request covers only the current changes.
- Pushes normally belong to the user. In this conversation explicit `commit push` / `commit a push` requests authorized those individual pushes; they do not authorize future pushes. A commit-only request does not authorize a push.
- Never run Playwright or other browser automation unless requested for the current task. Shell HTTP checks and non-browser tests are allowed.
- For small application changes use `npm run typecheck`, `npx vite build` and a simple localhost response check. Reuse generated photos. Run focused tests when meaningful; a documentation-only handoff needs no application tests.

## Approved appearance

- Brand: Lenka fotí with a peach dot and a cute peach asterisk favicon.
- Main design: photographic hero and translucent rounded category dock (Floating palette); Mint afterglow light theme and Moonlit archive dark theme via shared CSS variables.
- Category navigation must distribute items with `space-between` and fill available width with responsive rows. The Events category was removed; do not reintroduce it or leave a gap for it.
- Current categories: `portraits-people`, `nature`, `travel`, `street-everyday`, `automotive`, `on-film`, plus the All photographs navigation item.
- On film remains peach in both themes. Prints and images stay straight, without rotation. White film frames, including a wider bottom margin, remain in the lightbox in both themes.
- Digital photographs can have a rounded peach caption frame when Show description is enabled (explicitly requested after the original paper-frame rule). Film photographs use their existing cream/white frame and vintage/typewriter captions.
- All interface text is English. No public photograph counters or category headings above the gallery. Footer exists and stays completely empty.

## Content and local import

- `content/gallery.json`: version 1, ordered `photos` array. Records contain `id`, `sourcePath`, `categoryIds`, `alt`, `hidden`, optional `showDescription` (default false).
- Array order is the single global order; categories filter it. A photo can have multiple categories without copying its source. All photographs shows each visible photo once.
- Source exports are tracked in `content/photos/<category>/`. A folder gives only the initial category for a new photo. Subsequent categories, descriptions and ordering come from the registry.
- `npm run photos` synchronizes sources and registry, preserves existing edits/IDs/order, appends new files, and removes missing sources. Renaming/moving a file is removal plus new import; online recategorization preserves IDs.
- `npm run build` runs a read-only photo preflight, then TypeScript and Vite. It rejects unregistered/missing files, invalid content and unavailable banner references instead of rewriting tracked content.
- `npm run dev` has a `predev` import. It is not necessary to rerun the importer for CSS/component-only edits.
- Sharp corrects orientation, strips EXIF and generates WebP variants at 480/960/1600/2560 px without upscaling. `public/gallery/` and its manifest are generated and ignored by Git.
- Hidden photographs stay in the registry and keep their source. Restore makes them public again. Any photo containing `on-film` gets film treatment in all categories and in the lightbox.
- Local gallery currently contains 122 visible photos; this is a snapshot, not a UI counter requirement.

## Admin and GitHub security

- `src/features/admin/Admin.tsx` is the editor. Vite has a standalone HTML input at `spalena-kyticka/index.html`, supporting direct Pages access and repository base paths.
- Login displays only Password and Connect. Password is a fine-grained GitHub PAT restricted to `lenichod/lenkafoti-v2`, with Contents read/write. Repository and branch `main` are fixed, hidden defaults.
- Token stays in tab memory, is sent only to GitHub, and is cleared on sign out/tab close. Never persist it in browser storage, source, documentation or logs. The hidden URL is convenience; GitHub authorization protects writes.
- `src/features/admin/github.mjs` loads registry, categories and banners at one pinned commit, loads source previews progressively, and saves only gallery and banner JSON in one Git tree/commit/ref update.
- No forced branch update. Concurrent branch changes preserve the draft and report a conflict. Ambiguous network results are reconciled before retrying to avoid duplicate commits. Save success confirms GitHub storage separately from later deployment.
- Native fetch must remain bound to `globalThis`; an earlier unbound call caused `Illegal invocation`, masked as a network error.
- Production admin HTML has a restrictive CSP. Vite removes the meta CSP during development for React refresh; production policy remains intact.
- Select on photo cards means bulk selection for Add categories / Remove categories / Set categories; selection survives filtering.
- Editor supports English descriptions, shared order, search/category/visibility filters, reversible removal, Show description and manual banners/crops. No online upload, category list editor, Czech descriptions or general page editing.

## Localhost versus GitHub: important resolved issue

The admin reads GitHub even when opened on localhost. The public dev portfolio reads local `content/banner.json` and generated local gallery data. Saving in the admin does not update the local checkout automatically.

The latest reported issue (admin showed a new banner, localhost did not, production worked) was stale local content, not a failed crossfade. Fast-forwarding from `268e16c` to the admin's `641db70` commit and rebuilding resolved it. The dev-served banner module and manifest were checked to contain the selected photo.

For future admin edits, first check for conflicting local content edits, then pull and regenerate:

```sh
git pull --ff-only
npm run photos
```

Refresh the dev page afterward. Do not introduce online fetching into the public dev app merely to mask an outdated local checkout.

At the snapshot, the shared banner is `2331285fedbceddb`, crop `50% 58%`. Portraits & people overrides it with `597b1f1c926bb5cd`, crop `50% 100%`; other categories use the shared banner. These IDs are examples of current content, not defaults to hard-code.

## Recent banner and lightbox implementation

- `src/features/banner/BannerBackdrop.tsx` layers banner frames. Incoming images stay hidden until load/decode completes, then crossfade over 700 ms. The old image remains visible during loading.
- Rapid category changes discard unloaded candidates, retain visible layers and prune old layers once the newer layer is opaque. The key includes source and crop. Empty portfolios show a gradient; reduced-motion CSS shortens the transition.
- `PortfolioHero.tsx` delegates the backdrop; `PortfolioHero.module.css` supplies animation and layers. `banner.ts` still chooses manual category overrides and the shared fallback from `content/banner.json`.
- `PhotoDialog.tsx` displays a `<figure>` and escaped `<figcaption>` only for film photographs with `showDescription` enabled, regardless of the category they were opened from.
- `PhotoDialog.module.css` retains the white frame, vintage font and whole image aspect ratio. Caption space is accounted for in viewport sizing; long captions can scroll. Digital lightbox captions were not requested and are not displayed.

## Faster builds and deployment

- Ignored `.photo-cache/` caches encoded variants by source bytes, processing recipe/scripts, Sharp versions, platform and architecture. Descriptions, categories, ordering, visibility and banner settings do not invalidate encodings.
- `scripts/photo-cache.mjs` validates metadata and variant checksums; missing/corrupt entries regenerate. `scripts/process-photo.mjs` reuses valid variants and emits content-fingerprinted public filenames. Current metadata is always regenerated in the manifest.
- Importer reports processed/reused counts and writes them to `GITHUB_OUTPUT` in Actions.
- `.github/workflows/deploy.yml`: checkout, Node 24/npm cache, npm ci, non-browser tests, Pages config, restore `.photo-cache`, full build, save cache only when new encodings exist, upload/deploy `dist`.
- Cache keys include processing/dependency hashes, source hash and run ID/attempt; restore prefixes reuse prior images. Do not replace this with a permanently immutable exact key that prevents repaired/new entries from being saved.
- Cold local processing was about 132 s; a warm complete build about 5–6 s (0 processed, 122 reused). This is local timing, not a verified total GitHub deployment duration. Cache misses/eviction still cause safe full processing.
- Every push to `main`, including an online admin save, triggers Pages. No manual deployment was triggered by the handoff.

## Verification already completed

- Photo cache/import work: 33 non-browser tests passed before the latest lightbox test was added; cold/warm import and corrupt cache repair were verified.
- Latest animation/lightbox changes: both focused SSR tests in `tests/gallery-render.test.mjs` passed; TypeScript and direct Vite build passed; localhost returned HTTP 200.
- After pulling the latest admin content, complete `npm run build` passed using 122 cached photographs, and dev HTTP checks confirmed the new banner and film caption data.
- No browser automation or visual browser verification was performed. Do not claim it was.

Useful commands (choose checks appropriate to the next change):

```sh
npm run typecheck
npx vite build
node --test tests/gallery-render.test.mjs
npm test
npm run build
```

See `README.md` for normal operation and `tests/import-photos.test.mjs`, `tests/gallery-content.test.mjs`, `tests/admin-github.test.mjs` and `tests/gallery-render.test.mjs` for focused coverage.

## Relevant commit history

- `7042a69` Add GitHub photo manager and content registry.
- `8a64a90` Add optional photo captions and simplify admin access (also renamed the admin route and fixed fetch binding).
- `268e16c` Cache processed photographs and update category navigation (includes removal of Events).
- `641db70` Update portfolio photographs and banners (online admin content, pulled locally).
- `9f03195` Animate banner transitions and show film lightbox captions (pushed).

Start the next chat by reading this file and `AGENTS.md`, checking `git status`, and asking no repeated setup questions already answered here. Preserve unrelated local edits and recheck remote content when synchronization is relevant.
