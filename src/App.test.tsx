import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock fetch for data loading
const mockTransmissionsCSV = `state,year,transmissions
AL,2018,245000
AL,2019,258000
AL,2020,242000`;

const mockDamagesCSV = `state,year,total_damages
AL,2018,1842
AL,2019,1935
AL,2020,1815`;

beforeEach(() => {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('cga_transmissions.csv')) {
      return Promise.resolve({
        text: () => Promise.resolve(mockTransmissionsCSV),
      });
    }
    if (url.includes('cga_dirt_damages.csv')) {
      return Promise.resolve({
        text: () => Promise.resolve(mockDamagesCSV),
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  }) as jest.Mock;
});

test('renders loading state initially', () => {
  render(<App />);
  const loadingElement = screen.getByText(/loading data/i);
  expect(loadingElement).toBeInTheDocument();
});

test('renders app title after loading', async () => {
  render(<App />);
  const titleElement = await screen.findByText(/US Ticket-to-Damage Proxy Model/i, {}, { timeout: 3000 });
  expect(titleElement).toBeInTheDocument();
});
