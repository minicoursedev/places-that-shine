import { votingHallStoreWorkPreviews } from '../../lib/oshen-store-work-previews';

export function GET() {
  return Response.json(votingHallStoreWorkPreviews);
}
