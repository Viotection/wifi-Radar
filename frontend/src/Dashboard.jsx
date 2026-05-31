import React, { useState, useEffect } from 'react';
import { useCSIStream } from './hooks/useCSIStream';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

/**
 * Analytics Dashboard
 * Displays zone distribution, confidence trends, and occupancy metrics.
 */
export function Dashboard() {
  const { data, history, connected } = useCSIStream();
  const [stats, setStats] = useState({ near: 0, medium: 0, far: 0 });
  const [confidenceData, setConfidenceData] = useState([]);

  // Update stats
  useEffect(() => {
    const zones = { near: 0, medium: 0, far: 0 };
    history.forEach((pred) => {
      if (pred.zone) zones[pred.zone]++;
    });
    setStats(zones);

    // Build confidence trend
    const trend = history.slice(-50).map((pred, idx) => ({
      frame: idx,
      confidence: (pred.presence_conf * 100).toFixed(1),
    }));
    setConfidenceData(trend);
  }, [history]);

  const zoneData = [
    { name: 'Near', value: stats.near, fill: '#ff6b6b' },
    { name: 'Medium', value: stats.medium, fill: '#ffd93d' },
    { name: 'Far', value: stats.far, fill: '#95e1d3' },
  ];

  const presenceRate = history.length > 0 ? (history.filter((p) => p.presence).length / history.length * 100).toFixed(1) : 0;

  return (
    <div style={{ padding: '20px', backgroundColor: '#0a0e27', borderRadius: '8px', color: '#00ff00', fontFamily: 'monospace' }}>
      <h2 style={{ margin: '0 0 20px 0' }}>ANALYTICS COMMAND CENTER</h2>

      {/* Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '30px' }}>
        <div style={{ border: '1px solid #00ff00', padding: '15px', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>CONNECTION</div>
          <div style={{ fontSize: '18px', marginTop: '8px', color: connected ? '#00ff00' : '#ff6b6b' }}>
            {connected ? '✓ LIVE' : '✗ OFFLINE'}
          </div>
        </div>
        <div style={{ border: '1px solid #00ff00', padding: '15px', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>PRESENCE RATE</div>
          <div style={{ fontSize: '18px', marginTop: '8px' }}>{presenceRate}%</div>
        </div>
        <div style={{ border: '1px solid #00ff00', padding: '15px', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>FRAMES PROCESSED</div>
          <div style={{ fontSize: '18px', marginTop: '8px' }}>{history.length}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Zone Distribution */}
        <div style={{ border: '1px solid #00ff00', padding: '15px', borderRadius: '4px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>ZONE DISTRIBUTION</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={zoneData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {zoneData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Confidence Timeline */}
        <div style={{ border: '1px solid #00ff00', padding: '15px', borderRadius: '4px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>CONFIDENCE TIMELINE</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={confidenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00ff00" opacity={0.2} />
              <XAxis dataKey="frame" stroke="#00ff00" />
              <YAxis stroke="#00ff00" />
              <Tooltip contentStyle={{ backgroundColor: '#0a0e27', border: '1px solid #00ff00', color: '#00ff00' }} />
              <Line type="monotone" dataKey="confidence" stroke="#00ff00" dot={false} isAnimationActive={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Current Metrics */}
      {data && !data.buffering && (
        <div style={{ border: '1px solid #00ff00', padding: '15px', borderRadius: '4px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>CURRENT METRICS</h3>
          <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div>Presence: {data.presence ? '✓ DETECTED' : '✗ CLEAR'}</div>
            <div>Confidence: {(data.presence_conf * 100).toFixed(1)}%</div>
            <div>Zone: {data.zone ? data.zone.toUpperCase() : 'N/A'}</div>
            <div>Zone Conf: {(data.zone_conf * 100).toFixed(1)}%</div>
            <div>Motion: {data.trend ? data.trend.toUpperCase() : 'STATIONARY'}</div>
            <div>Frame ID: {data.frame_id}</div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSimulatorStream } from './hooks/useCSIStream';
import './Dashboard.css';

/**
 * Analytics Dashboard - Command center for WiFi Radar metrics
 * Displays zone distribution, confidence timeline, and occupancy statistics
 */
function Dashboard() {
  const { data, scenario } = useSimulatorStream(100);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    presenceRate: 0,
    zoneDistribution: { near: 0, medium: 0, far: 0 },
    avgConfidence: 0,
  });
  
  // Maintain rolling history
  useEffect(() => {
    if (!data) return;
    
    setHistory(prev => {
      const updated = [
        ...prev,
        {
          timestamp: data.frameCount || prev.length,
          confidence: data.zoneConf || 0,
          zone: data.zone || 'empty',
          presence: data.presence ? 1 : 0,
        },
      ];
      return updated.slice(-200);
    });
  }, [data]);
  
  // Compute statistics from history
  useEffect(() => {
    if (history.length === 0) return;
    
    const presenceCount = history.filter(h => h.presence).length;
    const presenceRate = presenceCount / history.length;
    
    const zoneCounts = { near: 0, medium: 0, far: 0 };
    history.forEach(h => {
      if (h.zone in zoneCounts) zoneCounts[h.zone]++;
    });
    
    const total = zoneCounts.near + zoneCounts.medium + zoneCounts.far;
    const zoneDistribution = {
      near: total > 0 ? zoneCounts.near / total : 0,
      medium: total > 0 ? zoneCounts.medium / total : 0,
      far: total > 0 ? zoneCounts.far / total : 0,
    };
    
    const avgConfidence = history.reduce((sum, h) => sum + h.confidence, 0) / history.length;
    
    setStats({
      presenceRate,
      zoneDistribution,
      avgConfidence,
      totalFrames: history.length,
    });
  }, [history]);
  
  // Data for zone distribution pie chart
  const zoneChartData = [
    { name: 'Near', value: stats.zoneDistribution.near, color: '#ff4757' },
    { name: 'Medium', value: stats.zoneDistribution.medium, color: '#ffa502' },
    { name: 'Far', value: stats.zoneDistribution.far, color: '#3742fa' },
  ];
  
  const COLORS = ['#ff4757', '#ffa502', '#3742fa'];
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>WiFi Radar - Analytics Dashboard</h1>
        <p className="scenario-label">Scenario: <strong>{scenario}</strong></p>
      </div>
      
      <div className="dashboard-grid">
        {/* Zone Distribution Card */}
        <div className="card">
          <h2>Zone Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={zoneChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {zoneChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${(value * 100).toFixed(1)}%`}
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #16c784' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Confidence Timeline Card */}
        <div className="card">
          <h2>Confidence Timeline</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={history.slice(-100)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="timestamp" stroke="#999" />
              <YAxis stroke="#999" domain={[0, 1]} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #16c784' }} />
              <Line type="monotone" dataKey="confidence" stroke="#16c784" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Key Metrics Card */}
        <div className="card metrics-card">
          <h2>Key Metrics</h2>
          <div className="metrics-grid">
            <div className="metric">
              <div className="metric-label">Occupancy Rate</div>
              <div className="metric-value">{(stats.presenceRate * 100).toFixed(1)}%</div>
            </div>
            <div className="metric">
              <div className="metric-label">Avg Confidence</div>
              <div className="metric-value">{(stats.avgConfidence * 100).toFixed(1)}%</div>
            </div>
            <div className="metric">
              <div className="metric-label">Frames Analyzed</div>
              <div className="metric-value">{stats.totalFrames}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="dashboard-footer">
        <p>WiFi Radar • Real-time Human Sensing • CSI-based Detection</p>
      </div>
    </div>
  );
}

export default Dashboard;
