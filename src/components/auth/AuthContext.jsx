import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, setOnUnauthorized, refreshAccessToken } from '../../api/client';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [status, setStatus] = useState('loading');
  const [profile, setProfile] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  // Регистрируем колбэк: если refresh провалился — разлогиниваем
  useEffect(() => {
    setOnUnauthorized(logout);
  }, [logout]);

  // При старте: проверяем токен (или пробуем refresh, если токена нет)
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        // Если access-токена нет — пробуем получить через refresh
        let currentToken = token;
        if (!currentToken) {

          currentToken = refreshAccessToken();
          localStorage.setItem('token', currentToken);
          console.log("localStorage token check", localStorage.getItem('token'))
          if (!cancelled) setToken(currentToken);
        }

        // Проверяем, что токен живой
        const { res, newToken } = await apiFetch('/api/users/me', {}, () => currentToken);

        if (newToken) {
          setAccessToken(newToken); // если токен обновился — сохраняем в state
        }
        if (!res.ok) throw new Error('Invalid token');
        const data = await res.json();

        if (cancelled) return;
        setUser(data.user);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setStatus('guest');
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);   // ← запускаем один раз при монтировании

  const login = async (email, password) => {
    console.log("login start");
    const res = await fetch(API_URL+'/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',       // ← бэк должен поставить refreshToken в куку
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    console.log("login middle");
    const data = await res.json();
    localStorage.setItem('token', data.accessToken);
    console.log("localStorage token", localStorage.getItem('token'));
    setToken(data.accessToken);
    setUser(data.user);
    setProfile(data.profile)
    setStatus('authenticated');
  };

  // Ручной refresh (если понадобится где-то вызвать явно)
  const refresh = useCallback(async () => {
    const res = await apiFetch('/api/users/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      logout();
      throw new Error('Refresh failed');
    }
    const data = await res.json();
    localStorage.setItem('token', data.accessToken);
    setToken(data.accessToken);
    return data.accessToken;
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, status, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}