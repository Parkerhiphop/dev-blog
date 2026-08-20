# Giscus setup (one-time, manual)

1. Ensure Discussions is enabled on https://github.com/Parkerhiphop/dev-blog
   (repo Settings → Features → Discussions).
2. Install the giscus app on that repo: https://github.com/apps/giscus
3. Go to https://giscus.app, enter `Parkerhiphop/dev-blog`, choose mapping
   "pathname", pick or create a "Comments" discussion category.
4. Copy the generated `data-repo-id` and `data-category-id` values into a
   local `.env` file (copy `.env.example` to `.env` first) as
   `PUBLIC_GISCUS_REPO_ID` and `PUBLIC_GISCUS_CATEGORY_ID`.
5. Set the same two variables in the Cloudflare Pages project's environment
   variables so they're available at build time in production.
