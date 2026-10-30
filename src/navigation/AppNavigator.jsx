import { useState, useCallback } from 'react';
import { screens, ROOT_SCREENS } from './screens';
import Footer from '../components/Footer';
import Header from '../components/Header';

export default function AppNavigator() {
  const [stack, setStack] = useState([{ name: 'home', params: {} }]);
  const route = stack[stack.length - 1];

  const navigate = useCallback((name, params = {}) => {
    setStack((prev) => {
      // Корневой экран — сбрасываем историю до него
      if (ROOT_SCREENS.has(name)) {
        return [{ name, params }];
      }
      // Обычный экран — пушим в стек
      return [...prev, { name, params }];
    });
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const canGoBack = stack.length > 1 && !ROOT_SCREENS.has(route.name);
  const CurrentScreen = screens[route.name];

  if (!CurrentScreen) {
    return <div>Unknown screen: {route.name}</div>;
  }

  return (
    <>
      <div id="shell">
        <Header  canGoBack={canGoBack} goBack={goBack} />
        <CurrentScreen
          params={route.params}
          navigate={navigate}
          goBack={goBack}
          canGoBack={canGoBack}
        />
        <Footer
          navigate={navigate}
        />
      </div>
    </>);
}