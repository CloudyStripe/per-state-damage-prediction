import React, { useState } from 'react';

const AboutData: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="about-data">
      <button
        className="about-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? '▼' : '▶'} About this data
      </button>
      {isExpanded && (
        <div className="about-content">
          <p>
            This application uses publicly available CGA 811 transmission data and CGA DIRT 
            damage reports.
          </p>
          <p>
            Expected damages are calculated using each state's historical damage rate from 
            prior years only.
          </p>
          <p>
            DIRT reporting is voluntary and aggregated at the state level; results should be 
            interpreted as relative performance benchmarks, not exact strike counts or risk 
            at specific locations.
          </p>
          <h4>Metric Definitions</h4>
          <ul>
            <li>
              <strong>Damage Rate</strong>: (Total Damages / Transmissions) × 10,000
            </li>
            <li>
              <strong>Expected Damage Rate</strong>: Average damage rate from the last 3 
              prior years (or national average if insufficient history)
            </li>
            <li>
              <strong>Expected Damages</strong>: Transmissions × Expected Rate / 10,000
            </li>
            <li>
              <strong>Residual</strong>: Actual Damages − Expected Damages
            </li>
            <li>
              <strong>Residual %</strong>: Residual / Expected Damages
            </li>
          </ul>
          <h4>Data Limitations</h4>
          <ul>
            <li>DIRT damage reporting is voluntary, leading to undercount bias</li>
            <li>Data is aggregated annually at the state level only</li>
            <li>Expected rates require at least one prior year of data</li>
            <li>Results are for exploratory analytics, not regulatory reporting</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default AboutData;
