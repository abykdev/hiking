import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { gpx } from '@mapbox/togeojson';

// Ключ и опции загрузчика должны совпадать с RouteMap.jsx — иначе useJsApiLoader
// выбросит ошибку «Loader must not be called again with different options».
const GOOGLE_MAPS_API_KEY = 'AIzaSyDrGMTqk9G2O7bmZMKcK6a5BU7srhwvpR4';

const DEFAULT_CENTER = { lat: 40.18, lng: 44.51 };
const LINE_STYLE = { strokeColor: '#C17A82', strokeOpacity: 0.95, strokeWeight: 5 };
const DEFAULT_EMOJI = '📍';

/* ------------------------------------------------------------------ */
/* Парсинг файлов маршрута                                              */
/* ------------------------------------------------------------------ */

/** GPX (текст) → GeoJSON FeatureCollection. Бросает Error при некорректном файле. */
function gpxTextToGeoJson(gpxText) {
  const dom = new DOMParser().parseFromString(gpxText, 'text/xml');
  if (dom.querySelector('parsererror')) throw new Error('Invalid GPX');
  const geoJson = gpx(dom);
  if (!geoJson?.features?.length) throw new Error('Empty GPX');
  return geoJson;
}

/** Текст файла (GPX или GeoJSON) → GeoJSON. Формат определяется по содержимому. */
function routeTextToGeoJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    if (!parsed?.type) throw new Error('Invalid GeoJSON');
    return parsed;
  }
  return gpxTextToGeoJson(trimmed);
}

/* ------------------------------------------------------------------ */
/* Внутренние функции (работают с контекстом ctx, а не с React-state)   */
/* ------------------------------------------------------------------ */

const eleKey = (lng, lat) => `${lng.toFixed(6)},${lat.toFixed(6)}`;

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat() - a.lat());
  const dLng = toRad(b.lng() - a.lng());
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat())) * Math.cos(toRad(b.lat())) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function emojiIcon(emoji, size = 36) {
  const g = window.google.maps;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36">` +
    `<circle cx="18" cy="18" r="16" fill="#fff" stroke="#8B5A62" stroke-width="2"/>` +
    `<text x="18" y="24" font-size="17" text-anchor="middle">${emoji.replace(/[<>&]/g, '')}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new g.Size(size, size),
    anchor: new g.Point(size / 2, size / 2),
  };
}

function dotIcon(fill) {
  const g = window.google.maps;
  return { path: g.SymbolPath.CIRCLE, scale: 6, fillColor: fill, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 };
}

function markerMeta(marker) {
  return marker.get('meta');
}

function buildResult(ctx) {
  const features = [];
  let points = 0;
  let km = 0;

  for (const line of ctx.lines) {
    const path = line.getPath().getArray();
    points += path.length;
    for (let i = 1; i < path.length; i++) km += haversineKm(path[i - 1], path[i]);
    if (path.length < 2) continue;
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: path.map((p) => {
          const lng = p.lng();
          const lat = p.lat();
          const ele = ctx.ele.get(eleKey(lng, lat));
          return ele === undefined ? [lng, lat] : [lng, lat, ele];
        }),
      },
    });
  }

  const markers = ctx.markers.map((marker) => {
    const pos = marker.getPosition();
    const m = markerMeta(marker);
    return { id: m.id, emoji: m.emoji, title: m.title, desc: m.desc, address: m.address, photo: m.photo, lat: pos.lat(), lng: pos.lng() };
  });

  for (const m of markers) {
    const properties = { name: m.title, emoji: m.emoji };
    if (m.desc) properties.description = m.desc;
    if (m.address) properties.address = m.address;
    if (m.photo) properties.photo = m.photo;
    features.push({ type: 'Feature', properties, geometry: { type: 'Point', coordinates: [m.lng, m.lat] } });
  }

  return {
    geojson: { type: 'FeatureCollection', features },
    stats: { points, markers: markers.length, km },
    markers,
  };
}

function refreshEnds(ctx) {
  ctx.ends.forEach((m) => m.setMap(null));
  ctx.ends = [];
  const g = window.google.maps;
  const line = ctx.lines[0];
  if (!line) return;
  const path = line.getPath().getArray();
  if (path.length) {
    ctx.ends.push(new g.Marker({ map: ctx.map, position: path[0], icon: dotIcon('#C9A6AE'), clickable: false, zIndex: 1 }));
  }
  if (path.length > 1) {
    ctx.ends.push(new g.Marker({ map: ctx.map, position: path[path.length - 1], icon: dotIcon('#D1495B'), clickable: false, zIndex: 1 }));
  }
}

function emit(ctx) {
  // Склеиваем серию событий (например, перетаскивание вершины) в одно уведомление за кадр
  if (ctx.emitScheduled) return;
  ctx.emitScheduled = true;
  requestAnimationFrame(() => {
    ctx.emitScheduled = false;
    if (!ctx.map) return;
    refreshEnds(ctx);
    ctx.onChange?.(buildResult(ctx));
  });
}

function removeLine(ctx, line) {
  line.setMap(null);
  ctx.lines = ctx.lines.filter((l) => l !== line);
}

function createLine(ctx, latLngs) {
  const line = new window.google.maps.Polyline({
    map: ctx.map,
    path: latLngs,
    editable: true,
    ...LINE_STYLE,
  });
  const path = line.getPath();
  const onPathChange = () => {
    if (path.getLength() === 0) removeLine(ctx, line);
    emit(ctx);
  };
  path.addListener('set_at', onPathChange);
  path.addListener('insert_at', onPathChange);
  path.addListener('remove_at', onPathChange);
  // Правый клик по вершине — удалить вершину
  line.addListener('contextmenu', (e) => {
    if (e.vertex !== undefined && e.vertex !== null) path.removeAt(e.vertex);
  });
  ctx.lines.push(line);
  return line;
}

/** Содержимое инфо-окна маркера. Всё через textContent — данные могут прийти из чужого файла. */
function buildMarkerInfo(ctx, marker) {
  const m = markerMeta(marker);
  const box = document.createElement('div');
  box.style.cssText = 'max-width:210px;font-family:inherit;color:#2E1A1E;';

  if (m.photo && /^data:image\//.test(m.photo)) {
    const img = document.createElement('img');
    img.src = m.photo;
    img.style.cssText = 'width:100%;max-height:130px;object-fit:cover;border-radius:8px;margin-bottom:6px;';
    box.append(img);
  }
  const title = document.createElement('div');
  title.style.cssText = 'font-weight:700;font-size:14px;';
  title.textContent = `${m.emoji} ${m.title}`;
  box.append(title);

  const pos = marker.getPosition();
  const addr = document.createElement('div');
  addr.style.cssText = 'font-size:12px;margin-top:3px;color:#8A6A70;line-height:1.35;';
  addr.textContent = `📍 ${m.address || `${pos.lat().toFixed(5)}, ${pos.lng().toFixed(5)}`}`;
  box.append(addr);

  if (m.desc) {
    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:12.5px;margin-top:4px;line-height:1.4;';
    desc.textContent = m.desc;
    box.append(desc);
  }

  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = ctx.labels.deleteMarker;
  del.style.cssText =
    'margin-top:6px;border:1px solid #C0504D;color:#C0504D;background:#fff;border-radius:8px;padding:3px 9px;font-size:12px;cursor:pointer;';
  del.addEventListener('click', () => {
    ctx.info?.close();
    ctx.onMarkerDelete?.(m.id);
  });
  box.append(del);
  return box;
}

function openMarkerInfo(ctx, marker) {
  if (!ctx.info) ctx.info = new window.google.maps.InfoWindow({ maxWidth: 240 });
  ctx.info.setContent(buildMarkerInfo(ctx, marker));
  ctx.info.open({ map: ctx.map, anchor: marker });
}

function createMarker(ctx, position, meta) {
  const full = {
    id: `m${++ctx.seq}`,
    emoji: meta.emoji || DEFAULT_EMOJI,
    title: meta.title || '',
    desc: meta.desc || '',
    address: meta.address || '',
    photo: meta.photo || null,
  };
  const marker = new window.google.maps.Marker({
    map: ctx.map,
    position,
    draggable: true,
    icon: emojiIcon(full.emoji),
    zIndex: 50,
  });
  marker.set('meta', full);
  marker.addListener('dragend', () => emit(ctx));
  marker.addListener('mouseover', () => {
    if (!ctx.infoPinned) openMarkerInfo(ctx, marker);
  });
  marker.addListener('mouseout', () => {
    if (!ctx.infoPinned) ctx.info?.close();
  });
  marker.addListener('click', () => {
    ctx.infoPinned = true;
    openMarkerInfo(ctx, marker);
  });
  ctx.markers.push(marker);
  return marker;
}

function removeMarkerById(ctx, id) {
  const marker = ctx.markers.find((m) => markerMeta(m).id === id);
  if (!marker) return;
  marker.setMap(null);
  ctx.markers = ctx.markers.filter((m) => m !== marker);
  ctx.info?.close();
  ctx.infoPinned = false;
  emit(ctx);
}

function setPending(ctx, pos, emoji) {
  if (!pos) {
    ctx.pendingMarker?.setMap(null);
    ctx.pendingMarker = null;
    return;
  }
  const g = window.google.maps;
  if (!ctx.pendingMarker) {
    ctx.pendingMarker = new g.Marker({ map: ctx.map, clickable: false, zIndex: 60, opacity: 0.7 });
  }
  ctx.pendingMarker.setPosition(pos);
  ctx.pendingMarker.setIcon(emojiIcon(emoji || DEFAULT_EMOJI));
}

function clearLines(ctx) {
  ctx.lines.forEach((l) => l.setMap(null));
  ctx.lines = [];
  ctx.history = [];
  ctx.ele = new Map();
}

function clearMarkers(ctx) {
  ctx.markers.forEach((m) => m.setMap(null));
  ctx.markers = [];
  ctx.info?.close();
  ctx.infoPinned = false;
}

function handleMapClick(ctx, e) {
  if (!e.latLng) return;
  if (ctx.infoPinned) {
    ctx.infoPinned = false;
    ctx.info?.close();
  }
  if (ctx.mode === 'pin') {
    ctx.onPinRequest?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    return;
  }
  const line = ctx.lines[ctx.lines.length - 1] ?? createLine(ctx, []);
  line.getPath().push(e.latLng);
  ctx.history.push({ line });
  emit(ctx);
}

function undoPoint(ctx) {
  while (ctx.history.length) {
    const { line } = ctx.history.pop();
    if (!ctx.lines.includes(line)) continue;
    const path = line.getPath();
    if (path.getLength() > 0) {
      path.removeAt(path.getLength() - 1); // само вызовет emit
      return;
    }
  }
}

/** Загружает GeoJSON: линия заменяется всегда, маркеры — только если replaceMarkers. */
function loadGeoJson(ctx, fc, replaceMarkers) {
  clearLines(ctx);
  if (replaceMarkers) clearMarkers(ctx);

  const g = window.google.maps;
  const bounds = new g.LatLngBounds();
  const features =
    fc.type === 'FeatureCollection' ? fc.features ?? [] : fc.type === 'Feature' ? [fc] : [{ geometry: fc, properties: {} }];

  const addLine = (coords) => {
    const latLngs = coords.map(([lng, lat, ele]) => {
      if (ele !== undefined && ele !== null) ctx.ele.set(eleKey(lng, lat), ele);
      const ll = new g.LatLng(lat, lng);
      bounds.extend(ll);
      return ll;
    });
    if (latLngs.length) createLine(ctx, latLngs);
  };
  const addPoint = ([lng, lat], props = {}) => {
    const ll = new g.LatLng(lat, lng);
    bounds.extend(ll);
    createMarker(ctx, ll, {
      emoji: typeof props.emoji === 'string' ? props.emoji : DEFAULT_EMOJI,
      title: String(props.name ?? props.title ?? ''),
      desc: String(props.description ?? props.desc ?? ''),
      address: String(props.address ?? ''),
      photo: typeof props.photo === 'string' && props.photo.startsWith('data:image/') ? props.photo : null,
    });
  };

  for (const f of features) {
    const geom = f?.geometry;
    if (!geom) continue;
    if (geom.type === 'LineString') addLine(geom.coordinates);
    else if (geom.type === 'MultiLineString') geom.coordinates.forEach(addLine);
    else if (geom.type === 'Point') addPoint(geom.coordinates, f.properties);
    else if (geom.type === 'MultiPoint') geom.coordinates.forEach((c) => addPoint(c, f.properties));
  }

  ctx.markers.forEach((m) => bounds.extend(m.getPosition()));
  if (!bounds.isEmpty()) ctx.map.fitBounds(bounds, 28);
  ctx.centered = true;
  emit(ctx);
}

/* ------------------------------------------------------------------ */
/* Компонент                                                            */
/* ------------------------------------------------------------------ */

/**
 * Редактор маршрута на Google-карте.
 *
 * Props:
 *  - mode:            'route' | 'pin' — что делает клик по карте (добавляет точку линии / запрашивает маркер)
 *  - onChange:        ({ geojson, stats: { points, markers, km }, markers }) => void
 *  - onPinRequest:    ({ lat, lng }) => void — клик по карте в режиме 'pin' (родитель показывает форму маркера)
 *  - onMarkerDelete:  (markerId) => void — запрос удаления из инфо-окна маркера
 *  - labels:          { deleteMarker, expand, collapse, loading, loadError }
 *  - center:          { lat, lng } — начальный центр (например, геопозиция пользователя)
 *  - ref:             императивный API:
 *      loadText(text, { replaceMarkers })  — GPX/GeoJSON; бросает Error для некорректного файла
 *      undo()  clear()  — отменить последнюю точку / очистить линию маршрута
 *      addMarker({ lat, lng, emoji, title, desc, address, photo })
 *      removeMarker(id)
 *      setPending(pos | null, emoji)       — полупрозрачный маркер «в процессе создания»
 *
 * Редактирование линии: клик по карте — добавить точку; перетащить вершину — сдвинуть;
 * потянуть середину сегмента — вставить вершину; правый клик по вершине — удалить.
 * Маркеры можно перетаскивать; наведение/клик показывает карточку маркера.
 */
export default function RouteMapEdit({
  ref,
  mode = 'route',
  onChange,
  onPinRequest,
  onMarkerDelete,
  labels,
  center,
  height = 300,
}) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const [expanded, setExpanded] = useState(false);

  const ctxRef = useRef({
    map: null,
    lines: [],
    markers: [],
    ends: [],
    history: [],
    ele: new Map(),
    info: null,
    infoPinned: false,
    pendingMarker: null,
    pendingLoad: null,
    centered: false,
    seq: 0,
    emitScheduled: false,
    mode,
    onChange,
    onPinRequest,
    onMarkerDelete,
    labels,
  });

  useEffect(() => {
    const ctx = ctxRef.current;
    ctx.mode = mode;
    ctx.onChange = onChange;
    ctx.onPinRequest = onPinRequest;
    ctx.onMarkerDelete = onMarkerDelete;
    ctx.labels = labels;
  });

  useImperativeHandle(ref, () => ({
    loadText(text, { replaceMarkers = false } = {}) {
      const fc = routeTextToGeoJson(text);
      const ctx = ctxRef.current;
      if (!ctx.map) ctx.pendingLoad = { fc, replaceMarkers };
      else loadGeoJson(ctx, fc, replaceMarkers);
    },
    undo() {
      if (ctxRef.current.map) undoPoint(ctxRef.current);
    },
    clear() {
      const ctx = ctxRef.current;
      if (!ctx.map) return;
      clearLines(ctx);
      emit(ctx);
    },
    addMarker({ lat, lng, ...meta }) {
      const ctx = ctxRef.current;
      if (!ctx.map) return;
      createMarker(ctx, new window.google.maps.LatLng(lat, lng), meta);
      emit(ctx);
    },
    removeMarker(id) {
      const ctx = ctxRef.current;
      if (ctx.map) removeMarkerById(ctx, id);
    },
    setPending(pos, emoji) {
      const ctx = ctxRef.current;
      if (ctx.map) setPending(ctx, pos, emoji);
    },
  }), []);

  // Центрируем карту на геопозиции, пока пользователь ещё ничего не нарисовал
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx.map || !center || ctx.centered) return;
    ctx.map.setCenter(center);
    ctx.map.setZoom(14);
    ctx.centered = true;
  }, [center, isLoaded]);

  // После изменения высоты карты просим Google пересчитать размер
  useEffect(() => {
    const map = ctxRef.current.map;
    if (map) window.google.maps.event.trigger(map, 'resize');
  }, [expanded]);

  const options = useMemo(() => ({
    mapTypeId: 'terrain',
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    gestureHandling: 'greedy',
    draggableCursor: 'crosshair',
  }), []);

  const containerStyle = useMemo(
    () => ({ width: '100%', height: expanded ? '70vh' : `${height}px` }),
    [expanded, height],
  );

  const handleLoad = (map) => {
    const ctx = ctxRef.current;
    ctx.map = map;
    map.setCenter(center ?? DEFAULT_CENTER);
    map.setZoom(center ? 14 : 12);
    if (center) ctx.centered = true;
    map.addListener('click', (e) => handleMapClick(ctx, e));
    if (ctx.pendingLoad) {
      loadGeoJson(ctx, ctx.pendingLoad.fc, ctx.pendingLoad.replaceMarkers);
      ctx.pendingLoad = null;
    }
  };

  const handleUnmount = () => {
    const ctx = ctxRef.current;
    if (ctx.map) window.google.maps.event.clearInstanceListeners(ctx.map);
    clearLines(ctx);
    clearMarkers(ctx);
    ctx.ends.forEach((m) => m.setMap(null));
    ctx.ends = [];
    setPending(ctx, null);
    ctx.map = null;
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
    </div>
  );
}
