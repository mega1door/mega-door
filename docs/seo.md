# SEO and catalog maintenance

Production is `https://mega1door.github.io/mega-door`. `src/lib/catalogMetadata.ts`
is the shared source for public URLs and model metadata in React and the build.
Model names, codes, category labels, colors, materials, dimensions and usage come
from saved catalog fields only. Prices are internal and are not included in SEO.
A missing model image uses the company logo for sharing; it is not added as a
product photograph in Product JSON-LD.

## Build and verification

- `npm test`: offline tests for search, metadata, static HTML and loading state.
- `npm run lint`: TypeScript, no output.
- `npm run test:built`: verify every generated sitemap URL has a matching HTML
  page/canonical, and every model has one Product JSON-LD block.
- `npm run build`: TypeScript + Vite, then read-only Supabase selects to generate
  model/category/popular HTML pages and `dist/sitemap.xml` / `dist/robots.txt`.
- The generator paginates all rows and fails the build if the catalog cannot be
  read. Do not restore the old "warn and continue" behavior: it could publish a
  site without the promised model pages.
- Public sitemap is a safe minimal fallback for development. Production build
  replaces it with current IDs, never the demo list. Empty categories are omitted.
- Product JSON-LD and real model text are present before JavaScript executes.
  React retains the existing interactive design after loading.
- Test link previews separately after an approved deployment: WhatsApp/Facebook
  cache metadata, and external image-host crawler access is outside this build.
  The old hard-coded A1 photo override was removed so an edited model cannot keep
  sharing an unrelated old photo.

## Keeping static pages current after admin edits

Admin saves update Supabase immediately. React sees the saved data on a fresh
load, but GitHub Pages serves a build snapshot to crawlers. It cannot run a live
database query per request. No code edits are needed to refresh the snapshot:
rerun the existing GitHub Pages workflow (Actions -> Run workflow).

The existing GitHub Pages workflow already runs hourly, on pushes to main and by manual dispatch. It rebuilds model pages and the sitemap from the current catalog. This change preserves that schedule; no duplicate workflow or new automation is added. Updates can lag until the next successful run. Scheduled jobs may be delayed by GitHub.

For near-immediate refresh later: a trusted backend/Webhook can dispatch that
workflow after successful admin writes. Keep the GitHub credential server-side,
authenticate requests, debounce bursts, and handle failures/retries. Never put a
GitHub write token in this Vite frontend. This requires separately approved
infrastructure, permissions and deployment; no Webhook was configured here.

## Search data limits

Search supports combined tokens across name, model code, material, color text,
category ID and category label. It normalizes Arabic diacritics, tatweel,
alef/ya/ta-marbuta variants, Arabic/Persian digits, case and code separators.
There is no separate saved color-code column. A code such as `RAL 9010` can be
found when it actually exists in the saved `color` field. Decorative `accent`
hex values are not treated as product color codes. No schema/data edits are made.

## Loading behavior

Models and categories start empty with explicit loading/error/ready states.
The public content waits for both successful reads; failed reads offer retry.
An actually missing model is shown only after a successful catalog load.
The existing admin CRUD methods and Supabase schema/policies are unchanged.
The authenticated editor also waits for a successful read, so a new model form
cannot initialize with an empty category while categories are still loading.
