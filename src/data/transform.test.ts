import {
  parseCSV,
  parseTransmissionRow,
  parseDamageRow,
  calculateDamageRate,
  transformData,
  getAvailableYears,
  filterByYear,
} from './transform';
import { TransmissionRecord, DamageRecord } from '../types';

describe('Data transformation utilities', () => {
  describe('parseCSV', () => {
    it('should parse CSV text into records', () => {
      const csv = `state,year,transmissions
AL,2018,245000
CA,2019,2980000`;
      const records = parseCSV(csv, parseTransmissionRow);
      expect(records).toHaveLength(2);
      expect(records[0]).toEqual({ state: 'AL', year: 2018, transmissions: 245000 });
      expect(records[1]).toEqual({ state: 'CA', year: 2019, transmissions: 2980000 });
    });
  });

  describe('calculateDamageRate', () => {
    it('should calculate damage rate per 10,000 transmissions', () => {
      const rate = calculateDamageRate(750, 100000);
      expect(rate).toBe(75);
    });

    it('should return null for zero transmissions', () => {
      const rate = calculateDamageRate(100, 0);
      expect(rate).toBeNull();
    });

    it('should return null for negative transmissions', () => {
      const rate = calculateDamageRate(100, -100);
      expect(rate).toBeNull();
    });
  });

  describe('transformData', () => {
    const transmissions: TransmissionRecord[] = [
      { state: 'AL', year: 2018, transmissions: 100000 },
      { state: 'AL', year: 2019, transmissions: 100000 },
      { state: 'AL', year: 2020, transmissions: 100000 },
      { state: 'AL', year: 2021, transmissions: 100000 },
    ];

    const damages: DamageRecord[] = [
      { state: 'AL', year: 2018, total_damages: 750 },
      { state: 'AL', year: 2019, total_damages: 800 },
      { state: 'AL', year: 2020, total_damages: 700 },
      { state: 'AL', year: 2021, total_damages: 850 },
    ];

    it('should compute damage rates', () => {
      const metrics = transformData(transmissions, damages);
      expect(metrics).toHaveLength(4);
      expect(metrics[0].damage_rate).toBe(75);
      expect(metrics[1].damage_rate).toBe(80);
    });

    it('should compute expected damage rate from prior years', () => {
      const metrics = transformData(transmissions, damages);
      // 2021 should use average of 2018, 2019, 2020: (75 + 80 + 70) / 3 = 75
      const metric2021 = metrics.find(m => m.year === 2021);
      expect(metric2021?.expected_damage_rate).toBeCloseTo(75, 1);
    });

    it('should compute residuals correctly', () => {
      const metrics = transformData(transmissions, damages);
      const metric2021 = metrics.find(m => m.year === 2021);
      // Expected damages = 100000 * 75 / 10000 = 750
      // Actual damages = 850
      // Residual = 850 - 750 = 100
      // Residual % = 100 / 750 = 13.3% (> 0.5% threshold, so meaningful)
      expect(metric2021?.expected_damages).toBeCloseTo(750, 0);
      expect(metric2021?.residual).toBeCloseTo(100, 0);
    });

    it('should show N/A for expected damages when residual is not meaningful', () => {
      // Create data where all years have the same damage rate
      // This simulates the synthetic data issue
      const uniformTransmissions: TransmissionRecord[] = [
        { state: 'TX', year: 2018, transmissions: 100000 },
        { state: 'TX', year: 2019, transmissions: 100000 },
        { state: 'TX', year: 2020, transmissions: 100000 },
        { state: 'TX', year: 2021, transmissions: 100000 },
      ];
      // All years have the same rate of 75 per 10,000
      const uniformDamages: DamageRecord[] = [
        { state: 'TX', year: 2018, total_damages: 750 },
        { state: 'TX', year: 2019, total_damages: 750 },
        { state: 'TX', year: 2020, total_damages: 750 },
        { state: 'TX', year: 2021, total_damages: 750 },
      ];
      
      const metrics = transformData(uniformTransmissions, uniformDamages);
      const metric2021 = metrics.find(m => m.year === 2021);
      
      // Expected rate = (75 + 75 + 75) / 3 = 75
      // Expected damages = 100000 * 75 / 10000 = 750
      // Actual damages = 750
      // Residual = 0, which is 0% difference (below the 0.5% threshold)
      // So expected_damages, residual, and residual_pct should be null
      expect(metric2021?.expected_damage_rate).toBeCloseTo(75, 1);
      expect(metric2021?.expected_damages).toBeNull();
      expect(metric2021?.residual).toBeNull();
      expect(metric2021?.residual_pct).toBeNull();
    });

    it('should handle missing damage data gracefully', () => {
      const partialDamages: DamageRecord[] = [
        { state: 'AL', year: 2018, total_damages: 750 },
      ];
      const metrics = transformData(transmissions, partialDamages);
      expect(metrics).toHaveLength(4);
      // Years without damage data should have 0 damages and rate of 0
      const metric2019 = metrics.find(m => m.year === 2019);
      expect(metric2019?.actual_damages).toBe(0);
      expect(metric2019?.damage_rate).toBe(0);
    });
  });

  describe('getAvailableYears', () => {
    it('should return years with expected damage rates', () => {
      const transmissions: TransmissionRecord[] = [
        { state: 'AL', year: 2018, transmissions: 100000 },
        { state: 'AL', year: 2019, transmissions: 100000 },
      ];
      const damages: DamageRecord[] = [
        { state: 'AL', year: 2018, total_damages: 750 },
        { state: 'AL', year: 2019, total_damages: 800 },
      ];
      const metrics = transformData(transmissions, damages);
      const years = getAvailableYears(metrics);
      // 2018 won't have expected rate (no prior years), 2019 will
      expect(years).toContain(2019);
    });
  });

  describe('filterByYear', () => {
    it('should filter metrics by year', () => {
      const transmissions: TransmissionRecord[] = [
        { state: 'AL', year: 2018, transmissions: 100000 },
        { state: 'CA', year: 2018, transmissions: 200000 },
        { state: 'AL', year: 2019, transmissions: 110000 },
      ];
      const damages: DamageRecord[] = [
        { state: 'AL', year: 2018, total_damages: 750 },
        { state: 'CA', year: 2018, total_damages: 1500 },
        { state: 'AL', year: 2019, total_damages: 800 },
      ];
      const metrics = transformData(transmissions, damages);
      const year2018 = filterByYear(metrics, 2018);
      expect(year2018).toHaveLength(2);
      expect(year2018.every(m => m.year === 2018)).toBe(true);
    });
  });
});
