import type { APIRoute } from 'astro';
import { stageOpeningFrame, stageOpeningFrameName, stageOpeningHalls, stageOpeningViews } from '../../../lib/stage-opening';

export function getStaticPaths() {
  return stageOpeningHalls.flatMap(hallId => stageOpeningViews.map(view => ({
    params: { frame: stageOpeningFrameName(hallId, view) }, props: { hallId, view },
  })));
}

export const GET: APIRoute = async ({ props }) => {
  const { image } = await stageOpeningFrame(props.hallId, props.view);
  return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/webp' } });
};
