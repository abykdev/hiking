import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChoiceGroup from './ChoiceGroup';
import { useAuth } from './auth/AuthContext';


export default function ProfileMeScreen({ navigate }) {
    const { t, i18n } = useTranslation('profileMe');
    //console.log('language:', i18n.language);
    //console.log('all data:', i18n.store.data);
    //console.log('t:', t('heading'));
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
    const go = (target, params) => navigate?.(target, params);
    const { user } = useAuth();

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
            <ChoiceGroup
              group="experience"
              value={user.experience_id}
              onChange={(newValue) => updateProfile('experience', newValue)}
            />
            
            <div className="field-label">{t('profileBuild.fields.pace.label')}</div>
            <ChoiceGroup
              group="pace"
              value={user.pace_id}
              onChange={(newValue) => updateProfile('pace', newValue)}
            />            
            <div className="field-label">{t('profileBuild.fields.distance.label')}</div>
            <ChoiceGroup
              group="distance"
              value={user.distance_id}
              onChange={(newValue) => updateProfile('distance', newValue)}
            />
            <div className="field-label">{t('profileBuild.fields.elevation.label')}</div>
            <ChoiceGroup
              group="elevation"
              value={user.elevation_id}
              onChange={(newValue) => updateProfile('elevation', newValue)}
            />

            <div className="field-label">{t('profileBuild.fields.style.label')}</div>
            <ChoiceGroup
              group="style"
              value={user.style_id}
              onChange={(newValue) => updateProfile('style', newValue)}
            />
            <div className="field-label">{t('profileBuild.fields.startTime.label')}</div>
            <ChoiceGroup
              group="startTime"
              value={user.startTime_id}
              onChange={(newValue) => updateProfile('startTime', newValue)}
            />
            <div className="field-label">{t('profileBuild.fields.stops.label')}</div>
            <ChoiceGroup
              group="stops"
              value={user.stops_id}
              onChange={(newValue) => updateProfile('stops', newValue)}
            />

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
                <button className="btn btn-primary" onClick={() => go('profileMe')}>{t('profileBuild.finishButton')}</button>
            </div>
        </div>
    );
}
