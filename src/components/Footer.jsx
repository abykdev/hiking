import { useState } from 'react';
import { useTranslation } from 'react-i18next';


export default function Footer({ navigate }) {
    const { t, i18n } = useTranslation('onboarding');
    //console.log('language:', i18n.language);
    //console.log('all data:', i18n.store.data);
    //console.log('t:', t('heading'));
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
    const go = (target, params) => navigate?.(target, params);
    return (
        
            <div id="tabbar" className="tabbar">
                <button className="tab" onClick={() => go('home')}>
                    <span className="ic">🏠</span>Главная
                </button>
                <button className="tab" onClick={() => go('explore')}>
                    <span className="ic">🧭</span>Открыть
                </button>
                <button className="tab" onClick={() => go('routes')}>
                    <span className="ic">🥾</span>Маршруты
                </button>
                <button className="tab" onClick={() => go('messages')}>
                    <span className="ic">💬</span>Сообщения
                </button>
                <button className="tab active" onClick={() => go('profile')}>
                    <span className="ic">👤</span>Профиль
                </button>
            </div>
        
    );
}
