import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../../api/client';
import ChoiceGroup from '../ChoiceGroup';
import RouteMapEdit from '../RouteMapEdit';
import { readGpxMeta } from '../../utils/gpxReader';

const EMPTY_STATS = { points: 0, markers: 0, km: 0 };
const PIN_KINDS = ['🍽', '☕', '📸', '💧', '⛺', '⚠️', '📍'];
const MAX_FILE_BYTES = 8 * 1024 * 1024;

// Уменьшаем фото маркера до 800px по длинной стороне, как в прототипе
function readPhotoAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 800 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => reject(new Error('image failed'));
      img.src = String(ev.target.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function AddRouteScreen({ navigate }) {
  const { t, i18n } = useTranslation('addRoute');
  const { user } = useAuth();
  const mapRef = useRef(null);

  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [hikeStyle, setHikeStyle] = useState([]);
  const [mode, setMode] = useState('route'); // 'route' | 'pin'
  const [geojson, setGeojson] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [markers, setMarkers] = useState([]);
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'ok', text }

  // Форма нового маркера и подтверждение удаления
  const [pinForm, setPinForm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Клонирование публичных маршрутов
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneRoutes, setCloneRoutes] = useState(null);
  const [cloneError, setCloneError] = useState(null);

  const go = (target, params) => navigate?.(target, params);
  const showError = (text) => setMessage({ type: 'error', text });

  // Центрируем карту на позиции пользователя, если она доступна
  useEffect(() => {
    let cancelled = false;

    // 1. Пытаемся получить позицию пользователя
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      async () => {
        // 2. Геолокация не удалась — берём координаты страны из API
        if (cancelled || !user?.country_code) return;

        try {
          const res = await apiFetch(`/api/countries/${user.country_code}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          if (!cancelled) {
            setCenter({ lat: data.center_lat, lng: data.center_lon });
          }
        } catch (err) {
          // 3. Совсем не удалось — оставляем дефолтный центр (или логируем)
          if (!cancelled) console.warn('Не удалось определить центр:', err.message);
        }
      },
      { timeout: 8000 },
    );

    return () => { cancelled = true; };
  }, [user?.country_code]);

  const mapLabels = {
    loading: t('mapLoading'),
    loadError: t('mapLoadError'),
    expand: t('mapExpand'),
    collapse: t('mapCollapse'),
    deleteMarker: t('deleteMarker'),
  };

  const handleMapChange = ({ geojson: fc, stats: s, markers: ms }) => {
    setGeojson(fc);
    setStats(s);
    setMarkers(ms);
  };

  const handleStyleChange = (value) => {
    if (Array.isArray(value)) setHikeStyle(value);
    else setHikeStyle(value === undefined || value === null ? [] : [value]);
  };

  const changeMode = (next) => {
    setMode(next);
    closePinForm();
  };

  /* ------------------------------- Маркеры -------------------------------- */

  const closePinForm = () => {
    setPinForm(null);
    mapRef.current?.setPending(null);
  };

  const requestPin = ({ lat, lng }) => {
    const form = { lat, lng, emoji: PIN_KINDS[0], title: '', desc: '', address: '', photo: null };
    setPinForm(form);
    setDeletingId(null);
    mapRef.current?.setPending({ lat, lng }, form.emoji);

    // Адрес по координатам (необязательно: если Geocoder недоступен — пропускаем)
    try {
      const Geocoder = window.google?.maps?.Geocoder;
      if (!Geocoder) return;
      new Geocoder().geocode({ location: { lat, lng } }, (res, status) => {
        if (status !== 'OK' || !res?.[0]) return;
        setPinForm((prev) =>
          prev && prev.lat === lat && prev.lng === lng && !prev.address
            ? { ...prev, address: res[0].formatted_address }
            : prev,
        );
      });
    } catch (err) {
      console.warn('Geocoder error:', err);
    }
  };

  const updatePinForm = (patch) => setPinForm((prev) => (prev ? { ...prev, ...patch } : prev));

  const pickPinKind = (emoji) => {
    updatePinForm({ emoji });
    if (pinForm) mapRef.current?.setPending({ lat: pinForm.lat, lng: pinForm.lng }, emoji);
  };

  const handlePinPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      updatePinForm({ photo: await readPhotoAsDataUrl(file) });
    } catch (err) {
      console.warn('Photo not read:', err);
    }
  };

  const savePin = () => {
    if (!pinForm) return;
    if (!pinForm.title.trim()) {
      showError(t('pinNeedTitle'));
      return;
    }
    setMessage(null);
    mapRef.current?.addMarker({
      lat: pinForm.lat,
      lng: pinForm.lng,
      emoji: pinForm.emoji,
      title: pinForm.title.trim(),
      desc: pinForm.desc.trim(),
      address: pinForm.address.trim(),
      photo: pinForm.photo,
    });
    closePinForm();
  };

  const confirmDeletePin = () => {
    if (deletingId) mapRef.current?.removeMarker(deletingId);
    setDeletingId(null);
  };

  /* ---------------------------- Загрузка файла ---------------------------- */

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = ''; // позволяем выбрать тот же файл повторно
    if (!selected) return;
    if (selected.size > MAX_FILE_BYTES) {
      showError(t('fileTooBig'));
      return;
    }

    setMessage(null);
    try {
      // Линия заменяется файлом, уже поставленные маркеры остаются (как в прототипе)
      mapRef.current?.loadText(await selected.text(), { replaceMarkers: false });
    } catch (err) {
      console.error('File parse error:', err);
      showError(t('fileInvalid'));
      return;
    }

    // Название/описание из GPX подставляем только в пустые поля
    if (selected.name.toLowerCase().endsWith('.gpx')) {
      try {
        const { name, description } = await readGpxMeta(selected);
        const fallback = selected.name.replace(/\.[^.]+$/, '');
        const finalName = (name || fallback).slice(0, 100);
        setRouteName((prev) => (prev.trim() ? prev : finalName));
        if (description) setRouteDescription((prev) => (prev.trim() ? prev : description));
      } catch (err) {
        console.warn('GPX metadata not read:', err);
      }
    }
  };

  /* ----------------------------- Клонирование ----------------------------- */

  const toggleClone = async () => {
    const next = !cloneOpen;
    setCloneOpen(next);
    if (!next || cloneRoutes || !user?.country_code) return;

    setCloneLoading(true);
    setCloneError(null);
    try {
      const params = new URLSearchParams({
        country_code: user.country_code,
        lang: i18n.language,
        limit: '20',
      });
      const { res } = await apiFetch(`/api/routes?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCloneRoutes(Array.isArray(data) ? data : data.routes ?? []);
    } catch (err) {
      console.error('Clone list error:', err);
      setCloneError(t('cloneListFailed'));
    } finally {
      setCloneLoading(false);
    }
  };

  const cloneRoute = async (route) => {
    setMessage(null);
    try {
      let source = route;
      // В списке может не быть ссылки на файл — тогда берём полную карточку маршрута
      if (!source.geojson_url && !source.gpx_url) {
        const { res } = await apiFetch(`/api/routes/${route.id}?lang=${i18n.language}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        source = data.route ?? data;
      }
      const url = source.geojson_url ?? source.gpx_url;
      if (!url) {
        showError(t('cloneNoGeometry'));
        return;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Клон заменяет и линию, и маркеры
      mapRef.current?.loadText(await response.text(), { replaceMarkers: true });

      setRouteName(`${route.name ?? ''} ${t('cloneCopySuffix')}`.trim().slice(0, 100));
      setRouteDescription(route.description ?? '');
      closePinForm();
      setCloneOpen(false);
    } catch (err) {
      console.error('Clone error:', err);
      showError(t('cloneFailed'));
    }
  };

  /* ------------------------------ Сохранение ------------------------------ */

  const submitCreateRoute = async () => {
    if (stats.points < 2) {
      showError(t('needPoints'));
      return;
    }
    const name = (routeName.trim() || t('defaultName')).slice(0, 100);

    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (routeDescription.trim()) formData.append('description', routeDescription.trim());
      hikeStyle.forEach((id) => formData.append('hike_style', String(id)));
      formData.append('is_public', false);
      if (user?.country_code) formData.append('country_code', user.country_code);

      // Все геоданные (линии и маркеры) — одним GeoJSON-файлом
      const file = new File([JSON.stringify(geojson)], 'route.geojson', {
        type: 'application/geo+json',
      });
      formData.append('file', file);

      // Content-Type не задаём: браузер сам выставит multipart/form-data с boundary
      const { res } = await apiFetch('/api/routes', { method: 'POST', body: formData });

      if (res.ok) {
        setMessage({ type: 'ok', text: t('saved') });
        go('routes');
        return;
      }
      let text = t('saveFailed');
      try {
        const body = await res.json();
        if (body?.error) text = body.error;
      } catch {
        /* тело ответа не JSON — оставляем общий текст */
      }
      showError(text);
    } catch (err) {
      console.error('Error uploading route:', err);
      showError(t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------- Разметка ------------------------------- */

  return (
    <div id="screen">
      <h2 style={{ fontSize: '22px' }}>{t('title')}</h2>
      <p className="muted">{t('intro')}</p>

      <div className="field-label">{t('routeName')}</div>
      <input
        type="text"
        id="routeNameInput"
        maxLength={100}
        placeholder={t('routeNamePh')}
        value={routeName}
        onChange={(e) => setRouteName(e.target.value)}
      />

      <div className="field-label">{t('routeDescription')}</div>
      <textarea
        id="routeDescInput"
        placeholder={t('routeDescPh')}
        value={routeDescription}
        onChange={(e) => setRouteDescription(e.target.value)}
      />

      <div className="field-label">{t('routeType')}</div>
      <ChoiceGroup group="hikeStyle" value={hikeStyle} onChange={handleStyleChange} />

      <div className="chip-row" style={{ marginTop: '14px' }}>
        <button
          type="button"
          className={`chip ${mode === 'route' ? 'selected' : ''}`}
          onClick={() => changeMode('route')}
        >
          <span className="emo">〰</span> {t('modeRoute')}
        </button>
        <button
          type="button"
          className={`chip ${mode === 'pin' ? 'selected' : ''}`}
          onClick={() => changeMode('pin')}
        >
          <span className="emo">📍</span> {t('modePin')}
        </button>
      </div>
      <div className="muted" style={{ fontSize: '12px', margin: '8px 0' }}>
        {mode === 'pin' ? t('mapHintPin') : t('mapHintRoute')}
        {markers.length > 0 && ` ${t('tapMarkerToDelete')}`}
      </div>

      <div
        style={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: 'var(--radius)',
          background: 'var(--sand)',
        }}
      >
        <RouteMapEdit
          ref={mapRef}
          mode={mode}
          center={center}
          onChange={handleMapChange}
          onPinRequest={requestPin}
          onMarkerDelete={setDeletingId}
          labels={mapLabels}
          height={300}
        />
      </div>

      <div className="space-between" style={{ marginTop: '8px' }}>
        <div className="muted" style={{ fontSize: '12.5px' }}>
          {t('stats', {
            points: stats.points,
            markers: stats.markers,
            km: stats.km.toFixed(2),
          })}
        </div>
        <div className="row" style={{ gap: '6px' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => mapRef.current?.undo()}>
            ↶ {t('undo')}
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => mapRef.current?.clear()}>
            {t('clear')}
          </button>
        </div>
      </div>

      {pinForm && (
        <div className="card" style={{ marginTop: '12px', padding: '14px' }}>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>{t('pinFormTitle')}</div>
          <div className="chip-row">
            {PIN_KINDS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`chip ${pinForm.emoji === emoji ? 'selected' : ''}`}
                style={{ fontSize: '18px', padding: '6px 12px' }}
                onClick={() => pickPinKind(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <input
            type="text"
            maxLength={80}
            placeholder={t('pinTitlePh')}
            value={pinForm.title}
            onChange={(e) => updatePinForm({ title: e.target.value })}
            style={{ marginTop: '10px' }}
          />
          <input
            type="text"
            placeholder={`📍 ${t('pinAddressPh')}`}
            value={pinForm.address}
            onChange={(e) => updatePinForm({ address: e.target.value })}
            style={{ marginTop: '8px' }}
          />
          <textarea
            placeholder={t('pinDescPh')}
            value={pinForm.desc}
            onChange={(e) => updatePinForm({ desc: e.target.value })}
            style={{ marginTop: '8px' }}
          />
          {pinForm.photo && (
            <img
              src={pinForm.photo}
              alt=""
              style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '12px', marginTop: '8px' }}
            />
          )}
          <label className="upload-btn" style={{ marginTop: '8px' }}>
            {t('pinAddPhoto')}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePinPhoto} />
          </label>
          <div className="row" style={{ gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={savePin}>
              {t('pinSave')}
            </button>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={closePinForm}>
              {t('pinCancel')}
            </button>
          </div>
        </div>
      )}

      {markers.length > 0 && (
        <>
          <div className="section-title">{t('pinsTitle')}</div>
          {markers.map((m) => (
            <div key={m.id} className="card" style={{ marginTop: '8px', padding: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {m.photo ? (
                  <img
                    src={m.photo}
                    alt=""
                    style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '10px', flex: '0 0 auto' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'var(--sand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      flex: '0 0 auto',
                    }}
                  >
                    {m.emoji}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>
                    {m.photo ? `${m.emoji} ` : ''}
                    {m.title}
                  </div>
                  <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                    📍 {m.address || `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`}
                  </div>
                  {m.desc && (
                    <div className="muted" style={{ fontSize: '12.5px', marginTop: '3px' }}>
                      {m.desc}
                    </div>
                  )}
                </div>
                {deletingId !== m.id && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: 'var(--alert)', color: 'var(--alert)', flex: '0 0 auto' }}
                    onClick={() => setDeletingId(m.id)}
                  >
                    {t('pinDelete')}
                  </button>
                )}
              </div>
              {deletingId === m.id && (
                <div className="inline-confirm" style={{ marginTop: '10px' }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: '13.5px' }}>{t('pinDeleteQ')}</p>
                  <div className="row" style={{ gap: '10px' }}>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeletingId(null)}>
                      {t('pinCancel')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, background: 'var(--alert)' }}
                      onClick={confirmDeletePin}
                    >
                      {t('pinDelete')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <label className="upload-btn" style={{ marginTop: '14px' }}>
        {t('uploadFile')}
        <input
          type="file"
          accept=".gpx,.geojson,.json,application/gpx+xml,application/geo+json,application/json,application/xml,text/xml,application/octet-stream"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </label>

      <button
        type="button"
        className="btn btn-outline"
        style={{ marginTop: '10px' }}
        onClick={toggleClone}
      >
        {cloneOpen ? t('cloneHide') : t('cloneToggle')}
      </button>

      {cloneOpen && (
        <div className="card" style={{ marginTop: '10px' }}>
          <div className="muted" style={{ fontSize: '12.5px', marginBottom: '8px' }}>
            {t('cloneHint')}
          </div>
          {!user?.country_code && <div className="muted">{t('cloneNoCountry')}</div>}
          {user?.country_code && cloneLoading && <div className="muted">{t('cloneLoading')}</div>}
          {cloneError && <div className="error">{cloneError}</div>}
          {user?.country_code && !cloneLoading && !cloneError && cloneRoutes?.length === 0 && (
            <div className="muted">{t('cloneEmpty')}</div>
          )}
          {cloneRoutes?.map((route) => (
            <div
              key={route.id}
              className="space-between"
              style={{ padding: '8px 0', borderTop: '1px solid var(--sand)', gap: '10px' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{route.name}</div>
                <div className="muted" style={{ fontSize: '12px' }}>
                  {route.length_m ? `${(route.length_m / 1000).toFixed(1)} ${t('kmShort')}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => cloneRoute(route)}
              >
                {t('cloneAction')}
              </button>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div
          className={message.type === 'error' ? 'error' : 'muted'}
          role={message.type === 'error' ? 'alert' : 'status'}
          style={{ marginTop: '12px' }}
        >
          {message.text}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: '20px' }}
        disabled={loading}
        onClick={submitCreateRoute}
      >
        {loading ? t('submitting') : t('submit')}
      </button>
    </div>
  );
}
