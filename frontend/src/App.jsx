import React, { useState } from 'react';
import { RadarView } from './RadarView';
import { Dashboard } from './Dashboard';
import './App.css';

/**
 * Main Application Component
 * Hosts both Tactical Radar and Analytics Dashboard views.
 */
function App() {
  const [view, setView] = useState('radar');

  return (
    <div className="App">
      <div className="header">
        <h1>WiFi RADAR</h1>
        <p>Privacy-Preserving WiFi-Based Human Sensing</p>
      </div>

      <div className="nav-buttons">
        <button 
          className={`nav-btn ${view === 'radar' ? 'active' : ''}`}
          onClick={() => setView('radar')}
        >
          Tactical Radar
        </button>
        <button 
          className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          Analytics Dashboard
        </button>
      </div>

      <div className="content">
        {view === 'radar' && <RadarView />}
        {view === 'dashboard' && <Dashboard />}
      </div>
    </div>
  );
}

export default App;
