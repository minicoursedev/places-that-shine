import { workInHall } from '../../public/designers/js/products.js';
import { designerWorkSharePath } from '../../public/designers/js/work-links.js';
import { designerWorks } from './oshen-designers';

const votingHallCode = 'V';

export const votingHallStoreWorkPreviews = designerWorks.flatMap(({ designer, work }) => {
  const hasVotingHallBooth = designer.booth.hallBooths.some(({ aisle }) => aisle[0] === votingHallCode);
  if (!hasVotingHallBooth || !workInHall(work, votingHallCode) || work.id === 'yang-liu-avatar') return [];
  return [{
    designerName: designer.name,
    label: work.name.trim() || `${designer.name}的作品`,
    href: designerWorkSharePath(designer.id, work.id, votingHallCode),
    image: work.cover,
    width: work.width,
    height: work.height,
  }];
});
