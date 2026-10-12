import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { gpx } from '@mapbox/togeojson';

const loadGpxFromUrl = async (url) => {
    // 1. Загружаем текст файла
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить GPX: ${response.status} ${response.statusText}`);
  }
  const gpxText = await response.text();

  // 2. Парсим XML
  const parser = new DOMParser();
  const gpxDom = parser.parseFromString(gpxText, 'text/xml');

  // DOMParser не бросает исключений — ошибки парсинга он кладёт в <parsererror>
  const parseError = gpxDom.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Некорректный GPX: ${parseError.textContent}`);
  }

  // 3. Конвертируем в GeoJSON
  const geoJson = gpx(gpxDom);

  // togeojson вернёт FeatureCollection даже для пустого GPX — проверяем, что там что-то есть
  if (!geoJson?.features?.length) {
    throw new Error('GPX не содержит треков или точек');
  }

  return geoJson;
};
export default function RouteMap({ gpxUrl, route }) {
    if (!gpxUrl) return <div>Loading map...</div>;
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: 'AIzaSyDrGMTqk9G2O7bmZMKcK6a5BU7srhwvpR4',
    });
    const [map, setMap] = useState(null);
    const [geoJson, setGeoJson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        if (gpxUrl) {
            loadGpxFromUrl(gpxUrl)
                .then((data) => { if (!cancelled) setGeoJson(data); })
                .catch((err) => { if (!cancelled) setError(err.message); })
                .finally(() => { if (!cancelled) setLoading(false); });

        }
        return () => { cancelled = true; };
    }, [gpxUrl]);
    useEffect(() => {
        if (!map || !geoJson) return;
        map.data.forEach((f) => map.data.remove(f));
        map.data.addGeoJson(geoJson);
        
        const bounds = new window.google.maps.LatLngBounds();
        map.data.forEach((feature) => {
            const geometry = feature.getGeometry();
            geometry.forEachLatLng
                ? geometry.forEachLatLng((latLng) => bounds.extend(latLng))
                : bounds.extend(geometry.get()); // Point
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }, [map, geoJson]);
    if (!isLoaded) return <div>Loading map...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <GoogleMap
            mapContainerStyle={{ width: '100%', height: '240px' }}
            center={{
                lat: route?.start_lat ?? 0,
                lng: route?.start_lon ?? 0,
            }}
            zoom={8}
            onLoad={map => setMap(map)}
        />
    );
}