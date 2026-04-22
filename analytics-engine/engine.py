from flask import Flask, request, jsonify
import numpy as np
import pandas as pd
import yfinance as yf
from scipy.optimize import minimize

app = Flask(__name__)

# Assume a 2% Risk-Free Rate (Standard assumption for US Treasury Bills)
RISK_FREE_RATE = 0.02 

def get_real_market_data(tickers):
    """Downloads 1 year of closing prices and calculates the covariance matrix."""
    data = yf.download(tickers, period="1y", interval="1d")['Close']
    returns = data.pct_change().dropna()
    returns = returns[tickers] # Prevent the sorting bug!
    
    expected_returns = returns.mean() * 252
    cov_matrix = returns.cov() * 252
    return expected_returns.values, cov_matrix.values

def portfolio_performance(weights, expected_returns, cov_matrix):
    """Calculates the return and risk (volatility) of a specific portfolio."""
    port_return = np.sum(expected_returns * weights)
    port_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
    return port_return, port_volatility

def calculate_efficient_frontier(expected_returns, cov_matrix):
    """Generates 50 x,y coordinates to plot the Efficient Frontier curve."""
    num_assets = len(expected_returns)
    frontier_y = np.linspace(expected_returns.min(), expected_returns.max(), 50)
    frontier_x = []

    for target_return in frontier_y:
        # Constraint 1: Weights sum to 1. Constraint 2: Return equals target.
        constraints = (
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
            {'type': 'eq', 'fun': lambda x: portfolio_performance(x, expected_returns, cov_matrix)[0] - target_return}
        )
        bounds = tuple((0, 1) for _ in range(num_assets))
        init_guess = num_assets * [1. / num_assets]

        # Minimize Volatility for this specific Target Return
        result = minimize(lambda x: portfolio_performance(x, expected_returns, cov_matrix)[1], 
                          init_guess, method='SLSQP', bounds=bounds, constraints=constraints)
        frontier_x.append(result.fun)
    
    # Return as a list of coordinate objects for React Native Charts
    return [{"x": round(x, 4), "y": round(y, 4)} for x, y in zip(frontier_x, frontier_y)]

def optimize_max_sharpe(expected_returns, cov_matrix):
    """Finds the portfolio with the absolute highest Sharpe Ratio."""
    num_assets = len(expected_returns)
    
    # SciPy only minimizes, so we minimize the NEGATIVE Sharpe Ratio
    def negative_sharpe(weights):
        p_ret, p_vol = portfolio_performance(weights, expected_returns, cov_matrix)
        return -(p_ret - RISK_FREE_RATE) / p_vol

    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((0, 1) for _ in range(num_assets))
    init_guess = num_assets * [1. / num_assets]

    optimized = minimize(negative_sharpe, init_guess, method='SLSQP', bounds=bounds, constraints=constraints)
    
    opt_ret, opt_vol = portfolio_performance(optimized.x, expected_returns, cov_matrix)
    opt_sharpe = (opt_ret - RISK_FREE_RATE) / opt_vol
    
    return optimized.x, opt_ret, opt_vol, opt_sharpe

@app.route('/optimize', methods=['POST'])
def run_optimization():
    data = request.json
    tickers = data.get('tickers', [])
    
    if len(tickers) < 2:
        return jsonify({"status": "error", "message": "Requires at least 2 tickers."}), 400

    try:
        # 1. Fetch Data
        expected_returns, cov_matrix = get_real_market_data(tickers)
        
        # 2. Calculate the Baseline (Assuming equal weight for now)
        equal_weights = np.array(len(tickers) * [1. / len(tickers)])
        base_ret, base_vol = portfolio_performance(equal_weights, expected_returns, cov_matrix)
        base_sharpe = (base_ret - RISK_FREE_RATE) / base_vol

        # 3. Optimize for Maximum Sharpe Ratio
        opt_weights, opt_ret, opt_vol, opt_sharpe = optimize_max_sharpe(expected_returns, cov_matrix)
        
        # 4. Generate the Frontier Graph Coordinates
        frontier_coords = calculate_efficient_frontier(expected_returns, cov_matrix)
        
        # 5. Format Weights
        allocation = {tickers[i]: round(weight * 100, 2) for i, weight in enumerate(opt_weights)}
        
        return jsonify({
            "status": "success",
            "metrics": {
                "baseline_portfolio": {
                    "expected_return": round(base_ret, 4),
                    "volatility_risk": round(base_vol, 4),
                    "sharpe_ratio": round(base_sharpe, 4)
                },
                "optimized_portfolio": {
                    "expected_return": round(opt_ret, 4),
                    "volatility_risk": round(opt_vol, 4),
                    "sharpe_ratio": round(opt_sharpe, 4),
                    "allocations": allocation
                }
            },
            "efficient_frontier_data": frontier_coords
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)