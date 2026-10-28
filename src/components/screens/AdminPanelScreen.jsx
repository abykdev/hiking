import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../../api/client';

export default function AdminPanelScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isAdmin = user?.role === 'admin';
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    
  }, [user]);
  const loadGpxBatch = async () => {
    setLoading(true);
    try {
      const { res } = await apiFetch('/admin/loadGpx');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return <p>Access denied</p>;

  return (
    <div>
      <h1>Admin Panel</h1>
      <button className="btn btn-outline" style={{ marginTop: '10px', borderColor: 'var(--alert)', color: 'var(--alert)' }} onClick={loadGpxBatch}>Load GPX Batch</button>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && <p style={{ color: 'green' }}>{JSON.stringify(result)}</p>}
    </div>
  );
}