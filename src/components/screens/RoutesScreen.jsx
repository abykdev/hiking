import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gpx } from '@mapbox/togeojson';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../../api/client';
import { COUNTRIES } from '../../utils/countries';
import RouteMapView from '../RouteMapView';

const PAGE_SIZE = 5; // маршрутов за один раз («Показать ещё»)
const EVENTS_LIMIT = 100; // максимум по API

// Цвета бейджей сложности — как в прототипе (hard — alert, moderate — forest, easy — sage)
const DIFFICULTY_BADGES = {
  easy: { label: 'diffEasy', bg: 'var(--sage)' },
  moderate: { label: 'diffModerate', bg: 'var(--forest)' },
  hard: { label: 'diffHard', bg: 'var(--alert)' },
  expert: { label: 'diffExpert', bg: 'var(--forest-deep)' },
};

/* ------------------------------ Геометрия ------------------------------ */

// Линии и точки из GeoJSON. Координаты GeoJSON: [lng, lat].
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
  return extractGeometry(gpx(new DOMParser().parseFromString(text, 'text/xml')));
}

// Данные для RouteMapView: геометрия (если уже загружена) и точка старта
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

const listFrom = (data, key) => (Array.isArray(data) ? data : (data?.[key] ?? []));

// К событию можно присоединиться: запланировано, ещё не началось, есть места,
// я не организатор и ещё не участвую (заявка, приглашение, участие, лист ожидания)
function isJoinable(ev, userId, myEventIds) {
  if (ev.status !== 'planned') return false;
  if (ev.organizer_id === userId || myEventIds.has(ev.id)) return false;
  if (new Date(ev.starts_at).getTime() < Date.now()) return false;
  const spots = ev.stats?.spots_left;
  return spots == null || spots > 0;
}

/* --------------------------------- Экран -------------------------------- */

export function RoutesScreen({ navigate }) {
  const { t, i18n } = useTranslation('routes');
  const { user } = useAuth();
  const userId = user?.id;
  const countryCode = user?.country_code ?? null;
  const [pickedCountry, setPickedCountry] = useState(null);
  const [countries, setCountries] = useState([]);
  const routesCountry = pickedCountry ?? countryCode; // по умолчанию — страна профиля
  const selectedCountry = countries.find((c) => c.code === routesCountry);
  const countryName =
    selectedCountry?.name ??
    COUNTRIES.find((c) => c.alpha2 === routesCountry)?.name[i18n.language] ??
    routesCountry;

  const [routes, setRoutes] = useState([]);
  const [geoms, setGeoms] = useState({}); // id маршрута → { lines, pins }
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);

  const [events, setEvents] = useState([]); // события, к которым можно присоединиться
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [eventRoutes, setEventRoutes] = useState({}); // id маршрута события → маршрут
  const [joiningId, setJoiningId] = useState(null);

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const requestedGeoms = useRef(new Set());
  const requestedEventRoutes = useRef(new Set());

  const go = (target, params) => navigate?.(target, params);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Поиск по маршрутам: запрос уходит на бэк (q) через 400 мс после последнего ввода
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Страны для селектора + счётчики маршрутов
  useEffect(() => {
    let cancelled = false;
    const loadCountries = async () => {
      try {
        const { res } = await apiFetch(`/api/countries?lang=${i18n.language}&with_counts=1`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = listFrom(await res.json(), 'countries');
        if (!cancelled) {
          setCountries(list);
        }
      } catch (err) {
        console.error('Error loading countries:', err);
      }
    };
    loadCountries();
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  const showToast = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  /* ------------------------------- Маршруты ------------------------------ */

  // Страница маршрутов страны пользователя; append — добавить к уже загруженным
  const loadPage = useCallback(
    async (offset, append) => {
      if (!routesCountry) {
        setLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams({
          country_code: routesCountry,
          lang: i18n.language,
          is_public: 'true',
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (debouncedQuery) params.set('q', debouncedQuery);
        const { res } = await apiFetch(`/api/routes?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const page = listFrom(await res.json(), 'routes');
        setRoutes((prev) => (append ? [...prev, ...page] : page));
        // Пагинации с total нет: если вернулось меньше limit — это последняя страница
        setHasMore(page.length >= PAGE_SIZE);
        setError(false);
      } catch (err) {
        console.error('Error loading routes:', err);
        setError(true);
        showToast(t('loadFailed'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [routesCountry, i18n.language, debouncedQuery, showToast, t],
  );

  const pickCountry = (code) => {
    if (code === routesCountry) return;
    setRoutes([]);
    setHasMore(false);
    setLoading(true);
    setEvents([]);
    setEventsLoading(true);
    setPickedCountry(code);
  };

  // Первая страница (и перезагрузка при смене страны или языка)
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

  /* ------------------------------- События ------------------------------- */

  // Предстоящие события страны минус те, где я уже участвую или организатор
  useEffect(() => {
    if (!routesCountry) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const base = { upcoming: '1', limit: String(EVENTS_LIMIT) };
        const [countryRes, mineRes] = await Promise.all([
          apiFetch(`/api/events?${new URLSearchParams({ ...base, country_code: routesCountry })}`),
          apiFetch(`/api/events?${new URLSearchParams({ ...base, mine: '1' })}`),
        ]);
        if (!countryRes.res.ok) throw new Error(`HTTP ${countryRes.res.status}`);
        const countryEvents = listFrom(await countryRes.res.json(), 'items');
        // Список «моих» нужен только для фильтра; если он не загрузился — организатора всё равно отсеем
        const mineEvents = mineRes.res.ok ? listFrom(await mineRes.res.json(), 'items') : [];
        if (cancelled) return;
        const myIds = new Set(mineEvents.map((e) => e.id));
        setEvents(countryEvents.filter((e) => isJoinable(e, userId, myIds)));
        setEventsError(false);
      } catch (err) {
        console.error('Error loading events:', err);
        if (!cancelled) setEventsError(true);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [routesCountry, userId]);

  // Маршруты событий (для карты и длины): GET /api/routes/:id, каждый один раз
  useEffect(() => {
    events.forEach(async (ev) => {
      const rid = ev.route_id;
      if (rid == null || requestedEventRoutes.current.has(rid)) return;
      requestedEventRoutes.current.add(rid);
      try {
        const { res } = await apiFetch(`/api/routes/${rid}?lang=${i18n.language}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const route = data.route ?? data;
        let geom = null;
        try {
          geom = await loadRouteGeometry(route);
        } catch (geomErr) {
          console.error('Error loading event route geometry:', rid, geomErr);
        }
        setEventRoutes((prev) => ({ ...prev, [rid]: { route, geom } }));
      } catch (err) {
        requestedEventRoutes.current.delete(rid);
        console.error('Error loading event route:', rid, err);
      }
    });
  }, [events, i18n.language]);

  const joinEvent = async (ev) => {
    setJoiningId(ev.id);
    try {
      const { res } = await apiFetch(`/api/events/${ev.id}/join`, { method: 'POST' });
      if (res.ok) {
        showToast(t('joinSent'));
        setEvents((prev) => prev.filter((e) => e.id !== ev.id)); // теперь я участник — уходит из списка
        return;
      }
      let text = t('joinFailed');
      try {
        const data = await res.json();
        if (data?.error) text = data.error;
      } catch {
        /* тело ответа не JSON — оставляем общий текст */
      }
      showToast(text);
    } catch (err) {
      console.error('Error joining event:', err);
      showToast(t('joinFailed'));
    } finally {
      setJoiningId(null);
    }
  };

  /* -------------------------------- Разметка ------------------------------ */

  const mapLabels = useMemo(
    () => ({
      expand: t('mapExpand'),
      collapse: t('mapCollapse'),
      loading: t('mapLoading'),
      loadError: t('mapLoadError'),
      empty: t('mapEmpty'),
    }),
    [t],
  );

  const durationText = (min) => {
    if (min == null) return null;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h} ${t('hShort')}${m ? ` ${m} ${t('minShort')}` : ''}` : `${m} ${t('minShort')}`;
  };

  const routeStats = (route) =>
    [
      route.length_m != null && `${(route.length_m / 1000).toFixed(1)} ${t('kmShort')}`,
      route.elevation_gain_m != null && `+${route.elevation_gain_m} ${t('mShort')}`,
      durationText(route.duration_min),
    ]
      .filter(Boolean)
      .join(' · ');

  const formatStart = (iso) =>
    new Date(iso).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div id="screen">
      <h2 style={{ fontSize: '22px' }}>{t('title')}</h2>

      <input
        type="search"
        className="search-input"
        placeholder={`🔍 ${t('searchPh')}`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />

      <div className="country-rail" tabIndex={0} role="region" aria-label={t('countries')}>
        {countries.map((c) => {
          const name = c.name ?? COUNTRIES.find((x) => x.alpha2 === c.code)?.name[i18n.language] ?? c.code;
          const routeCount = Number(c.route_count ?? 0);
          const hasFlagImage = typeof c.flag === 'string' && (c.flag.startsWith('/') || c.flag.startsWith('http'));
          return (
            <div
              key={c.code}
              className={`country-card ${routesCountry === c.code ? 'sel' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => pickCountry(c.code)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pickCountry(c.code);
                }
              }}
            >
              <div style={{ fontSize: '26px', lineHeight: 1 }}>
                {hasFlagImage ? (
                  <span className="emo" style={{ backgroundImage: `url(${c.flag})` }}>
                    {name}
                  </span>
                ) : (
                  <span>{c.flag ?? ''}</span>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: '13.5px', marginTop: '4px' }}>{name}</div>
              <div style={{ fontSize: '11.5px' }}>{t('routesCount', { count: routeCount })}</div>
            </div>
          );
        })}
      </div>

      <div className="section-title">
        {countryName ? t('routesIn', { country: countryName }) : t('routes')}
      </div>

      {loading && <div className="muted">{t('loading')}</div>}
      {error && (
        <div className="error" role="alert">
          {t('loadFailed')}
        </div>
      )}
      {routesCountry && !loading && !error && routes.length === 0 && debouncedQuery && (
        <p className="muted">{t('noMatch', { q: debouncedQuery })}</p>
      )}
      {!routesCountry && <p className="muted">{t('noCountry')}</p>}
      {routesCountry && !loading && !error && routes.length === 0 && !debouncedQuery && (
        <p className="muted">{t('noRoutes')}</p>
      )}

      {routes.map((route) => {
        const badge = DIFFICULTY_BADGES[route.difficulty];
        return (
          <div
            key={route.id}
            className="card"
            style={{ marginBottom: '10px', cursor: 'pointer', padding: 0, overflow: 'hidden' }}
            onClick={() => go('routeSingle', { id: route.id })}
          >
            {route.cover_file_url ? (
              <img
                src={route.cover_file_url}
                alt={route.name}
                loading="lazy"
                style={{ display: 'block', width: '100%', height: '150px', objectFit: 'cover' }}
              />
            ) : (
              <RouteMapView
                items={[routeItem(route, geoms)]}
                height={150}
                labels={mapLabels}
                interactive={false}
                expandable={false}
              />
            )}
            <div style={{ padding: '12px 14px 14px' }}>
              <div className="space-between">
                <div style={{ fontWeight: 600, fontSize: '14.5px' }}>{route.name}</div>
                {badge && (
                  <span className="tag" style={{ background: badge.bg }}>
                    {t(badge.label)}
                  </span>
                )}
              </div>
              {route.region && (
                <div className="muted" style={{ fontSize: '12.5px', marginTop: '2px' }}>
                  {route.region}
                </div>
              )}
              <div className="muted" style={{ fontSize: '12.5px', marginTop: '6px' }}>
                {routeStats(route)}
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <button
          type="button"
          className="btn btn-outline"
          style={{ marginBottom: '10px' }}
          disabled={loadingMore}
          onClick={() => {
            setLoadingMore(true);
            loadPage(routes.length, true);
          }}
        >
          {loadingMore ? t('loading') : t('showMore')}
        </button>
      )}

      <div className="section-title">{t('communityTitle')}</div>

      {eventsLoading && routesCountry && <div className="muted">{t('loading')}</div>}
      {eventsError && (
        <div className="error" role="alert">
          {t('eventsLoadFailed')}
        </div>
      )}
      {routesCountry && !eventsLoading && !eventsError && events.length === 0 && (
        <p className="muted">{t('noCommunity')} {events.length}</p>
      )}

      {events.map((ev) => {
        const er = eventRoutes[ev.route_id];
        const title = ev.title_multilang?.[i18n.language] || ev.title;
        const spots = ev.stats?.spots_left;
        return (
          <div
            key={ev.id}
            className="card"
            style={{ marginBottom: '10px', cursor: 'pointer' }}
            onClick={() => go('hikeDetail', { id: ev.id })}
          >
            {er && (
              <RouteMapView
                items={[routeItem(er.route, { [er.route.id]: er.geom })]}
                height={130}
                labels={mapLabels}
                interactive={false}
                expandable={false}
              />
            )}
            <div className="space-between" style={{ marginTop: er ? '8px' : 0 }}>
              <div style={{ fontWeight: 600, fontSize: '14.5px' }}>{title}</div>
              <span className="tag">{t('groupTag')}</span>
            </div>
            <div className="muted" style={{ fontSize: '12.5px', marginTop: '4px' }}>
              {[
                formatStart(ev.starts_at),
                er?.route?.length_m != null &&
                  `${(er.route.length_m / 1000).toFixed(1)} ${t('kmShort')}`,
                t('joinedCount', { n: ev.stats?.confirmed_count ?? 0 }),
                spots != null && t('spotsLeft', { n: spots }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginTop: '10px' }}
              disabled={joiningId === ev.id}
              onClick={(e) => {
                e.stopPropagation(); // не открывать карточку события
                joinEvent(ev);
              }}
            >
              {t('join')}
            </button>
          </div>
        );
      })}

      <div id="toast" className={toast ? 'show' : ''} role="status">
        {toast}
      </div>
    </div>
  );
}
export default RoutesScreen;
