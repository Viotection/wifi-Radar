import React, { useState, useEffect } from 'react';
import { useCSIStream } from './hooks/useCSIStream';

const CANVAS_SIZE = 500;
const ZONES = [
  { name: 'Near', radius: 60, color: '#ff6b6b', label: '0.5m' },
  { name: 'Medium', radius: 150, color: '#ffd93d', label: '1.5m' },
  { name: 'Far', radius: 240, color: '#95e1d3', label: '3m' },
];

/**
 * Tactical Radar View
 * Displays real-time human detection and distance estimation.
 */
export function RadarView() {
  const { data, connected, error } = useCSIStream();
  const [sweep, setSweep] = useState(0);
  const canvasRef = React.useRef(null);

  // Animate sweep
  useEffect(() => {
    const interval = setInterval(() => {
      setSweep((prev) => (prev + 6) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Draw radar
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;

    // Clear
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw zones
    ZONES.forEach((zone) => {
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, zone.radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Label
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = zone.color;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(zone.label, centerX + zone.radius + 5, centerY - 5);
    });

    // Draw sweep
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    const sweepAngle = (sweep * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(sweepAngle) * 250,
      centerY + Math.sin(sweepAngle) * 250
    );
    ctx.stroke();

    // Draw crosshairs
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();

    // Draw target if present
    if (data?.presence && !data?.buffering) {
      let radius = 60; // Near
      let color = '#ff6b6b';

      if (data.zone === 'medium') {
        radius = 150;
        color = '#ffd93d';
      } else if (data.zone === 'far') {
        radius = 240;
        color = '#95e1d3';
      }

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(centerX, centerY - radius + 40, 12, 0, 2 * Math.PI);
      ctx.fill();

      // Pulse effect
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      const pulseRadius = 12 + (Math.sin(Date.now() / 200) * 5);
      ctx.beginPath();
      ctx.arc(centerX, centerY - radius + 40, pulseRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Status text
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';

    if (data?.buffering) {
      ctx.fillText('BUFFERING...', centerX, 30);
    } else if (data?.presence) {
      ctx.fillText('✓ DETECTED', centerX, 30);
      ctx.fillText(data.zone?.toUpperCase() || '', centerX, 50);
    } else {
      ctx.fillText('-- CLEAR --', centerX, 30);
    }

    // Connection status
    ctx.font = '11px monospace';
    ctx.fillStyle = connected ? '#00ff00' : '#ff6b6b';
    ctx.textAlign = 'left';
    ctx.fillText(connected ? '● CONNECTED' : '● DISCONNECTED', 10, CANVAS_SIZE - 10);
  }, [sweep, data, connected]);

  return (
    <div style={{ padding: '20px', backgroundColor: '#0a0e27', borderRadius: '8px' }}>
      <h2 style={{ color: '#00ff00', margin: '0 0 15px 0' }}>TACTICAL RADAR</h2>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{
          border: '2px solid #00ff00',
          borderRadius: '4px',
          backgroundColor: '#0a0e27',
          display: 'block',
        }}
      />
      {error && <p style={{ color: '#ff6b6b', marginTop: '10px' }}>{error}</p>}
      {data && (
        <div style={{ marginTop: '15px', fontSize: '12px', color: '#00ff00', fontFamily: 'monospace' }}>
          <div>Presence: {data.presence ? '✓ YES' : '✗ NO'}</div>
          <div>Confidence: {(data.presence_conf * 100).toFixed(1)}%</div>
          {data.zone && <div>Distance: {data.zone.toUpperCase()}</div>}
          {data.trend && <div>Motion: {data.trend.toUpperCase()}</div>}
        </div>
      )}
    </div>
  );
}
