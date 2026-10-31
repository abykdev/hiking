import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gpx } from '@mapbox/togeojson';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../../api/client';
import RouteMapView from '../RouteMapView';

const PAGE_SIZE = 3;

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

/* --------------------------------- Экран -------------------------------- */

export function MyRoutesScreen({ navigate }) {
  const { t, i18n } = useTranslation('myRoutes');
  const { user } = useAuth();
  const userId = user?.id;

  const [routes, setRoutes] = useState([]);
  const [geoms, setGeoms] = useState({}); // id маршрута → { lines, pins }
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showToTop, setShowToTop] = useState(false);
  const [error, setError] = useState(false);
  const screenRef = useRef(null);
  const requestedGeoms = useRef(new Set());

  // Кнопки пока заглушки — навигацию и действия подключим отдельно
  const onRecordRoute = () => {};
  const onCreateRoute = () => {};
  const onOpenDetails = (route) => {go('myRouteDetail',{id: route.id})};
  const onFollowRoute = () => {};
  const onSchedule = (route) => {go('addEvent',{route})};
  const onDeleteRoute = () => {};

  const go = (target, params) => navigate?.(target, params);

  // Загружает страницу маршрутов начиная с offset; append — добавить к уже загруженным
  const loadPage = useCallback(
    async (offset, append) => {
      if (userId == null) return;
      try {
        const params = new URLSearchParams({
          user_id: String(userId),
          lang: i18n.language,
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        const { res } = await apiFetch(`/api/routes?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const page = Array.isArray(data) ? data : (data.routes ?? []);
        setRoutes((prev) => (append ? [...prev, ...page] : page));
        setHasMore(page.length >= PAGE_SIZE);
        setError(false);
      } catch (err) {
        console.error('Error loading routes:', err);
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, i18n.language],
  );

  // Первая страница (и перезагрузка при смене пользователя или языка)
  useEffect(() => {
    const init = async () => {
      await loadPage(0, false);
    };
    init();
  }, [loadPage]);

  // Геометрия маршрутов для карт. Каждый файл грузим один раз; ошибка одного не ломает остальные.
  useEffect(() => {
    routes.forEach(async (route) => {
      if (requestedGeoms.current.has(route.id)) return;
      requestedGeoms.current.add(route.id);
      try {
        const geom = await loadRouteGeometry(route);
        if (geom) setGeoms((prev) => ({ ...prev, [route.id]: geom }));
      } catch (err) {
        requestedGeoms.current.delete(route.id);
        console.error('Error loading route geometry:', route.id, err);
      }
    });
  }, [routes]);

  // Прокручиваемый контейнер — сам #screen. Кнопку «наверх» показываем, если контент выше экрана.
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return undefined;
    const update = () => setShowToTop(el.scrollHeight > el.clientHeight + 1);
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [routes, loading, loadingMore, hasMore]);

  const scrollToTop = () => screenRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const overviewItems = useMemo(
    () => routes.map((route) => routeItem(route, geoms)),
    [routes, geoms],
  );

  const mapLabels = {
    expand: t('mapExpand'),
    collapse: t('mapCollapse'),
    loading: t('mapLoading'),
    loadError: t('mapLoadError'),
    empty: t('mapEmpty'),
  };

  const statsLine = (route) =>
    `${((route.length_m ?? 0) / 1000).toFixed(1)} ${t('kmShort')} · +${route.elevation_gain_m ?? 0} ${t('mShort')}`;

  return (
    <div id="screen" ref={screenRef}>
      <h2 style={{ fontSize: '22px' }}>{t('title')}</h2>

      <div style={{ position: 'relative' }}>
        <RouteMapView items={overviewItems} height={240} labels={mapLabels} />
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
              <RouteMapView
                items={[item]}
                height={130}
                labels={mapLabels}
                interactive={false}
                expandable={false}
              />
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

      {hasMore && (
        <button
          type="button"
          className="btn btn-outline"
          style={{ width: '100%', marginTop: '4px' }}
          disabled={loadingMore}
          onClick={() => loadPage(routes.length, true)}
        >
          {loadingMore ? t('loading') : t('loadMore')}
        </button>
      )}

      {showToTop && (
        <div style={{ position: 'sticky', bottom: '12px', height: 0, overflow: 'visible' }}>
          <button
            type="button"
            aria-label={t('toTop')}
            title={t('toTop')}
            onClick={scrollToTop}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: 'none',
              background: 'var(--forest)',
              color: '#fff',
              fontSize: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,.3)',
              cursor: 'pointer',
            }}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  );
}

export default MyRoutesScreen;
