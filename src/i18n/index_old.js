import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enOnboarding from '../locales/en/onboarding.json';
import ruOnboarding from '../locales/ru/onboarding.json';
import enSignIn from '../locales/en/signin.json';
import ruSignIn from '../locales/ru/signin.json';
import enSignUp from '../locales/en/signup.json';
import ruSignUp from '../locales/ru/signup.json';
console.log("enSignIn",enSignIn);
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { onboarding: enOnboarding, signin: enSignIn, signup: enSignUp },
      ru: { onboarding: ruOnboarding, signin: ruSignIn, signup: ruSignUp }
    },
    lng: localStorage.getItem('lang') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });
i18n.on('languageChanged', (lng) => localStorage.setItem('lang', lng));
console.log('i18n initialized', i18n.isInitialized, i18n.language);
export default i18n;
  