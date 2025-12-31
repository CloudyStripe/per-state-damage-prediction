import React, { useEffect, useState } from 'react';
import './App.css';
import { USMap, MetricSelector, YearSelector, AboutData } from './components';
import { loadAndTransformData } from './data/loader';
import { getAvailableYears } from './data/transform';
import { StateYearMetrics, MetricType } from './types';

function App() {
  const [metrics, setMetrics] = useState<StateYearMetrics[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2023);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('damage_rate');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAndTransformData()
      .then((data) => {
        setMetrics(data);
        const years = getAvailableYears(data);
        setAvailableYears(years);
        // Set to most recent year with data
        if (years.length > 0) {
          setSelectedYear(years[years.length - 1]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load data: ${err.message}`);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>US Ticket-to-Damage Proxy Model</h1>
        <p className="subtitle">
          Benchmarking underground utility damages against 811 ticket volume
        </p>
      </header>

      <main className="App-main">
        <div className="controls">
          <MetricSelector
            selectedMetric={selectedMetric}
            onChange={setSelectedMetric}
          />
          <YearSelector
            years={availableYears}
            selectedYear={selectedYear}
            onChange={setSelectedYear}
          />
        </div>

        <USMap
          metrics={metrics}
          selectedYear={selectedYear}
          selectedMetric={selectedMetric}
        />

        <AboutData />
      </main>

      <footer className="App-footer">
        <p>
          Data sources: CGA 811 Center Dashboard (Transmissions) · CGA DIRT Annual Report (Damages)
        </p>
      </footer>
    </div>
  );
}

export default App;
