import { useState } from 'react';
import { useTranslation } from 'react-i18next';


export default function ProfileScreen({ navigate }) {
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
                <div style={{ width: '36px' }}></div>
                <span className="display" style={{ fontSize: '15px', fontWeight: 600 }}>🥾 Trailkin</span>
                <div style={{ width: '36px' }}></div>
            </div>
            <div id="screen">
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <div className="avatar" style={{ width: '70px', height: '70px', fontSize: '26px', margin: '0 auto' }}>?</div>
                    <h2 style={{ marginTop: '12px' }}>—</h2>
                    <div className="muted"></div>
                </div>

                <div className="row" style={{ marginTop: '20px', gap: '10px' }}>
                    <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 700 }}>0</div>
                        <div className="muted" style={{ fontSize: '11px' }}>Завершено походов</div>
                    </div>
                    <div className="card" style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 700 }}>0</div>
                        <div className="muted" style={{ fontSize: '11px' }}>Значки</div>
                    </div>
                </div>

                <div className="section-title">Значки</div>
                <p className="muted">Пока нет значков — заверши поход, чтобы получить первый.</p>

                <div className="section-title">Настройки</div>
                <div className="card space-between">
                    <span>Язык</span>
                    <div className="lang-toggle">
                        <button className="" onClick={() => toggleLang('en')}>EN</button>
                        <button className="active" onClick={() => toggleLang('ru')}>RU</button>
                    </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                    <button className="btn btn-outline" onClick={() => goToProfileBuild('profileMe')}>Редактировать профиль</button>
                </div>
                <button className="btn btn-outline" style={{ marginTop: '10px', borderColor: 'var(--alert)', color: 'var(--alert)' }} onClick={() => go('safetyCenter')}>🛟 Центр безопасности</button>
                <button className="btn btn-outline" style={{ marginTop: '10px' }} onClick={() => go('notifications')}>🔔 Уведомления</button>
                <button className="btn btn-outline" style={{ marginTop: '10px' }} onClick={() => go('privacy')}>🔒 Приватность</button>
                <button className="btn btn-outline" style={{ marginTop: '10px', borderColor: 'var(--alert)', color: 'var(--alert)' }} onClick={() => go('home')}>🚪 Выйти</button>

                <p className="muted" style={{ marginTop: '26px', fontSize: '12px', lineHeight: 1.5 }}>Отзывы сообщества субъективны, а условия могут меняться. Ответственность за оценку маршрута остаётся на тебе. Функции безопасности зависят от связи на устройстве.</p>
            </div>
            <div id="toast" className="">Запросить место</div>
            <div id="tabbar" className="tabbar">
                <button className="tab" onClick={() => go('home')}>
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
                <button className="tab active" onClick={() => go('profileMe')}>
                    <span className="ic">👤</span>Профиль
                </button>
            </div>
        </div>
    );
}
