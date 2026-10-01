import { useState } from 'react';
import { useTranslation } from 'react-i18next';


function HomeScreen({ navigate }) {
  const { t, i18n } = useTranslation('onboarding');
  //console.log('language:', i18n.language);
  //console.log('all data:', i18n.store.data);
  //console.log('t:', t('heading'));
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

  return (
    <div className="screen">
        <div className="status-bar">
          
        </div>

        <div className="content" style={{justifyContent: 'space-between', paddingTop: '60px'}}>

          <div></div>

          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div className="boot">🥾</div>
            <h1 className="heading">Main screen</h1>
            
          </div>

          

        </div>

        <div className="home-indicator"><span></span></div>
      </div>
  );
}

export default HomeScreen;