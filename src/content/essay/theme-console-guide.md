---
title: Theme Console Configuration Guide
description: An explanation of astro-whono's local Theme Console in the development environment — its scope, page groups, config destinations, and save mechanism.
badge: Guide
date: 2026-04-26
updatedAt: 2026-07-11
tags: [ "Theme Console", "Guide"]
draft: false
---

astro-whono provides a local Theme Console for centrally managing theme-level configuration in the development environment.

The Theme Console's entry point is `/admin/theme/`. It mainly covers site info, sidebar, homepage, and inner-page copy, along with some reading and code-display options, making it easy to quickly adjust your site's theme settings after forking or cloning.

:::note[Development Environment]
`/admin/theme/` is only operable in the development environment. In production, only a local-development notice is shown, with no write capability.
:::

## Local Startup and Access

To start the project locally, run:

```bash
npm install
npm run dev
```

By default, the dev server runs at `http://localhost:4321/`. Once started, you can go directly to:

```text
http://localhost:4321/admin/theme/
```

If you've changed the local dev port, replace `4321` with your actual port.

`/admin/` is the backend's Site Overview entry point, used to view a snapshot of your site. Theme Console lives at `/admin/theme/` — be careful to distinguish between the two.

## Development vs. Production

Theme Console is a configuration tool aimed at local maintainers, and behaves differently across environments:

- Development: `/admin/theme/` can read and save theme configuration
- Production: `/admin/theme/` only shows a local-development notice, with no writable form
- `/api/admin/settings/`: only available in development, not used as a public API

## Scope

Theme Console is currently suited to handling the following categories of configuration:

- Site title, default language, default SEO description
- Footer year and copyright text
- `/admin/` Overview's public-visibility toggle and its off-state text
- Social links and their order
- Sidebar site name, quote text, nav order, and visibility
- Sidebar action icons (reading mode / RSS / theme switch / site overview entry)
- Homepage Hero, homepage tagline, and homepage internal entry points
- Main and sub titles for `/essay/`, `/archive/`, `/bits/`, `/memo/`, `/about/`
- Post metadata display options
- Code block line numbers
- Typography fonts for the four roles: body / prose / monospace / brand


## Configuration Files

Saved settings are automatically written to `src/data/settings/`, grouped as follows:

```text
src/data/settings/
  site.json
  shell.json
  home.json
  page.json
  ui.json
```

> If `src/data/settings/*.json` doesn't exist yet, it will be generated automatically the first time you save in `/admin/theme/`.

Theme Console manages theme configuration within the repository, and related changes can still be tracked and rolled back via Git.

The theme configuration read order is fixed: `src/data/settings/*.json` takes priority, followed by legacy configuration, and finally the project defaults. The legacy configuration here mainly comes from `site.config.mjs` and default constants within components.<br>
In other words, right after cloning the project you can start with the default configuration; as soon as you save once in Theme Console, a trackable settings JSON is generated.

## Page Groups

`/admin/theme/` is currently split into five groups by editing scenario.

### Site

`Site` handles site-level basic information:

- Site title
- Default language
- Default SEO description
- Footer year and copyright text
- Whether `/admin/` Overview is publicly visible, and the text shown when it's off
- Social links

> ![Site group screenshot](./theme-console/theme-console-site.webp)

### Sidebar

`Sidebar` handles shell- and navigation-related configuration:

- Sidebar site name
- Sidebar quote text
- Sidebar divider style
- Sidebar action icon visibility (reading mode / RSS / theme switch / site overview)
- Nav item names, order, suffix characters, and visibility

> ![Sidebar group screenshot](./theme-console/theme-console-sidebar.webp)

### Home

`Home` handles homepage display configuration:

- Hero image URL and caption text
- Hero visibility
- Homepage tagline main text
- Homepage tagline supplementary text
- Primary and secondary links within the supplementary tagline

> ![Home group screenshot](./theme-console/theme-console-home.webp)

The homepage's supplementary tagline still uses a fixed sentence structure; the backend only exposes the text and entry-point choice, in order to keep the homepage structure stable. Currently available entry points include `archive`, `essay`, `bits`, `memo`, `about`, and `tag`.


### Inner Pages

`Inner Pages` handles unified copy and display strategy at the inner-page level:

- `/essay/` page main and sub titles
- `/archive/` page main and sub titles
- `/bits/` page main and sub titles
- `/memo/` page main and sub titles
- `/about/` page main and sub titles
- Whether post metadata shows date, tags, word count, reading time
- `/bits/` default author name and avatar

> ![Inner Pages group screenshot](./theme-console/theme-console-inner-pages.webp)


### Code

- Whether to show line numbers in code blocks

### Typography

`Typography` handles the selection of four typography font roles:

- Body font (post body and headings)
- Prose font (tagline, about page, and similar contexts)
- Monospace font (code blocks and inline code)
- Brand font (sidebar site name and quote)

Saving writes to `src/data/settings/ui.json` and takes effect on the next build. See the "Typography Fonts" section below for font sources, size, and how to add custom fonts.


## Typography Fonts

Each of the four font roles is chosen from its own set of font cards: each card renders a live preview of the font along with a source badge, and once selected shows the full name and size details below the card to help you weigh trade-offs. Built-in options fall into three source categories:

- **System fonts**: use fonts already present on the visitor's device, with no download.
- **Self-hosted fonts**: font files are bundled with the site's build output and shipped alongside it — visitors never hit an external CDN, and the page makes no third-party requests.
- **Fetched-online fonts**: downloaded from an open-source font library (fontsource / Google Fonts) at build time and then self-hosted — the page likewise makes zero third-party requests, but the build machine needs access to the relevant font source.

Chinese fonts typically run over 1 MB per weight, while system fonts involve zero download — weigh appearance against size accordingly.

### Adding Fonts Beyond the Card List

The card options come from the font registry at `src/lib/fonts/registry.ts`. When you need a font outside the list, just append a configuration block for it to the end of `THEME_FONT_REGISTRY` — the selection card, validation, and page styling all take effect automatically, with no other files to change.

To keep builds reproducible and pages free of third-party requests, the registry only accepts pre-registered fonts; the interface doesn't support typing in an arbitrary font name. Each font uses one of the following approaches depending on how it's sourced — see the in-file comments for what each field means:

| Method | Use Case | Key Fields |
|---|---|---|
| `system` | System font stack | `fallbacks`; no download |
| `astro-fonts-api` | Open-source online fonts | `provider` (`fontsource` has better availability in mainland China / `google` requires access to fonts.google.com), `familyName`; Chinese fonts must declare `subsets` (e.g. `['chinese-simplified', 'latin']`), otherwise Chinese glyphs won't be bundled |
| `astro-fonts-api` + `provider: 'local'` | Offline or no-internet builds | Place font files in `src/assets/fonts/` and fill in `localVariants`; the build has no network dependency |
| `subset-pipeline` | Chinese subsetting/compression needed | Also requires a source font, `scripts/font-subset.mjs`, and matching `global.css` setup — see the existing default fonts for reference |

If a fetched-online font fails to download during the build, the page automatically falls back to a system font and the build doesn't fail; running `SITE_URL=... npm run check:prod-artifacts` will report this kind of silent fallback as an explicit error. After switching such a font in development mode, you'll need to restart the dev server to see the effect.


## Save Mechanism

- Saving writes back grouped by `site / shell / home / page / ui`, without directly modifying template source code
- Most fields provide an instant preview or a clear page correspondence
- Field validation runs before saving
- Saves are tagged with version info to prevent silent overwrites from concurrent edits
- The write process includes rollback on failure, avoiding a half-succeeded multi-file state

---

That covers Theme Console's commonly used configuration entry points and save mechanism today. If you run into configuration issues or save problems while using it, feel free to submit an Issue.
