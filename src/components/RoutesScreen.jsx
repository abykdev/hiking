import { useState } from 'react';
import { useTranslation } from 'react-i18next';



export default function RoutesScreen({ navigate }) {
    const { t, i18n } = useTranslation('onboarding');
    //console.log('language:', i18n.language);
    //console.log('all data:', i18n.store.data);
    //console.log('t:', t('heading'));
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
    const go = (target, params) => navigate?.(target, params);
    return (
        <>
            <div id="activebar"></div>
            <div id="topbar" className="topbar">
                <div style={{ width: '36px' }}></div>
                <span className="display" style={{ fontSize: '15px', fontWeight: 600 }}>🥾 Trailkin</span>
                <div style={{ width: '36px' }}></div>
            </div>
            
            <div id="screen">
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <div className="avatar" style={{ width: '70px', height: '70px', fontSize: '26px', margin: '0 auto' }}>?</div>
                    <h2 style={{ marginTop: '12px' }}>—</h2>
                    
                    <button onClick={() => go('uploadRoute')} >
                        New Route
                    </button>
                    <div className="muted"></div>
                </div>
            </div>


        </>
    );
}
