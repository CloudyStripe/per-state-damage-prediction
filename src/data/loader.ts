import { TransmissionRecord, DamageRecord, StateYearMetrics } from '../types';
import {
  parseCSV,
  parseTransmissionRow,
  parseDamageRow,
  transformData,
} from './transform';

/**
 * Load and parse transmission CSV data
 */
export async function loadTransmissions(): Promise<TransmissionRecord[]> {
  const response = await fetch('/data/cga_transmissions.csv');
  const text = await response.text();
  return parseCSV(text, parseTransmissionRow);
}

/**
 * Load and parse damage CSV data
 */
export async function loadDamages(): Promise<DamageRecord[]> {
  const response = await fetch('/data/cga_dirt_damages.csv');
  const text = await response.text();
  return parseCSV(text, parseDamageRow);
}

/**
 * Load all data and transform it
 */
export async function loadAndTransformData(): Promise<StateYearMetrics[]> {
  const [transmissions, damages] = await Promise.all([
    loadTransmissions(),
    loadDamages(),
  ]);
  
  return transformData(transmissions, damages);
}

/**
 * Load US states TopoJSON
 */
export async function loadUSStates(): Promise<TopoJSON.Topology> {
  // Import from us-atlas package
  const topology = await import('us-atlas/states-albers-10m.json');
  return topology.default as unknown as TopoJSON.Topology;
}
