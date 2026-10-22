import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { c: 'en', n: 'English' },
  { c: 'ru', n: 'Русский' },
  { c: 'hy', n: 'Հայերեն' },
  { c: 'uk', n: 'Українська' },
  { c: 'es', n: 'Español' },
  { c: 'fr', n: 'Français' },
  { c: 'de', n: 'Deutsch' },
  { c: 'it', n: 'Italiano' },
  { c: 'pt', n: 'Português' },
  { c: 'tr', n: 'Türkçe' },
  { c: 'ka', n: 'ქართული' },
  { c: 'ar', n: 'العربية' },
  { c: 'zh', n: '中文' },
  { c: 'ja', n: '日本語' },
  { c: 'ko', n: '한국어' },
];

export default function LangSheet({ isOpen, currentLang, onSelect, onClose }) {
  const { t } = useTranslation('langsheet');

  if (!isOpen) return null;

  return createPortal(
    <>
      <div id="langSheet">
        <div className="lang-backdrop" onClick={onClose} />
        <div className="lang-panel" role="listbox">
          <div className="lang-title">🌐 {t('chooseLang')}</div>
          <div className="lang-list">
            {LANGS.map((l) => (
              <button
                key={l.c}
                className={`lang-opt ${currentLang === l.c ? 'active' : ''}`}
                role="option"
                aria-selected={currentLang === l.c}
                onClick={() => onSelect(l.c)}
              >
                <span>{l.n}</span>
                <span className="lang-code">
                  {l.c.toUpperCase()}
                  {currentLang === l.c ? ' ✓' : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

    </>,
    document.body
  );
}