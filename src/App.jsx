import { useState } from 'react'
import { useAuth } from './components/auth/AuthContext'
import './App.css'
import OnboardingScreen from './components/OnboardingScreen.jsx'
import SignInScreen from './components/SignInScreen.jsx'
const screens = {
  "onboarding": OnboardingScreen,
  "signin": SignInScreen,
}
function App() {
  const [screen, setScreen] = useState("onboarding");
  const CurrentScreen = screens[screen];
  const [value, setValue] = useState('');
  const { status } = useAuth();
  const handleNext = (target) => {
    // Авторизован → вместо формы сразу успех
    if (target === 'signin' && status === 'authenticated') {
      setScreen('success');
      return;
    }
    setScreen(target);
  };
  return (
    <CurrentScreen
      value={value}
      onChangeValue={setValue}
      onNext={handleNext}
    />
  )
}

export default App
