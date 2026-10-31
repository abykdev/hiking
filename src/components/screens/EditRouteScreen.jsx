import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../api/client';
import ChoiceGroup from '../ChoiceGroup';
import RouteMapEdit from '../RouteMapEdit';

const EMPTY_STATS = { points: 0, markers: 0, km: 0 };
const PIN_KINDS = ['🍽', '☕', '📸', '💧', '⛺', '⚠️', '📍'];
const DIFFICULTIES = ['easy', 'moderate', 'hard', 'expert'];
const TEXT_FIELDS = ['name', 'description', 'region', 'start_name', 'finish_name'];
const COVER_ACCEPT = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

// Уменьшаем фото маркера до 800px по длинной стороне, как в AddRouteScreen
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

// Текст ошибки из тела ответа ({ error }) или запасной вариант
async function readError(res, fallback) {
  try {
    const body = await res.json();
    if (body?.error) return body.error;
  } catch {
    /* тело ответа не JSON */
  }
  return fallback;
}

function formFromRoute(route) {
  return {
    name: route.name ?? '',
    description: route.description ?? '',
    region: route.region ?? '',
    start_name: route.start_name ?? '',
    finish_name: route.finish_name ?? '',
    difficulty: route.difficulty ?? '',
    duration_min: route.duration_min == null ? '' : String(route.duration_min),
  };
}

export default function EditRouteScreen({ navigate, goBack, params }) {
  const { t, i18n } = useTranslation(['editRoute', 'addRoute']);
  const routeId = params?.id;
  const mapRef = useRef(null);
  const baselineRef = useRef(null); // GeoJSON сразу после загрузки файла — для определения правок

  const [route, setRoute] = useState(null);
  const [form, setForm] = useState(null);
  const [hikeStyle, setHikeStyle] = useState([]);
  const [hikeStyleTouched, setHikeStyleTouched] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [mode, setMode] = useState('route'); // 'route' | 'pin'
  const [geojson, setGeojson] = useState(null);
  const [mapDirty, setMapDirty] = useState(false);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [markers, setMarkers] = useState([]);
  const [pinForm, setPinForm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [coverPreview, setCoverPreview] = useState(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'ok', text }

  const showError = (text) => setMessage({ type: 'error', text });

  // Карточка маршрута
  useEffect(() => {
    if (routeId == null) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const { res } = await apiFetch(`/api/routes/${routeId}?lang=${i18n.language}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const loaded = data.route ?? data;
        setRoute(loaded);
        setForm(formFromRoute(loaded));
        if (Array.isArray(loaded.hike_style)) setHikeStyle(loaded.hike_style);
      } catch (err) {
        console.error('Error loading route:', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [routeId, i18n.language]);

  // Трек маршрута на карту (карта уже смонтирована, когда route загружен)
  const geometryUrl = route?.geojson_url ?? route?.gpx_url ?? null;
  useEffect(() => {
    if (!geometryUrl) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(geometryUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (cancelled) return;
        baselineRef.current = null;
        setMapDirty(false);
        mapRef.current?.loadText(text, { replaceMarkers: true });
      } catch (err) {
        console.error('Error loading route geometry:', err);
        if (!cancelled) showError(t('geometryLoadFailed'));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryUrl]);

  const mapLabels = {
    loading: t('mapLoading'),
    loadError: t('mapLoadError'),
    expand: t('mapExpand'),
    collapse: t('mapCollapse'),
    deleteMarker: t('deleteMarker'),
  };

  const updateField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleMapChange = ({ geojson: fc, stats: s, markers: ms }) => {
    const serialized = JSON.stringify(fc);
    // Первое уведомление после загрузки файла — исходное состояние, а не правка
    if (baselineRef.current === null && geometryUrl) baselineRef.current = serialized;
    else if (serialized !== baselineRef.current) setMapDirty(true);
    setGeojson(fc);
    setStats(s);
    setMarkers(ms);
  };

  const handleStyleChange = (value) => {
    setHikeStyleTouched(true);
    if (Array.isArray(value)) setHikeStyle(value);
    else setHikeStyle(value === undefined || value === null ? [] : [value]);
  };

  /* ------------------------------- Маркеры -------------------------------- */

  const closePinForm = () => {
    setPinForm(null);
    mapRef.current?.setPending(null);
  };

  const changeMode = (next) => {
    setMode(next);
    closePinForm();
  };

  const requestPin = ({ lat, lng }) => {
    const next = { lat, lng, emoji: PIN_KINDS[0], title: '', desc: '', address: '', photo: null };
    setPinForm(next);
    setDeletingId(null);
    mapRef.current?.setPending({ lat, lng }, next.emoji);

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

  /* -------------------------------- Обложка ------------------------------- */

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCoverBusy(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append('cover', file);
      const { res } = await apiFetch(`/api/routes/${routeId}/cover`, { method: 'PATCH', body });
      if (!res.ok) {
        showError(await readError(res, t('coverFailed')));
        return;
      }
      const data = await res.json();
      if (data.route) setRoute((prev) => ({ ...prev, ...data.route }));
      setCoverPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setMessage({ type: 'ok', text: t('coverSaved') });
    } catch (err) {
      console.error('Error uploading cover:', err);
      showError(t('coverFailed'));
    } finally {
      setCoverBusy(false);
    }
  };

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  /* ------------------------------ Сохранение ------------------------------ */

  const submitSave = async () => {
    const name = form.name.trim();
    if (!name) {
      showError(t('nameRequired'));
      return;
    }
    if (mapDirty && stats.points < 2) {
      showError(t('needPoints'));
      return;
    }

    // Отправляем только изменённые поля
    const original = formFromRoute(route);
    const patch = {};
    for (const key of TEXT_FIELDS) {
      const value = key === 'name' ? name : form[key].trim();
      if (value !== original[key]) patch[key] = value;
    }
    if (form.difficulty && form.difficulty !== original.difficulty) patch.difficulty = form.difficulty;
    if (form.duration_min !== original.duration_min) {
      const minutes = Number(form.duration_min);
      if (form.duration_min === '' || !Number.isInteger(minutes) || minutes < 0) {
        showError(t('durationInvalid'));
        return;
      }
      patch.duration_min = minutes;
      patch.duration_estimated = false; // значение задано вручную
    }
    if (hikeStyleTouched) patch.hike_style = hikeStyle;

    setSaving(true);
    setMessage(null);
    try {
      // Сначала трек: сервер пересчитывает по нему длину, сложность и время,
      // поэтому правки полей ниже должны идти после него
      if (mapDirty) {
        const body = new FormData();
        body.append('file', new File([JSON.stringify(geojson)], 'route.geojson', { type: 'application/geo+json' }));
        const { res } = await apiFetch(`/api/routes/${routeId}/file?type=geojson`, { method: 'PATCH', body });
        if (!res.ok) {
          showError(await readError(res, t('saveFailed')));
          return;
        }
      }

      if (Object.keys(patch).length > 0) {
        const { res } = await apiFetch(`/api/routes/${routeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          showError(await readError(res, t('saveFailed')));
          return;
        }
      }

      setMessage({ type: 'ok', text: t('saved') });
      if (goBack) goBack();
      else navigate?.('myRoutes');
    } catch (err) {
      console.error('Error saving route:', err);
      showError(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------- Разметка ------------------------------- */

  if (loadingRoute && routeId != null) {
    return (
      <div id="screen">
        <div className="muted">{t('loading')}</div>
      </div>
    );
  }
  if (routeId == null || loadError || !route || !form) {
    return (
      <div id="screen">
        <div className="error" role="alert">{t('loadFailed')}</div>
      </div>
    );
  }

  return (
    <div id="screen">
      <h2 style={{ fontSize: '22px' }}>{t('title')}</h2>

      <div className="field-label">{t('routeName')}</div>
      <input
        type="text"
        maxLength={100}
        placeholder={t('routeNamePh')}
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
      />

      <div className="field-label">{t('routeDescription')}</div>
      <textarea
        placeholder={t('routeDescPh')}
        value={form.description}
        onChange={(e) => updateField('description', e.target.value)}
      />

      <div className="field-label">{t('region')}</div>
      <input
        type="text"
        maxLength={300}
        value={form.region}
        onChange={(e) => updateField('region', e.target.value)}
      />

      <div className="field-label">{t('startName')}</div>
      <input
        type="text"
        maxLength={300}
        value={form.start_name}
        onChange={(e) => updateField('start_name', e.target.value)}
      />

      <div className="field-label">{t('finishName')}</div>
      <input
        type="text"
        maxLength={300}
        value={form.finish_name}
        onChange={(e) => updateField('finish_name', e.target.value)}
      />

      <div className="field-label">{t('difficulty')}</div>
      <select value={form.difficulty} onChange={(e) => updateField('difficulty', e.target.value)}>
        {!form.difficulty && <option value="">—</option>}
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>{t(`difficulty_${d}`)}</option>
        ))}
      </select>

      <div className="field-label">{t('durationMin')}</div>
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={form.duration_min}
        onChange={(e) => updateField('duration_min', e.target.value)}
      />
      {route.duration_estimated && form.duration_min === String(route.duration_min) && (
        <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>{t('durationEstimated')}</div>
      )}

      <div className="field-label">{t('routeType')}</div>
      <ChoiceGroup group="hikeStyle" value={hikeStyle} onChange={handleStyleChange} />

      <div className="field-label">{t('cover')}</div>
      {coverPreview && (
        <img
          src={coverPreview}
          alt=""
          style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
        />
      )}
      {!coverPreview && route.cover_file_id && (
        <div className="muted" style={{ fontSize: '12.5px', marginBottom: '8px' }}>{t('coverSet')}</div>
      )}
      <label className="upload-btn">
        {coverBusy ? t('coverUploading') : t('coverUpload')}
        <input
          type="file"
          accept={COVER_ACCEPT}
          style={{ display: 'none' }}
          disabled={coverBusy}
          onChange={handleCoverChange}
        />
      </label>

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

      <div style={{ width: '100%', overflow: 'hidden', borderRadius: 'var(--radius)', background: 'var(--sand)' }}>
        <RouteMapEdit
          ref={mapRef}
          mode={mode}
          center={
            route.start_lat != null && route.start_lon != null
              ? { lat: Number(route.start_lat), lng: Number(route.start_lon) }
              : null
          }
          onChange={handleMapChange}
          onPinRequest={requestPin}
          onMarkerDelete={setDeletingId}
          labels={mapLabels}
          height={300}
        />
      </div>

      <div className="space-between" style={{ marginTop: '8px' }}>
        <div className="muted" style={{ fontSize: '12.5px' }}>
          {t('stats', { points: stats.points, markers: stats.markers, km: stats.km.toFixed(2) })}
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
      {mapDirty && (
        <div className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>{t('trackChangedHint')}</div>
      )}

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
                    <div className="muted" style={{ fontSize: '12.5px', marginTop: '3px' }}>{m.desc}</div>
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
        disabled={saving}
        onClick={submitSave}
      >
        {saving ? t('submitting') : t('submit')}
      </button>
    </div>
  );
}
