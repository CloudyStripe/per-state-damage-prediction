import React from 'react';

interface YearSelectorProps {
  years: number[];
  selectedYear: number;
  onChange: (year: number) => void;
}

const YearSelector: React.FC<YearSelectorProps> = ({ years, selectedYear, onChange }) => {
  return (
    <div className="selector-group">
      <label htmlFor="year-selector">Year:</label>
      <select
        id="year-selector"
        value={selectedYear}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="selector"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
};

export default YearSelector;
