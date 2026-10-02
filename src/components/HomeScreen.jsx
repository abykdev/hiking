import { useState } from 'react';
import { useTranslation } from 'react-i18next';


export default function HomeScreen({ navigate }) {
  const { t, i18n } = useTranslation('onboarding');
  //console.log('language:', i18n.language);
  //console.log('all data:', i18n.store.data);
  //console.log('t:', t('heading'));
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
  const go = (target, params) => navigate?.(target, params);
  return (
    <div id="shell">
      <div id="activebar"></div>

      <div id="topbar" className="topbar">
        <div style={{ width: 36 }}></div>
        <span className="display" style={{ fontSize: 15, fontWeight: 600 }}>
          🥾 Trailkin
        </span>
        <div style={{ width: 36 }}></div>
      </div>

      <div id="screen">
        <div className="space-between">
          <div>
            <div className="muted">—</div>
            <h2 style={{ fontSize: 24 }}>Чем хочешь заняться?</h2>
          </div>
          <div className="avatar">?</div>
        </div>

        <div className="chip-row" style={{ marginTop: 16 }}>
          <div className="chip" onClick={() => go('explore', { sort: 'easy' })}>🥾 Лёгкий поход</div>
          <div className="chip" onClick={() => go('explore', { sort: 'challenge' })}>⛰ Бросить вызов</div>
          <div className="chip" onClick={() => go('explore')}>🌅 Поход на рассвете</div>
          <div className="chip" onClick={() => go('explore')}>📸 Живописный маршрут</div>
          <div className="chip" onClick={() => go('explore')}>☕ Поход + кофе</div>
          <div className="chip" onClick={() => go('explore')}>🏕 С ночёвкой</div>
          <div className="chip" onClick={() => go('explore')}>🏃 Трейл-ран</div>
          <div className="chip" onClick={() => go('explore')}>✨ Удиви меня</div>
        </div>

        <div className="section-title">Предстоящие события</div>

        <div
          className="card row"
          style={{ marginBottom: 8, cursor: 'pointer' }}
          onClick={() => go('hikeDetail')}
        >
          <div className="avatar">🥾</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Озеро Парз — Гошаванк</div>
            <div className="muted">09:30 · Дилижан</div>
          </div>
        </div>

        <button
          className="btn btn-outline"
          style={{ marginTop: 8 }}
          onClick={() => go('createEvent')}
        >
          + Спланировать событие
        </button>

        <div className="section-title">Поход сегодня</div>

        <div
          className="card"
          style={{ marginTop: 10, cursor: 'pointer' }}
          onClick={() => go('hikeDetail')}
        >
          <div className="hero-img">
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                opacity: 0.85,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                Поход сегодня
              </div>
              <div className="display" style={{ fontSize: 20 }}>Дилижан</div>
            </div>
          </div>

          <div className="space-between" style={{ marginTop: 12 }}>
            <span className="muted">8 km · +250 m · Средняя</span>
            <span className="muted">09:30</span>
          </div>

          <div className="space-between" style={{ marginTop: 10 }}>
            <span className="muted">👥 4 присоединились · 2 мест осталось</span>
            <span className="tag">92%</span>
          </div>
        </div>

        <div className="section-title">Ищут компанию для похода</div>

        <div
          className="card row clickable"
          style={{ cursor: 'pointer' }}
          onClick={() => go('findBuddies')}
        >
          <div className="avatar">S</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Sofia</div>
            <div className="muted">Ищет компанию на субботу</div>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              go('findBuddies');
            }}
          >
            Открыть
          </button>
        </div>

        <div className="section-title">Подходит новичкам</div>

        <div className="card row">
          <div className="avatar" style={{ background: 'var(--stone)' }}>🌄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Гарни — короткая тропа</div>
            <div className="muted">4.5 km · Лёгкая</div>
          </div>
        </div>
      </div>

      <div id="toast" className="">Запросить место</div>

      <div id="tabbar" className="tabbar">
        <button className="tab active" onClick={() => go('home')}>
          <span className="ic">🏠</span>Главная
        </button>
        <button className="tab" onClick={() => go('explore')}>
          <span className="ic">🧭</span>Открыть
        </button>
        <button className="tab" onClick={() => go('routes')}>
          <span className="ic">🥾</span>Маршруты
        </button>
        <button className="tab" onClick={() => go('messages')}>
          <span className="ic">💬</span>Сообщения
        </button>
        <button className="tab" onClick={() => go('profileMe')}>
          <span className="ic">👤</span>Профиль
        </button>
      </div>
    </div>
  );
}
