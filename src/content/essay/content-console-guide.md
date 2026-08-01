---
title: Content Console Guide
description: An explanation of astro-whono's local Content Console in the development environment — content types, list search, editing/preview, and downloading/deleting.
badge: Guide
date: 2026-06-13
tags: [ "Content Console", "Guide" ]
draft: false
---

astro-whono provides a local Content Console for managing your site's written content in the development environment.

The Content Console's entry point is `/admin/content/`. It covers browsing, searching, editing, and previewing for four content types — Essays, Bits, Memo, and About — and supports creating new drafts, downloading source files, and deleting, making it easy to maintain content without hand-writing frontmatter.

:::note[Development Environment]
`/admin/content/` and its editing pages are only operable in the development environment. In production, only a local-development notice is shown — no content data or editor is loaded; `/api/admin/content/*` only serves the local backend and is not a public API.
:::

## Local Startup and Access

To start the project locally, run:

```bash
npm install
npm run dev
```

By default, the dev server runs at `http://localhost:4321/`. Once started, you can go directly to:

```text
http://localhost:4321/admin/content/
```

If you've changed the local dev port, replace `4321` with your actual port.

Content Console reads source files directly from `src/content/**`, with no dependency on a database or external service. Creating, saving, and deleting all land on content files within the repository, and related changes can be tracked and rolled back via Git.

## Content Types and Capabilities

Content Console manages four content types under one roof, but their capabilities differ:

| Content | Directory | Create | Edit | Delete | List Filtering |
| :--- | :--- | :---: | :---: | :---: | :---: |
| Essays | `src/content/essay/` | Yes | Yes | Yes | Yes |
| Bits | `src/content/bits/` | Yes | Yes | Yes | Yes |
| Memo | `src/content/memo/index.md` | — | Yes | — | — |
| About | `src/content/about/index.md` | — | Yes | — | — |

Essays and Bits are multi-entry content — you can create new drafts, edit and delete individual entries in the console, and the list also offers filtering and pagination. Memo and About are fixed single-page content — you can only edit the existing body text, with no support for creating new entries or deleting.

## Browsing, Filtering, and Search

When you open `/admin/content/`, the content overview is shown grouped by Essays, Bits, Memo, and About by default. The top toolbar provides:

- Search: find content across all types by title, tag, or slug
- Scope: switch between "All Content" and a single content type
- Status: All Statuses / Published / Drafts Only
- Sort: Recently Updated / Title A-Z
- Year: filter by content year

Status, sort, and year filtering plus pagination only apply to Essays and Bits; Memo and About are fixed single pages and don't expose these filter options. In the list, drafts are marked `[draft]`, and essays with archiving turned off are marked `[archive off]`.

Every item provides an "Edit" button, plus modification info, front-end view, download, and delete actions in the "More" menu.

## Creating and Editing

### Essays

Click "New Post" in the Essays group; after filling in basic info like the title, a draft is generated and you're taken to the editing page.

The essay editing page provides:

- A CodeMirror-based body editor with multiple built-in syntax highlighting themes and line-number options
- Edit / Preview layout toggle, with preview rendered server-side
- A frontmatter info panel: publish date, update date, tags, draft and archive fields, etc.
- Two helper sidebars: table of contents and Markdown syntax reference
- A toolbar for common Markdown, math formulas, emoji, images, and galleries
- Inline image upload: uploaded images are saved to the current content's attachment directory and inserted into the Markdown

### Bits

Click "New Bit" in the Bits group; after choosing a publish time, a draft is generated and you're taken to the editing page.

The bit editing page is a standalone workspace where you can edit the body text, basic info, and the image (`images`) field, with image upload support and a live card preview that matches what appears in the `/bits/` list.

### Memo and About

Memo and About are fixed single-page content — their editing pages only handle the body text:

- Memo: edit the body of `src/content/memo/index.md`, with support for inserting inline images, page preview, and a body table of contents
- About: edit the body of `src/content/about/index.md`; the friends list and FAQ in the preview render with the public-page styling, and the contact links position is controlled by the `::contact-links` placeholder

The main and sub titles for the Memo and About pages aren't maintained here — they're managed uniformly in Theme Console.

## Bulk Operations

After checking items in the list, you can perform "Bulk Operations":

- Publish / Mark as Draft: toggle the `draft` status in bulk
- Download: package the source files of the selected content into a zip download
- Delete: bulk-delete the selected content — source files are moved to the recycle bin (with confirmation before deletion)

Bulk operations apply to the items currently checked in the list; you can narrow the scope with filters or search first, then apply the bulk action.

## Downloading and Deleting

- Download: click "Download Source File" in an item's "More" menu to get the corresponding Markdown file
- Delete: delete from an item's "More" menu — the source file is moved to the recycle bin rather than erased outright; deletion requires confirmation

Downloading and deleting operate on the source file itself. Deletion is only supported for Essays and Bits; Memo and About don't offer a delete option.

## Content Fields and Writing Conventions

Content Console handles entering and maintaining content, but the specific frontmatter fields, image path rules, and body writing conventions (Callout, Figure, Gallery, formulas, etc.) are still governed by the repository README's "Content and Writing" section — not repeated here.

**Newly created content defaults to draft status.** Drafts for Essays and Bits are visible in local development, and are automatically filtered from the production build, RSS, and public lists; Memo is single-page content and should not be marked as a draft.

---

## Closing Notes

:::info[Why build a local backend at all]
Content Console is the most complex part of the whole backend, and the one that took the most time to build. Since everything is written locally and requires starting a dev server anyway — and editing Markdown directly would work just as well — some of you may wonder why bother building a backend like this?

- astro-whono's audience isn't necessarily familiar with frontend development. Editing source files directly requires remembering frontmatter fields, directory structure, and writing conventions; the backend folds these into forms and buttons, lowering the barrier to entry.
- When writing, what matters more is the final layout. The editing page has a built-in server-side preview, so the body, cards, and about page can all be seen close to their public appearance before saving, without switching back and forth to a browser to check.
- Commonly used content formats (Callout, images, galleries, formulas, emoji, etc.) can be inserted directly from the toolbar, saving you from hand-writing markup and consulting docs.
- Fixed single pages like Memo and About used to require editing the source file directly; now you can edit the body in place in the backend and preview it, which is more convenient.

The goal of Content Console isn't to replace the command line or an editor, but to let people without a coding background maintain their own content comfortably. Of course, the best solution would still be a real CMS, but that's a project of a different scale entirely, and isn't on the near-term roadmap.
:::

### 🔜 Current Progress and Future Plans

The features originally envisioned for Content Console are basically implemented now; going forward, the Admin backend will mostly focus on maintenance and polish, with no plans to keep stacking new features for the time being. If you have good ideas or suggestions while using it, feel free to raise them.

:::tip[Future Plans]
A comments feature is on the roadmap, with Waline currently being considered as a first option. Integrating it with Essays is relatively straightforward; Bits, being a short-update-style page, will need the comment system's styling and adaptation rethought for that format. So while the comments module is planned, it may still take some time before it officially ships.
:::

---

The above covers Content Console's current content management entry points and common operations. If you run into content issues, save problems, or have ideas or suggestions while using it, feel free to submit an Issue.
