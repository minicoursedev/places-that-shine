const storefront = 'M4 10v10h16V10 M3 10l2-6h14l2 6H3Z M9 20v-5h6v5';
const symbols = new Map([
  ['甜點飲料', 'M6 8h12l-2 12H8L6 8Z M5 8h14 M12 8l2-5h4 M9 12h6'],
  ['咖啡廳', 'M4 7h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Z M16 8h2a2 2 0 0 1 0 4h-2 M3 20h16'],
  ['小吃', 'M4 20 19 5 M7 12l2-2 4 4-2 2-4-4Z M11 8l2-2 4 4-2 2-4-4Z'],
  ['正餐', 'M5 3v6a3 3 0 0 0 6 0V3 M8 3v18 M18 3c-2 2-3 5-3 9h3 M18 3v18'],
  ['烘焙', 'M5 18c-2-1-2-5 1-8l5-5c4-4 10-1 10 3 0 3-5 8-10 11-3 2-5 1-6-1Z M8 9l3 3 M12 6l3 3 M5 13l3 3'],
  ['咖啡豆', 'M18 5c3 3 2 8-1 11s-8 4-11 1-2-8 1-11 8-4 11-1Z M17 5c-4 2-2 5-5 7-3 2-5 2-6 5'],
  ['酒吧', 'M5 4h14l-7 9L5 4Z M8 8h8 M12 13v7 M8 20h8'],
  ['書店', 'M12 6c-3-2-6-2-9-2v14c3 0 6 1 9 2 3-1 6-2 9-2V4c-3 0-6 0-9 2Z M12 6v14'],
  ['服飾鞋店', 'M8 4 3 7l2 5 3-1v9h8v-9l3 1 2-5-5-3a4 4 0 0 1-8 0Z'],
  ['印刷小組', 'M7 8V4h10v4 M7 17H4V8h16v9h-3 M7 14h10v6H7z M16 11h1'],
  ['3C 通訊', 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M11 17h2'],
  ['選物雜貨', 'M5 8h14l1 12H4L5 8Z M9 9V6a3 3 0 0 1 6 0v3'],
  ['運動用品', 'M20 12a8 8 0 1 1-16 0 8 8 0 1 1 16 0Z M4 12h16 M12 4v16 M7 6a8 8 0 0 1 0 12 M17 6a8 8 0 0 0 0 12'],
  ['花店', 'M12 15v6 M12 18c-3 0-5-1-6-3 M12 19c3 0 5-1 6-3 M12 6c-1-4-6-3-5 1-4 1-2 6 2 5 0 4 6 4 6 0 4 1 6-4 2-5 1-4-4-5-5-1Z M12 9h.01'],
  ['寵物', 'M8 14c2-3 6-3 8 0l2 3c1 2-1 4-3 3l-1-.5c-1-.5-3-.5-4 0l-1 .5c-2 1-4-1-3-3l2-3Z M4 10h.01 M8 6h.01 M16 6h.01 M20 10h.01'],
  ['美髮', 'M7 14 18 4 M7 10l11 10 M7 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 1 0 0 5Z M7 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 1 0 0 5Z'],
  ['桌遊', 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M8 8h.01 M12 12h.01 M16 16h.01'],
  ['日常生活', 'm3 11 9-7 9 7 M5 10v10h14V10 M10 20v-6h4v6'],
  ['洋流服務站', 'M5 20V5h14v15 M3 20h18 M9 20v-4h6v4 M9 9h.01 M15 9h.01 M9 12h.01 M15 12h.01'],
  ['農業', 'M12 20v-7 M12 14C6 14 4 10 4 6c5 0 8 3 8 8Z M12 14c0-5 3-8 8-9 0 5-3 9-8 9Z M8 20h8'],
  ['其它', storefront],
]);

const svgNamespace = 'http://www.w3.org/2000/svg';

export function storeCategoryIcon(category, verification) {
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('viewBox', '0 0 34 40');
  svg.setAttribute('aria-hidden', 'true');
  const outline = document.createElementNS(svgNamespace, 'path');
  outline.setAttribute('class', 'store-category-outline');
  outline.setAttribute('d', 'M8 2h18a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6h-4l-5 6-5-6H8a6 6 0 0 1-6-6V8a6 6 0 0 1 6-6Z');
  const symbol = document.createElementNS(svgNamespace, 'path');
  symbol.setAttribute('class', 'store-category-symbol');
  symbol.setAttribute('transform', 'translate(6 6) scale(.92)');
  symbol.setAttribute('d', symbols.get(category) || storefront);
  svg.append(outline, symbol);
  if (typeof verification === 'boolean') {
    const dot = document.createElementNS(svgNamespace, 'circle');
    dot.setAttribute('class', 'store-category-status');
    dot.setAttribute('cx', '28');
    dot.setAttribute('cy', '28');
    dot.setAttribute('r', '2.5');
    dot.setAttribute('fill', verification ? '#f82970' : '#42a656');
    svg.append(dot);
  }
  return svg;
}
