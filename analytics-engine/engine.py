import os
import pandas as pd
import numpy as np
from scipy.optimize import minimize
from flask import Flask, request, jsonify
import requests
from dotenv import load_dotenv
import yfinance as yf

# Load the secret Alpha Vantage API Key
load_dotenv()

app = Flask(__name__)
MARKET_PROXY = "VOO"

def fetch_data(tickers):
    """
    Fetches historical daily adjusted close prices using Yahoo Finance.
    """
    if MARKET_PROXY not in tickers:
        tickers.append(MARKET_PROXY)

    print(f"[Python Engine] Fetching Yahoo Finance data for {tickers}...")
    data = yf.download(tickers, period="2y")['Close']
    
    if isinstance(data, pd.Series):
        data = data.to_frame(name=tickers[0])
        
    # NEW: Drop columns (tickers) that Yahoo Finance couldn't find
    data = data.dropna(axis=1, how='all')
    data = data.dropna()
    return data

def optimize_portfolio(tickers):
    prices = fetch_data(tickers)
    if prices.empty:
        raise ValueError("Failed to fetch historical data. Check if tickers are valid.")

    # NEW: Update our tickers list to ONLY include the ones Yahoo Finance successfully found
    valid_tickers = [t for t in tickers if t in prices.columns]
    
    returns = prices.pct_change().dropna()
    mean_returns = returns.mean() * 252
    cov_matrix = returns.cov() * 252

    num_assets = len(valid_tickers)
    
    def portfolio_return(weights):
        return np.sum(mean_returns * weights)

    def portfolio_volatility(weights):
        return np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))

    def negative_sharpe_ratio(weights):
        return -portfolio_return(weights) / portfolio_volatility(weights)

    equal_weights = np.array([1.0 / num_assets] * num_assets)
    baseline_return = portfolio_return(equal_weights)
    baseline_volatility = portfolio_volatility(equal_weights)
    baseline_sharpe = baseline_return / baseline_volatility

    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((0.0, 1.0) for _ in range(num_assets))

    optimized = minimize(negative_sharpe_ratio, equal_weights, method='SLSQP', bounds=bounds, constraints=constraints)
    opt_weights = optimized.x

    opt_return = portfolio_return(opt_weights)
    opt_volatility = portfolio_volatility(opt_weights)
    opt_sharpe = opt_return / opt_volatility

    market_variance = returns[MARKET_PROXY].var() * 252
    asset_betas = cov_matrix[MARKET_PROXY] / market_variance
    
    baseline_beta = np.sum(equal_weights * asset_betas)
    opt_beta = np.sum(opt_weights * asset_betas)

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

    # NEW: Use valid_tickers here!
    allocations = {valid_tickers[i]: round(opt_weights[i] * 100, 2) for i in range(num_assets)}

    return {
        "status": "success",
        "metrics": {
            "baseline_portfolio": {
                "expected_return": round(float(baseline_return), 4),
                "volatility_risk": round(float(baseline_volatility), 4),
                "sharpe_ratio": round(float(baseline_sharpe), 4),
                "portfolio_beta": round(float(baseline_beta), 4)
            },
            "optimized_portfolio": {
                "expected_return": round(float(opt_return), 4),
                "volatility_risk": round(float(opt_volatility), 4),
                "sharpe_ratio": round(float(opt_sharpe), 4),
                "portfolio_beta": round(float(opt_beta), 4),
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


@app.route('/price', methods=['POST'])
def get_price():
    data = request.json
    ticker = data.get('ticker')
    
    if not ticker:
        return jsonify({"error": "No ticker provided"}), 400
    
    try:
        # Use yfinance to grab the absolute latest market data for this ticker
        ticker_data = yf.Ticker(ticker)
        todays_data = ticker_data.history(period='1d')
        
        if todays_data.empty:
            return jsonify({"error": f"Could not find live price for {ticker}"}), 400
        
        # Extract the most recent closing price
        current_price = todays_data['Close'].iloc[0]
        
        return jsonify({"price": round(float(current_price), 2)}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)