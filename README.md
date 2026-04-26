# Portmanteau: Advanced Financial Portfolio Optimiser

### What the software does
Portmanteau is a professional-grade financial decision-support system. It replaces fragmented spreadsheet tracking with a unified dashboard that utilises **Modern Portfolio Theory (MPT)**. By running Mean-Variance Optimisation algorithms, the system provides actionable, algorithmic rebalancing insights, helping investors move their holdings toward the "Efficient Frontier" to maximise returns for a given level of risk.

---

### Core Features Implemented
* **Cloud-Distributed Microservice Architecture:** * **Node.js API Gateway (Render):** Manages user authentication, database orchestration via Supabase, and core transaction logic.
    * **Python Analytics Engine (PythonAnywhere):** A decoupled service using `SciPy` and `NumPy` to solve complex matrix algebra for portfolio optimisation without blocking the main event loop.
* **Responsive Cross-Platform UI:** A fluid React Native interface that scales from desktop browsers to physical mobile devices, featuring a custom side-navigation drawer and global state management via the Context API.
* **Dynamic Theming & Settings:** Users can toggle between Light and Dark modes, which instantly updates all UI components, charts, and native inputs across the application.
* **Automated Market Orders:** Users no longer manually enter stock prices. The system fetches live market data via a custom price-discovery route in the Python engine using the `yfinance` API.
* **Visual Analytics:** Includes dynamic **Portfolio Allocation Pie Charts** for current holdings and a filtered **Efficient Frontier Line Chart** to visualise the risk/return profile of the optimised portfolio.
* **Cross-Platform Data Management:** Features context-aware CSV exporting that utilises native iOS/Android file sharing on mobile, and direct blob downloads on web browsers. Includes full relational cascade deletion allowing users to safely wipe all transaction history.
* **Business Logic & Security:** Advanced "Short-Sell" protection prevents users from selling assets they do not currently own. Implements JWT session management and Bcrypt password hashing.

---

### Tech Stack
* **Frontend:** React Native (Expo Router), React Context API, React Native Chart Kit.
* **Backend:** Node.js (Express), Python 3.10 (Flask).
* **Data Science:** Pandas, NumPy, SciPy (Optimisation), yfinance.
* **Database:** PostgreSQL (Supabase) with JWT-protected relational schemas.
* **Cloud Deployment:** Render (API Gateway), PythonAnywhere (Analytics Engine).

---

### Setup and Run Instructions

**Quick Start (Cloud Connected)**
Because the Node.js API Gateway and Python Analytics Engine are actively deployed to the cloud, **you only need to run the Mobile Client** to test the full system.

```bash
cd mobile-client
npm install
npx expo start -c
```
* Web: Press w in the terminal to open in your browser.

### How to Use

1. **Register/Login**: Create an account with a valid email. Your username is automatically generated and formatted from your email address.

2. **Dashboard**: View your current Asset Allocation pie chart and live Profit/Loss (ROI) percentages calculated against current market prices.

3. **Add Transaction**: Use the "Market Order" form. Simply type a ticker (or use a quick-select chip) and a quantity. The system fetches the live price automatically.

4. **Optimisation View**: Navigate via the Side Menu to see your portfolio's Beta, Sharpe Ratio, and the suggested trades needed to reach the Efficient Frontier.

5. **Settings**: Toggle Dark Mode, visually adjust your preferred currency, export your live portfolio to a `.csv` spreadsheet, or execute a database wipe to start fresh.

### Known Limitations

* **Market Latency**: As the system uses the yfinance library for real-time pricing, slight delays or "Analysis Errors" may occur during high-volatility sessions or if ticker symbols are invalid.

* **Ticker Symbols**: Cryptocurrency assets require a -USD suffix (e.g., BTC-USD) for accurate price discovery within the Yahoo Finance API.

* **Historical Snapshots**: Performance history is currently calculated based on live price movements of current holdings

* **API Pivot & Market Latency**: The original system architecture proposed using the **Alpha Vantage API** for live data. However, during development, it was discovered that Alpha Vantage's strict free-tier rate limits (5 requests per minute) would fatally bottleneck the multi-asset optimization engine. The architecture was successfully pivoted to use the `yfinance` library. While this solved the rate-limiting constraints, `yfinance` relies on web scraping Yahoo Finance, which can occasionally result in slight latency or "Analysis Errors" during high-volatility trading sessions.
