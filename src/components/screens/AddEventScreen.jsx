import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gpx } from '@mapbox/togeojson';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../../api/client';
import { readGpxMeta } from '../../utils/gpxReader';
import RouteMapView from '../RouteMapView';

const MAP_VIS = [
  ['all', 'mapVisAll'],
  ['members', 'mapVisMembers'],
  ['hidden', 'mapVisHidden'],
  ['me', 'mapVisMe'],
];
const RIDE_SEATS = [1, 2, 3, 4];
const DIFFICULTY_KEYS = {
  easy: 'diffEasy',
  moderate: 'diffModerate',
  hard: 'diffHard',
  expert: 'diffExpert',
};

const MAX_GPX_BYTES = 20 * 1024 * 1024; // лимит сервера на файл трека
const ROUTES_LIMIT = 200;

const pad2 = (n) => String(n).padStart(2, '0');

/* ------------------------------ Геометрия ------------------------------ */

// Линии и точки из GeoJSON. Координаты GeoJSON: [lng, lat, ele?].
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
  return { rawLines: lines.filter((l) => l.length >= 2), rawPins: pins };
}

const toLatLng = ([lng, lat]) => ({ lat, lng });

// Данные для RouteMapView: линии, маркеры и точка старта
function toMapItem(rawLines, rawPins, start) {
  return {
    lines: rawLines.map((l) => l.map(toLatLng)),
    pins: rawPins.map(toLatLng),
    start: start ?? null,
  };
}

function haversineKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Длина (км) и набор высоты (м) по линиям трека
function trackStats(rawLines) {
  let km = 0;
  let gain = 0;
  rawLines.forEach((line) => {
    for (let i = 1; i < line.length; i += 1) {
      km += haversineKm(line[i - 1], line[i]);
      const e0 = line[i - 1][2];
      const e1 = line[i][2];
      if (typeof e0 === 'number' && typeof e1 === 'number' && e1 > e0) gain += e1 - e0;
    }
  });
  return { km, gain: Math.round(gain) };
}

// Читает выбранный .gpx: карта, статистика и название (из метаданных или имени файла)
async function parseGpxFile(file) {
  const text = await file.text();
  const dom = new DOMParser().parseFromString(text, 'text/xml');
  if (dom.querySelector('parsererror')) throw new Error('Invalid GPX/XML');
  const { rawLines, rawPins } = extractGeometry(gpx(dom));
  if (!rawLines.length) throw new Error('GPX has no track');
  const meta = await readGpxMeta(file).catch(() => ({ name: '', description: '' }));
  return {
    file,
    name: meta.name || file.name.replace(/\.gpx$/i, ''),
    description: meta.description || '',
    item: toMapItem(rawLines, rawPins, null),
    ...trackStats(rawLines),
  };
}

// Геометрия существующего маршрута по ссылке на файл (geojson или gpx)
async function loadRouteItem(route) {
  const url = route.geojson_url ?? route.gpx_url;
  const start =
    route.start_lat != null && route.start_lon != null
      ? { lat: Number(route.start_lat), lng: Number(route.start_lon) }
      : null;
  if (!url) return toMapItem([], [], start);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  const geo = route.geojson_url
    ? JSON.parse(text)
    : gpx(new DOMParser().parseFromString(text, 'text/xml'));
  const { rawLines, rawPins } = extractGeometry(geo);
  return toMapItem(rawLines, rawPins, start);
}

const routesFrom = (data) => (Array.isArray(data) ? data : (data?.routes ?? []));

// Склеиваем дату и время формы в ISO 8601 с часовым поясом пользователя,
// например 2026-11-15T08:00:00+03:00. Возвращает null, если дата некорректна.
function toStartsAt(dateVal, timeVal) {
  const local = new Date(`${dateVal}T${timeVal || '00:00'}`);
  if (Number.isNaN(local.getTime())) return null;
  const offsetMin = -local.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return (
    `${dateVal}T${timeVal || '00:00'}:00` +
    `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  );
}

function Toggle({ label, hint, on, onChange }) {
  return (
    <div className="card toggle-row" style={{ marginTop: '12px', padding: '14px 16px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{label}</div>
        {hint && (
          <div className="muted" style={{ fontSize: '11.5px', marginTop: '2px' }}>
            {hint}
          </div>
        )}
      </div>
      <div
        className={`switch ${on ? 'on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={label}
        tabIndex={0}
        onClick={() => onChange(!on)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange(!on);
          }
        }}
      >
        <div className="knob" />
      </div>
    </div>
  );
}

export function AddEventScreen({ params, navigate }) {
  const { t, i18n } = useTranslation('addEvent');
  const { user } = useAuth();
  const route = params?.route ?? null; // необязательно: данные маршрута для карточки
  const routeId = params?.route_id ?? route?.id ?? null;
  // Маршрут передан — показываем его карточку; иначе даём выбрать маршрут или загрузить GPX
  const hasPresetRoute = routeId != null || route != null;

  const [title, setTitle] = useState(params?.title ?? route?.name ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:30');
  const [lookingForBuddies, setLookingForBuddies] = useState(false);
  const [createGroup, setCreateGroup] = useState(false);
  const [groupSize, setGroupSize] = useState(6);
  const [offersRide, setOffersRide] = useState(false);
  const [rideSeats, setRideSeats] = useState(2);
  const [mapVis, setMapVis] = useState('all');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Выбор маршрута (только когда маршрут не передан в параметрах)
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState(user?.country_code ?? null);
  const [myRoutes, setMyRoutes] = useState([]);
  const [libRoutes, setLibRoutes] = useState([]);
  const [selectedKey, setSelectedKey] = useState(''); // 'my:<id>' | 'lib:<id>'
  const [selectedItem, setSelectedItem] = useState(null); // геометрия выбранного маршрута
  const [gpxRoute, setGpxRoute] = useState(null); // загруженный GPX: { file, name, item, km, gain }
  const createdRoute = useRef(null); // { file, id } — созданный из GPX маршрут, чтобы не плодить дубли при повторе

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Страны, в которых есть маршруты
  useEffect(() => {
    if (hasPresetRoute) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const { res } = await apiFetch(`/api/countries?lang=${i18n.language}&with_counts=1`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const list = data.countries ?? [];
        setCountries(list);
        setCountry((cur) => cur ?? list.find((c) => c.route_count > 0)?.code ?? list[0]?.code ?? null);
      } catch (err) {
        console.error('Error loading countries:', err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [hasPresetRoute, i18n.language]);

  // Мои маршруты
  useEffect(() => {
    if (hasPresetRoute || user?.id == null) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const q = new URLSearchParams({ user_id: String(user.id), lang: i18n.language, limit: String(ROUTES_LIMIT) });
        const { res } = await apiFetch(`/api/routes?${q.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setMyRoutes(routesFrom(data));
      } catch (err) {
        console.error('Error loading my routes:', err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [hasPresetRoute, user?.id, i18n.language]);

  // Готовые маршруты выбранной страны
  useEffect(() => {
    if (hasPresetRoute || !country) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const q = new URLSearchParams({ country_code: country, lang: i18n.language, limit: String(ROUTES_LIMIT) });
        const { res } = await apiFetch(`/api/routes?${q.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setLibRoutes(routesFrom(data));
      } catch (err) {
        console.error('Error loading routes:', err);
        if (!cancelled) setLibRoutes([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [hasPresetRoute, country, i18n.language]);

  const selectedRoute = useMemo(() => {
    if (!selectedKey) return null;
    const [src, id] = selectedKey.split(':');
    return (src === 'my' ? myRoutes : libRoutes).find((r) => String(r.id) === id) ?? null;
  }, [selectedKey, myRoutes, libRoutes]);

  // Геометрия выбранного маршрута для карты
  useEffect(() => {
    if (!selectedRoute) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const item = await loadRouteItem(selectedRoute);
        if (!cancelled) setSelectedItem({ id: selectedKey, item });
      } catch (err) {
        console.error('Error loading route geometry:', err);
        if (!cancelled) setSelectedItem({ id: selectedKey, item: toMapItem([], [], null) });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedRoute, selectedKey]);

  const selectedMapItems = useMemo(
    () => (selectedItem && selectedItem.id === selectedKey ? [selectedItem.item] : []),
    [selectedItem, selectedKey],
  );
  const gpxMapItems = useMemo(() => (gpxRoute ? [gpxRoute.item] : []), [gpxRoute]);

  const mapLabels = {
    expand: t('mapExpand'),
    collapse: t('mapCollapse'),
    loading: t('mapLoading'),
    loadError: t('mapLoadError'),
    empty: t('mapEmpty'),
  };

  const chooseCountry = (code) => {
    setCountry(code);
    setSelectedKey(''); // маршруты прежней страны исчезают из списка
  };

  // Выбран GPX: убираем выбранный готовый маршрут и его карту
  const onGpxPicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // чтобы тот же файл можно было выбрать снова после «Убрать»
    if (!file) return;
    if (file.size > MAX_GPX_BYTES) {
      showToast(t('gpxTooBig'));
      return;
    }
    try {
      const parsed = await parseGpxFile(file);
      setSelectedKey('');
      setSelectedItem(null);
      setGpxRoute(parsed);
    } catch (err) {
      console.error('Error reading GPX:', err);
      showToast(t('gpxInvalid'));
    }
  };

  // «Убрать»: сбрасываем GPX — снова показываются выбор маршрута и кнопка загрузки
  const removeGpx = () => {
    setGpxRoute(null);
    createdRoute.current = null;
  };

  const showToast = (text) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  // Создаёт маршрут из загруженного GPX и возвращает его id. Повторный вызов с тем же файлом
  // (например, после ошибки создания события) не создаёт второй маршрут.
  const createRouteFromGpx = async (eventTitle) => {
    if (createdRoute.current?.file === gpxRoute.file) return createdRoute.current.id;

    const form = new FormData();
    form.append('file', gpxRoute.file);
    form.append('name', (gpxRoute.name.trim() || eventTitle).slice(0, 200));
    // description у сервера обязательное — берём из метаданных GPX или генерируем
    form.append('description', (gpxRoute.description || t('gpxRouteDescription')).slice(0, 5000));
    form.append('is_public', 'false');

    // Content-Type не задаём: браузер сам выставит multipart/form-data с boundary
    const { res } = await apiFetch('/api/routes', { method: 'POST', body: form });
    if (!res.ok) {
      let text = t('routeCreateFailed');
      try {
        const data = await res.json();
        if (data?.error) text = data.error;
      } catch {
        /* тело ответа не JSON — оставляем общий текст */
      }
      throw new Error(text);
    }
    const data = await res.json();
    const id = data?.route?.id ?? data?.id;
    if (id == null) throw new Error(t('routeCreateFailed'));
    createdRoute.current = { file: gpxRoute.file, id };
    return id;
  };

  const submit = async () => {
    const eventTitle =
      title.trim() ||
      (hasPresetRoute ? '' : (gpxRoute?.name.trim() || selectedRoute?.name || ''));
    if (!eventTitle) {
      showToast(t('needTitle'));
      return;
    }
    if (!date) {
      showToast(t('needDate'));
      return;
    }
    const startsAt = toStartsAt(date, time);
    if (!startsAt) {
      showToast(t('needValidDate'));
      return;
    }

    setLoading(true);
    try {
      // Какой маршрут привязываем к событию
      let eventRouteId = routeId;
      if (!hasPresetRoute) {
        if (gpxRoute) eventRouteId = await createRouteFromGpx(eventTitle);
        else eventRouteId = selectedRoute?.id ?? null;
      }

      const body = {
        title: eventTitle,
        starts_at: startsAt,
        looking_for_buddies: lookingForBuddies,
        create_group: createGroup,
        offers_ride: offersRide,
        map_visibility: mapVis,
        lang: i18n.language,
      };
      if (eventRouteId != null) body.route_id = eventRouteId;
      if (createGroup) body.group_size = groupSize;
      if (offersRide) body.ride_seats = rideSeats;

      const { res } = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(t('created'));
        navigate?.('home');
        return;
      }
      let text = t('saveFailed');
      try {
        const data = await res.json();
        if (data?.error) text = data.error;
      } catch {
        /* тело ответа не JSON — оставляем общий текст */
      }
      showToast(text);
    } catch (err) {
      console.error('Error creating event:', err);
      // Ошибка создания маршрута приходит с готовым текстом; прочие — общий текст
      showToast(err instanceof Error && err.message && !/^(HTTP|Failed|Network)/.test(err.message) ? err.message : t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="screen">
      <h2 style={{ fontSize: '20px' }}>{hasPresetRoute ? t('title') : t('titlePlan')}</h2>

      {!hasPresetRoute && (
        <>
          {gpxRoute ? (
            <>
              <div className="field-label">{t('gpxLabel')}</div>
              <div className="card" style={{ padding: '12px' }}>
                <RouteMapView items={gpxMapItems} height={180} labels={mapLabels} />
                <div className="space-between" style={{ marginTop: '8px' }}>
                  <div style={{ minWidth: 0, flex: 1, marginRight: '10px' }}>
                    <input
                      type="text"
                      value={gpxRoute.name}
                      maxLength={200}
                      aria-label={t('gpxNameLabel')}
                      onChange={(e) => setGpxRoute((g) => ({ ...g, name: e.target.value }))}
                      style={{ padding: '8px 10px', fontSize: '13.5px', fontWeight: 600 }}
                    />
                    <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                      {gpxRoute.km.toFixed(1)} {t('kmShort')} · +{gpxRoute.gain} {t('mShort')}
                    </div>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={removeGpx}>
                    {t('removeGpx')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="field-label">{t('chooseTrailSection')}</div>
              <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
                <option value="">{t('chooseTrailPh')}</option>
                {myRoutes.length > 0 && (
                  <optgroup label={t('myRoutesGroup')}>
                    {myRoutes.map((r) => (
                      <option key={`my:${r.id}`} value={`my:${r.id}`}>
                        📍 {r.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup
                  label={`${t('availableGroup')} — ${countries.find((c) => c.code === country)?.name ?? ''}`}
                >
                  {libRoutes.map((r) => (
                    <option key={`lib:${r.id}`} value={`lib:${r.id}`}>
                      🥾 {r.name}
                    </option>
                  ))}
                </optgroup>
              </select>

              <div className="chip-row" style={{ marginTop: '8px' }}>
                {countries
                  .filter((c) => c.route_count > 0 || c.code === country)
                  .map((c) => (
                    <div
                      key={c.code}
                      className={`chip ${country === c.code ? 'selected' : ''}`}
                      onClick={() => chooseCountry(c.code)}
                    >
                      {c.flag} {c.name}
                    </div>
                  ))}
              </div>

              {selectedRoute && (
                <div style={{ marginTop: '12px' }}>
                  <RouteMapView items={selectedMapItems} height={180} labels={mapLabels} />
                  <div className="muted" style={{ fontSize: '12.5px', marginTop: '6px' }}>
                    {[
                      selectedRoute.name,
                      selectedRoute.length_m != null &&
                        `${(selectedRoute.length_m / 1000).toFixed(1)} ${t('kmShort')}`,
                      selectedRoute.elevation_gain_m != null &&
                        `+${selectedRoute.elevation_gain_m} ${t('mShort')}`,
                      DIFFICULTY_KEYS[selectedRoute.difficulty] &&
                        t(DIFFICULTY_KEYS[selectedRoute.difficulty]),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              )}

              <div className="field-label">{t('gpxLabel')}</div>
              <label className="upload-btn">
                {t('uploadGpx')}
                <input
                  type="file"
                  accept=".gpx,application/gpx+xml,application/xml,text/xml,application/octet-stream"
                  style={{ display: 'none' }}
                  onChange={onGpxPicked}
                />
              </label>
              <div className="muted" style={{ fontSize: '11.5px', marginTop: '6px' }}>
                {t('gpxHint')}
              </div>
            </>
          )}
        </>
      )}

      {route && (
        <div className="card" style={{ marginTop: '10px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>{route.name}</div>
          <div className="muted" style={{ fontSize: '12.5px', marginTop: '4px' }}>
            {[
              route.distance != null && `${route.distance} ${t('kmShort')}`,
              route.elevation != null && `+${route.elevation} m`,
              DIFFICULTY_KEYS[route.difficulty] && t(DIFFICULTY_KEYS[route.difficulty]),
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          {route.description && (
            <p style={{ fontSize: '13.5px', lineHeight: 1.5, marginTop: '10px' }}>
              {route.description}
            </p>
          )}
        </div>
      )}

      <div className="field-label">{t('eventTitleLabel')}</div>
      <input
        type="text"
        value={title}
        maxLength={150}
        placeholder={t('eventTitlePh')}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="field-label">{t('dateLabel')}</div>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="field-label">{t('timeLabel')}</div>
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />

      <Toggle
        label={t('lookingForBuddiesToggle')}
        hint={t('lookingForBuddiesHint')}
        on={lookingForBuddies}
        onChange={setLookingForBuddies}
      />

      <Toggle
        label={t('createGroupToggle')}
        hint={t('createGroupHint')}
        on={createGroup}
        onChange={setCreateGroup}
      />
      {createGroup && (
        <>
          <div className="field-label">
            {t('groupSizeSection')}: <span>{groupSize}</span> {t('peopleUnit')}
          </div>
          <input
            type="range"
            min="2"
            max="12"
            step="1"
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--forest)' }}
          />
        </>
      )}

      <Toggle label={t('offersRideToggle')} on={offersRide} onChange={setOffersRide} />
      {offersRide && (
        <>
          <div className="field-label">{t('rideSeatsLabel')}</div>
          <div className="chip-row">
            {RIDE_SEATS.map((n) => (
              <div
                key={n}
                className={`chip ${rideSeats === n ? 'selected' : ''}`}
                onClick={() => setRideSeats(n)}
              >
                {n}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="field-label">🗺 {t('mapVisTitle')}</div>
      <div className="chip-row">
        {MAP_VIS.map(([key, label]) => (
          <div
            key={key}
            className={`chip ${mapVis === key ? 'selected' : ''}`}
            onClick={() => setMapVis(key)}
          >
            {t(label)}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: '22px' }}
        disabled={loading}
        onClick={submit}
      >
        {loading ? t('submitting') : hasPresetRoute ? t('submit') : t('submitCreate')}
      </button>

      <div id="toast" className={toast ? 'show' : ''} role="status">
        {toast}
      </div>
    </div>
  );
}

export default AddEventScreen;
