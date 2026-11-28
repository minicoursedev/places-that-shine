import { workInHall } from '../../public/designers/js/products.js';
import { designerWorkSharePath } from '../../public/designers/js/work-links.js';
import { designerWorks } from './oshen-designers';

function buildStoreWorkPreviews(hallCode?: string) {
  return designerWorks.flatMap(({ designer, work }) => {
    const booth = designer.booth.hallBooths.find(({ aisle }) => {
      const code = aisle[0];
      return (hallCode ? code === hallCode : code !== 'A') && workInHall(work, code);
    });
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
}

export const storeWorkPreviews = buildStoreWorkPreviews();
export const votingHallStoreWorkPreviews = buildStoreWorkPreviews('V');
