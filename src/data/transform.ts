import { TransmissionRecord, DamageRecord, StateYearMetrics } from '../types';

/**
 * Threshold for meaningful residual percentage.
 * If the absolute residual percentage is below this threshold,
 * the expected values are considered too close to actual values to be useful.
 * Set to 0 to show all residuals regardless of magnitude.
 */
const MEANINGFUL_RESIDUAL_THRESHOLD = 0;

/**
 * Parse CSV text into structured records
 */
export function parseCSV<T>(csvText: string, parser: (row: string[]) => T): T[] {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const records: T[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length === headers.length) {
      records.push(parser(values));
    }
  }
  
  return records;
}

/**
 * Parse transmission CSV row
 */
export function parseTransmissionRow(row: string[]): TransmissionRecord {
  return {
    state: row[0].trim().toUpperCase(),
    year: parseInt(row[1], 10),
    transmissions: parseInt(row[2], 10),
  };
}

/**
 * Parse damage CSV row
 */
export function parseDamageRow(row: string[]): DamageRecord {
  return {
    state: row[0].trim().toUpperCase(),
    year: parseInt(row[1], 10),
    total_damages: parseInt(row[2], 10),
  };
}

/**
 * Calculate damage rate: (damages / transmissions) * 10,000
 */
export function calculateDamageRate(damages: number, transmissions: number): number | null {
  if (transmissions <= 0) return null;
  return (damages / transmissions) * 10000;
}

/**
 * Calculate expected damage rate using prior years only
 * Uses up to the last 3 available years of state-specific data,
 * falling back to national average only if no state-specific data exists
 */
export function calculateExpectedDamageRate(
  state: string,
  year: number,
  metricsMap: Map<string, StateYearMetrics[]>,
  nationalAvgRate: Map<number, number>
): number | null {
  const stateHistory = metricsMap.get(state) || [];
  
  // Get prior years' damage rates (years < current year)
  const priorRates = stateHistory
    .filter(m => m.year < year && m.damage_rate !== null)
    .sort((a, b) => b.year - a.year) // Most recent first
    .slice(0, 3) // Take up to last 3 years
    .map(m => m.damage_rate as number);
  
  // Use state-specific prior data if available (even if fewer than 3 years)
  if (priorRates.length > 0) {
    return priorRates.reduce((sum, rate) => sum + rate, 0) / priorRates.length;
  }
  
  // Only fall back to national average if no state-specific data exists
  const priorYear = year - 1;
  const natAvg = nationalAvgRate.get(priorYear);
  
  return natAvg ?? null;
}

/**
 * Calculate national average damage rate for each year
 */
export function calculateNationalAverages(
  transmissions: TransmissionRecord[],
  damages: DamageRecord[]
): Map<number, number> {
  const yearTotals = new Map<number, { damages: number; transmissions: number }>();
  
  // Sum transmissions by year
  for (const t of transmissions) {
    const existing = yearTotals.get(t.year) || { damages: 0, transmissions: 0 };
    existing.transmissions += t.transmissions;
    yearTotals.set(t.year, existing);
  }
  
  // Sum damages by year
  for (const d of damages) {
    const existing = yearTotals.get(d.year) || { damages: 0, transmissions: 0 };
    existing.damages += d.total_damages;
    yearTotals.set(d.year, existing);
  }
  
  // Calculate rate for each year
  const nationalAvg = new Map<number, number>();
  yearTotals.forEach((totals, year) => {
    const rate = calculateDamageRate(totals.damages, totals.transmissions);
    if (rate !== null) {
      nationalAvg.set(year, rate);
    }
  });
  
  return nationalAvg;
}

/**
 * Main data transformation pipeline
 * Joins data, computes all metrics, handles missing data gracefully
 */
export function transformData(
  transmissions: TransmissionRecord[],
  damages: DamageRecord[]
): StateYearMetrics[] {
  // Create a map for quick lookup: state+year -> transmission record
  const transmissionMap = new Map<string, TransmissionRecord>();
  for (const t of transmissions) {
    transmissionMap.set(`${t.state}-${t.year}`, t);
  }
  
  // Create a map for quick lookup: state+year -> damage record
  const damageMap = new Map<string, DamageRecord>();
  for (const d of damages) {
    damageMap.set(`${d.state}-${d.year}`, d);
  }
  
  // Get all unique state-year combinations
  const allKeys = new Set<string>();
  transmissions.forEach(t => allKeys.add(`${t.state}-${t.year}`));
  damages.forEach(d => allKeys.add(`${d.state}-${d.year}`));
  
  // Calculate national averages
  const nationalAvgRate = calculateNationalAverages(transmissions, damages);
  
  // First pass: calculate damage rates for all state-years
  const metricsMap = new Map<string, StateYearMetrics[]>();
  const allMetrics: StateYearMetrics[] = [];
  
  for (const key of allKeys) {
    const [state, yearStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    
    const transmissionRecord = transmissionMap.get(key);
    const damageRecord = damageMap.get(key);
    
    const transmissionCount = transmissionRecord?.transmissions ?? 0;
    const damageCount = damageRecord?.total_damages ?? 0;
    
    // Skip if no transmission data
    if (transmissionCount <= 0) continue;
    
    const damageRate = calculateDamageRate(damageCount, transmissionCount);
    
    const metric: StateYearMetrics = {
      state,
      year,
      transmissions: transmissionCount,
      actual_damages: damageCount,
      damage_rate: damageRate,
      expected_damage_rate: null,
      expected_damages: null,
      residual: null,
      residual_pct: null,
    };
    
    // Store in map for state lookup
    const stateMetrics = metricsMap.get(state) || [];
    stateMetrics.push(metric);
    metricsMap.set(state, stateMetrics);
    
    allMetrics.push(metric);
  }
  
  // Sort each state's metrics by year
  for (const stateMetrics of metricsMap.values()) {
    stateMetrics.sort((a, b) => a.year - b.year);
  }
  
  // Second pass: calculate expected rates and residuals
  for (const metric of allMetrics) {
    const expectedRate = calculateExpectedDamageRate(
      metric.state,
      metric.year,
      metricsMap,
      nationalAvgRate
    );
    
    metric.expected_damage_rate = expectedRate;
    
    if (expectedRate !== null && metric.transmissions > 0) {
      const rawExpectedDamages = (metric.transmissions * expectedRate) / 10000;
      
      if (rawExpectedDamages > 0) {
        const rawResidual = metric.actual_damages - rawExpectedDamages;
        const rawResidualPct = rawResidual / rawExpectedDamages;
        
        // Check if the residual is meaningful (not just rounding noise)
        // If the absolute residual percentage is below the threshold,
        // the expected value is too close to actual to be useful
        const isResidualMeaningful = Math.abs(rawResidualPct) >= MEANINGFUL_RESIDUAL_THRESHOLD;
        
        if (isResidualMeaningful) {
          metric.expected_damages = rawExpectedDamages;
          metric.residual = rawResidual;
          metric.residual_pct = rawResidualPct;
        }
        // If not meaningful, leave expected_damages, residual, and residual_pct as null
      }
    }
  }
  
  // Sort by state and year
  allMetrics.sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state);
    return a.year - b.year;
  });
  
  return allMetrics;
}

/**
 * Get available years from metrics data
 * Only returns years where expected damage rate can be calculated
 * (i.e., years with sufficient historical baseline)
 */
export function getAvailableYears(metrics: StateYearMetrics[]): number[] {
  const yearsWithExpected = new Set<number>();
  
  for (const metric of metrics) {
    if (metric.expected_damage_rate !== null) {
      yearsWithExpected.add(metric.year);
    }
  }
  
  return Array.from(yearsWithExpected).sort();
}

/**
 * Get unique states from metrics data
 */
export function getUniqueStates(metrics: StateYearMetrics[]): string[] {
  const states = new Set<string>();
  for (const metric of metrics) {
    states.add(metric.state);
  }
  return Array.from(states).sort();
}

/**
 * Filter metrics by year
 */
export function filterByYear(metrics: StateYearMetrics[], year: number): StateYearMetrics[] {
  return metrics.filter(m => m.year === year);
}

/**
 * Get metrics for a specific state and year
 */
export function getStateYearMetric(
  metrics: StateYearMetrics[],
  state: string,
  year: number
): StateYearMetrics | undefined {
  return metrics.find(m => m.state === state && m.year === year);
}
