import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../../api/client';

export default function AdminPanelScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorGPX, setErrorGPX] = useState(null);
  const isAdmin = user?.role === 'admin';
  const [resultGPX, setResultGPX] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [errorFile, setErrorFile] = useState(null);
  const [resultFile, setResultFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    
  }, [user]);
  const loadGpxBatch = async () => {
    setLoading(true);
    try {
      const { res } = await apiFetch('/admin/loadGpx');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResultGPX(data);
    } catch (err) {
      setErrorGPX(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file) => {
    setLoadingFile(true);
    setErrorFile(null);
    setResultFile(null);
    try {
      const body = new FormData();
      body.append('file', file);
      // Content-Type не задаём — браузер сам добавит boundary для multipart
      const { res } = await apiFetch('/api/files', { method: 'POST', body });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      setResultFile(await res.json());
    } catch (err) {
      setErrorFile(err.message);
    } finally {
      setLoadingFile(false);
    }
  };

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) uploadFile(file);
  };

  if (!isAdmin) return <p>Access denied</p>;

  return (
    <div>
      <h1>Admin Panel</h1>
      <button className="btn btn-outline" style={{ marginTop: '10px', borderColor: 'var(--alert)', color: 'var(--alert)' }} onClick={loadGpxBatch}>Load GPX Batch</button>
      {loading && <p>Loading...</p>}
      {errorGPX && <p style={{ color: 'red' }}>{errorGPX}</p>}
      {resultGPX && <p style={{ color: 'green' }}>{JSON.stringify(resultGPX)}</p>}

      <input ref={fileInputRef} type="file" hidden onChange={onFileSelected} />
      <button
        className="btn btn-outline"
        style={{ marginTop: '10px', borderColor: 'var(--alert)', color: 'var(--alert)' }}
        disabled={loadingFile}
        onClick={() => fileInputRef.current?.click()}
      >
        Load file
      </button>
      {loadingFile && <p>Loading...</p>}
      {errorFile && <p style={{ color: 'red' }}>{errorFile}</p>}
      {resultFile && (
        <div style={{ color: 'green', wordBreak: 'break-all' }}>
          <p>id: {resultFile.id}</p>
          <p>
            url:{' '}
            {resultFile.url ? (
              <a href={resultFile.url} target="_blank" rel="noreferrer">{resultFile.url}</a>
            ) : (
              resultFile.stored_path
            )}
          </p>
        </div>
      )}
    </div>
  );
}