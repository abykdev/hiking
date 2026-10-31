import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { gpx } from '@mapbox/togeojson';

// Ключ и опции загрузчика должны совпадать с RouteMap.jsx и RouteMapEdit.jsx — иначе useJsApiLoader
// выбросит ошибку «Loader must not be called again with different options».
const GOOGLE_MAPS_API_KEY = 'AIzaSyDrGMTqk9G2O7bmZMKcK6a5BU7srhwvpR4';

const DEFAULT_CENTER = { lat: 40.18, lng: 44.51 };
const LINE_STYLE = { strokeColor: '#C17A82', strokeOpacity: 0.95, strokeWeight: 5 };
const DEFAULT_EMOJI = '📍';

function textToGeoJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  const dom = new DOMParser().parseFromString(trimmed, 'text/xml');
  if (dom.querySelector('parsererror')) throw new Error('Invalid GPX');
  return gpx(dom);
}

function emojiIcon(emoji) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 36 36">' +
    '<circle cx="18" cy="18" r="16" fill="#fff" stroke="#8B5A62" stroke-width="2"/>' +
    `<text x="18" y="24" font-size="17" text-anchor="middle">${emoji.replace(/[<>&]/g, '')}</text></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}` };
}

function markerInfo(title, desc) {
  const box = document.createElement('div');
  box.style.cssText = 'max-width:210px;color:#2E1A1E;';
  const head = document.createElement('div');
  head.style.cssText = 'font-weight:700;font-size:14px;';
  head.textContent = title;
  box.append(head);
  if (desc) {
    const d = document.createElement('div');
    d.style.cssText = 'font-size:12.5px;margin-top:4px;line-height:1.4;';
    d.textContent = desc;
    box.append(d);
  }
  return box;
}

/** Рисует GeoJSON на карте, возвращает созданные объекты, чтобы их можно было убрать. */
function drawGeoJson(map, fc, info) {
  const g = window.google.maps;
  const overlays = [];
  const bounds = new g.LatLngBounds();
  const features =
    fc.type === 'FeatureCollection' ? fc.features ?? [] : fc.type === 'Feature' ? [fc] : [{ geometry: fc, properties: {} }];

  const addLine = (coords) => {
    const path = coords.map(([lng, lat]) => ({ lat, lng }));
    path.forEach((p) => bounds.extend(p));
    if (path.length) overlays.push(new g.Polyline({ map, path, clickable: false, ...LINE_STYLE }));
  };
  const addPoint = ([lng, lat], props = {}) => {
    const position = { lat, lng };
    bounds.extend(position);
    const emoji = typeof props.emoji === 'string' ? props.emoji : DEFAULT_EMOJI;
    const title = String(props.name ?? props.title ?? '');
    const desc = String(props.description ?? props.desc ?? '');
    const marker = new g.Marker({ map, position, icon: emojiIcon(emoji), zIndex: 50 });
    if (title || desc) {
      marker.addListener('click', () => {
        info.setContent(markerInfo(`${emoji} ${title}`, desc));
        info.open({ map, anchor: marker });
      });
    }
    overlays.push(marker);
  };

  for (const f of features) {
    const geom = f?.geometry;
    if (!geom) continue;
    if (geom.type === 'LineString') addLine(geom.coordinates);
    else if (geom.type === 'MultiLineString') geom.coordinates.forEach(addLine);
    else if (geom.type === 'Point') addPoint(geom.coordinates, f.properties);
    else if (geom.type === 'MultiPoint') geom.coordinates.forEach((c) => addPoint(c, f.properties));
  }

  if (!bounds.isEmpty()) map.fitBounds(bounds, 28);
  return overlays;
}

/**
 * Карта маршрута только для просмотра: без редактирования, но с зумом и перемещением.
 *
 * Props:
 *  - url:     адрес GPX/GeoJSON файла трека
 *  - labels:  { expand, collapse, loading, loadError, geometryLoadFailed }
 *  - height:  высота карты в px
 */
export default function RouteMapDetail({ url, labels, height = 220 }) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const [expanded, setExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const infoRef = useRef(null);

  useEffect(() => {
    if (!mapReady || !url) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const fc = textToGeoJson(await response.text());
        if (cancelled || !mapRef.current) return;
        overlaysRef.current.forEach((o) => o.setMap(null));
        infoRef.current ??= new window.google.maps.InfoWindow({ maxWidth: 240 });
        overlaysRef.current = drawGeoJson(mapRef.current, fc, infoRef.current);
        setGeoError(false);
      } catch (err) {
        console.error('Error loading route geometry:', err);
        if (!cancelled) setGeoError(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [url, mapReady]);

  // После изменения высоты карты просим Google пересчитать размер
  useEffect(() => {
    const map = mapRef.current;
    if (map) window.google.maps.event.trigger(map, 'resize');
  }, [expanded]);

  const options = useMemo(() => ({
    mapTypeId: 'terrain',
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true,
    gestureHandling: 'greedy',
    clickableIcons: false,
  }), []);

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
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    infoRef.current?.close();
    infoRef.current = null;
    mapRef.current = null;
    setMapReady(false);
  };

  if (loadError) return <div className="error">{labels.loadError}</div>;
  if (!isLoaded) return <div className="muted">{labels.loading}</div>;

  return (
    <div className="mapwrap" style={{ position: 'relative' }}>
      <button
        type="button"
        className="map-expand"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? labels.collapse : labels.expand}
        title={expanded ? labels.collapse : labels.expand}
      >
        ⤢
      </button>
      <GoogleMap
        mapContainerStyle={containerStyle}
        options={options}
        onLoad={handleLoad}
        onUnmount={handleUnmount}
      />
      {geoError && <div className="error" role="alert">{labels.geometryLoadFailed}</div>}
    </div>
  );
}
