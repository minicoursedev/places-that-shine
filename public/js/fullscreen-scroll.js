let active = false;
let frame = 0;

function holdScrollOffset() {
  const scroller = document.scrollingElement;
  if (window.scrollY < 1 && scroller?.scrollHeight > scroller?.clientHeight
      && (window.visualViewport?.scale ?? 1) === 1) {
    window.scrollTo({ top: 1, behavior: 'instant' });
  }
}

function scheduleScrollOffset() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    holdScrollOffset();
  });
}

function cancelScrollOffset() {
  cancelAnimationFrame(frame);
  frame = 0;
}

// A fixed view can start above the document's top edge for native WebView gestures.
export function setFullscreenScroll(enabled) {
  if (enabled === active) return;
  active = enabled;
  document.documentElement.toggleAttribute('data-fullscreen-scroll', active);
  if (active) {
    holdScrollOffset();
    scheduleScrollOffset();
    window.addEventListener('scroll', scheduleScrollOffset, { passive: true });
    window.addEventListener('resize', scheduleScrollOffset);
    window.visualViewport?.addEventListener('resize', scheduleScrollOffset);
    window.addEventListener('pageshow', scheduleScrollOffset);
    window.addEventListener('pagehide', cancelScrollOffset);
  } else {
    cancelScrollOffset();
    window.removeEventListener('scroll', scheduleScrollOffset);
    window.removeEventListener('resize', scheduleScrollOffset);
    window.visualViewport?.removeEventListener('resize', scheduleScrollOffset);
    window.removeEventListener('pageshow', scheduleScrollOffset);
    window.removeEventListener('pagehide', cancelScrollOffset);
  }
}
