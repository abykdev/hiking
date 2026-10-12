import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/client';

export default function RoutesList({
  navigate
}) {
  const { i18n } = useTranslation();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const go = (target, params) => navigate?.(target, params);
  // Загрузка опций
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    apiFetch(`/api/routes?lang=${i18n.language}`)
      .then(({ res }) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();            // ← вот здесь парсим JSON
      })
      .then((data) => {
        if (cancelled) return;
        setRoutes(data.routes ?? []);

        setError(null);
        console.log("data.routes : ", data.routes)
      })
      .catch(() => {
        if (cancelled) return;
        setError('loadFailed');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="muted">…</div>;
  if (error) return <div className="error">{error}</div>;



  return (
    <>
    {routes.map((route) => (
          <div key={route.id} className="card" style={{ marginBottom: '10px', cursor: 'pointer' }} onClick={() => go('routeSingle', { id: route.id })}>
            <div className="space-between">
              <div style={{ fontWeight: 600, fontSize: '14.5px' }}>{route.name}</div>
              <span className="tag" style={{ background: 'var(--sage)' }}>Easy</span>
            </div>
            <div className="muted" style={{ fontSize: '12.5px', marginTop: '2px' }}>{route.description}</div>
            <div className="muted" style={{ fontSize: '12.5px', marginTop: '6px' }}>{route.length_m / 1000} km · +{route.elevation_gain_m ?? 0} m</div>
          </div>
        ))}
    </>
  );
}