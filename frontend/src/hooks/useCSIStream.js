import { useState, useEffect } from 'react';

/**
 * React hook for connecting to WiFi Radar WebSocket.
 * 
 * Connects to the backend WebSocket and returns the latest prediction data.
 * Falls back to simulator if connection fails.
 * 
 * @param {string} url - WebSocket URL (default: localhost:8000)
 * @returns {object} Latest prediction data or null if not connected
 */
export function useCSIStream(url = 'ws://localhost:8000/ws') {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ws = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const connect = () => {
      try {
        ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setConnected(true);
          setError(null);
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            setData(msg);
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setError('WebSocket connection error');
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnected(false);
          
          // Attempt to reconnect
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            setTimeout(connect, 2000 * reconnectAttempts);
          } else {
            setError('Failed to connect to WebSocket after multiple attempts');
          }
        };
      } catch (e) {
        console.error('WebSocket connection failed:', e);
        setError(e.message);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [url]);

  return { data, connected, error };
}

/**
 * Simulates CSI stream for demo/fallback when real hardware unavailable.
 * 
 * @returns {object} Simulated prediction data
 */
export function useSimulatorStream(updateIntervalMs = 100) {
  const [data, setData] = useState(null);
  const [scenarioTime, setScenarioTime] = useState(0);
  const [scenario, setScenario] = useState('empty');

  useEffect(() => {
    let frameCount = 0;
    const scenarios = ['empty', 'far', 'medium', 'near', 'approaching', 'departing'];
    let currentScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    let scenarioDuration = 30 * 1000; // 30 seconds per scenario
    let scenarioStartTime = Date.now();

    const interval = setInterval(() => {
      frameCount++;
      const now = Date.now();
      const elapsed = now - scenarioStartTime;

      // Switch scenario if duration exceeded
      if (elapsed > scenarioDuration) {
        currentScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        scenarioStartTime = now;
      }

      const progress = (elapsed % scenarioDuration) / scenarioDuration;

      let presence = false;
      let zone = null;
      let trend = null;
      let confidence = 0;

      if (currentScenario === 'empty') {
        presence = false;
        confidence = 0.1;
      } else if (currentScenario === 'far') {
        presence = true;
        zone = 'far';
        confidence = 0.5 + Math.random() * 0.2;
      } else if (currentScenario === 'medium') {
        presence = true;
        zone = 'medium';
        confidence = 0.7 + Math.random() * 0.2;
      } else if (currentScenario === 'near') {
        presence = true;
        zone = 'near';
        confidence = 0.85 + Math.random() * 0.15;
      } else if (currentScenario === 'approaching') {
        presence = true;
        if (progress < 0.33) {
          zone = 'far';
        } else if (progress < 0.66) {
          zone = 'medium';
        } else {
          zone = 'near';
        }
        trend = 'approaching';
        confidence = 0.5 + progress * 0.4;
      } else if (currentScenario === 'departing') {
        presence = true;
        if (progress < 0.33) {
          zone = 'near';
        } else if (progress < 0.66) {
          zone = 'medium';
        } else {
          zone = 'far';
        }
        trend = 'departing';
        confidence = 0.9 - progress * 0.4;
      }

      setData({
        presence,
        presenceConf: confidence,
        zone,
        zoneConf: presence ? confidence : 0,
        trend,
        frameCount,
        timestamp: now / 1000,
      });

      setScenario(currentScenario);
    }, updateIntervalMs);

    return () => clearInterval(interval);
  }, [updateIntervalMs]);

  return { data, scenario, connected: true, error: null };
}
