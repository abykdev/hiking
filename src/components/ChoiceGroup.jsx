import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';

export default function ChoiceGroup({
  group,           // '/api/activities'
  value,              // выбранные id: строка или массив
  onChange,           // (newValue) => void
  label,              // заголовок группы
}) {
  const { i18n } = useTranslation();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Загрузка опций
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    api.get(`/api/refs/${group}`)
      .then((data) => {
        if (cancelled) return;
        setOptions(data.options ?? []);
        setMode(data.mode ?? 'single');
        setError(null);
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
  }, [group, modeProp]);

  if (loading) return <div className="muted">…</div>;
  if (error)   return <div className="error">{error}</div>;

  const isSelected = (id) => {
    if (mode === 'single') return value === id;
    return Array.isArray(value) && value.includes(id);
  };

  const handleClick = (id) => {
    if (mode === 'single') {
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
      {label && <div className="field-label">{label}</div>}
      <div className="chip-row">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`chip ${isSelected(option.id) ? 'selected' : ''}`}
            onClick={() => handleClick(option.id)}
          >
            {option.labels[i18n.language] ?? option.labels.en ?? option.id}
          </button>
        ))}
      </div>
    </div>
  );
}