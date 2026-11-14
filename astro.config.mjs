import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://places-that-shine.lmanliang.chatgpt.site',
  output: 'static',
  outDir: './build',
  build: { format: 'directory' },
  trailingSlash: 'always',
});
