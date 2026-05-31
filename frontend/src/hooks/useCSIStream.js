import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for WebSocket connection to WiFi Radar backend.
 * Handles reconnection, buffering, and data updates.
 */
export function useCSIStream(url = 'ws://localhost:8000/ws') {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    const maxRetries = 10;
    let retries = 0;

    const connect = () => {
      try {
        ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('✓ WebSocket connected');
          setConnected(true);
          setError(null);
          retries = 0;
        };

        ws.onmessage = (event) => {
          try {
            const newData = JSON.parse(event.data);
            setData(newData);
            setHistory((prev) => [...prev.slice(-99), newData]);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setError('Connection error');
        };

        ws.onclose = () => {
          setConnected(false);
          console.log('✗ WebSocket disconnected');

          // Attempt reconnection with exponential backoff
          if (retries < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retries), 10000);
            console.log(`Reconnecting in ${delay}ms...`);
            reconnectTimeout = setTimeout(connect, delay);
            retries += 1;
          } else {
            setError('Max reconnection attempts reached');
          }
        };
      } catch (e) {
        console.error('Failed to create WebSocket:', e);
        setError('Failed to connect');
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [url]);

  return { data, connected, error, history };
}
