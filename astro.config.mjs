import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://dev.parkerchang.life',
  integrations: [tailwind({ applyBaseStyles: false })],
});
