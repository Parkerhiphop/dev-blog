# Parker's Dev Blog

Bilingual (zh/en) software development blog built with Astro, Tailwind CSS,
and Utterances comments. Deployed to Cloudflare Pages at
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

Article cover images are generated from each post title in the blog's dark
teal grid style. `npm run build` refreshes them automatically; run
`npm run generate:covers` to regenerate them on demand. The generated covers
are used for Open Graph and Twitter previews.

English and Japanese translations show an AI translation notice while their
frontmatter has `review-by-me: false`. Set it to `true` after reviewing the
translation to hide the notice.

## Deployment

Hosted on Cloudflare Pages with build command `npm run build` and output
directory `dist`. Utterances is configured directly in
`src/components/Utterances.astro` and requires no environment variables.
