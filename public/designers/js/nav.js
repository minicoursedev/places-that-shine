// Move between designer aisles and resolve share links.
import { designerWalkPath, updateDesignerMetadata } from './routes.js?v=20261116-oshen-websites-hall';
import { state, emit, toast } from './state.js';
import { loadAisle, aisleOfBooth, hallOf, isOshenHall } from './data.js?v=20261117-secondary-instagram';

const hallOfIndex = code => state.index.halls.find(h => h.code === hallOf(code));

export { designerBoothUrl } from './routes.js?v=20261116-oshen-websites-hall';

export function aisleNeighbors(code) {
  const currentHall = hallOf(code);
  const list = state.index.halls
    .filter(hall => isOshenHall(currentHall) ? isOshenHall(hall.code) : hall.code === currentHall)
    .flatMap(hall => hall.aisles);
  const i = list.findIndex(a => a.code === code);
  return {
    prev: i > 0 ? list[i - 1].code : null,
    next: i >= 0 ? list[i + 1]?.code || null : null,
  };
}

// A missing aisle or network error returns false and shows a message.
export async function goToAisle(code, { boothId = null, from = null } = {}) {
  try {
    if (!hallOfIndex(code)) { toast('找不到這條走道'); return false; }
    const data = await loadAisle(code);
    state.aisleCode = code;
    state.aisle = data;
    state.hallCode = data.hall;
    emit('aisle', { code, data, boothId, from, ...aisleNeighbors(code) });
    history.replaceState(null, '', designerWalkPath(code, boothId));
    updateDesignerMetadata();
    return true;
  } catch (e) {
    if (e.status === 404) toast('找不到這條走道，名單可能剛更新過');
    else toast('換走道失敗，請再試一次');
    return false;
  }
}

export const goToBooth = boothId => goToAisle(aisleOfBooth(boothId), { boothId });
