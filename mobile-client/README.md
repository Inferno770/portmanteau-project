# Portmanteau: Advanced Financial Portfolio Optimizer

**Video Demonstration:** [Insert YouTube Link Here]

### What the software does
Portmanteau is a professional-grade financial decision-support system. It replaces fragmented spreadsheet tracking with a unified dashboard that utilizes **Modern Portfolio Theory (MPT)**. By running Mean-Variance Optimization algorithms, the system provides actionable, algorithmic rebalancing insights, helping investors move their holdings toward the "Efficient Frontier" to maximize returns for a given level of risk.

---

### Core Features Implemented
* **Responsive Cross-Platform UI:** A fluid React Native interface that scales from desktop browsers to physical mobile devices, featuring a custom side-navigation drawer and dynamic user themes.
* **Microservice Architecture:** * **Node.js API Gateway:** Manages user authentication, database orchestration via Supabase, and core transaction logic.
    * **Python Analytics Engine:** A decoupled service using `SciPy` and `NumPy` to solve complex matrix algebra for portfolio optimization.
* **Automated Market Orders:** Users no longer manually enter stock prices. The system fetches live market data via a custom price-discovery route in the Python engine using the `yfinance` API.
* **Visual Analytics:** Includes dynamic **Portfolio Allocation Pie Charts** for current holdings and a filtered **Efficient Frontier Line Chart** to visualize the risk/return profile of the optimized portfolio.
* **Secure Authentication:** Implements JWT session management, Bcrypt password hashing, and client-side Regex email validation for a robust security posture.
* **Business Logic Validation:** Advanced "Short-Sell" protection prevents users from selling assets they do not currently own or exceeding their current owned quantity.

---

### Tech Stack
* **Frontend:** React Native (Expo Router), React Context API, React Native Chart Kit.
* **Backend:** Node.js (Express), Python 3.10 (Flask).
* **Data Science:** Pandas, NumPy, SciPy (Optimization), yfinance.
* **Database:** PostgreSQL (Supabase) with JWT-protected relational schemas.

---

### Setup and Run Instructions
To run this system locally, you must start the backend microservices before launching the mobile client.

**1. Configuration (Environment Variables)**
Create a `.env` file inside the `api-gateway/` folder and paste the following testing credentials:
```text
SUPABASE_URL=https://tgobcazuqdiqqjbtkjjr.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnb2JjYXp1cWRpcXFqYnRrampyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTgxOTcsImV4cCI6MjA5MjQzNDE5N30.uLEe6tZpOblSxT-Ap5MteedETz0AgJ3X-KQzRDLucDU
JWT_SECRET=secretjwtkeyforportmanteau
```

**2. Start the Analytics Engine (Python)**
```bash
cd analytics-engine
python -m venv venv
venv\Scripts\activate  # On Mac use: source venv/bin/activate
pip install -r requirements.txt
python engine.py
```
**3. Start the API Gateway (Node.js)**
```bash
cd api-gateway
npm install
node server.js
```
**4. Start the Mobile Client (React Native)**
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

4. **Optimise**: Navigate via the Side Menu to see your portfolio's Beta, Sharpe Ratio, and the suggested trades needed to reach the Efficient Frontier.

### Known Limitations

* **Market Latency**: As the system uses the yfinance library for real-time pricing, slight delays or "Analysis Errors" may occur during high-volatility sessions or if ticker symbols are invalid.

* **Ticker Symbols**: Cryptocurrency assets require a -USD suffix (e.g., BTC-USD) for accurate price discovery within the Yahoo Finance API.

* **Historical Snapshots**: Performance history is currently calculated based on live price movements of current holdings
