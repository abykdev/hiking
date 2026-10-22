import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../i18n/LanguageContext';
import LangSheet from '../LangSheet';
import CountrySheet from '../CountrySheet';
import {  useAuth } from '../auth/AuthContext';

export default function ProfileScreen({ navigate }) {
    const { t, i18n } = useTranslation('onboarding');
    const { lang, setLang } = useLanguage();
    const [isLangOpen, setIsLangOpen] = useState(false);
    const { user, setUserField } = useAuth();
    const handleLangSelect = (code) => {
        setLang(code);

        setIsLangOpen(false);
        console.log('handleLangSelect lang', lang)
    };
    const [isCountryOpen, setIsCountryOpen] = useState(false);
    const [country, setCountry] = useState('RU'); // alpha2

    const handleCountrySelect = (alpha2) => {
        setCountry(alpha2);
        setIsCountryOpen(false);
        setUserField('country_code', alpha2);
        // при необходимости — сохранить на бэк
    };

    const go = (target, params) => navigate(target, params);
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
                    <span>Language</span>
                    <button className="lang-btn" onClick={() => setIsLangOpen(true)} aria-label="Language"><span clasNames="emo" >🌐</span> {lang.toUpperCase()} ▾</button>
                </div>
                <LangSheet
                    isOpen={isLangOpen}
                    currentLang={lang}
                    onSelect={handleLangSelect}
                    onClose={() => setIsLangOpen(false)}
                />
                <div className="card space-between">
                    <span>Country</span>
                    <button className="lang-btn" onClick={() => setIsCountryOpen(true)} aria-label="Country"><span clasNames="emo" >🌐</span> {user.country_code.toUpperCase()} ▾</button>
                </div>
                <CountrySheet
                    isOpen={isCountryOpen}
                    currentCode={user.country_code}
                    onSelect={handleCountrySelect}
                    onClose={() => setIsCountryOpen(false)}
                />


                <div style={{ marginTop: '12px' }}>
                    <button className="btn btn-outline" onClick={() => go('profileMe')}>Редактировать профиль</button>
                </div>
                <button className="btn btn-outline" style={{ marginTop: '10px', borderColor: 'var(--alert)', color: 'var(--alert)' }} onClick={() => go('safetyCenter')}>🛟 Центр безопасности</button>
                <button className="btn btn-outline" style={{ marginTop: '10px' }} onClick={() => go('notifications')}>🔔 Уведомления</button>
                <button className="btn btn-outline" style={{ marginTop: '10px' }} onClick={() => go('privacy')}>🔒 Приватность</button>
                <button className="btn btn-outline" style={{ marginTop: '10px', borderColor: 'var(--alert)', color: 'var(--alert)' }} onClick={() => go('home')}>🚪 Выйти</button>

                <p className="muted" style={{ marginTop: '26px', fontSize: '12px', lineHeight: 1.5 }}>Отзывы сообщества субъективны, а условия могут меняться. Ответственность за оценку маршрута остаётся на тебе. Функции безопасности зависят от связи на устройстве.</p>
            </div>

        </div>
    );
}
