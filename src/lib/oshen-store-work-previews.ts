import { designerWorkSharePath } from '../../public/designers/js/work-links.js';
import { designerWorks } from './oshen-designers';

export const storeWorkPreviews = designerWorks.flatMap(({ designer, work }) => {
  const booth = designer.booth.hallBooths.find(({ aisle }) => aisle[0] !== 'A');
  if (!booth || work.id === 'yang-liu-avatar') return [];
  return [{
    designerName: designer.name,
    label: work.name.trim() || `${designer.name}的作品`,
    href: designerWorkSharePath(designer.id, work.id, booth.aisle[0]),
    image: work.cover,
    width: work.width,
    height: work.height,
  }];
});
