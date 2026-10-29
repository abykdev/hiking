import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gpx } from '@mapbox/togeojson';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../../api/client';

/* ------------------------------ Геометрия ------------------------------ */

// Достаём из GeoJSON линии и точки (маркеры). Координаты GeoJSON: [lng, lat].
function extractGeometry(geo) {
  const lines = [];
  const pins = [];
  const visit = (g) => {
    if (!g) return;
    if (g.type === 'FeatureCollection') g.features?.forEach(visit);
    else if (g.type === 'Feature') visit(g.geometry);
    else if (g.type === 'GeometryCollection') g.geometries?.forEach(visit);
    else if (g.type === 'LineString') lines.push(g.coordinates);
    else if (g.type === 'MultiLineString') g.coordinates.forEach((c) => lines.push(c));
    else if (g.type === 'Point') pins.push(g.coordinates);
  };
  visit(geo);
  return {
    lines: lines
      .map((l) => l.map(([lng, lat]) => ({ lat, lng })))
      .filter((l) => l.length >= 2),
    pins: pins.map(([lng, lat]) => ({ lat, lng })),
  };
}

async function loadRouteGeometry(route) {
  const url = route.geojson_url ?? route.gpx_url;
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  if (route.geojson_url) return extractGeometry(JSON.parse(text));
  const dom = new DOMParser().parseFromString(text, 'text/xml');
  return extractGeometry(gpx(dom));
}

// Данные для карты одного маршрута: геометрия (если уже загружена) и точка старта
function routeItem(route, geoms) {
  return {
    lines: geoms[route.id]?.lines ?? [],
    pins: geoms[route.id]?.pins ?? [],
    start:
      route.start_lat != null && route.start_lon != null
        ? { lat: Number(route.start_lat), lng: Number(route.start_lon) }
        : null,
  };
}

// Простая проекция в рамку SVG: широту сжимаем на cos(lat), чтобы не растягивать карту
function makeProjector(points, W, H, pad) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);
  // Один маршрут-точка или очень маленький — даём небольшой запас вокруг
  if (maxLat - minLat < 0.002 && maxLng - minLng < 0.002) {
    const cLat = (minLat + maxLat) / 2;
    const cLng = (minLng + maxLng) / 2;
    minLat = cLat - 0.01;
    maxLat = cLat + 0.01;
    minLng = cLng - 0.01;
    maxLng = cLng + 0.01;
  }
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180) || 1;
  const spanX = (maxLng - minLng) * k;
  const spanY = maxLat - minLat;
  const scale = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const offX = (W - spanX * scale) / 2;
  const offY = (H - spanY * scale) / 2;
  return (p) => ({
    x: offX + (p.lng - minLng) * k * scale,
    y: offY + (maxLat - p.lat) * scale,
  });
}

// Схематичная карта: линии маршрутов и маркеры. items: [{ lines, pins, start }]
function RoutesSvg({ items, height, emptyText }) {
  const W = 300;
  const H = height;
  const pad = 22;

  const all = items.flatMap((it) => [
    ...it.lines.flat(),
    ...it.pins,
    ...(it.start ? [it.start] : []),
  ]);

  if (!all.length) {
    return (
      <div
        className="muted"
        style={{
          height: H,
          background: 'var(--sand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12.5px',
          borderRadius: 'var(--radius)',
        }}
      >
        {emptyText}
      </div>
    );
  }

  const project = makeProjector(all, W, H, pad);
  const pathD = (line) =>
    line
      .map((p, i) => {
        const q = project(p);
        return `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <div style={{ height: H, background: 'var(--sand)', borderRadius: 'var(--radius)' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        {items.map((it, i) => (
          <g key={i}>
            {it.lines.map((line, j) => (
              <path
                key={j}
                d={pathD(line)}
                fill="none"
                stroke="#C17A82"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity=".9"
              />
            ))}
            {it.pins.map((p, j) => {
              const q = project(p);
              return (
                <circle
                  key={`p${j}`}
                  cx={q.x}
                  cy={q.y}
                  r="5"
                  fill="#fff"
                  stroke="#C17A82"
                  strokeWidth="2"
                />
              );
            })}
            {/* Нет геометрии — рисуем хотя бы точку старта */}
            {!it.lines.length && it.start && (
              <circle
                cx={project(it.start).x}
                cy={project(it.start).y}
                r="6"
                fill="#C17A82"
                stroke="#fff"
                strokeWidth="2"
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* --------------------------------- Экран -------------------------------- */

export function MyRoutesScreen() {
  const { t, i18n } = useTranslation('myRoutes');
  const { user } = useAuth();
  const userId = user?.id;

  const [routes, setRoutes] = useState([]);
  const [geoms, setGeoms] = useState({}); // id маршрута → { lines, pins }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Кнопки пока заглушки — навигацию и действия подключим отдельно
  const onRecordRoute = () => {};
  const onCreateRoute = () => {};
  const onOpenDetails = () => {};
  const onFollowRoute = () => {};
  const onSchedule = () => {};
  const onDeleteRoute = () => {};

  // Список маршрутов текущего пользователя
  useEffect(() => {
    if (userId == null) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({ user_id: String(userId), lang: i18n.language });
        const { res } = await apiFetch(`/api/routes?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setRoutes(Array.isArray(data) ? data : (data.routes ?? []));
      } catch (err) {
        console.error('Error loading routes:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [userId, i18n.language]);

  // Геометрия маршрутов для карт. Ошибка одного файла не ломает остальные.
  useEffect(() => {
    let cancelled = false;
    routes.forEach(async (route) => {
      try {
        const geom = await loadRouteGeometry(route);
        if (geom && !cancelled) setGeoms((prev) => ({ ...prev, [route.id]: geom }));
      } catch (err) {
        console.error('Error loading route geometry:', route.id, err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [routes]);

  const overviewItems = useMemo(
    () => routes.map((route) => routeItem(route, geoms)),
    [routes, geoms],
  );

  const statsLine = (route) =>
    `${((route.length_m ?? 0) / 1000).toFixed(1)} ${t('kmShort')} · +${route.elevation_gain_m ?? 0} ${t('mShort')}`;

  return (
    <div>
      <h2 style={{ fontSize: '22px' }}>{t('title')}</h2>

      <div style={{ position: 'relative' }}>
        <RoutesSvg items={overviewItems} height={240} emptyText={t('mapEmpty')} />
        <button
          type="button"
          className="fab map-overlay"
          style={{ position: 'absolute', right: '10px', bottom: '10px' }}
          onClick={onRecordRoute}
        >
          {t('recordRoute')}
        </button>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: '12px' }}
        onClick={onCreateRoute}
      >
        {t('createRoute')}
      </button>

      <div className="section-title">{t('sectionTitle')}</div>

      {loading && <div className="muted">{t('loading')}</div>}
      {error && (
        <div className="error" role="alert">
          {t('loadFailed')}
        </div>
      )}
      {!loading && !error && routes.length === 0 && <p className="muted">{t('noRoutes')}</p>}

      {routes.map((route) => {
        const item = routeItem(route, geoms);
        const pointsCount = item.lines.reduce((sum, l) => sum + l.length, 0);
        return (
          <div key={route.id} className="card" style={{ marginBottom: '10px' }}>
            <div style={{ cursor: 'pointer' }} onClick={() => onOpenDetails(route)}>
              <RoutesSvg items={[item]} height={130} emptyText={t('mapEmpty')} />
            </div>

            <div className="space-between" style={{ marginTop: '8px' }}>
              <div
                style={{ fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                onClick={() => onOpenDetails(route)}
              >
                {route.name}
              </div>
            </div>

            <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
              {statsLine(route)}
              {pointsCount > 0 && ` · ${pointsCount} ${t('pointsCount')}`}
              {item.pins.length > 0 && ` · ${item.pins.length} 📍`}
            </div>

            {route.description && (
              <div style={{ fontSize: '13px', marginTop: '6px' }}>{route.description}</div>
            )}

            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginTop: '10px', width: '100%' }}
              onClick={() => onOpenDetails(route)}
            >
              {t('openDetails')}
            </button>
            <div className="row" style={{ gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={() => onFollowRoute(route)}
              >
                {t('followRoute')}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ flex: 1 }}
                onClick={() => onSchedule(route)}
              >
                {t('schedule')}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginTop: '8px', borderColor: 'var(--alert)', color: 'var(--alert)' }}
              onClick={() => onDeleteRoute(route)}
            >
              {t('deleteRoute')}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default MyRoutesScreen;
