import { designerHallRoot, designerPath, designerViewPath, designerWalkPath } from './routes.js?v=20261126-vote-hall';
import { hallPageForCode } from './hall-pages.js?v=20261126-vote-hall';

// Resolve old bookmarks before forwarding them to the current static pages.
export function legacyDesignerDestination(url, fallbackHallCode = 'O') {
  const [mode, target, action] = url.hash.replace(/^#\/?/, '').split('/');
  let path;
  if (mode === 'walk') {
    const match = /^([A-Z]\d{2})(-\d{2})?$/.exec(target || '');
    const aisle = match?.[1];
    path = aisle && hallPageForCode(aisle[0])
      ? designerWalkPath(aisle, match[2] ? target : null)
      : designerHallRoot(fallbackHallCode);
  } else if (mode === 'list' || mode === 'map') {
    path = designerViewPath(`${fallbackHallCode}01`, mode);
  } else if (mode === 'designer' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target || '')) {
    path = designerPath(target);
  } else {
    return null;
  }
  const destination = new URL(path, url);
  if (mode === 'walk' && action === 'open' && destination.searchParams.has('booth')) destination.searchParams.set('open', '1');
  for (const [key, value] of url.searchParams) {
    if (!['view', 'booth', 'open'].includes(key)) destination.searchParams.append(key, value);
  }
  return destination;
}
