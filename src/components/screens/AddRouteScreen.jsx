import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../../api/client';
import ChoiceGroup from '../ChoiceGroup';
import RouteMap from '../RouteMap';
import { readGpxMeta } from '../../utils/gpxReader';

// Переименовываем компонент в AddRouteScreen



export default function AddRouteScreen({ navigate }) {
  const { t, i18n } = useTranslation('onboarding');
  const { user } = useAuth();
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [routeDraft, setRouteDraft] = useState('');
  const [routeFile, setRouteFile] = useState(null);
  const [hikeStyle, setHikeStyle] = useState([]);
  const [loading, setLoading] = useState(false);

  const go = (target, params) => navigate(target, params);

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0] ?? null;
    setRouteFile(selected);

    if (!selected) return;

    // Читаем только .gpx — .geojson это JSON, там другая структура
    if (!selected.name.toLowerCase().endsWith('.gpx')) return;

    try {
      const { name, description } = await readGpxMeta(selected);

      // Заполняем только пустые поля — не затираем то, что ввёл пользователь
      if (name) setRouteName((prev) => prev.trim() ? prev : name);
      if (description) setRouteDescription((prev) => prev.trim() ? prev : description);
    } catch (err) {
      console.warn('Не удалось прочитать метаданные GPX:', err);
      // Не показываем ошибку — автозаполнение необязательное
    }
  };

  const uploadRoute = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', routeName);
      formData.append('description', routeDescription);
      formData.append('userId', user.id);
      formData.append('lang', i18n.language);
      if (routeFile) {
        formData.append('file', routeFile);
      }

      const { res: response } = await apiFetch('/api/routes', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        console.log('Route uploaded successfully', response);
        // go('home');
      } else {
        console.error('Failed to upload route');
      }
    } catch (error) {
      console.error('Error uploading route:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    
      <div id="screen">
        <h2 style={{ fontSize: '22px' }}>Create route</h2>
        <p className="muted">Name it, pick what it is (any number of tags), then tap the map to draw the route and drop markers.</p>
        <div className="field-label">Route name</div>
        <input
          type="text"
          id="routeNameInput"
          placeholder="e.g. My morning loop"
          defaultValue=""
          onInput={(e) => setRouteName(e.target.value)} />
        <div className="field-label">Description (optional)</div>
        <textarea
          id="routeDescInput"
          placeholder="What's this route like?"
          onInput={(e) => setRouteDescription(e.target.value)}
        ></textarea>
        <div className="field-label">What is this route? (pick any)</div>

        <ChoiceGroup
          group="hikeStyle"

          onChange={(hikeStyleId) => setHikeStyle(hikeStyleId)}
        />

        <div className="chip-row" style={{ marginTop: '14px' }}>
          <div className="chip selected" onClick={() => setDraftMode('route')}><span className="emo" style={{ backgroundImage: 'url(#IMAGE#)' }}>〰</span> Route line</div>
          <div className="chip" onClick={() => setDraftMode('pin')}><span className="emo" style={{ backgroundImage: 'url(#IMAGE#)' }}>📍</span> Marker</div>
        </div>
        <div className="muted" style={{ fontSize: '12px', margin: '8px 0' }}>Tap the map to add route points.</div>
        <div className="mapwrap" data-key="createRoute#0">
          <button className="map-expand" onClick={(e) => { e.stopPropagation(); toggleMapExpand('createRoute#0'); }} aria-label="Expand map" title="Expand map">⤢</button>
          <div style={{ width: '100%', overflow: 'hidden', borderRadius: 'var(--radius)', height: '300px', position: 'relative' }}>
            <div style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, background: 'var(--sand)' }}>
              <RouteMap
                        
                        
                      />
            </div>
          </div>
        </div>
        <div className="space-between" style={{ marginTop: '8px' }}>
          <div className="muted" style={{ fontSize: '12.5px' }}>0 points · 0.00 km</div>
          <div className="row" style={{ gap: '6px' }}>
            <button className="btn btn-outline btn-sm" onClick={undoDraftPoint}>↶ Undo</button>
            <button className="btn btn-outline btn-sm" onClick={clearDraftPoints}>Clear</button>
          </div>
        </div>

        <label className="upload-btn" style={{ marginTop: '14px' }}>⬆ Upload GPX file
          <input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml,application/octet-stream" style={{ display: 'none' }} onChange={createRouteGpx} />
        </label>

        <div className="field-label">Visibility</div>
        <div className="chip-row">
          <div className="chip selected" data-vis="public" onClick={() => { routeDraft.visibility = 'public'; readDraftFields(); render(); }}>Public — visible to everyone</div>
          <div className="chip" data-vis="private" onClick={() => { routeDraft.visibility = 'private'; readDraftFields(); render(); }}>Private — only you</div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={submitCreateRoute}>＋ Add route</button>
      </div>
   
  );
}