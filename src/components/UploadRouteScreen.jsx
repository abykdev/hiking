import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth/AuthContext';
import { apiFetch } from '../api/client';

export default function UploadRouteScreen({ navigate }) {
    const { t, i18n } = useTranslation('onboarding');
    const { user } = useAuth();
    const [routeName, setRouteName] = useState('');
    const [routeDescription, setRouteDescription] = useState('');
    const [routeFile, setRouteFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const go = (target, params) => navigate(target, params);

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
                //go('home');
                console.log('Route uploaded successfully ', response);
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
            <h1>{t('uploadRoute')}</h1>
            <input
                type="text"
                placeholder={t('routeName')}
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
            />
            <textarea
                placeholder={t('routeDescription')}
                value={routeDescription}
                onChange={(e) => setRouteDescription(e.target.value)}
            />
            <label htmlFor="route-file">{t('chooseFile')}</label>
            <input
                id="route-file"
                type="file"
                accept=".gpx,.geojson,application/gpx+xml,application/geo+json"
                onChange={(e) => setRouteFile(e.target.files?.[0] ?? null)}
            />
            {routeFile && <span>{routeFile.name}</span>}
            <button onClick={uploadRoute} disabled={loading}>
                {loading ? t('uploading') : t('upload')}
            </button>
        </div>
    );
}