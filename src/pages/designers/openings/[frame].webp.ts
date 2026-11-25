import type { APIRoute } from 'astro';
import { hallCodes, openingViews, openingFrame } from '../../../lib/designer-openings';

export function getStaticPaths() {
  return hallCodes.flatMap(code => openingViews.map(view => ({
    params: { frame: `${code}-${view.key}` }, props: { code, view },
  })));
}

export const GET: APIRoute = async ({ props }) => {
  const { image } = await openingFrame(props.code, props.view);
  return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/webp' } });
};
