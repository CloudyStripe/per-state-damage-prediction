# US Ticket-to-Damage Proxy Model

An interactive US map web application that benchmarks underground utility damages against 811 ticket volume at the state level. This exploratory analytics tool visualizes actual damages, expected damages (historical baseline), and residuals using real, publicly available CGA datasets.

## What This MVP Proves

1. **State-level damage benchmarking is feasible** using publicly available CGA 811 transmission data and DIRT damage reports
2. **Historical baselines work** for computing expected damage rates without data leakage (prior years only)
3. **Residual analysis identifies outliers** - states performing better or worse than their historical benchmarks
4. **Interactive visualization enables exploration** of damage patterns across time and geography

## What Better Data Would Unlock

1. **Sub-state granularity**: County or utility-level data would enable more actionable insights
2. **Monthly trends**: Seasonal patterns and trend analysis
3. **Root cause fields**: Excavator type, notification status, facility type
4. **Denominator alternatives**: Excavation permits, construction activity indices
5. **Complete reporting**: Mandatory vs. voluntary reporting would reduce undercount bias

## Data Sources

### CGA 811 Center Dashboard — Ticket Volume (Exposure)
- **File**: `public/data/cga_transmissions.csv`
- **Fields**: state, year, transmissions
- **Notes**: Annual 811 ticket/transmission totals

### CGA DIRT Annual Report — Damage Counts
- **File**: `public/data/cga_dirt_damages.csv`
- **Fields**: state, year, total_damages
- **Notes**: Voluntary reporting with undercount bias

### US States Geometry
- **Package**: `us-atlas` (TopoJSON)
- **Projection**: Albers USA

## Core Metric Definitions

### Damage Rate
```
damage_rate = (total_damages / transmissions) × 10,000
```

### Expected Damage Rate
For each state + year Y:
```
expected_damage_rate(Y) = average(damage_rate) for all years < Y
```
Rules:
- Uses prior years only (no leakage)
- Prefers last 3 available years
- Falls back to national average if < 3 years of history

### Expected Damages
```
expected_damages = transmissions × expected_damage_rate / 10,000
```

### Residuals
```
residual = actual_damages − expected_damages
residual_pct = residual / expected_damages
```

## Tech Stack

- **React 19** with TypeScript
- **D3.js** for choropleth mapping (SVG, no API keys required)
- **TopoJSON** for US state boundaries
- **Create React App** for build tooling

## Project Structure

```
per-state-damage-prediction/
├── public/
│   └── data/
│       ├── cga_transmissions.csv    # 811 ticket volume data
│       └── cga_dirt_damages.csv     # Damage counts data
├── src/
│   ├── components/
│   │   ├── USMap.tsx               # Main choropleth map with D3
│   │   ├── StateTooltip.tsx        # Hover tooltip with metrics
│   │   ├── MetricSelector.tsx      # Dropdown for metric selection
│   │   ├── YearSelector.tsx        # Dropdown for year selection
│   │   └── AboutData.tsx           # Data limitations panel
│   ├── data/
│   │   ├── loader.ts               # Data loading utilities
│   │   └── transform.ts            # Metric calculations
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   ├── App.tsx                     # Main application
│   └── App.css                     # Styles
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 16+
- npm 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/CloudyStripe/per-state-damage-prediction.git
cd per-state-damage-prediction

# Install dependencies
npm install
```

### Running Locally

```bash
# Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

```bash
npm run build
```

### Running Tests

```bash
npm test
```

## Features

### Map
- US choropleth map at state level
- Pre-projected Albers USA geometry (no tiles/API keys)

### Metric Selector
- Actual damage rate
- Expected damage rate
- Residual (count)
- Residual %

### Time Selector
- Year dropdown
- Only years with sufficient historical baseline are enabled

### Tooltips
Each state shows on hover:
- Transmissions
- Actual damages
- Expected damages
- Damage rate
- Residual and residual %

### Color Scales
- Sequential scale (blue) for rates
- Diverging scale (blue-red) for residuals

### Data Transparency
"About this data" panel with:
- Data source descriptions
- Metric definitions
- Known limitations

## Data Limitations

- DIRT reporting is voluntary → undercount bias
- State-level aggregation only
- Annual data only (no seasonal analysis)
- Results are exploratory benchmarks, not exact risk measures

## License

MIT
