# Project rules

These instructions apply to the entire repository.

## Approved visual direction

- The portfolio brand is "Lenka fotí" with a peach dot. Use the cute peach asterisk motif for the favicon.
- Do not show category headings or captions such as "Collected along the way" above the main gallery; category names belong in navigation.
- The main portfolio uses Floating palette: a photographic hero and a translucent rounded category dock. Categories evenly fill the dock width, with responsive rows.
- Banner photographs are chosen manually per category in `content/banner.json`, with a shared fallback photograph. Do not switch to automatic first-photo selection per category.
- Light mode uses the Mint afterglow palette; dark mode uses the Moonlit archive palette. Use the shared CSS variables.
- Highlight the On film category with the peach accent in both themes.
- Keep photographs and paper frames straight and aligned. Do not rotate or tilt photo prints.
- Paper frames in the main gallery and new design studies are reserved for On film photographs.
- Keep the white paper frame, including the wider bottom margin, around On film photographs in the lightbox in both themes.
- Keep the footer present and completely empty. Do not display photograph counters. All interface text is in English.

## Verification

- Do not run Playwright, `npm run test:e2e`, or other browser automation unless the user explicitly requests it for the current task.
- Match verification effort to the size and risk of the change. For small styling, spacing, copy or similarly low-impact changes, implement directly, check compilation and confirm the running page responds. Do not run broad test suites, browser automation or repeated checks for these changes.
- Use `npm run typecheck` and a direct Vite build for small application changes. Reuse generated photographs; do not rerun the photo importer when photo sources and processing are unchanged. Use `npm run build` for changes that require the complete build pipeline.
- Run focused non-browser tests when relevant to the change, such as importer tests for photo-processing changes. Do not add unnecessary verification steps for documentation-only changes.
- Keep the existing Playwright setup available for user-requested browser checks; do not run it automatically as routine verification.
