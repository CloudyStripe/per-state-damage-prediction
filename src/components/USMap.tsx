import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { StateYearMetrics, MetricType, FIPS_TO_STATE, STATE_NAMES } from '../types';
import StateTooltip from './StateTooltip';

interface USMapProps {
  metrics: StateYearMetrics[];
  selectedYear: number;
  selectedMetric: MetricType;
}

const METRIC_LABELS: Record<MetricType, string> = {
  damage_rate: 'Damage Rate (per 10,000 tickets)',
  expected_damage_rate: 'Expected Damage Rate (per 10,000 tickets)',
  residual: 'Residual (Actual - Expected)',
  residual_pct: 'Residual %',
};

const USMap: React.FC<USMapProps> = ({ metrics, selectedYear, selectedMetric }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [topology, setTopology] = useState<TopoJSON.Topology | null>(null);
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    stateCode: string;
    metric: StateYearMetrics | null;
  }>({ visible: false, x: 0, y: 0, stateCode: '', metric: null });

  // Load topology on mount
  useEffect(() => {
    import('us-atlas/states-albers-10m.json').then((data) => {
      setTopology(data.default as unknown as TopoJSON.Topology);
    });
  }, []);

  // Get metric value for a state
  const getMetricValue = useCallback(
    (stateCode: string): number | null => {
      const metric = metrics.find(
        (m) => m.state === stateCode && m.year === selectedYear
      );
      if (!metric) return null;
      return metric[selectedMetric] ?? null;
    },
    [metrics, selectedYear, selectedMetric]
  );

  // Get metric object for a state
  const getStateMetric = useCallback(
    (stateCode: string): StateYearMetrics | null => {
      return (
        metrics.find((m) => m.state === stateCode && m.year === selectedYear) ??
        null
      );
    },
    [metrics, selectedYear]
  );

  // Color scale based on metric type
  const getColorScale = useCallback(() => {
    const yearMetrics = metrics.filter((m) => m.year === selectedYear);
    const values = yearMetrics
      .map((m) => m[selectedMetric])
      .filter((v): v is number => v !== null);

    if (values.length === 0) {
      return () => '#ccc';
    }

    if (selectedMetric === 'residual_pct' || selectedMetric === 'residual') {
      // Diverging scale for residuals (negative = blue, positive = red)
      const maxAbs = Math.max(Math.abs(d3.min(values) ?? 0), Math.abs(d3.max(values) ?? 0));
      return d3
        .scaleSequential(d3.interpolateRdBu)
        .domain([maxAbs, -maxAbs]);
    } else {
      // Sequential scale for rates
      const [min, max] = d3.extent(values);
      return d3
        .scaleSequential(d3.interpolateBlues)
        .domain([min ?? 0, max ?? 1]);
    }
  }, [metrics, selectedYear, selectedMetric]);

  // Render map
  useEffect(() => {
    if (!svgRef.current || !topology) return;

    const svg = d3.select(svgRef.current);
    const width = 960;
    const height = 600;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // Clear previous content
    svg.selectAll('*').remove();

    // Get states geometry
    const states = topojson.feature(
      topology,
      topology.objects.states as TopoJSON.GeometryCollection
    ) as GeoJSON.FeatureCollection;

    // Use identity transform since data is pre-projected (Albers)
    const path = d3.geoPath();
    const colorScale = getColorScale();

    // Draw states
    svg
      .append('g')
      .attr('class', 'states')
      .selectAll('path')
      .data(states.features)
      .join('path')
      .attr('d', path)
      .attr('fill', (d) => {
        const fips = String(d.id).padStart(2, '0');
        const stateCode = FIPS_TO_STATE[fips];
        const value = stateCode ? getMetricValue(stateCode) : null;
        return value !== null ? colorScale(value) : '#f0f0f0';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 2);
        
        const fips = String(d.id).padStart(2, '0');
        const stateCode = FIPS_TO_STATE[fips];
        const metric = stateCode ? getStateMetric(stateCode) : null;
        
        setTooltipState({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          stateCode: stateCode || '',
          metric,
        });
      })
      .on('mousemove', function (event) {
        setTooltipState((prev) => ({
          ...prev,
          x: event.pageX,
          y: event.pageY,
        }));
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.5);
        setTooltipState((prev) => ({ ...prev, visible: false }));
      });

    // Draw state borders
    svg
      .append('path')
      .datum(
        topojson.mesh(
          topology,
          topology.objects.states as TopoJSON.GeometryCollection,
          (a, b) => a !== b
        )
      )
      .attr('fill', 'none')
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('d', path);
  }, [topology, metrics, selectedYear, selectedMetric, getColorScale, getMetricValue, getStateMetric]);

  // Render legend
  const renderLegend = () => {
    const yearMetrics = metrics.filter((m) => m.year === selectedYear);
    const values = yearMetrics
      .map((m) => m[selectedMetric])
      .filter((v): v is number => v !== null);

    if (values.length === 0) return null;

    const colorScale = getColorScale();
    const isDiverging = selectedMetric === 'residual_pct' || selectedMetric === 'residual';
    
    let domain: [number, number];
    if (isDiverging) {
      const maxAbs = Math.max(Math.abs(d3.min(values) ?? 0), Math.abs(d3.max(values) ?? 0));
      domain = [-maxAbs, maxAbs];
    } else {
      const [min, max] = d3.extent(values);
      domain = [min ?? 0, max ?? 1];
    }

    const steps = 5;
    const stepSize = (domain[1] - domain[0]) / (steps - 1);
    const legendItems = Array.from({ length: steps }, (_, i) => domain[0] + i * stepSize);

    const formatValue = (v: number) => {
      if (selectedMetric === 'residual_pct') {
        return `${(v * 100).toFixed(1)}%`;
      }
      if (selectedMetric === 'residual') {
        return v.toFixed(0);
      }
      return v.toFixed(2);
    };

    return (
      <div className="legend">
        <div className="legend-title">{METRIC_LABELS[selectedMetric]}</div>
        <div className="legend-scale">
          {legendItems.map((value, i) => (
            <div key={i} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: colorScale(value) }}
              />
              <span className="legend-label">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="map-container">
      <svg ref={svgRef} className="us-map" />
      {renderLegend()}
      {tooltipState.visible && (
        <StateTooltip
          x={tooltipState.x}
          y={tooltipState.y}
          stateCode={tooltipState.stateCode}
          stateName={STATE_NAMES[tooltipState.stateCode] || tooltipState.stateCode}
          metric={tooltipState.metric}
        />
      )}
    </div>
  );
};

export default USMap;
