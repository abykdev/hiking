import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const url = 'https://hikingapi.abyk.ru';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'guest'

  // При старте: если есть токен — проверяем его на бэке
  useEffect(() => {
    if (!token) {
      setStatus('guest');
      return;
    }

    let cancelled = false;

    fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        // токен протух или невалиден
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setStatus('guest');
      });

    return () => { cancelled = true; };
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(url+'/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Login failed');

    const data = await res.json();
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setStatus('authenticated');
  };
  const register = async (email, password) => {
    const res = await fetch(url+'/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Registration failed');

    const data = await res.json();
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setStatus('authenticated');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setStatus('guest');
  };

  return (
    <AuthContext.Provider value={{ user, token, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  console.log('useAuth called, ctx:', ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}