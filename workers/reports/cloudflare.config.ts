import { bindings, defineConfig, triggers } from 'cf/config';

const host = 'minicourse.dev';

export default defineConfig(({ isPreview, mode }) => {
  const production = mode === 'production' && !isPreview;

  return {
    worker: {
      name: production ? 'places-store-reports' : 'places-store-reports-dev',
      entrypoint: './index.js',
      compatibilityDate: '2026-11-18',
      workersDev: false,
      previewUrls: false,
      observability: { enabled: true, traces: { enabled: true, headSamplingRate: 0.1 } },
      env: {
        PUBLIC_HOST: bindings.text(production ? host : 'localhost'),
        REPORTS: bindings.d1({ name: production ? 'places-store-reports' : 'places-store-reports-dev' }),
        PHOTOS: bindings.r2({ name: production ? 'places-store-report-photos' : 'places-store-report-photos-dev' }),
        REPORTS_ADMIN_TOKEN_SHA256: bindings.secret(),
        TURNSTILE_SECRET: bindings.secret(),
      },
      triggers: production ? [
        triggers.fetch({ pattern: 'https://' + host + '/api/reports*', zone: host }),
        triggers.scheduled({ schedule: '*/15 * * * *' }),
      ] : [],
    },
  };
});
