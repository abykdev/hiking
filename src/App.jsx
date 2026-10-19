import { useState } from 'react'
import { useAuth } from './components/auth/AuthContext'
import './App.css'
import { useLanguage } from './i18n/LanguageContext';
import OnboardingScreen from './components/screens/OnboardingScreen.jsx'
import SignInScreen from './components/screens/SignInScreen.jsx'
import SignUpScreen from './components/screens/SignUpScreen.jsx';
import AppNavigator from './navigation/AppNavigator.jsx'

function App() {
  //const [screen, setScreen] = useState("onboarding");
  //const CurrentScreen = screens[screen];
  //const [value, setValue] = useState('');
  const { status } = useAuth();
  console.log('App: status =', status);
  const { lang } = useLanguage();

  const [authScreen, setAuthScreen] = useState('signin');  // 'signin' | 'signup'
  if (status === 'loading') {
    return <div className="screen">Загрузка…</div>;
  }
  if (!lang) return <OnboardingScreen />;
  if (status === 'authenticated') {
    return <AppNavigator />;
  }

  if (authScreen === 'signup') {
    return <SignUpScreen onGoToSignIn={() => setAuthScreen('signin')} />;
  }
  return <SignInScreen onGoToSignUp={() => setAuthScreen('signup')} />;
}


export default App
