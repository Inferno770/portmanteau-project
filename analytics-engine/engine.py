import time
import os
import pandas as pd
import numpy as np
from scipy.optimize import minimize
from flask import Flask, request, jsonify
import requests
from dotenv import load_dotenv

# Load the secret Alpha Vantage API Key
load_dotenv()

app = Flask(__name__)

ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")
MARKET_PROXY = "VOO" # We use Vanguard S&P 500 as the baseline market for Beta calculations

def fetch_data(tickers):
    """
    Fetches historical daily adjusted close prices using Alpha Vantage.
    Restricted to 'compact' (100 days) to comply with the free tier.
    """
    if MARKET_PROXY not in tickers:
        tickers.append(MARKET_PROXY)

    data = pd.DataFrame()

    for ticker in tickers:
        print(f"[Python Engine] Fetching Alpha Vantage data for {ticker}...")
        
        # REMOVED outputsize=full to comply with free tier
        url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={ticker}&apikey={ALPHA_VANTAGE_KEY}"
        
        response = requests.get(url)
        result = response.json()

        if "Time Series (Daily)" in result:
            df = pd.DataFrame.from_dict(result["Time Series (Daily)"], orient='index')
            df = df.rename(columns={"4. close": ticker})
            df = df[[ticker]].astype(float)
            
            if data.empty:
                data = df
            else:
                data = data.join(df, how="outer")
        else:
            print(f"[Warning] Alpha Vantage failed for {ticker}.")
            print(f"[Alpha Vantage Error response]: {result}")
            
        # Pause for 2 seconds to avoid the "1 request per second" block
        print(f"[Python Engine] Sleeping for 2 seconds to respect rate limits...")
        time.sleep(2)

    # Sort index and drop missing values. 
    # Because we are on the free tier, we only get ~100 rows instead of 504.
    data.index = pd.to_datetime(data.index)
    data = data.sort_index() 
    data = data.dropna()
    return data

def optimize_portfolio(tickers):
    # 1. Fetch data
    prices = fetch_data(tickers)
    if prices.empty:
        raise ValueError("Failed to fetch historical data. Alpha Vantage rate limit may have been reached.")

    # 2. Calculate daily returns
    returns = prices.pct_change().dropna()
    
    # 3. Calculate mean returns and covariance matrix (Annualized)
    mean_returns = returns.mean() * 252
    cov_matrix = returns.cov() * 252

    num_assets = len(tickers)
    
    def portfolio_return(weights):
        return np.sum(mean_returns * weights)

    def portfolio_volatility(weights):
        return np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))

    def negative_sharpe_ratio(weights):
        return -portfolio_return(weights) / portfolio_volatility(weights)

    # Baseline: Equal weight
    equal_weights = np.array([1.0 / num_assets] * num_assets)
    baseline_return = portfolio_return(equal_weights)
    baseline_volatility = portfolio_volatility(equal_weights)
    baseline_sharpe = baseline_return / baseline_volatility

    # 4. Optimisation Constraints
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((0.0, 1.0) for _ in range(num_assets))

    # 5. Run Mean-Variance Optimisation
    optimized = minimize(negative_sharpe_ratio, equal_weights, method='SLSQP', bounds=bounds, constraints=constraints)
    opt_weights = optimized.x

    opt_return = portfolio_return(opt_weights)
    opt_volatility = portfolio_volatility(opt_weights)
    opt_sharpe = opt_return / opt_volatility

    # 6. CALCULATE PORTFOLIO BETA (FR5 Requirement)
    # Beta = Covariance(Asset, Market) / Variance(Market)
    market_variance = returns[MARKET_PROXY].var() * 252
    asset_betas = cov_matrix[MARKET_PROXY] / market_variance
    
    # Calculate weighted beta for both the baseline and optimized portfolios
    baseline_beta = np.sum(equal_weights * asset_betas)
    opt_beta = np.sum(opt_weights * asset_betas)

    # 7. Generate Efficient Frontier Data
    target_returns = np.linspace(returns.mean().min() * 252, returns.mean().max() * 252, 50)
    efficient_frontier = []
    for target in target_returns:
        cons = (
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
            {'type': 'eq', 'fun': lambda x: portfolio_return(x) - target}
        )
        res = minimize(portfolio_volatility, equal_weights, method='SLSQP', bounds=bounds, constraints=cons)
        if res.success:
            efficient_frontier.append({
                "x": round(res.fun, 4),
                "y": round(target, 4)
            })

    # Format optimal allocations
    allocations = {tickers[i]: round(opt_weights[i] * 100, 2) for i in range(num_assets)}

    # Return JSON (NFR1 Compliant: Exact 4 decimal places)
    return {
        "status": "success",
        "metrics": {
            "baseline_portfolio": {
                "expected_return": round(float(baseline_return), 4),
                "volatility_risk": round(float(baseline_volatility), 4),
                "sharpe_ratio": round(float(baseline_sharpe), 4),
                "portfolio_beta": round(float(baseline_beta), 4) # NEW!
            },
            "optimized_portfolio": {
                "expected_return": round(float(opt_return), 4),
                "volatility_risk": round(float(opt_volatility), 4),
                "sharpe_ratio": round(float(opt_sharpe), 4),
                "portfolio_beta": round(float(opt_beta), 4), # NEW!
                "allocations": allocations
            }
        },
        "efficient_frontier_data": efficient_frontier
    }

@app.route('/optimize', methods=['POST'])
def optimize():
    data = request.json
    tickers = data.get('tickers', [])

    tickers = list(set(tickers))

    if not tickers:
        return jsonify({"error": "No tickers provided"}), 400
    
    try:
        result = optimize_portfolio(tickers)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)