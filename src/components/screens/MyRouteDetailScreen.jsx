import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../api/client';
import RouteMapDetail from '../RouteMapDetail';

function formatDuration(min, t) {
  if (min == null) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} ${t('hourShort')} ${m} ${t('minShort')}` : `${m} ${t('minShort')}`;
}

export default function MyRouteDetailScreen({ navigate, params }) {
  const { t, i18n } = useTranslation('myRouteDetail');
  const routeId = params?.id;

  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const go = (target, p) => navigate?.(target, p);

  const showToast = (text) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (routeId == null) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const { res } = await apiFetch(`/api/routes/${routeId}?lang=${i18n.language}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setRoute(data.route ?? data);
        setLoadError(false);
      } catch (err) {
        console.error('Error loading route:', err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [routeId, i18n.language]);

  const startRename = () => {
    setNameDraft(route?.name ?? '');
    setRenaming(true);
  };

  const saveRename = async () => {
    const name = nameDraft.trim();
    if (!name) {
      showToast(t('nameRequired'));
      return;
    }
    if (name === route.name) {
      setRenaming(false);
      return;
    }
    setSaving(true);
    try {
      const { res } = await apiFetch(`/api/routes/${routeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRoute((prev) => ({ ...prev, name }));
      setRenaming(false);
      showToast(t('renamed'));
    } catch (err) {
      console.error('Error renaming route:', err);
      showToast(t('renameFailed'));
    } finally {
      setSaving(false);
    }
  };

  const onAddPhoto = () => fileInputRef.current?.click();

  // Файл отправляется сразу в галерею маршрута (поле photo)
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      const { res } = await apiFetch(`/api/routes/${routeId}/photos`, { method: 'POST', body });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRoute((prev) => ({ ...prev, photos: [...(prev.photos ?? []), data.photo] }));
      showToast(t('photoAdded'));
    } catch (err) {
      console.error('Error adding photo:', err);
      showToast(t('photoFailed'));
    } finally {
      setUploading(false);
    }
  };

  // Заглушка: действие подключим отдельно
  const onFollowRoute = () => {};
  const onDeleteRoute = () => setConfirmDelete(false);

  if (loading) {
    return (
      <div id="screen">
        <div className="muted">{t('loading')}</div>
      </div>
    );
  }
  if (routeId == null || loadError || !route) {
    return (
      <div id="screen">
        <div className="error" role="alert">{t('loadFailed')}</div>
      </div>
    );
  }

  const locked = Boolean(route.is_public);
  const km = route.length_m == null ? null : (route.length_m / 1000).toFixed(2);
  const stats = [
    km != null && `${km} ${t('kmShort')}`,
    route.duration_min != null &&
      `${formatDuration(route.duration_min, t)}${route.duration_estimated ? ` ${t('estimated')}` : ''}`,
  ].filter(Boolean).join(' · ');
  const mapLabels = {
    loading: t('mapLoading'),
    loadError: t('mapLoadError'),
    geometryLoadFailed: t('geometryLoadFailed'),
    expand: t('mapExpand'),
    collapse: t('mapCollapse'),
  };
  const geometryUrl = route.geojson_url ?? route.gpx_url ?? null;
  const photos = route.photos ?? [];
  const hasStart = route.start_lat != null && route.start_lon != null;

  return (
    <div id="screen">
      {renaming ? (
        <div>
          <input
            type="text"
            maxLength={100}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            autoFocus
          />
          <div className="row" style={{ gap: '10px', marginTop: '8px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRenaming(false)} disabled={saving}>
              {t('cancel')}
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveRename} disabled={saving}>
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: '20px' }}>{route.name}</h2>
          <div className="muted" style={{ fontSize: '12.5px' }}>{stats}</div>
          <button className="btn btn-outline btn-sm" style={{ marginTop: '8px' }} onClick={startRename}>
            {t('rename')}
          </button>
        </>
      )}

      <div style={{ marginTop: '10px' }}>
        {geometryUrl ? (
          <RouteMapDetail url={geometryUrl} labels={mapLabels} height={220} />
        ) : (
          <div className="muted">{t('mapEmpty')}</div>
        )}
      </div>

      {locked && (
        <div className="muted" style={{ fontSize: '12.5px', marginTop: '12px' }}>
          <span className="emo" style={{ backgroundImage: "url('/assets/lock.png')" }}>🔒</span> {t('lockedNote')}
        </div>
      )}
      <button
        className="btn btn-primary"
        style={{ marginTop: '10px' }}
        disabled={locked}
        onClick={() => go('editRoute', { id: routeId })}
      >
        <span className="emo" style={{ backgroundImage: "url('/assets/footer_myroutes.png')" }}>🥾</span> {t('editRoute')}
      </button>
      <button className="btn btn-primary" style={{ marginTop: '10px' }} onClick={() => go('addEvent', { route })}>
        <span className="emo" style={{ backgroundImage: "url('/assets/schedule.png')" }}>📅</span> {t('schedule')}
      </button>
      <button className="btn btn-outline" style={{ marginTop: '10px' }} onClick={onFollowRoute}>
        <span className="emo" style={{ backgroundImage: "url('/assets/footer_explore.png')" }}>🧭</span> {t('follow')}
      </button>
      {hasStart && (
        <a
          className="btn btn-outline"
          style={{ marginTop: '10px', textDecoration: 'none' }}
          href={`https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${route.start_lat},${route.start_lon}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('openInGoogleMaps')}
        </a>
      )}

      <div className="section-title">{t('photos')}</div>
      {photos.length === 0 ? (
        <p className="muted">{t('noPhotos')}</p>
      ) : (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {photos.map((photo) => (
            <button
              key={photo.file_id}
              type="button"
              onClick={() => setViewerUrl(photo.url)}
              aria-label={t('openPhoto')}
              style={{ flex: '0 0 33%', aspectRatio: '1', padding: 0, border: 0, borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer' }}
            >
              <img src={photo.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handlePhotoChange}
      />
      <button className="btn btn-outline" style={{ marginTop: '18px' }} onClick={onAddPhoto} disabled={uploading}>
        {uploading ? t('uploading') : t('addPhoto')}
      </button>
      <button
        className="btn btn-outline"
        style={{ marginTop: '18px', borderColor: 'var(--alert)', color: 'var(--alert)' }}
        onClick={() => setConfirmDelete(true)}
      >
        <span className="emo" style={{ backgroundImage: "url('/assets/delete.png')" }}>🗑</span> {t('deleteRoute')}
      </button>
      {confirmDelete && (
        <div className="inline-confirm" style={{ marginTop: '10px' }}>
          <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: '13.5px' }}>{t('deleteConfirm')}</p>
          <div className="row" style={{ gap: '10px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>
              {t('cancel')}
            </button>
            <button className="btn" style={{ flex: 1, background: 'var(--alert)', color: '#fff' }} onClick={onDeleteRoute}>
              {t('delete')}
            </button>
          </div>
        </div>
      )}

      {viewerUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setViewerUrl(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <button
            type="button"
            aria-label={t('close')}
            onClick={() => setViewerUrl(null)}
            style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 0, color: '#fff', fontSize: '28px', cursor: 'pointer' }}
          >
            ✕
          </button>
          <img src={viewerUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      )}

      <div id="toast" className={toast ? 'show' : ''} role="status">
        {toast}
      </div>
    </div>
  );
}
