# Parker's Dev Blog — Design

## Overview

A personal software-development blog. Articles are authored in Markdown, rendered
statically, and the site supports Traditional Chinese (default) and English,
light/dark mode with a cyan-based color theme, giscus-powered comments, tag
browsing, a per-article table of contents, and RSS.

## Stack

- **Framework**: Astro (Content Collections for Markdown, static output)
- **Styling**: Tailwind CSS, CSS variables for light/dark theming, cyan as the
  primary accent color
- **Syntax highlighting**: Astro's built-in Shiki, theme switches with dark mode
- **Comments**: giscus, backed by GitHub Discussions on
  `Parkerhiphop/dev-blog` (requires: enable Discussions on the repo, install
  the giscus GitHub App, and fill in repo-id/category-id from giscus.app once
  the repo exists remotely)
- **Deployment**: Cloudflare Pages, static `astro build` output
- **RSS**: `@astrojs/rss`, one feed per language

## Content structure

```
src/content/
  posts/
    zh/
      <slug>.md
    en/
      <slug>.md
```

Frontmatter per post: `title`, `description`, `pubDate`, `updatedDate?`,
`tags: string[]`, `draft?: boolean`.

- Chinese is the default locale: routed at `/posts/<slug>/` (no prefix).
- English is routed at `/en/posts/<slug>/`.
- Translation pairing is by matching `slug` across `zh/` and `en/`. A post
  does not require both versions — untranslated posts simply don't exist at
  the other locale's path. When both exist, the article page shows a language
  switch link; otherwise no switch link is shown.

## Pages

- **Home** (`/`, `/en/`): reverse-chronological post list per language, with
  excerpt, tags, reading time.
- **Post page**: rendered Markdown, sticky TOC sidebar (collapsible on
  mobile) generated from h2/h3 headings via a remark plugin, Shiki-highlighted
  code blocks, giscus comment section, language-switch link when a
  translation exists.
- **Tag pages**: `/tags/[tag]/`, `/en/tags/[tag]/` — list posts under a tag.
- **About page**: one static page per language.
- **Nav**: site title ("Parker's Dev Blog"), Home, Tags, About, language
  switch, dark-mode toggle, RSS link.

## Theming

- Cyan-based accent color, CSS variables drive both light and dark palettes.
- Dark mode preference stored in `localStorage`; defaults to
  `prefers-color-scheme` on first visit.

## RSS

- `/rss.xml` — Chinese posts
- `/en/rss.xml` — English posts

## Out of scope

- Full-text search
- Multi-author support
- CMS/admin UI — content is authored directly as Markdown files in the repo
