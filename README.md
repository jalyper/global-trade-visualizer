# Global Trade Visualization

An interactive visualization of global trade data between 15 major economies from 2015-2025, built with HTML, JavaScript, and D3.js.

## Live Demo
Visit [https://jalyper.github.io/global-trade-visualizer/](https://jalyper.github.io/global-trade-visualizer/) to see the visualization in action.

## Features
- Network graph showing trade relationships between countries
- Chord diagram displaying bilateral trade flows
- Trade balance visualization comparing exports and imports
- Historical trends tracking trade metrics over time
- Geographic map with animated trade flows
- Sector-based trade network analysis
- Economic insights and analysis panels

## Setup Instructions

### Prerequisites
- Python 3.7 or higher
- Web browser (Chrome, Firefox, or Edge recommended)
- Git (for version control)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/jalyper/global-trade-visualizer.git
   cd global-trade-visualizer
   ```

### Data Processing
1. Fetch trade data from UN Comtrade API:
   ```bash
   python databank_search.py
   ```
   This will create raw data files in the `data_sources` directory.

2. Process the raw data into visualization-ready format:
   ```bash
   python process_trade_data.py
   ```
   This generates processed files in the `data/processed` directory.

### Running the Visualization
1. Start a local web server:
   ```bash
   python -m http.server 8000
   ```

2. Open your web browser and visit:
   ```
   http://localhost:8000
   ```

## Data Sources
- Trade data: [UN Comtrade Database](https://comtrade.un.org/)
- The visualization uses data for 15 major economies:
  - North America: USA, Canada, Mexico
  - Europe: Germany, UK, France, Italy, Spain, Netherlands
  - Asia-Pacific: China, Japan, South Korea, Australia, India
  - South America: Brazil

## Project Structure
```
global-trade-visualizer/
├── data/                    # Processed data files
│   └── processed/           # Visualization-ready data
├── data_sources/           # Raw data from UN Comtrade
├── databank_search.py      # Script to fetch UN Comtrade data
├── process_trade_data.py   # Data processing script
├── index.html             # Main visualization page
├── visualization.js       # D3.js visualization code
└── README.md             # This file
```

## Development
To modify the visualization:
1. Edit `visualization.js` for changes to charts and interactions
2. Modify `index.html` for layout and UI changes
3. Update `process_trade_data.py` to change data processing logic

## License
This project is open source and available under the MIT License.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.
