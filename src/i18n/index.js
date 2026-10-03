import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const modules = import.meta.glob('../locales/*/*.json', {
  eager: true,
  query: '?raw',
  import: 'default'
});

const resources = {};
for (const path in modules) {
  // '../locales/en/onboarding.json' → ['en', 'onboarding']
  const [, lng, ns] = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  resources[lng] ??= {};
  resources[lng][ns] = modules[path];
}
for (const key_lang in resources){
  console.log("resources[key_lang]",resources[key_lang]);
  for(const key_screen in resources[key_lang]){
    let strJson=resources[key_lang][key_screen];
    strJson=strJson.replace(/\\[rn]/g, ' ');
    console.log("strJson",strJson);
    resources[key_lang][key_screen]=JSON.parse(strJson.trim());
    
  }
}
console.log("i18n resources", resources)
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('lang') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

i18n.on('languageChanged', (lng) => localStorage.setItem('lang', lng));

export default i18n;