import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { COUNTRIES } from '../utils/countries';
import { useState, useMemo } from 'react';

export default function CountrySheet({ isOpen, currentCode, onSelect, onClose }) {
  const { t, i18n } = useTranslation('onboarding');
  const [query, setQuery] = useState('');
  const lang = i18n.language;

  const filtered = useMemo(() => {
    if (!query.trim()) return COUNTRIES;
    const q = query.toLowerCase();
    return COUNTRIES.filter((c) => {
      const name = (c.name[lang] ?? c.name.en).toLowerCase();
      return (
        name.includes(q) ||
        c.alpha2.toLowerCase().includes(q) ||
        c.alpha3.toLowerCase().includes(q)
      );
    });
  }, [query, lang]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="lang-backdrop" onClick={onClose} />
      <div className="lang-panel" role="listbox">
        <div className="lang-title">🌍 {t('chooseCountry')}</div>
        <input
          type="text"
          placeholder={t('search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="lang-search"
          autoFocus
        />
        <div className="lang-list">
          {filtered.map((country) => {
            const isActive = currentCode === country.alpha2;
            return (
              <button
                key={country.alpha2}
                className={`lang-opt ${isActive ? 'active' : ''}`}
                role="option"
                aria-selected={isActive}
                onClick={() => onSelect(country.alpha2)}
              >
                <span>{country.name[lang] ?? country.name.en}</span>
                <span className="lang-code">
                  {country.alpha2}
                  {isActive ? ' ✓' : ''}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="muted" style={{ padding: '10px' }}>
              {t('nothingFound')}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}