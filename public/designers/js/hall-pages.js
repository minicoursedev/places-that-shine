// Static share pages for halls with their own entry URL.
export const hallPages = [{
  code: 'A',
  name: '洋流愛好者館',
  path: '/designers/halls/amateurs/',
  title: '洋流愛好者館｜發光的設計師',
  description: '走進洋流愛好者館，瀏覽愛好者的作品、介紹與社群連結。',
  image: '/designers/assets/amateur-hall-og.jpg',
  alt: '洋流愛好者館逛攤畫面',
  width: 1200,
  height: 630,
  type: 'image/jpeg',
}, {
  code: 'S',
  name: '鏟子超人館',
  path: '/designers/halls/shovel-heroes/',
  title: '鏟子超人館｜發光的設計師',
  description: '2025 鏟子超人時期的設計師展館。',
  image: '/media/library/yuan-art-space/4.webp',
  alt: '鏟子超人館入口圖',
  width: 637,
  height: 800,
  type: 'image/webp',
}, {
  code: 'B',
  name: '青鳥行動館',
  path: '/designers/halls/bluebird-action/',
  title: '2024 青鳥行動館｜發光的設計師',
  description: '2024 青鳥行動的設計師展館。',
}];

export const hallPageForCode = code => hallPages.find(hall => hall.code === code) || null;
export const hallPageForPath = pathname => hallPages.find(hall => hall.path === pathname.replace(/\/?$/, '/')) || null;
