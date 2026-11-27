import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import baseStyle from '../assets/store-map/shortbread-colorful.json';

const HIDDEN_LAND_USES = ['retail', 'commercial', 'military'];
const HIDDEN_PLACE_SYMBOL_SOURCES = new Set(['pois', 'sites', 'public_transport']);

setWorkerUrl(workerUrl);

function withoutIconProperties(properties = {}) {
  return Object.fromEntries(Object.entries(properties).filter(([name]) => !name.startsWith('icon-')));
}

function hidePointIcons(layer) {
  const layout = layer.layout;
  if (layer.type !== 'symbol' || !layout?.['icon-image'] || (layout['symbol-placement'] ?? 'point') !== 'point') {
    return [layer];
  }
  if (!layout['text-field']) return [];
  const textLayout = withoutIconProperties(layout);
  delete textLayout['text-optional'];
  return [{ ...layer, layout: textLayout, paint: withoutIconProperties(layer.paint) }];
}

export function addStoreBasemap(map, onUnavailable, onLoad) {
  const visibleLandUse = ['!', ['in', ['get', 'kind'], ['literal', HIDDEN_LAND_USES]]];
  const layers = baseStyle.layers
    .filter(layer => layer.type !== 'symbol' || !HIDDEN_PLACE_SYMBOL_SOURCES.has(layer['source-layer']))
    .flatMap(hidePointIcons)
    .map(layer => {
      if (layer.type !== 'fill' || layer['source-layer'] !== 'land') return layer;
      return { ...layer, filter: layer.filter ? ['all', layer.filter, visibleLandUse] : visibleLandUse };
    });

  const layer = maplibreGL({ style: { ...baseStyle, layers }, prefetchZoomDelta: 0 });
  const removeLayer = layer.onRemove;
  // WebGL can fail before the adapter creates its MapLibre map.
  layer.onRemove = function (leafletMap) {
    if (this.getMaplibreMap()) removeLayer.call(this, leafletMap);
    else this.getContainer()?.remove();
  };

  try {
    layer.addTo(map);
  } catch (error) {
    if (map.hasLayer(layer)) map.removeLayer(layer);
    throw error;
  }

  const timer = setTimeout(onUnavailable, 15000);
  layer.getMaplibreMap().once('load', () => {
    clearTimeout(timer);
    onLoad();
  });
}
