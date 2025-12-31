import React from 'react';
import { MetricType } from '../types';

interface MetricSelectorProps {
  selectedMetric: MetricType;
  onChange: (metric: MetricType) => void;
}

const METRIC_OPTIONS: { value: MetricType; label: string }[] = [
  { value: 'damage_rate', label: 'Actual Damage Rate' },
  { value: 'expected_damage_rate', label: 'Expected Damage Rate' },
  { value: 'residual', label: 'Residual (Count)' },
  { value: 'residual_pct', label: 'Residual %' },
];

const MetricSelector: React.FC<MetricSelectorProps> = ({ selectedMetric, onChange }) => {
  return (
    <div className="selector-group">
      <label htmlFor="metric-selector">Metric:</label>
      <select
        id="metric-selector"
        value={selectedMetric}
        onChange={(e) => onChange(e.target.value as MetricType)}
        className="selector"
      >
        {METRIC_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default MetricSelector;
