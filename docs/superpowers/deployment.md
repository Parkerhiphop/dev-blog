# Deploying to Cloudflare Pages

1. Push this repo to GitHub (`Parkerhiphop/dev-blog`).
2. In the Cloudflare dashboard: Workers & Pages → Create → Pages →
   Connect to Git → select `Parkerhiphop/dev-blog`.
3. Build settings:
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Environment variables (Production and Preview): add
   `PUBLIC_GISCUS_REPO_ID` and `PUBLIC_GISCUS_CATEGORY_ID` with the values
   from `docs/superpowers/giscus-setup.md`.
5. After the first deploy succeeds, go to the Pages project's Custom
   domains tab and add `dev.parkerchang.life`. Follow Cloudflare's DNS
   instructions (a CNAME record is added automatically if the
   `parkerchang.life` zone is already on Cloudflare).
6. Every push to the default branch redeploys automatically.
