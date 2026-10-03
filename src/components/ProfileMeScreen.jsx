import { useState } from 'react';
import { useTranslation } from 'react-i18next';


export default function ProfileMeScreen({ navigate }) {
    const { t, i18n } = useTranslation('onboarding');
    //console.log('language:', i18n.language);
    //console.log('all data:', i18n.store.data);
    //console.log('t:', t('heading'));
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
    const go = (target, params) => navigate?.(target, params);
    return (
        <div id="screen">
            <h2 style={{ fontSize: '24px' }}>{t('profileBuild.title')}</h2>
            <p className="muted" style={{ margin: '4px 0 6px' }}>{t('profileBuild.subtitle')}</p>

            <div className="field-label">{t('profileBuild.fields.name.label')}</div>
            <input type="text" placeholder={t('profileBuild.fields.name.placeholder')} value="" onInput={(e) => updateProfile('name', e.target.value)} />
            <div className="field-label">{t('profileBuild.fields.city.label')}</div>
            <input type="text" placeholder={t('profileBuild.fields.city.placeholder')} value="" onInput={(e) => updateProfile('city', e.target.value)} />
            <div className="field-label">{t('profileBuild.fields.bio.label')}</div>
            <textarea placeholder={t('profileBuild.fields.bio.placeholder')} onInput={(e) => updateProfile('bio', e.target.value)}></textarea>

            <div className="field-label">{t('profileBuild.fields.experience.label')}</div>
            <div className="chip-row">
                <div className="chip" onClick={() => updateProfile('experience', 0)}>{t('profileBuild.fields.experience.options.beginner')}</div>
                <div className="chip" onClick={() => updateProfile('experience', 1)}>{t('profileBuild.fields.experience.options.intermediate')}</div>
                <div className="chip" onClick={() => updateProfile('experience', 2)}>{t('profileBuild.fields.experience.options.advanced')}</div>
                <div className="chip selected" onClick={() => updateProfile('experience', 3)}>{t('profileBuild.fields.experience.options.expert')}</div>
            </div>
            <div className="field-label">{t('profileBuild.fields.pace.label')}</div>
            <div className="chip-row">
                <div className="chip" onClick={() => updateProfile('pace', 0)}>{t('profileBuild.fields.pace.options.chill')}</div>
                <div className="chip" onClick={() => updateProfile('pace', 1)}>{t('profileBuild.fields.pace.options.moderate')}</div>
                <div className="chip selected" onClick={() => updateProfile('pace', 2)}>{t('profileBuild.fields.pace.options.fast')}</div>
                <div className="chip" onClick={() => updateProfile('pace', 3)}>{t('profileBuild.fields.pace.options.veryFast')}</div>
            </div>
            <div className="field-label">{t('profileBuild.fields.distance.label')}</div>
            <div className="chip-row">
                <div className="chip" onClick={() => updateProfile('distance', 0)}>{t('profileBuild.fields.distance.options.0_5')}</div>
                <div className="chip" onClick={() => updateProfile('distance', 1)}>{t('profileBuild.fields.distance.options.5_10')}</div>
                <div className="chip selected" onClick={() => updateProfile('distance', 2)}>{t('profileBuild.fields.distance.options.10_15')}</div>
                <div className="chip" onClick={() => updateProfile('distance', 3)}>{t('profileBuild.fields.distance.options.15_25')}</div>
                <div className="chip" onClick={() => updateProfile('distance', 4)}>{t('profileBuild.fields.distance.options.25plus')}</div>
            </div>
            <div className="field-label">{t('profileBuild.fields.elevation.label')}</div>
            <div className="chip-row">
                <div className="chip" onClick={() => updateProfile('elevation', 0)}>{t('profileBuild.fields.elevation.options.low')}</div>
                <div className="chip" onClick={() => updateProfile('elevation', 1)}>{t('profileBuild.fields.elevation.options.moderate')}</div>
                <div className="chip" onClick={() => updateProfile('elevation', 2)}>{t('profileBuild.fields.elevation.options.high')}</div>
                <div className="chip selected" onClick={() => updateProfile('elevation', 3)}>{t('profileBuild.fields.elevation.options.veryHigh')}</div>
            </div>

            <div className="field-label">{t('profileBuild.fields.style.label')}</div>
            <div className="chip-row">
                <div className="chip" onClick={() => toggleStyle(0)}>{t('profileBuild.fields.style.options.social')}</div>
                <div className="chip selected" onClick={() => toggleStyle(1)}>{t('profileBuild.fields.style.options.photography')}</div>
                <div className="chip selected" onClick={() => toggleStyle(2)}>{t('profileBuild.fields.style.options.fitness')}</div>
                <div className="chip" onClick={() => toggleStyle(3)}>{t('profileBuild.fields.style.options.nature')}</div>
                <div className="chip" onClick={() => toggleStyle(4)}>{t('profileBuild.fields.style.options.quiet')}</div>
                <div className="chip" onClick={() => toggleStyle(5)}>{t('profileBuild.fields.style.options.adventure')}</div>
                <div className="chip" onClick={() => toggleStyle(6)}>{t('profileBuild.fields.style.options.exploration')}</div>
            </div>
            <div className="field-label">{t('profileBuild.fields.startTime.label')}</div>
            <div className="chip-row">
                <div className="chip" onClick={() => updateProfile('startTime', 0)}>{t('profileBuild.fields.startTime.options.sunrise')}</div>
                <div className="chip" onClick={() => updateProfile('startTime', 1)}>{t('profileBuild.fields.startTime.options.morning')}</div>
                <div className="chip" onClick={() => updateProfile('startTime', 2)}>{t('profileBuild.fields.startTime.options.afternoon')}</div>
                <div className="chip selected" onClick={() => updateProfile('startTime', 3)}>{t('profileBuild.fields.startTime.options.flexible')}</div>
            </div>
            <div className="field-label">{t('profileBuild.fields.stops.label')}</div>
            <div className="chip-row">
                <div className="chip" onClick={() => updateProfile('stops', 0)}>{t('profileBuild.fields.stops.options.frequent')}</div>
                <div className="chip selected" onClick={() => updateProfile('stops', 1)}>{t('profileBuild.fields.stops.options.normal')}</div>
                <div className="chip" onClick={() => updateProfile('stops', 2)}>{t('profileBuild.fields.stops.options.minimal')}</div>
            </div>

            <div className="field-label">{t('profileBuild.fields.hasCar.label')}</div>
            <div className="chip-row">
                <div className="chip selected" onClick={() => updateProfile('hasCar', true)}>{t('profileBuild.fields.hasCar.options.yes')}</div>
                <div className="chip" onClick={() => updateProfile('hasCar', false)}>{t('profileBuild.fields.hasCar.options.no')}</div>
            </div>

            <div className="field-label">{t('profileBuild.fields.carSeats.label')}</div>
            <div className="chip-row">
                <div className="chip selected" onClick={() => updateProfile('carSeats', 1)}>{t('profileBuild.fields.carSeats.options.1')}</div>
                <div className="chip" onClick={() => updateProfile('carSeats', 2)}>{t('profileBuild.fields.carSeats.options.2')}</div>
                <div className="chip" onClick={() => updateProfile('carSeats', 3)}>{t('profileBuild.fields.carSeats.options.3')}</div>
                <div className="chip" onClick={() => updateProfile('carSeats', 4)}>{t('profileBuild.fields.carSeats.options.4')}</div>
            </div>

            <div className="field-label">{t('profileBuild.fields.dogsOk.label')}</div>
            <div className="chip-row">
                <div className="chip" onClick={() => updateProfile('dogsOk', true)}>{t('profileBuild.fields.dogsOk.options.yes')}</div>
                <div className="chip selected" onClick={() => updateProfile('dogsOk', false)}>{t('profileBuild.fields.dogsOk.options.no')}</div>
            </div>
            <div className="field-label">{t('profileBuild.fields.extra.label')}</div>
            <div className="chip-row">
                <div className="chip selected" onClick={() => toggleExtra(0)}>{t('profileBuild.fields.extra.options.camping')}</div>
                <div className="chip selected" onClick={() => toggleExtra(1)}>{t('profileBuild.fields.extra.options.trailRunning')}</div>
                <div className="chip selected" onClick={() => toggleExtra(2)}>{t('profileBuild.fields.extra.options.climbing')}</div>
                <div className="chip selected" onClick={() => toggleExtra(3)}>{t('profileBuild.fields.extra.options.cycling')}</div>
                <div className="chip selected" onClick={() => toggleExtra(4)}>{t('profileBuild.fields.extra.options.sup')}</div>
                <div className="chip selected" onClick={() => toggleExtra(5)}>{t('profileBuild.fields.extra.options.snowActivities')}</div>
            </div>

            <div style={{ marginTop: '26px' }}>
                <button className="btn btn-primary" onClick={finishProfile}>{t('profileBuild.finishButton')}</button>
            </div>
        </div>
    );
}
