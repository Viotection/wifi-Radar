import React, { useState } from 'react';
import RadarView from './RadarView';
import Dashboard from './Dashboard';
import './App.css';

function App() {
  const [view, setView] = useState('radar');

  return (
    <div className="app">
      <div className="view-switcher">
        <button
          className={`switcher-btn ${view === 'radar' ? 'active' : ''}`}
          onClick={() => setView('radar')}
        >
          🎯 Tactical Radar
        </button>
        <button
          className={`switcher-btn ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          📊 Analytics Dashboard
        </button>
      </div>

      {view === 'radar' && <RadarView />}
      {view === 'dashboard' && <Dashboard />}
    </div>
  );
}

export default App;