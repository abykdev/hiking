import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext'


function SignUpScreen({ onNext }) {
    const { t, i18n } = useTranslation('signup');
    //console.log('language:', i18n.language);
    //console.log('all data from SignInScreen:', i18n.store.data);
    //console.log('t:', t('heading'));
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        if (!email.trim() || !password.trim()) return;
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await register(email, password);
            // редирект делается автоматически — см. ниже
        } catch {
            setError('Неверный email или пароль');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="screen">

            <div className="content">

                <div className="boot small">🥾</div>
                <h1 className="heading">{t('heading')}</h1>
                <p className="subheading">{t('subheading')}</p>
                <form className="form" style={{ marginBottom: '20px' }} onSubmit={handleSubmit}>
                    <div className="field">
                        <label htmlFor="email">Email</label>
                        <div className="input-wrap">
                            <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
                        </div>
                    </div>
                    <div className="field">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrap">
                            <input id="password" value={password} type="password" placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} />
                            <span className="eye-toggle" aria-hidden="true">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" strokeWidth="1.6"></path><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"></circle></svg>
                            </span>
                        </div>
                        
                    </div>
                    <div className="spacer"></div>

                    <div className="bottom-group">
                        <button className="btn btn-primary" type="submit">{t('button')}</button>
                        <p className="terms">{t('terms')}</p>
                        <p className="switch-text">{t('switch-text')} <span className="link" onClick={() => onNext('signin')}>{t('signIn')}</span></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SignUpScreen;