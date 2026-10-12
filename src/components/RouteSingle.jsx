import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/client';
import RouteMap from './RouteMap';
//import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

export default function RoutesSingle({
  navigate,
  id,
}) {
  const { i18n } = useTranslation();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const go = (target, params) => navigate?.(target, params);

  const [map, setMap] = useState(null);
  const [geoJson, setGeoJson] = useState(null);
  const [gpxUrl, setgpxUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const {res} = await apiFetch(`/api/routes/${id}?lang=${i18n.language}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setRoute(data.route ?? null);
        setError(null);
        console.log("data.route : ", data.route);
        setgpxUrl(data.route?.gpx_url ?? '');
        
      } catch (err) {
        if (cancelled) return;
        setError('loadFailed');
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    fetchData();

    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="muted">…</div>;
  if (error) return <div className="error">{error}</div>;



  return (
    <>
      <div className="hero-img" style={{ height: '160px' }}>
        <div>
          <div className="display" style={{ fontSize: '20px' }}>{route?.name ?? ''}</div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>Гарни, Котайкская область</div>
        </div>
      </div>
      <div className="space-between" style={{ marginTop: '16px' }}>
        <div><div className="muted">Дистанция</div><div style={{ fontWeight: 700 }}>{route?.length_m ? route.length_m / 1000 : ''} km</div></div>
        <div><div className="muted">Набор высоты</div><div style={{ fontWeight: 700 }}>+{route?.elevation_gain_m ?? ''} m</div></div>
        <div><div className="muted">Прим. длительность</div><div style={{ fontWeight: 700 }}>{route?.duration ?? ''}h</div></div>
      </div>
      <div className="section-title">Карта маршрута</div>

      <div style={{ height: '240px', borderRadius: 'var(--radius)', background: 'var(--sand)', overflow: 'hidden' }}>
        <RouteMap
          gpxUrl={gpxUrl}
          route={route}
        />
      </div>
      <div className="row" style={{ marginTop: '8px', gap: '8px' }}>
        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setMapView('me')}>Центрировать на мне</button>
        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => setMapView('fit')}>Весь маршрут</button>
      </div>
    </>
  );
}