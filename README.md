# Parker's Dev Blog

Bilingual (zh/en) software development blog built with Astro, Tailwind CSS,
and giscus comments. Deployed to Cloudflare Pages at
https://dev.parkerchang.life.

## Development

```bash
npm install
npm run dev
```

## Writing a post

Add a Markdown file under `src/content/posts/zh/<slug>.md` (and optionally
`src/content/posts/en/<slug>.md` for the translation) with frontmatter:

```yaml
title: "..."
description: "..."
pubDate: 2026-01-01
tags: ["..."]
```

## Docs

- [Design spec](docs/superpowers/specs/2026-08-17-dev-blog-design.md)
- [Giscus setup](docs/superpowers/giscus-setup.md)
- [Deployment](docs/superpowers/deployment.md)
