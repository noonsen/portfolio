---
title: Admin Console Quick Guide
description: An overview of the entry points and page functions of astro-whono's local Admin Console.
badge: Guide
date: 2026-04-24
tags: [ "Admin Console", "Guide" ]
draft: false
---

The Admin Console at `/admin/` is the local backend entry point, used for taking over site configuration and content maintenance after you fork, clone, or self-host the project.

It's not a standalone CMS — saving writes changes back to the config or content files in your repository, so it works well alongside Git: you can review diffs before and after changes, and roll back like any normal project file when needed.

:::note[Local Tool]
The Admin Console only provides write access in the development environment.<br>
In production, at most a read-only Site Overview page is retained; `/api/admin/*` only serves the local backend and is not a public API.
:::

## Quick Access

Start the project locally:

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:4321/` by default. If you've changed the port, replace `4321` with your actual port.

| Entry | Page | Main Purpose |
| :---: | :---: | :--- |
| `/admin/` | Site Overview | View site overview, content structure, recent posts, etc. |
| `/admin/theme/` | Theme Console | Edit site info, sidebar, homepage, and inner-page copy |
| `/admin/content/` | Content Console | Post management and visual writing |
| `/admin/images/` | Images Console | Browse image assets and copy usable paths |
| `/admin/checks/` | Checks Console | View structured diagnostics for pre-publish checks |
| `/admin/data/` | Data Console | Import and export theme settings for migration and backup |

## Main Pages

### 📈 Site Overview

[Site Overview](/admin/) is the backend homepage, showing site content counts, recent updates, and backend entry points (entries are only visible in the development environment).

This page can optionally be made public, controlled by the Admin Overview toggle in the Theme Console page.

### 🛠️ Theme Console

Theme Console manages theme-level configuration, making it easy to quickly adjust basic site settings after forking or cloning.

See the [Theme Console Configuration Guide](/archive/theme-console-guide/) for details.

### 📝 Content Console

Content Console is the entry point for content management and visual writing, letting you centrally view and maintain your site's written content.

See the [Content Console Guide](/archive/content-console-guide/) for details.

### 🖼️ Images Console

Images Console lets you browse image assets, verify image information, and copy paths usable in config or content fields.

It's currently positioned close to an asset browser, and doesn't yet support compressing, deleting, or replacing files.
When you need to swap an image, first place it in the project's designated directory, then return to the relevant page to select or fill in the path.

### ✅ Checks Console

Checks Console performs pre-publish checks, compiling content, config, image reference, and convention risks into a diagnostic report.

This page doesn't modify files directly. After finding issues, go back to Theme, Content, or the source code to fix them.

### 📤 Data Console

Data Console handles importing and exporting theme settings. Exporting is suited for migration or backup; importing runs a pre-check first, then confirms before writing.

It handles the theme configuration data managed by Theme Console, not post content.

---
That covers the main entry points and functions of the Admin Console today. If you have further ideas or suggestions, feel free to submit an Issue.
