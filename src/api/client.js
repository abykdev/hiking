let refreshPromise = null;   // защита от параллельных refresh
const API_URL = import.meta.env.VITE_API_URL;

let getToken = () => null;
let onTokenRefreshed = () => { };
let onUnauthorized = () => { };// Вызывается из AuthProvider, чтобы разлогинить при провале refresh

export function configureAuth({ getToken: gt, onTokenRefreshed: otr, onUnauthorized: ou }) {
    if (gt) getToken = gt;
    if (otr) onTokenRefreshed = otr;
    if (ou) onUnauthorized = ou;
}



export function setOnUnauthorized(fn) {
    onUnauthorized = fn;
}

export async function refreshAccessToken() {
    // Если refresh уже идёт — ждём его, не запускаем второй
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const res = await fetch(API_URL + '/api/users/refresh', {
                method: 'POST',
                credentials: 'include',   // ← обязательно! иначе кука не уйдёт
            });

            if (!res.ok) throw new Error('Refresh failed');

            const data = await res.json();
            return data.accessToken;          // новый access-токен
        } finally {
            refreshPromise = null;      // сбрасываем в любом случае
        }
    })();

    return refreshPromise;
}

export async function apiFetch(path, options = {}) {
    const token = getToken();     // актуальный access-токен

    const doRequest = (t) =>
        fetch(`${API_URL}${path}`, {
            ...options,
            credentials: 'include',     // ← чтобы refresh-кука уходила при необходимости
            headers: {
                ...options.headers,
                ...(t && { Authorization: `Bearer ${t}` }),
            },
        });

    let res = await doRequest(token);

    // Токен протух — пробуем обновиться
    if (res.status === 401) {
        try {
            const newToken = await refreshAccessToken();
            onTokenRefreshed(newToken);
            // Повторяем исходный запрос с новым токеном
            res = await doRequest(newToken);
            // Сообщаем наверх, что токен обновился (чтобы сохранить его в state)
            return { res, newToken };
        } catch {
            // Refresh не удался — разлогиниваем
            onUnauthorized();
            throw new Error('Unauthorized');
        }
    }

    return { res };
}