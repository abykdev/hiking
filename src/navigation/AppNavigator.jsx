import { useState, useCallback } from 'react';
import { screens } from './screens';

export default function AppNavigator() {
  const [route, setRoute] = useState({ name: 'Home', params: {} });

  const navigate = useCallback((name, params = {}) => {
    setRoute({ name, params });
  }, []);

  const goBack = useCallback(() => {
    // заглушка под RN-стиль; в вебе можно хранить стек
    setRoute({ name: 'Home', params: {} });
  }, []);

  const CurrentScreen = screens[route.name];

  if (!CurrentScreen) {
    return <div>Unknown screen: {route.name}</div>;
  }

  return (
    <CurrentScreen
      params={route.params}
      navigate={navigate}
      goBack={goBack}
    />
  );
}