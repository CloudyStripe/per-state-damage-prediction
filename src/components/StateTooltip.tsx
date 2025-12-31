import React from 'react';
import { StateYearMetrics } from '../types';

interface StateTooltipProps {
  x: number;
  y: number;
  stateCode: string;
  stateName: string;
  metric: StateYearMetrics | null;
}

const StateTooltip: React.FC<StateTooltipProps> = ({
  x,
  y,
  stateCode,
  stateName,
  metric,
}) => {
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString();
  };

  const formatRate = (rate: number | null | undefined): string => {
    if (rate === null || rate === undefined) return 'N/A';
    return rate.toFixed(2);
  };

  const formatPercent = (pct: number | null | undefined): string => {
    if (pct === null || pct === undefined) return 'N/A';
    return `${(pct * 100).toFixed(1)}%`;
  };

  const formatResidual = (residual: number | null | undefined): string => {
    if (residual === null || residual === undefined) return 'N/A';
    const sign = residual >= 0 ? '+' : '';
    return `${sign}${residual.toFixed(0)}`;
  };

  return (
    <div
      className="tooltip"
      style={{
        position: 'fixed',
        left: x + 15,
        top: y - 10,
        pointerEvents: 'none',
      }}
    >
      <div className="tooltip-header">
        <strong>{stateName}</strong> ({stateCode})
      </div>
      {metric ? (
        <div className="tooltip-content">
          <div className="tooltip-row">
            <span className="tooltip-label">Transmissions:</span>
            <span className="tooltip-value">{formatNumber(metric.transmissions)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Actual Damages:</span>
            <span className="tooltip-value">{formatNumber(metric.actual_damages)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Expected Damages:</span>
            <span className="tooltip-value">
              {metric.expected_damages !== null
                ? formatNumber(Math.round(metric.expected_damages))
                : 'N/A'}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Damage Rate:</span>
            <span className="tooltip-value">{formatRate(metric.damage_rate)}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Expected Rate:</span>
            <span className="tooltip-value">{formatRate(metric.expected_damage_rate)}</span>
          </div>
          <div className="tooltip-divider" />
          <div className="tooltip-row">
            <span className="tooltip-label">Residual:</span>
            <span
              className={`tooltip-value ${
                metric.residual !== null
                  ? metric.residual >= 0
                    ? 'positive'
                    : 'negative'
                  : ''
              }`}
            >
              {formatResidual(metric.residual)}
            </span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Residual %:</span>
            <span
              className={`tooltip-value ${
                metric.residual_pct !== null
                  ? metric.residual_pct >= 0
                    ? 'positive'
                    : 'negative'
                  : ''
              }`}
            >
              {formatPercent(metric.residual_pct)}
            </span>
          </div>
        </div>
      ) : (
        <div className="tooltip-content">
          <span className="tooltip-no-data">No data available</span>
        </div>
      )}
    </div>
  );
};

export default StateTooltip;
