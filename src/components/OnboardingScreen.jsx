import { useState } from 'react';

import { useTranslation } from 'react-i18next';


function OnboardingScreen() {
  const { t, i18n } = useTranslation('onboarding');
  console.log('current ns:', i18n.options.defaultNS);
  console.log('language:', i18n.language);
  console.log('all data:', i18n.store.data);
  console.log('t:', t('heading'));
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

  return (
    <div className="screen">
        <div className="status-bar">
          <span>9:41</span>
          <div className="icons">
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none"><rect x="0" y="7" width="3" height="5" rx="0.5" fill="currentColor"></rect><rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="currentColor"></rect><rect x="9" y="2.5" width="3" height="9.5" rx="0.5" fill="currentColor"></rect><rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="currentColor"></rect></svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M8 3.2c2.3 0 4.4.9 6 2.3l-1.2 1.3A6.9 6.9 0 0 0 8 5c-1.8 0-3.5.6-4.8 1.8L2 5.5A9 9 0 0 1 8 3.2z" fill="currentColor"></path><path d="M8 6.8c1.2 0 2.3.4 3.1 1.2L9.9 9.3a2.1 2.1 0 0 0-1.9-.5 2.1 2.1 0 0 0-1 .5L5.7 8a4.5 4.5 0 0 1 2.3-1.2z" fill="currentColor"></path></svg>
            <svg width="24" height="12" viewBox="0 0 24 12" fill="none"><rect x="0.5" y="0.5" width="20" height="11" rx="2.5" stroke="currentColor"></rect><rect x="2" y="2" width="17" height="8" rx="1.3" fill="currentColor"></rect><rect x="21.5" y="4" width="1.6" height="4" rx="0.8" fill="currentColor"></rect></svg>
          </div>
        </div>

        <div className="content" style={{justifyContent: 'space-between', paddingTop: '60px'}}>

          <div></div>

          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div className="boot">🥾</div>
            <h1 className="heading">{t('heading')}</h1>
            <p className="subheading">{t('subheading')}</p>

            <div className="lang-toggle">
              <button className={lang === 'en' ? 'active' : ''} type="button" onClick={() => { setLang('en'); i18n.changeLanguage('en'); }}>EN</button>
              <button className={lang === 'ru' ? 'active' : ''} type="button" onClick={() => { setLang('ru'); i18n.changeLanguage('ru'); }}>RU</button>
            </div>
          </div>

          <div className="bottom-group">
            <button className="btn btn-primary" type="button">{t('getStarted')}</button>
          </div>

        </div>

        <div className="home-indicator"><span></span></div>
      </div>
  );
}

export default OnboardingScreen;