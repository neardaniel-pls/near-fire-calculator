# FIRE Calculator Portugal

An open-source FIRE (Financial Independence, Retire Early) calculator designed for the Portuguese community. Monte Carlo simulation, portfolio management, financial events, and PDF export — all running client-side in your browser.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This calculator was created for the Portuguese FIRE community. Many existing tools are too simple or focused on the US market. This tool adapts to the Portuguese reality with transparent calculations, Monte Carlo simulation, and bilingual support (Portuguese/English).

All processing happens in your browser — no data is sent to any server.

## Features

### Monte Carlo Simulation
- **Purpose:** Tests your financial plan against market volatility
- **How:** Generates thousands of possible future scenarios
- **Output:** Success probability, confidence bands, median path

### Portfolio Management
- **Purpose:** Add and manage different investments with custom parameters
- **Supported:** ETFs, PPRs, Stocks, Bonds, Crypto
- **Per-asset:** Custom return rate and volatility (standard deviation)

### Financial Events
- **Purpose:** Simulate one-time and recurring financial events
- **Types:** Inheritance, house down payment, annual bonus, rental income

### Investment Templates
- **Purpose:** Quick start with predefined profiles
- **Options:** Conservative, Moderate, Aggressive, or save your own

### PDF Export
- **Purpose:** Generate a PDF report with your projection
- **Includes:** Portfolio summary, chart, Monte Carlo results

## Documentation

### [Documentation Hub](docs/README.md)
Guides and references

### [Quick Start Guide](docs/QUICK_START.md)
Get started in 2 minutes

### [Guides](docs/guides/)
- [Calculator Guide](docs/guides/calculator-guide.md)
- [i18n Guide](docs/guides/i18n-guide.md)

### [FAQ](docs/FAQ.md)
Common questions and troubleshooting

### [Contributing Guide](CONTRIBUTING.md)
How to contribute

## Installation

### Online
Visit the GitHub Pages deployment (link in repo).

### Local
```bash
git clone https://github.com/neardaniel-pls/calculadora-fire.git
cd calculadora-fire
```

Open `index.html` in your browser, or use Live Server in VS Code.

## Project Structure

```
near-fire-calculator/
├── index.html            # Main entry point
├── css/style.css         # Styles (dark/light theme)
├── src/
│   ├── app.js            # Application initialization
│   ├── calculator.js     # Financial calculations
│   ├── charts.js         # Chart rendering
│   ├── i18n.js           # Internationalization
│   ├── pdf.js            # PDF export
│   ├── state.js          # State management
│   └── ui.js             # UI helpers
├── locales/
│   ├── en.json           # English translations
│   └── pt.json           # Portuguese translations
├── docs/                 # Documentation
└── .github/
    └── workflows/main.yml # GitHub Pages deployment
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [Report Bugs](https://github.com/neardaniel-pls/calculadora-fire/issues/new?template=bug_report.md)
- [Request Features](https://github.com/neardaniel-pls/calculadora-fire/issues/new?template=feature_request.md)

## Related Projects

- **[near-investing](https://github.com/neardaniel-pls/near-investing)**: Portfolio analysis and optimization tool
- **[near-electric](https://github.com/neardaniel-pls/near-electric)**: Electricity consumption analysis
- **[fedora-user-scripts](https://github.com/neardaniel-pls/fedora-user-scripts)**: Utility scripts for Fedora Linux

---

Made for the Portuguese FIRE community.
