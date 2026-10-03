import { useState, useCallback } from 'react';
import { screens } from './screens';
import Footer from '../components/Footer';

export default function AppNavigator() {
  const [route, setRoute] = useState({ name: 'home', params: {} });

  const navigate = useCallback((name, params = {}) => {
    setRoute({ name, params });
  }, []);

  const goBack = useCallback(() => {
    // заглушка под RN-стиль; в вебе можно хранить стек
    setRoute({ name: 'home', params: {} });
  }, []);

  const CurrentScreen = screens[route.name];

  if (!CurrentScreen) {
    return <div>Unknown screen: {route.name}</div>;
  }

  return (
    <>
      <div id="shell">
        <CurrentScreen
          params={route.params}
          navigate={navigate}
          goBack={goBack}
        />
        <Footer
          navigate={navigate}
        />
      </div>
    </>);
}