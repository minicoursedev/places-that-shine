import { stageHallPath, stageVideoPath } from './routes.js';

export const STAGE_EXIT_WIDTH = 190;
export const STAGE_WIDTH = 224;
export const STAGE_SCREEN = { y: 56, width: 160, height: 90 };
export const STAGE_TITLE = { y: 159, width: 200, height: 16 };
export const STAGE_AUTHOR = { y: 187.5, width: 168, height: 14 };

export function stageWorldWidth(aisle) {
  return STAGE_EXIT_WIDTH * 2 + STAGE_WIDTH * (aisle.islands[0]?.booths.length || 0);
}

export function stageVideoLinks(stage) {
  const video = stageVideoPath(stage.id);
  const hall = stage.sourceHallId || stage.hallId;
  const author = stage.socials.length === 1 ? stage.socials[0].url
    : hall === 'public-stage' ? video : stageHallPath(hall);
  return { video, author };
}

function label(link, text, href) {
  link.textContent = text;
  link.href = href;
}

function buildLabel(stage, booth, centerX) {
  const wrapper = document.createElement('div');
  wrapper.dataset.booth = booth.id;
  wrapper.dataset.stageId = stage.id;
  wrapper.style.setProperty('--scene-booth-x', centerX);
  const links = stageVideoLinks(stage);

  if (stage.video.poster) {
    const screen = document.createElement('a');
    screen.className = 'stage-scene-poster';
    screen.tabIndex = -1;
    screen.setAttribute('aria-label', stage.title);
    screen.href = links.video;
    screen.style.setProperty('--stage-poster', `url(${JSON.stringify(stage.video.poster)})`);
    wrapper.append(screen);
  }

  const title = document.createElement('a');
  title.className = 'stage-scene-title';
  label(title, stage.title, links.video);
  wrapper.append(title);
  if (stage.creator) {
    const author = document.createElement('a');
    author.className = 'stage-scene-author';
    label(author, stage.creator, links.author);
    wrapper.append(author);
  }
  return wrapper;
}

export function bindStageLabels(root, callbacks) {
  let previous;
  let camera;
  let labels = new Map();
  function click(event) {
    const link = event.target.closest('a');
    const booth = link?.parentElement.dataset.booth;
    if (!booth || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (link.classList.contains('stage-scene-author')) callbacks.onCreator(booth);
    else callbacks.onOpen(booth);
  }
  root.addEventListener('click', click);

  return {
    position(aisle, booths, camX, scale, offY, viewportWidth, nearId) {
      if (previous !== aisle) {
        labels = new Map(Array.from(root.children, node => [node.dataset.booth, node]));
        const elements = booths.flatMap(({ b, cx }) => {
          const stage = callbacks.resolveStage(b.id);
          if (!stage) return [];
          const existing = labels.get(b.id);
          return [existing?.dataset.stageId === stage.id ? existing : buildLabel(stage, b, cx)];
        });
        root.replaceChildren(...elements);
        labels = new Map(elements.map(node => [node.dataset.booth, node]));
        previous = aisle;
        camera = null;
      }
      if (camera?.camX === camX && camera.scale === scale && camera.offY === offY &&
        camera.viewportWidth === viewportWidth && camera.nearId === nearId) return;
      camera = { camX, scale, offY, viewportWidth, nearId };
      root.style.setProperty('--live-scene-scale', scale + 'px');
      root.style.setProperty('--live-scene-left', (-camX * scale) + 'px');
      root.style.setProperty('--live-scene-top', offY + 'px');
      const right = camX + viewportWidth / scale;
      for (const { b, cx } of booths) {
        const node = labels.get(b.id);
        if (!node) continue;
        node.classList.toggle('is-near', b.id === nearId);
        const tabIndex = cx >= camX && cx <= right ? 0 : -1;
        for (const label of node.querySelectorAll('.stage-scene-title, .stage-scene-author')) {
          if (label.tabIndex !== tabIndex) label.tabIndex = tabIndex;
        }
      }
    },
    destroy() { root.removeEventListener('click', click); },
  };
}
