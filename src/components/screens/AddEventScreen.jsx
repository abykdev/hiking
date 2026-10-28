import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../../api/client';

const MAP_VIS = [
  ['all', 'mapVisAll'],
  ['members', 'mapVisMembers'],
  ['hidden', 'mapVisHidden'],
  ['me', 'mapVisMe'],
];
const RIDE_SEATS = [1, 2, 3, 4];
const DIFFICULTY_KEYS = {
  easy: 'diffEasy',
  moderate: 'diffModerate',
  hard: 'diffHard',
  expert: 'diffExpert',
};

const pad2 = (n) => String(n).padStart(2, '0');

// Склеиваем дату и время формы в ISO 8601 с часовым поясом пользователя,
// например 2026-11-15T08:00:00+03:00. Возвращает null, если дата некорректна.
function toStartsAt(dateVal, timeVal) {
  const local = new Date(`${dateVal}T${timeVal || '00:00'}`);
  if (Number.isNaN(local.getTime())) return null;
  const offsetMin = -local.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return (
    `${dateVal}T${timeVal || '00:00'}:00` +
    `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  );
}

function Toggle({ label, hint, on, onChange }) {
  return (
    <div className="card toggle-row" style={{ marginTop: '12px', padding: '14px 16px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{label}</div>
        {hint && (
          <div className="muted" style={{ fontSize: '11.5px', marginTop: '2px' }}>
            {hint}
          </div>
        )}
      </div>
      <div
        className={`switch ${on ? 'on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={label}
        tabIndex={0}
        onClick={() => onChange(!on)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onChange(!on);
          }
        }}
      >
        <div className="knob" />
      </div>
    </div>
  );
}

export function AddEventScreen({ params, navigate }) {
  const { t } = useTranslation('addEvent');
  const routeId = params?.route_id ?? null;
  const route = params?.route ?? null; // необязательно: данные маршрута для карточки

  const [title, setTitle] = useState(params?.title ?? route?.name ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:30');
  const [lookingForBuddies, setLookingForBuddies] = useState(false);
  const [createGroup, setCreateGroup] = useState(false);
  const [groupSize, setGroupSize] = useState(6);
  const [offersRide, setOffersRide] = useState(false);
  const [rideSeats, setRideSeats] = useState(2);
  const [mapVis, setMapVis] = useState('all');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (text) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const submit = async () => {
    if (!title.trim()) {
      showToast(t('needTitle'));
      return;
    }
    if (!date) {
      showToast(t('needDate'));
      return;
    }
    const startsAt = toStartsAt(date, time);
    if (!startsAt) {
      showToast(t('needValidDate'));
      return;
    }

    const body = {
      title: title.trim(),
      starts_at: startsAt,
      looking_for_buddies: lookingForBuddies,
      create_group: createGroup,
      offers_ride: offersRide,
      map_visibility: mapVis,
    };
    if (routeId != null) body.route_id = routeId;
    if (createGroup) body.group_size = groupSize;
    if (offersRide) body.ride_seats = rideSeats;

    setLoading(true);
    try {
      const { res } = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(t('created'));
        navigate?.('home');
        return;
      }
      let text = t('saveFailed');
      try {
        const data = await res.json();
        if (data?.error) text = data.error;
      } catch {
        /* тело ответа не JSON — оставляем общий текст */
      }
      showToast(text);
    } catch (err) {
      console.error('Error creating event:', err);
      showToast(t('saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px' }}>{t('title')}</h2>

      {route && (
        <div className="card" style={{ marginTop: '10px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>{route.name}</div>
          <div className="muted" style={{ fontSize: '12.5px', marginTop: '4px' }}>
            {[
              route.distance != null && `${route.distance} ${t('kmShort')}`,
              route.elevation != null && `+${route.elevation} m`,
              DIFFICULTY_KEYS[route.difficulty] && t(DIFFICULTY_KEYS[route.difficulty]),
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          {route.description && (
            <p style={{ fontSize: '13.5px', lineHeight: 1.5, marginTop: '10px' }}>
              {route.description}
            </p>
          )}
        </div>
      )}

      <div className="field-label">{t('eventTitleLabel')}</div>
      <input
        type="text"
        value={title}
        maxLength={150}
        placeholder={t('eventTitlePh')}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="field-label">{t('dateLabel')}</div>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="field-label">{t('timeLabel')}</div>
      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />

      <Toggle
        label={t('lookingForBuddiesToggle')}
        hint={t('lookingForBuddiesHint')}
        on={lookingForBuddies}
        onChange={setLookingForBuddies}
      />

      <Toggle
        label={t('createGroupToggle')}
        hint={t('createGroupHint')}
        on={createGroup}
        onChange={setCreateGroup}
      />
      {createGroup && (
        <>
          <div className="field-label">
            {t('groupSizeSection')}: <span>{groupSize}</span> {t('peopleUnit')}
          </div>
          <input
            type="range"
            min="2"
            max="12"
            step="1"
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--forest)' }}
          />
        </>
      )}

      <Toggle label={t('offersRideToggle')} on={offersRide} onChange={setOffersRide} />
      {offersRide && (
        <>
          <div className="field-label">{t('rideSeatsLabel')}</div>
          <div className="chip-row">
            {RIDE_SEATS.map((n) => (
              <div
                key={n}
                className={`chip ${rideSeats === n ? 'selected' : ''}`}
                onClick={() => setRideSeats(n)}
              >
                {n}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="field-label">🗺 {t('mapVisTitle')}</div>
      <div className="chip-row">
        {MAP_VIS.map(([key, label]) => (
          <div
            key={key}
            className={`chip ${mapVis === key ? 'selected' : ''}`}
            onClick={() => setMapVis(key)}
          >
            {t(label)}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: '22px' }}
        disabled={loading}
        onClick={submit}
      >
        {loading ? t('submitting') : t('submit')}
      </button>

      <div id="toast" className={toast ? 'show' : ''} role="status">
        {toast}
      </div>
    </div>
  );
}

export default AddEventScreen;
