import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api/client';


export default function ChoiceGroup({
  group,           // '/api/activities'
  value,              // выбранные id: строка или массив
  onChange,           // (newValue) => void
}) {
  const { i18n } = useTranslation();

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modeProp, setModeProp] = useState('single');
  // Загрузка опций
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    apiFetch(`/api/refs/${group}?lang=${i18n.language}`)
      .then(({ res }) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();            // ← вот здесь парсим JSON
      })
      .then((data) => {
        if (cancelled) return;
        setOptions(data.options ?? []);
        setModeProp(data.mode ?? 'single');
        setError(null);
        console.log("data " + group + ": ", data)
      })
      .catch(() => {
        if (cancelled) return;
        setError('loadFailed');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [group]);

  if (loading) return <div className="muted">…</div>;
  if (error) return <div className="error">{error}</div>;

  const isSelected = (id) => {
    if (modeProp === 'single') return value === id;
    return Array.isArray(value) && value.includes(id);
  };

  const handleClick = (id) => {
    if (modeProp === 'single') {
      onChange(id);
      return;
    }
    // multiple
    const current = Array.isArray(value) ? value : [];
    const next = current.includes(id)
      ? current.filter((v) => v !== id)
      : [...current, id];
    onChange(next);
  };

  return (
    <div>
      <div className="chip-row">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chip ${isSelected(option.id) ? 'selected' : ''}`}
            onClick={() => handleClick(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}