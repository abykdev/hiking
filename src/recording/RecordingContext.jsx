import { createContext, useContext, useState, useRef, useCallback } from 'react';

const RecordingContext = createContext(null);

export function RecordingProvider({ children }) {
  const [isRecording, setIsRecording] = useState(false);
  const [points, setPoints] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const watchIdRef = useRef(null);

  const start = useCallback(() => {
    if (isRecording) return;
    setIsRecording(true);
    setStartedAt(Date.now());
    setPoints([]);

    // подписка на геолокацию — живёт в провайдере
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPoints((prev) => [
          ...prev,
          {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            t: pos.timestamp,
          },
        ]);
      },
      (err) => console.error('geo error', err),
      { enableHighAccuracy: true, distanceFilter: 5 },
    );
  }, [isRecording]);

  const stop = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsRecording(false);
    setStartedAt(null);
    // вернуть points наружу или сохранить на бэк
    return points;
  }, [points]);

  return (
    <RecordingContext.Provider
      value={{ isRecording, points, startedAt, start, stop }}
    >
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error('useRecording must be used inside RecordingProvider');
  return ctx;
}