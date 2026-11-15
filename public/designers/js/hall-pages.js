// Static share pages for halls with their own entry URL.
export const hallPages = [{
  code: 'A',
  name: '洋流愛好者館',
  path: '/designers/halls/amateurs/',
  title: '洋流愛好者館｜發光的設計師',
  description: '走進洋流愛好者館，瀏覽愛好者的作品、介紹與社群連結。',
  image: '/designers/assets/amateur-hall-a01-og.jpg',
  alt: '洋流愛好者館 A01 的前五攤：LiAn、Kyle Kuo、花花、Dizzy Duzz、chuck8031',
  width: 1200,
  height: 630,
  type: 'image/jpeg',
}, {
  code: 'S',
  name: '鏟子超人館',
  path: '/designers/halls/shovel-heroes/',
  title: '鏟子超人館｜發光的設計師',
  description: '2025 鏟子超人時期的設計師展館。',
  image: '/designers/assets/shovel-heroes-hall-og.jpg',
  alt: '鏟子超人館 S01 的沅藝術空間攤位',
  width: 1200,
  height: 630,
  type: 'image/jpeg',
}, {
  code: 'B',
  name: '青鳥行動',
  path: '/designers/halls/bluebird-action/',
  title: '2024 青鳥行動｜發光的設計師',
  description: '2024 青鳥行動的設計師展館。',
  image: '/designers/assets/bluebird-action-hall-og.jpg',
  alt: '青鳥行動 B01 的沅藝術空間與吳奕裴攤位',
  width: 1200,
  height: 630,
  type: 'image/jpeg',
}];

export const hallPageForCode = code => hallPages.find(hall => hall.code === code) || null;
export const hallPageForPath = pathname => hallPages.find(hall => hall.path === pathname.replace(/\/?$/, '/')) || null;
