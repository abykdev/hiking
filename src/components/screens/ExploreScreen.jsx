import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RoutesList from '../RoutesList';

export default function ExploreScreen({ navigate }) {
    const { t, i18n } = useTranslation('onboarding');
    //console.log('language:', i18n.language);
    //console.log('all data:', i18n.store.data);
    //console.log('t:', t('heading'));
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

                <div className="space-between">
                    <h2 style={{ fontSize: '22px' }}>Explore</h2>
                    <button className="btn btn-outline btn-sm" onClick={requestLocation}>📍 Enable location</button>
                </div>
                <p className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>Location access was denied. Enable it in your browser settings to see distance to trailheads.</p>
                <div className="section-title">Popular trails in Armenia</div>

                <RoutesList
                    navigate={navigate}
                />

                <div className="section-title">Community routes</div>

                <div className="card clickable" style={{ marginBottom: '10px', cursor: 'pointer' }} onClick={() => go('hikeDetail')}>

                    <div style={{ height: '240px', borderRadius: 'var(--radius)', background: 'var(--sand)', overflow: 'hidden' }}>
                        <svg width="100%" height="100%" viewBox="0 0 300 240">
                            <path d="M278.0,218.0 L244.2,170.9 L214.3,113.8 L171.4,69.1 L124.7,36.9 L75.3,22.0 L22.0,27.0" fill="none" stroke="#C17A82" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"></path>
                            <circle cx="278.0" cy="218.0" r="6" fill="#C9A6AE" stroke="#fff" strokeWidth="2"></circle>
                            <circle cx="22.0" cy="27.0" r="6" fill="#D1495B" stroke="#fff" strokeWidth="2"></circle>
                        </svg>
                    </div>
                    <div className="space-between" style={{ marginTop: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '14.5px' }}>Parz Lake — Goshavank</div>
                        <span className="tag">🔒 Group</span>
                    </div>
                    <div className="muted" style={{ fontSize: '12.5px', marginTop: '4px' }}>8 km · 4 joined</div>
                    <button className="btn btn-outline btn-sm" style={{ marginTop: '10px' }} onClick={(e) => { e.stopPropagation(); joinHike(); }}>Join hike</button>
                </div>

                <p className="muted">No community-recorded routes yet.</p>

            </div>
        </>
    );
}
