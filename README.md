# Photography portfolio

A personal gallery built with React, TypeScript, Vite and custom components with CSS Modules. The responsive masonry preserves each photograph's aspect ratio. Categories have shareable URLs, and the site supports light and dark mode.

All interface copy, accessible labels, metadata and tool messages are in English. **The footer must remain present and completely empty. Do not add text, images, credits or other content to it.** Category navigation uses the translucent Floating palette dock. The lightbox preserves the white paper frame for On film photographs, with a wider bottom margin in both themes; controls sit at the viewport edges over a softly blurred, dimmed background.

## Getting started

Install **Node.js 24** (includes npm) and **Git**, then run from the project root:

```sh
npm ci
npm run dev
```

Before development, the local photograph sources are synchronized with the content registry and imported. Production builds validate the registry and generate the gallery without changing tracked content. `npm run dev` opens your default browser at `http://localhost:5173/`. If the port is occupied, Vite selects the next available port and opens that address. To choose a port, run `npm run dev -- --port 3000`.

`npm run build` generates the production site in `dist`; `npm run preview` serves it locally. Automated browser tests disable automatic opening using `VITE_OPEN_BROWSER=false`.

## Adding photographs

1. Pull the latest changes from GitHub **before** editing locally. Online photo management changes the same content configuration that your local importer reads.
2. Put web exports directly into the matching category folder:

   ```text
   content/photos/portraits-people/  Portraits & people
   content/photos/nature/           Nature
   content/photos/travel/           Travel
   content/photos/street-everyday/  Street & everyday
   content/photos/automotive/       Automotive
   content/photos/on-film/          On film
   ```

3. Use **JPG, JPEG, PNG or WebP** (uppercase extensions also work). Export RAW, HEIC and other formats first. Subfolders are not imported. Web exports up to 2560 px wide are recommended; keep large originals outside the repository.
4. Use descriptive English names such as `01-sunset-portrait.jpg`. The filename supplies the initial English alternative text, and the folder supplies the initial category. A photograph can subsequently belong to multiple categories without moving or duplicating its file.
5. Run `npm run photos`. This updates `content/gallery.json` and generates the local gallery. Existing descriptions, categories, visibility, IDs and order are preserved. Newly discovered files are appended in category and natural filename order (`2` before `10`). While the development server is running, refresh the page after importing.
6. Publish your changes:

   ```sh
   git add content
   git commit -m "Add photographs"
   git push
   ```

GitHub automatically builds and deploys the photographs after a push. **A local commit without a push does not update the hosted website.** Include the updated registry and new source files in the same commit. Directly uploading a source file through GitHub without registering it will stop the build; use the local import workflow.

To permanently remove a source file, remove it locally and run `npm run photos` before committing. If the photograph is a selected banner, explicitly replace that banner or clear its category selection in `content/banner.json` first. An empty portfolio must have `defaultPhotoId: null` and no selected category banners. Renaming or moving a source file is treated as removal and a new import; change categories in the admin instead to retain its ID. Deleted and replaced images do not leave stale generated files. A corrupt supported image stops the build and reports its filename; the previously deployed site remains available. Concurrent imports wait for each other.

Sharp applies image orientation, removes EXIF metadata and creates WebP variants up to 2560 px without upscaling. Generated images and `manifest.json` live in `public/gallery/` and are ignored by Git. Source exports in `content/photos/` are committed and are publicly accessible in a public repository.

Processed images are also stored in the ignored `.photo-cache/` directory. The cache uses the source file contents, processing scripts and Sharp versions, independently of photo descriptions, categories, order, visibility and banner settings. Each build still validates sources and regenerates the manifest from current content, but only new or changed images are encoded. Missing or corrupt cache entries are regenerated automatically. Hidden or removed photographs remain excluded from public output; their cached images can be reused when restored. The importer reports how many photographs were processed and reused.

## Online photo manager

Open `/spalena-kyticka/` on your hosted website, or `http://localhost:5173/spalena-kyticka/` during development. There is no admin link in the public navigation. The editor uses the same light/dark palettes as the portfolio; its interface is English and its footer is empty.

The connection form contains only **Password** and **Connect**. Password accepts a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) restricted to the public repository `lenichod/lenkafoti-v2`, with **Contents: read and write**. The repository and branch `main` are fixed in the editor. The token stays in tab memory, is sent only to `api.github.com`, and is cleared on sign out or closing the tab. It is never saved to browser storage or project files. A hidden admin URL does not replace GitHub's authorization.

The manager provides English descriptions, multiple category checkboxes, search, category and visibility filters, shared photo order, bulk category actions, reversible removal, and manual banner selection with crop controls. **Remove from portfolio** hides the photograph without deleting its source file; use the removed-photo filter and **Restore** to bring it back. Visible photographs need at least one category and a nonempty English description of up to 500 characters. Film photographs keep their paper frames in every collection and in the lightbox.

Selections are retained across filters. **Add categories**, **Remove categories** and **Set categories** apply to every selected photograph, including selections outside the current filter. Move controls always change the complete shared order; collections filter that order. The public masonry is read top to bottom, then left to right. No photograph counters are displayed.

**Show description** is off by default. Enable it on a photograph to display its English description below the image in the public gallery. Digital photographs get a rounded peach frame; On film photographs use their existing white paper frame with a typewriter-style caption. The admin preview updates immediately. This setting is saved with the other photo edits and appears on the website after deployment; the accessibility description remains available when captions are off.

The **Banner photographs** panel manages the shared banner and optional category selections. Categories without their own selection use the shared photograph. To remove a selected banner photograph, choose its replacement or clear the category override before saving. Crops affect only the banner display.

Edits remain in tab memory until you click **Save to GitHub**. Leaving, reloading the saved version, or signing out prompts before discarding drafts. Saving commits only `content/gallery.json` and `content/banner.json` together; a save on `main` triggers the existing deployment workflow. The success message confirms the GitHub save, and links separately to deployment status. It does not claim that deployment has already finished.

Repository changes made after connecting stop the save instead of overwriting newer work. Keep the draft tab open while resolving the conflict; reloading the saved version discards the draft only after confirmation. Network errors retain the draft, and retries reconcile a possibly successful save before writing again. Rate-limit messages show when retrying is available. Branch protection must permit the selected account to update the branch directly.

New file upload, category creation, Czech descriptions and general page editing are not part of this editor. Import new files locally, then commit and push them yourself.

### Content registry

`content/gallery.json` has a `version: 1` and an ordered `photos` array. Each record stores `id`, `sourcePath`, `categoryIds`, `alt`, `hidden` and optional boolean `showDescription` (defaults to `false` for existing records). This file is the source of truth for presentation; folders are only used to initialize newly imported photographs. The initial registry preserves the existing path-derived IDs and photo order, including banner references.

`npm run photos` and the development preflight synchronize this registry. Production's preflight is read-only and rejects missing or unregistered source files, malformed content and unavailable banner references. Generated public photo records have `categoryIds` instead of `categoryId`; hidden photographs are excluded from the manifest.

## Categories and appearance

Category labels, IDs and order are configured in `content/categories.json`. Each category needs a unique lowercase ASCII ID, such as `trips`, and a matching folder. Changing a label preserves its URL; changing an ID changes its URL.

Category links use URLs such as `?category=portraits-people`. Reload, Back and Forward are supported; an unknown category shows all photographs. Open a photograph with a click or Enter, navigate with arrow keys, and close with Escape, the close control or a click outside the image. Focus returns to the selected photograph.

The theme initially follows the system. A manual light/dark choice is saved in the browser. The lightbox displays the complete photograph without cropping.

The main page uses **Floating palette**: a photographic banner, a translucent category dock with equally sized items, and straight cream paper frames for On film photographs. Other photographs keep their original proportions and get rounded peach frames when their descriptions are enabled.

### Banner photographs

Choose banner photographs manually in the admin or in `content/banner.json`. `defaultPhotoId` selects the shared banner for All photographs and for categories without their own selection. Initially this is the photograph used in the Floating palette study. Find each photo's `id` beside its `alt` and `categoryIds` in `content/gallery.json` or the generated `public/gallery/manifest.json`.

For example, set a category entry to:

```json
"portraits-people": {
  "photoId": "def53613a2e15f8c",
  "position": "50% 45%"
}
```

`position` controls the banner crop and is optional. Use two percentages between 0 and 100, such as `50% 45%`. `defaultPosition` supplies the shared crop. A `null` category photo uses the shared banner. Builds reject references to removed or missing photographs, requiring an explicit replacement or cleared category override. The public renderer retains a defensive fallback, and an empty gallery shows a soft gradient. These selections do not change photo order or gallery categories.

## Project structure

```text
src/app/                 page layout
spalena-kyticka/          standalone photo manager entry point
src/content/             shared content types and validation
src/components/          navigation and shared icons
src/features/gallery/    gallery, lightbox, data and category selection
src/features/admin/      GitHub photo manager and editor
src/features/banner/     banner selection and photographic hero
src/features/theme/      theme handling
src/styles/              shared variables and global styles
content/                 category configuration and source photographs
scripts/                 photograph import and optimization
tests/                   importer and browser tests
```

Components have their own style modules. The gallery reads a separate manifest, so a future CMS can supply the same data without replacing gallery components.

## GitHub Pages

1. Create a GitHub repository and push the project to `main`.
2. Select **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. `.github/workflows/deploy.yml` installs dependencies, runs tests, restores the photo cache, builds the portfolio (including TypeScript), and deploys `dist`. Newly processed photographs are cached for later runs; metadata-only builds reuse the existing cache without uploading another copy.

The first deployment without a cache still processes all visible photographs. Subsequent deployments reuse them, including when only the admin content or application changes. A photo source change restores the previous cache and processes only the affected images. Encoder or dependency changes invalidate the cache. GitHub may evict caches, so a cache miss safely performs a complete image build again. No generated images or cache files are committed.

The workflow reads the base path from the GitHub Pages configuration. It automatically uses `/` for a custom domain and `/<repository>/` for a project hosted on `github.io`. After changing the custom domain in Pages, rerun the deployment workflow or push a commit to publish with the updated paths. To verify a subdirectory locally in PowerShell:

```powershell
$env:VITE_BASE_PATH = '/lenkafoti-v2/'
npm run build
npm run preview
```

GitHub Pages is static hosting and is available with GitHub Free for public repositories. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

For Vercel, import the same repository, use `npm run build`, select `dist` as the output directory and keep the default `/` base path. No backend is needed. [Vite deployment documentation](https://vite.dev/guide/static-deploy.html).

## Visual design studies

Open `http://localhost:5173/?designs` while the dev server is running to compare visual directions. Four navigation studies appear first, followed by the earlier combinations and six original studies. Use the same port as your running server. Each direction has an "Explore" link to a larger preview, for example `?design=pills`. The studies use the same six existing photographs and illustrative category navigation. Floating palette is now implemented in the main portfolio; the studies remain available for reference. All preview footers remain empty and no photograph counters are displayed.

The approved palette is **Mint afterglow for light mode** and **Moonlit archive for dark mode**, shared with the main gallery. Use the preview theme button to compare both modes across Soft capsules, Quiet links, Floating palette and Studio sidebar. On film stays peach in both modes, regardless of selection. Earlier studies keep their original palettes for reference.

Photographs and their frames remain straight, with no rotation. The new studies reserve Contact sheet-style cream paper frames for photographs whose category is `on-film`; digital photographs remain unframed, and gallery images retain their aspect ratios.

## Verification

Routine application verification uses the production build, which includes the TypeScript check:

```sh
npm run build
```

Run `npm test` when changing photo processing, content synchronization or GitHub saving. Tests use temporary images outside the project and simulated GitHub responses; they never write to the real repository or publish the website.

**Run Playwright only when explicitly requested by the user for the current task.** It is not part of routine verification. When requested:

```sh
npx playwright install chromium
npm run test:e2e
```

Browser tests use intercepted responses, so they work independently of your photographs and do not add sample images to the portfolio. They cover categories, URLs, history, themes, mobile layout, lightbox controls, focus restoration and recoverable loading errors. Repository-wide agent instructions are in `AGENTS.md`.
