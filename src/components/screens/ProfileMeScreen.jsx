import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChoiceGroup from '../ChoiceGroup';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../../api/client';


export default function ProfileMeScreen({ navigate }) {
  const { t, i18n } = useTranslation('profileMe');
  const { user, setUserField } = useAuth();
  //console.log('language:', i18n.language);
  //console.log('all data:', i18n.store.data);
  //console.log('t:', t('heading'));
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
  const go = (target, params) => navigate?.(target, params);
  
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const patchChoiceGroup = async (group, newValue) => {
    const field = `${group}_id`;
    const previous = user?.[field];

    // 1. Оптимистично обновляем UI
    setUserField(field, newValue);

    // 2. Шлём на бэк
    setSaving(true);
    
    try {
      await apiFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName:field,value: newValue }),
      });
    } catch (err) {
      console.error('save failed:', err);
      setUserField(field, previous);   // откат
    } finally {
      setSaving(false);
    }
  };

  const patchText = (field, value) => {
    setUserField(field, value);
  };

  const saveText = async (field) => {
    setSaving(true);
    setSaveError(null);

    try {
      const { res } = await apiFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldName: field, value: user?.[field] ?? '' }),
      });
      if (!res.ok) throw new Error(`Profile save failed with status ${res.status}`);
    } catch (err) {
      console.error('save failed:', err);
      setSaveError(t('profileBuild.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="screen">
      <h2 style={{ fontSize: '24px' }}>{t('profileBuild.title')}</h2>
      <p className="muted" style={{ margin: '4px 0 6px' }}>{t('profileBuild.subtitle')}</p>
      {saveError && <p role="alert">{saveError}</p>}

      <div className="field-label">{t('profileBuild.fields.name.label')}</div>
      <input
        type="text"
        placeholder={t('profileBuild.fields.name.placeholder')}
        value={user?.username ?? ''}
        onChange={(e) => patchText('username', e.target.value)}
        onBlur={() => saveText('username')}
      />

      <div className="field-label">{t('profileBuild.fields.city.label')}</div>
      <input
        type="text"
        placeholder={t('profileBuild.fields.city.placeholder')}
        value={user?.city ?? ''}
        onChange={(e) => patchText('city', e.target.value)}
        onBlur={() => saveText('city')}
      />

      <div className="field-label">{t('profileBuild.fields.bio.label')}</div>
      <textarea
        placeholder={t('profileBuild.fields.bio.placeholder')}
        value={user?.bio ?? ''}
        onChange={(e) => patchText('bio', e.target.value)}
        onBlur={() => saveText('bio')}
      />

      <div className="field-label">{t('profileBuild.fields.experience.label')}</div>
      <ChoiceGroup
        group="experience"
        value={user.experience_id}
        onChange={(newValue) => patchChoiceGroup('experience', newValue)}
      />

      <div className="field-label">{t('profileBuild.fields.pace.label')}</div>
      <ChoiceGroup
        group="pace"
        value={user.pace_id}
        onChange={(newValue) => patchChoiceGroup('pace', newValue)}
      />
      <div className="field-label">{t('profileBuild.fields.distance.label')}</div>
      <ChoiceGroup
        group="distance"
        value={user.distance_id}
        onChange={(newValue) => patchChoiceGroup('distance', newValue)}
      />
      <div className="field-label">{t('profileBuild.fields.elevation.label')}</div>
      <ChoiceGroup
        group="elevation"
        value={user.elevation_id}
        onChange={(newValue) => patchChoiceGroup('elevation', newValue)}
      />

      <div className="field-label">{t('profileBuild.fields.style.label')}</div>
      <ChoiceGroup
        group="style"
        value={user.style_id}
        onChange={(newValue) => patchChoiceGroup('style', newValue)}
      />
      <div className="field-label">{t('profileBuild.fields.startTime.label')}</div>
      <ChoiceGroup
        group="starttime"
        value={user.starttime_id}
        onChange={(newValue) => patchChoiceGroup('starttime', newValue)}
      />
      <div className="field-label">{t('profileBuild.fields.stops.label')}</div>
      <ChoiceGroup
        group="stops"
        value={user.stops_id}
        onChange={(newValue) => patchChoiceGroup('stops', newValue)}
      />

      <div className="field-label">{t('profileBuild.fields.hasCar.label')}</div>
      <ChoiceGroup
        group="hascar"
        value={user.hascar_id}
        onChange={(newValue) => patchChoiceGroup('hascar', newValue)}
      />


      <div className="field-label">{t('profileBuild.fields.carSeats.label')}</div>
      <ChoiceGroup
        group="carseats"
        value={user.carseats_id}
        onChange={(newValue) => patchChoiceGroup('carseats', newValue)}
      />

      <div className="field-label">{t('profileBuild.fields.dogsOk.label')}</div>
      <ChoiceGroup
        group="dogsok"
        value={user.dogsok_id}
        onChange={(newValue) => patchChoiceGroup('dogsok', newValue)}
      />
      <div className="field-label">{t('profileBuild.fields.extra.label')}</div>
      <ChoiceGroup
        group="extra"
        value={user.extra_id}
        onChange={(newValue) => patchChoiceGroup('extra', newValue)}
      />

      <div style={{ marginTop: '26px' }}>
        <button className="btn btn-primary" onClick={() => go('profile')}>{t('profileBuild.finishButton')}</button>
      </div>
    </div>
  );
}
