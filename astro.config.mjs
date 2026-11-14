import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://places-that-shine.lmanliang.chatgpt.site',
  output: 'static',
  outDir: './build',
  build: { format: 'directory' },
  trailingSlash: 'always',
  redirects: {
    '/designers/wendy-tsai': '/designers/yuan-art-space/',
    '/designers/profiles/wendy-tsai': '/designers/yuan-art-space/',
    '/designers/wendy-tsai/works/wendy-tsai-bluebird-action-logo': '/designers/yuan-art-space/works/wendy-tsai-bluebird-action-logo/',
    '/designers/profiles/wendy-tsai/works/wendy-tsai-bluebird-action-logo': '/designers/yuan-art-space/works/wendy-tsai-bluebird-action-logo/',
  },
});
