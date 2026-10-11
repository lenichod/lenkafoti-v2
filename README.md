# Photography portfolio

A personal gallery built with React, TypeScript, Vite and custom components with CSS Modules. The responsive masonry preserves each photograph's aspect ratio. Categories have shareable URLs, and the site supports light and dark mode.

All interface copy, accessible labels, metadata and tool messages are in English. **The footer must remain present and completely empty. Do not add text, images, credits or other content to it.** Category navigation uses the translucent Floating palette dock. The lightbox has no frame or caption; controls sit at the viewport edges over a softly blurred, dimmed background.

## Getting started

Install **Node.js 24** (includes npm) and **Git**, then run from the project root:

```sh
npm ci
npm run dev
```

The gallery is imported automatically before development and production builds. `npm run dev` opens your default browser at `http://localhost:5173/`. If the port is occupied, Vite selects the next available port and opens that address. To choose a port, run `npm run dev -- --port 3000`.

`npm run build` generates the production site in `dist`; `npm run preview` serves it locally. Automated browser tests disable automatic opening using `VITE_OPEN_BROWSER=false`.

## Adding photographs

1. Put web exports directly into the matching category folder:

   ```text
   content/photos/portraits-people/  Portraits & people
   content/photos/nature/           Nature
   content/photos/travel/           Travel
   content/photos/street-everyday/  Street & everyday
   content/photos/events/           Events
   content/photos/automotive/       Automotive
   content/photos/on-film/          On film
   ```

2. Use **JPG, JPEG, PNG or WebP** (uppercase extensions also work). Export RAW, HEIC and other formats first. Subfolders are not imported. Web exports up to 2560 px wide are recommended; keep large originals outside the repository.
3. Use descriptive English names such as `01-sunset-portrait.jpg`. Numeric prefixes determine order, and the remaining filename becomes the alternative text. "All photographs" follows category configuration order; filenames within each category use natural ordering (`2` before `10`). CSS columns are read top to bottom, then left to right. The interface does not display photograph counts.
4. While the development server is running, use `npm run photos` in a second terminal and refresh the page. A new `npm run dev` or any build also runs the import automatically.
5. Publish your changes:

   ```sh
   git add content
   git commit -m "Add photographs"
   git push
   ```

GitHub automatically imports and deploys the photographs after a push. **A commit without a push does not update the hosted website.** You can also upload files to the existing folders through GitHub's **Add file → Upload files** interface and commit to `main`.

Delete a photograph by removing its source file and committing/pushing the change. Moving a file to another folder changes its category. Deleted and replaced images do not leave stale generated files. A corrupt supported image stops the build and reports its filename; the previously deployed site remains available. Concurrent imports wait for each other.

Sharp applies image orientation, removes EXIF metadata and creates WebP variants up to 2560 px without upscaling. Generated images and `manifest.json` live in `public/gallery/` and are ignored by Git. Source exports in `content/photos/` are committed and are publicly accessible in a public repository.

## Categories and appearance

Category labels, IDs and order are configured in `content/categories.json`. Each category needs a unique lowercase ASCII ID, such as `trips`, and a matching folder. Changing a label preserves its URL; changing an ID changes its URL.

Category links use URLs such as `?category=portraits-people`. Reload, Back and Forward are supported; an unknown category shows all photographs. Open a photograph with a click or Enter, navigate with arrow keys, and close with Escape, the close control or a click outside the image. Focus returns to the selected photograph.

The theme initially follows the system. A manual light/dark choice is saved in the browser. The lightbox displays the complete photograph without cropping.

The main page uses **Floating palette**: a photographic banner, a translucent category dock with equally sized items, and straight cream paper frames for On film photographs. Other photographs keep their original proportions without frames.

### Banner photographs

Choose banner photographs manually in `content/banner.json`. `defaultPhotoId` selects the shared banner for All photographs and for categories without their own selection. Initially this is the photograph used in the Floating palette study. Find each photo's `id` beside its `alt` and `categoryId` in the generated `public/gallery/manifest.json`.

For example, set a category entry to:

```json
"portraits-people": {
  "photoId": "def53613a2e15f8c",
  "position": "50% 45%"
}
```

`position` controls the banner crop and is optional. `defaultPosition` supplies the shared crop. A `null` category photo uses the shared banner; a missing or deleted selection also falls back to it. If the shared photograph is unavailable, the first available gallery photograph is used, and an empty gallery shows a soft gradient. These selections do not change photo order or gallery categories. Editing this JSON needs no photo reimport; rebuilding publishes the new configuration.

## Project structure

```text
src/app/                 page layout
src/components/          navigation and shared icons
src/features/gallery/    gallery, lightbox, data and category selection
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
3. `.github/workflows/deploy.yml` installs dependencies, checks TypeScript and importer tests, processes photographs and deploys `dist`.

The workflow derives the base path from the repository name, including `<user>.github.io` repositories. For a custom domain, set the workflow's base path to `/` and configure the domain in Pages. To verify a subdirectory locally in PowerShell:

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

Run `npm test` when changing photo processing. Importer tests create temporary images outside the project.

**Run Playwright only when explicitly requested by the user for the current task.** It is not part of routine verification. When requested:

```sh
npx playwright install chromium
npm run test:e2e
```

Browser tests use intercepted responses, so they work independently of your photographs and do not add sample images to the portfolio. They cover categories, URLs, history, themes, mobile layout, lightbox controls, focus restoration and recoverable loading errors. Repository-wide agent instructions are in `AGENTS.md`.
