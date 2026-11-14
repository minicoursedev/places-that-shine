import { defineConfig } from 'astro/config';
import { createReadStream, existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateDesignerOg } from './scripts/designer-og.mjs';

let generatedOg;
const designerOg = {
  name: 'designer-og',
  hooks: {
    'astro:config:setup': async ({ command, config, updateConfig }) => {
      const root = fileURLToPath(config.root);
      let manifest = join(root, 'public/designers/og-images.json');
      if (command === 'build' || command === 'dev') {
        const cacheDir = join(root, '.astro');
        await mkdir(cacheDir, { recursive: true });
        generatedOg = await mkdtemp(join(cacheDir, 'designer-og-'));
        await generateDesignerOg({ root, site: config.site, directory: generatedOg });
        manifest = join(generatedOg, 'designers/og-images.json');
      }
      updateConfig({ vite: { resolve: { alias: {
        'designer-og-manifest': manifest,
      } } } });
    },
    'astro:build:done': async ({ dir }) => {
      await cp(join(generatedOg, 'designers'), fileURLToPath(new URL('designers/', dir)), { recursive: true });
      await rm(generatedOg, { recursive: true, force: true });
    },
    'astro:server:setup': ({ server }) => {
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split('?')[0];
        if (path !== '/designers/og-images.json' && !/^\/designers\/assets\/og\/[a-z0-9-]+\.jpg$/.test(path || '')) {
          return next();
        }
        const file = join(generatedOg, path);
        if (!existsSync(file)) return next();
        response.setHeader('Content-Type', path.endsWith('.json') ? 'application/json' : 'image/jpeg');
        createReadStream(file).on('error', next).pipe(response);
      });
    },
    'astro:server:done': async () => {
      await rm(generatedOg, { recursive: true, force: true });
    },
  },
};

export default defineConfig({
  site: 'https://minicourse.dev',
  output: 'static',
  outDir: './build',
  build: { format: 'directory' },
  trailingSlash: 'always',
  integrations: [designerOg],
  redirects: {
    '/designers/wendy-tsai': '/designers/yuan-art-space/',
    '/designers/profiles/wendy-tsai': '/designers/yuan-art-space/',
    '/designers/wendy-tsai/works/wendy-tsai-bluebird-action-logo': '/designers/yuan-art-space/works/wendy-tsai-bluebird-action-logo/',
    '/designers/profiles/wendy-tsai/works/wendy-tsai-bluebird-action-logo': '/designers/yuan-art-space/works/wendy-tsai-bluebird-action-logo/',
  },
});
