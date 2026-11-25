export const stageBase = '/stage/';
export const oshenStagePath = `${stageBase}halls/oshen/`;
export const publicHallId = 'public-stage';
const legacyRoot = '/puma_oshen_wave/stage/';
const idPattern = '[a-z0-9]+(?:-[a-z0-9]+)*';
const validId = new RegExp(`^${idPattern}$`);
const hallRoute = new RegExp(`^${oshenStagePath.slice(0, -1)}(?:/(${idPattern}))?/?$`);
const videoRoute = new RegExp(`^${stageBase}videos/(${idPattern})/?$`);
const legacyRoute = new RegExp(`^${legacyRoot.slice(0, -1)}(?:/(halls|videos)/(${idPattern}))?/?$`);
const aisleCode = /^[A-Z]+\d{2,}$/;
const boothCode = /^[A-Z]+\d{2,}-\d{2,}$/;

export function stageHallPath(hallId = publicHallId, { mode, aisle, booth } = {}) {
  const path = hallId === publicHallId ? oshenStagePath : `${oshenStagePath}${encodeURIComponent(hallId)}/`;
  const query = new URLSearchParams();
  if (mode === 'list' || mode === 'map') query.set('view', mode);
  if (booth) query.set('booth', booth);
  else if (aisle) query.set('aisle', aisle);
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}

export const stageVideoPath = videoId => `${stageBase}videos/${encodeURIComponent(videoId)}/`;

export function resolveStageRoute(url) {
  const hall = url.pathname.match(hallRoute);
  const video = url.pathname.match(videoRoute);
  const legacy = url.pathname.match(legacyRoute);
  const currentHall = hall?.[1] || (legacy?.[1] === 'halls' ? legacy[2] : publicHallId);
  const [oldMode, oldTarget] = url.hash.replace(/^#\/?/, '').split('/');
  const migrate = Boolean(legacy || ['walk', 'list', 'map', 'stage'].includes(oldMode));
  if (oldMode === 'stage' && validId.test(oldTarget || '')) return { videoId: oldTarget, migrate };
  if (oldMode === 'walk') {
    const position = oldTarget || '';
    return {
      hallId: currentHall, mode: 'walk', migrate, legacyPosition: true,
      ...(boothCode.test(position) ? { booth: position } : aisleCode.test(position) ? { aisle: position } : {}),
    };
  }
  if (oldMode === 'list' || oldMode === 'map') {
    return { hallId: validId.test(oldTarget || '') ? oldTarget : currentHall, mode: oldMode, migrate };
  }
  if (video || legacy?.[1] === 'videos') return { videoId: video?.[1] || legacy[2], migrate };
  const view = url.searchParams.get('view');
  const aisle = url.searchParams.get('aisle') || '';
  const booth = url.searchParams.get('booth') || '';
  return {
    hallId: currentHall, mode: view === 'list' || view === 'map' ? view : 'walk', migrate,
    ...(boothCode.test(booth) ? { booth } : aisleCode.test(aisle) ? { aisle } : {}),
    bareLegacyHome: Boolean(legacy && !legacy[1] && !url.search && !url.hash),
  };
}

export function stagePageMetadata({ stage, hall } = {}) {
  if (stage) {
    return {
      title: `${stage.title}｜${stage.creator}｜洋流舞台`,
      description: `${stage.creator}的《${stage.title}》。${stage.description || '在洋流舞台觀看影片與探索作者作品。'}`,
      path: stageVideoPath(stage.id),
    };
  }
  if (hall && hall.id !== publicHallId) {
    return {
      title: `${hall.name}｜洋流舞台`,
      description: `走進${hall.name}，在洋流舞台探索影片與作者作品。`,
      path: stageHallPath(hall.id),
    };
  }
  return {
    title: '2026 洋流舞台｜發光的地方',
    description: '走進洋流舞台，點一座舞台，看一部影片。',
    path: oshenStagePath,
  };
}
