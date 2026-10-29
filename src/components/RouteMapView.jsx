import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

// Ключ и опции загрузчика должны совпадать с RouteMap.jsx и RouteMapEdit.jsx — иначе useJsApiLoader
// выбросит ошибку «Loader must not be called again with different options».
const GOOGLE_MAPS_API_KEY = 'AIzaSyDrGMTqk9G2O7bmZMKcK6a5BU7srhwvpR4';

const DEFAULT_CENTER = { lat: 40.18, lng: 44.51 };
const LINE_STYLE = { strokeColor: '#C17A82', strokeOpacity: 0.95, strokeWeight: 4 };

function dotIcon(fill, scale) {
  const g = window.google.maps;
  return { path: g.SymbolPath.CIRCLE, scale, fillColor: fill, fillOpacity: 1, strokeColor: '#C17A82', strokeWeight: 2 };
}

/** Убирает с карты всё, что нарисовали, и очищает список. */
function clearOverlays(overlays) {
  overlays.forEach((o) => o.setMap(null));
  overlays.length = 0;
}

function drawItems(map, items, overlays) {
  const g = window.google.maps;
  clearOverlays(overlays);
  const bounds = new g.LatLngBounds();

  for (const item of items) {
    for (const line of item.lines ?? []) {
      overlays.push(new g.Polyline({ map, path: line, clickable: false, ...LINE_STYLE }));
      line.forEach((p) => bounds.extend(p));
    }
    for (const pin of item.pins ?? []) {
      overlays.push(new g.Marker({ map, position: pin, icon: dotIcon('#fff', 5), clickable: false, zIndex: 2 }));
      bounds.extend(pin);
    }
    // Нет геометрии — рисуем хотя бы точку старта
    if (!item.lines?.length && item.start) {
      overlays.push(new g.Marker({ map, position: item.start, icon: dotIcon('#C17A82', 6), clickable: false, zIndex: 1 }));
      bounds.extend(item.start);
    }
  }

  if (bounds.isEmpty()) return false;
  map.fitBounds(bounds, 28);
  // fitBounds для одной точки даёт слишком близкий зум
  g.event.addListenerOnce(map, 'idle', () => {
    if (map.getZoom() > 16) map.setZoom(16);
  });
  return true;
}

/**
 * Карта только для просмотра: показывает маршруты (линии), маркеры и точки старта.
 *
 * Props:
 *  - items:        [{ lines: [[{lat, lng}]], pins: [{lat, lng}], start: {lat, lng} | null }]
 *  - labels:       { expand, collapse, loading, loadError, empty }
 *  - height:       высота карты в px
 *  - interactive:  false — карта не двигается и не зумится (для превью в списке)
 *  - expandable:   показывать кнопку «развернуть»
 */
export default function RouteMapView({
  items,
  labels,
  height = 240,
  interactive = true,
  expandable = true,
}) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const [expanded, setExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);

  const hasData = useMemo(
    () => items.some((it) => it.lines?.length || it.pins?.length || it.start),
    [items],
  );

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    drawItems(mapRef.current, items, overlaysRef.current);
  }, [items, mapReady]);

  // После изменения высоты карты просим Google пересчитать размер
  useEffect(() => {
    const map = mapRef.current;
    if (map) window.google.maps.event.trigger(map, 'resize');
  }, [expanded]);

  const options = useMemo(() => ({
    mapTypeId: 'terrain',
    mapTypeControl: interactive,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: interactive,
    gestureHandling: interactive ? 'greedy' : 'none',
    disableDefaultUI: !interactive,
    clickableIcons: false,
  }), [interactive]);

  const containerStyle = useMemo(
    () => ({ width: '100%', height: expanded ? '70vh' : `${height}px` }),
    [expanded, height],
  );

  const handleLoad = (map) => {
    mapRef.current = map;
    map.setCenter(DEFAULT_CENTER);
    map.setZoom(10);
    setMapReady(true);
  };

  const handleUnmount = () => {
    clearOverlays(overlaysRef.current);
    mapRef.current = null;
    setMapReady(false);
  };

  if (loadError) return <div className="error">{labels.loadError}</div>;
  if (!isLoaded) return <div className="muted">{labels.loading}</div>;

  return (
    <div className="mapwrap" style={{ position: 'relative' }}>
      {expandable && (
        <button
          type="button"
          className="map-expand"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? labels.collapse : labels.expand}
          title={expanded ? labels.collapse : labels.expand}
        >
          ⤢
        </button>
      )}
      <GoogleMap
        mapContainerStyle={containerStyle}
        options={options}
        onLoad={handleLoad}
        onUnmount={handleUnmount}
      />
      {!hasData && labels.empty && (
        <div
          className="muted"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12.5px',
            background: 'var(--sand)',
            borderRadius: 'var(--radius)',
            pointerEvents: 'none',
          }}
        >
          {labels.empty}
        </div>
      )}
    </div>
  );
}
