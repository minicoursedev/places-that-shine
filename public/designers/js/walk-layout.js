// Horizontal positions are shared by the interactive walk and its static opening frame.
export const EXIT_W = 190;
const CROSS = 104;

export function placeIslands(aisles, singleRow, boothWidth) {
  const islands = [];
  let x = EXIT_W;
  function place(isl, side) {
    const x1 = x + isl.booths.length * boothWidth;
    islands.push({ isl, side, x0: x, x1 });
  }
  if (singleRow) {
    const groups = aisles.filter(isl => isl.booths.length);
    for (const [index, isl] of groups.entries()) {
      place(isl, 'N');
      x += isl.booths.length * boothWidth;
      if (index + 1 < groups.length) x += CROSS;
    }
  } else {
    const north = aisles.filter(isl => isl.side === 'N');
    const south = aisles.filter(isl => isl.side === 'S');
    const columns = Math.max(north.length, south.length);
    for (let i = 0; i < columns; i++) {
      for (const isl of [north[i], south[i]]) {
        if (isl?.booths.length) place(isl, isl.side);
      }
      x += Math.max(north[i]?.booths.length || 0, south[i]?.booths.length || 0) * boothWidth;
      if (i + 1 < columns) x += CROSS;
    }
  }
  return { islands, worldW: x + EXIT_W };
}

export const DESIGNER_BOOTH_WIDTH = 112;
export const NAMEPLATE_WIDTH = DESIGNER_BOOTH_WIDTH - 26;
export const NORTH_NAME_Y = 64.5;
export const southNameY = tableY => tableY - 12.5;

export function designerNameplatePositions(aisle, singleRow) {
  const positions = new Map();
  const { islands } = placeIslands(aisle.islands, singleRow, DESIGNER_BOOTH_WIDTH);
  for (const { isl, side, x0 } of islands) {
    for (const [index, booth] of isl.booths.entries()) {
      positions.set(booth.id, { x: x0 + (index + 0.5) * DESIGNER_BOOTH_WIDTH, side });
    }
  }
  return positions;
}
