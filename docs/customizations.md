# Portfolio customizations

Notes on changes made to the upstream `astro-whono` theme for this site, and
gotchas discovered along the way. Keep theme-agnostic notes here rather than in
`CHANGELOG.md` (that file tracks the upstream theme).

## Site changes

- **Navigation trimmed to Portfolio + Bits.** `essay`, `memo`, `archive`,
  `about` are set `visible: false` in `src/data/settings/shell.json`. Their
  routes still build and resolve by direct URL; nothing links to them.
- **`/` redirects to `/portfolio/`.** `src/pages/index.astro` is now just
  `Astro.redirect('/portfolio/', 302)` — the theme's essay-list home page is
  retired. The dev server serves that as a real 302. The `static` build emits a
  2-second meta-refresh page for `/`, so `public/_redirects` adds a proper
  `301` that Cloudflare Workers applies before falling back to that HTML.
- **Branding.** Sidebar title (`shell.brandTitle`) = "Alonzo Luis". Bits author
  (`page.bits.defaultAuthor.name`) = "Alonzo Luis". Footer copyright
  (`site.footer.copyright`) = "Regend". Full SEO title (`site.title`) =
  "Alonzo Luis' Portfolio".
- **Avatar.** `public/author/avatar.webp` replaced with a personal photo
  (was the theme's fish logo).
- **Bits content.** The demo multi-image post was replaced with a koi-pond
  photo post (`src/content/bits/bits-2026-06-28-2015.md`, images
  `public/bits/koi-pond-0{1,2}.webp`). The five `bits-demo-*.webp` files were
  removed.
- **View transitions.** `src/styles/components/view-transitions.css` adds the
  native cross-document View Transition API (`@view-transition { navigation:
  auto }`), imported from `global.css`. Every navigation is still a full
  document load, so all theme scripts keep their normal lifecycle; browsers
  without support just navigate instantly. The sidebar gets
  `view-transition-name: site-sidebar` with a 0s group animation so it stays
  anchored while the main column cross-fades. `prefers-reduced-motion: reduce`
  disables the animations.

## Gotcha: `src/data/settings/*.json` must match the canonical shape *exactly*

### Symptom

Theme Console / Data Console show a red **"INVALID SETTINGS — settings JSON is
currently not writable"** banner:

> src/data/settings/shell.json has an invalid or non-conforming config value

The public site still renders (settings are normalized on read), but the
in-dev Console **save/export/import is disabled** until the file is fixed.

### Cause

`getThemeSettingsReadDiagnostics()` compares each raw settings file against the
**canonical** serialization produced by `createAdminWritableThemeSettingsGroups`
using `getAdminThemeSettingsMismatchPaths(..., 'exact')`. That comparison walks
arrays **positionally** (`collectMismatchPaths` in
`src/lib/admin-console/theme-shared.ts`).

The canonical form sorts `shell.nav` by ascending `order` (see
`canonicalizeAdminThemeSettings`, ~line 448). So if you change a nav item's
`order` without also moving the object to the matching position in the JSON
array, the array order no longer matches canonical and every downstream index
is flagged as a mismatch.

In this repo it happened when `portfolio` was given `"order": 1` but left as the
**last** element of the `nav` array.

### Fix

Keep the `nav` array elements physically sorted by their `order` value. Current
order: `portfolio` (1), `bits` (2), `memo` (3), `archive` (4), `essay` (5),
`about` (6).

The same rule applies to any array in these files (e.g.
`home.introMoreLinks`, `site.socialLinks.custom`): the raw JSON array order must
equal what the canonicalizer would produce, and each object's keys should be in
the canonical order too.

### How to check

There's no CLI lint for this — the check is runtime. Run `npm run dev` and open
`/admin/theme/` (or `/admin/data/`): a conforming file shows "Initial
configuration loaded" / "Ready"; a non-conforming one shows the red
**INVALID SETTINGS** banner naming the offending file. The diagnostic comes from
`getThemeSettingsReadDiagnostics()` in `src/lib/theme-settings.ts`.
