import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();

  // null — если пользователь ещё не выбирал язык (нужно для онбординга)
  const [lang, setLang] = useState(() => localStorage.getItem('lang'));

  useEffect(() => {
    if (lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem('lang', lang);
    }
  }, [lang, i18n]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}