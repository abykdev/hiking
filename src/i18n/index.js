import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enOnboarding from '../locales/en/onboarding.json';
import ruOnboarding from '../locales/ru/onboarding.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { onboarding: enOnboarding },
      ru: { onboarding: ruOnboarding }
    },
    lng: localStorage.getItem('lang') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });
i18n.on('languageChanged', (lng) => localStorage.setItem('lang', lng));
console.log('i18n initialized', i18n.isInitialized, i18n.language);
export default i18n;
  