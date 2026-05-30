import React, { useState, useEffect } from 'react';
import { useSimulatorStream } from './hooks/useCSIStream';
import './RadarView.css';

/**
 * Tactical Radar View - Live WiFi sensing display
 * Shows a game-style radar with concentric rings, scanning sweep, and motion blips
 */
function RadarView() {
  const { data, scenario } = useSimulatorStream(100);
  const [sweepAngle, setSweepAngle] = useState(0);
  const [blips, setBlips] = useState([]);
  
  const CANVAS_SIZE = 500;
  const CENTER = CANVAS_SIZE / 2;
  const RING_RADIUS = (CANVAS_SIZE / 2) * 0.9;
  
  // Animate scanning sweep
  useEffect(() => {
    const interval = setInterval(() => {
      setSweepAngle(prev => (prev + 6) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);
  
  // Update blips when data changes
  useEffect(() => {
    if (!data || !data.presence) {
      setBlips([]);
      return;
    }
    
    let radiusFraction = 0;
    if (data.zone === 'near') radiusFraction = 0.8;
    else if (data.zone === 'medium') radiusFraction = 0.5;
    else if (data.zone === 'far') radiusFraction = 0.2;
    
    const angle = (sweepAngle * Math.PI) / 180;
    const x = CENTER + radiusFraction * RING_RADIUS * Math.cos(angle);
    const y = CENTER + radiusFraction * RING_RADIUS * Math.sin(angle);
    
    setBlips([{ x, y, confidence: data.zoneConf, zone: data.zone }]);
  }, [data, sweepAngle]);
  
  return (
    <div className="radar-view">
      <div className="radar-header">
        <h1>WiFi Radar - Tactical View</h1>
        <p className="scenario-label">Scenario: <strong>{scenario}</strong></p>
      </div>
      
      <div className="radar-container">
        <svg width={CANVAS_SIZE} height={CANVAS_SIZE} className="radar-svg">
          <circle cx={CENTER} cy={CENTER} r={RING_RADIUS} fill="#0a1a2e" stroke="#16c784" strokeWidth="2" />
          {[0.25, 0.5, 0.75].map((frac, i) => (
            <circle key={`ring-${i}`} cx={CENTER} cy={CENTER} r={RING_RADIUS * frac} fill="none" stroke="#16c78433" strokeWidth="1" strokeDasharray="4,4" />
          ))}
          {blips.map((blip, i) => (
            <g key={`blip-${i}`}>
              <circle cx={blip.x} cy={blip.y} r="8" fill="#00ff00" opacity={blip.confidence} style={{filter: `drop-shadow(0 0 ${blip.confidence * 12}px #00ff00)`}} />
              <circle cx={blip.x} cy={blip.y} r="12" fill="none" stroke="#00ff00" strokeWidth="1" opacity={blip.confidence * 0.5} />
            </g>
          ))}
          <circle cx={CENTER} cy={CENTER} r="4" fill="#fff" />
        </svg>
      </div>
      
      <div className="radar-status">
        {data ? (
          <div className="status-content">
            <div className="status-item">
              <span className="status-label">Presence:</span>
              <span className={`status-value ${data.presence ? 'active' : ''}`}>{data.presence ? 'DETECTED' : 'NONE'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Zone:</span>
              <span className="status-value">{data.zone ? data.zone.toUpperCase() : 'N/A'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Confidence:</span>
              <span className="status-value">{(data.zoneConf * 100).toFixed(1)}%</span>
            </div>
            <div className="status-item">
              <span className="status-label">Trend:</span>
              <span className="status-value">{data.trend ? (data.trend === 'approaching' ? 'APPROACHING' : 'DEPARTING') : 'STATIONARY'}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default RadarView;