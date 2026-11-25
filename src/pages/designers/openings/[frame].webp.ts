import type { APIRoute } from 'astro';
import { openingAisles, openingViews, openingFrame, openingFrameName } from '../../../lib/designer-openings';

export function getStaticPaths() {
  return openingAisles.flatMap(code => openingViews.map(view => ({
    params: { frame: openingFrameName(code, view) }, props: { code, view },
  })));
}

export const GET: APIRoute = async ({ props }) => {
  const { image } = await openingFrame(props.code, props.view);
  return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/webp' } });
};
