import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth/AuthContext'


function SignInScreen() {
    const { t, i18n } = useTranslation('signin');
    console.log('language:', i18n.language);
    console.log('all data from SignInScreen:', i18n.store.data);
    console.log('t:', t('heading'));
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        if (!value.trim() || loading) return;
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await login(email, password);
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
                        </div>
                        <span className="forgot-link">{t('forgotPassword')}</span>
                    </div>
                    <div className="spacer"></div>

                    <div className="bottom-group">
                        <button className="btn btn-primary" type="button">{t('button')}</button>
                        <p className="terms">{t('terms')}</p>
                        <p className="switch-text">{t('switch-text')} <span className="link">{t('signUp')}</span></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SignInScreen;