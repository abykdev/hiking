import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import home from '../assets/footer_home.png';
import explore from '../assets/footer_explore.png';
import myRoutes from '../assets/footer_myroutes.png';
import messages from '../assets/footer_messages.png';
import profile from '../assets/footer_profile.png';
const icons={
    home,
    explore,
    myRoutes,
    messages,
    profile
}

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
                    <span className="ic" ><span className="emo" style={{backgroundImage:`url(${icons.home})`}}>🏠</span></span>Home
                </button>
                <button className="tab" onClick={() => go('explore')}>
                    <span className="ic">
                        <span className="emo" style={{backgroundImage:`url(${icons.explore})`}}>🧭</span>
                    </span>Available routes
                </button>
                <button className="tab" onClick={() => go('myRoutes')}>
                    <span className="ic"><span className="emo" style={{backgroundImage:`url(${icons.myRoutes})`}}>🥾</span></span>My Routes
                </button>
                <button className="tab" onClick={() => go('messages')}>
                    <span className="ic"><span className="emo" style={{backgroundImage:`url(${icons.messages})`}}>💬</span></span>Messages
                </button>
                <button className="tab active" onClick={() => go('profile')}>
                    <span className="ic"><span className="emo" style={{backgroundImage:`url(${icons.profile})`}}>👤</span></span>Profile
                </button>
            </div>
        
    );
}
