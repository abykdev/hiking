import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RouteSingle from '../RouteSingle';

export default function RouteSingleScreen({ navigate, params }) {
    const { t, i18n } = useTranslation('onboarding');
    //console.log('language:', i18n.language);
    //console.log('all data:', i18n.store.data);
    console.log('params:', params);
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
    const go = (target, params) => navigate?.(target, params);
    const requestLocation = () => {
        // Implement location request logic here
        console.log('Requesting location...');
    };
    const joinHike = () => {
        // Implement join hike logic here
        console.log('Joining hike...');
    };
    return (
        <>
            <div id="activebar"></div>
            <div id="topbar" className="topbar">
                <div style={{ width: '36px' }}></div>
                <span className="display" style={{ fontSize: '15px', fontWeight: 600 }}>🥾 Trailkin</span>
                <div style={{ width: '36px' }}></div>
            </div>
            <div id="screen">
                <RouteSingle
                    id={params.id}
                />
                <p className="muted" style={{ fontSize: '11px', marginTop: '4px' }}>Маршрут показан схематично — в этой сборке недоступны живые тайлы карты.</p>

                <p style={{ fontSize: '14px', lineHeight: 1.5, marginTop: '14px' }}>Лёгкая петля от села Гарни вниз в ущелье к базальтовым колоннам.</p>

                <div className="card" style={{ marginTop: '6px' }}>
                    <button className="btn btn-outline btn-sm" onClick={requestLocation}>Показать расстояние от меня</button>
                    <a className="sms-link" style={{ marginTop: '10px' }} href="https://maps.apple.com/?ll=40.1063,44.7302&amp;q=%D0%A3%D1%89%D0%B5%D0%BB%D1%8C%D0%B5%20%D0%93%D0%B0%D1%80%D0%BD%D0%B8%20%E2%80%94%20%D0%A1%D0%B8%D0%BC%D1%84%D0%BE%D0%BD%D0%B8%D1%8F%20%D0%BA%D0%B0%D0%BC%D0%BD%D0%B5%D0%B9" target="_blank" rel="noopener">Открыть в Картах</a>
                    <details style={{ marginTop: '10px' }}>
                        <summary className="muted" style={{ fontSize: '12px', cursor: 'pointer' }}>Координаты старта</summary>
                        <div style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '4px' }}>40.1063, 44.7302</div>
                    </details>
                </div>

                <button className="btn btn-outline" style={{ marginTop: '14px' }} onClick={() => toggleOffline('garni')}>Сделать доступным офлайн</button>

                <div className="card" style={{ marginTop: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13.5px', marginBottom: '10px' }}>0 женщин(ы) хотят пойти сюда</div>
                    <button className="btn btn-primary" onClick={() => expressInterest('garni')}>Я хочу сюда в поход</button>
                </div>

            </div>
        </>
    );
}
