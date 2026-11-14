// Static share pages for halls with their own entry URL and preview image.
export const hallPages = [{
  code: 'A',
  name: '愛好者館',
  path: '/designers/halls/amateurs/',
  title: '愛好者館｜發光的設計師',
  description: '走進愛好者館，瀏覽愛好者的作品、介紹與社群連結。',
  image: '/designers/assets/amateur-hall-og.jpg',
  alt: '愛好者館逛攤畫面',
  width: 1200,
  height: 630,
  type: 'image/jpeg',
}];

export const hallPageForCode = code => hallPages.find(hall => hall.code === code) || null;
export const hallPageForPath = pathname => hallPages.find(hall => hall.path === pathname.replace(/\/?$/, '/')) || null;
