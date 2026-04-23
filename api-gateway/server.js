require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = process.env.JWT_SECRET;

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required." });

        const password_hash = await bcrypt.hash(password, 10);
        const { data, error } = await supabase.from('users').insert([{ email, password_hash }]).select('user_id, email').single();
        if (error) throw error;

        await supabase.from('portfolios').insert([{ user_id: data.user_id, name: "Main Portfolio" }]);
        res.status(201).json({ status: "success", user: data });
    } catch (error) {
        res.status(500).json({ error: "Registration failed", details: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
        if (error || !user) return res.status(401).json({ error: "Invalid email or password." });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password." });

        const token = jwt.sign({ user_id: user.user_id }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ status: "success", token: token, user_id: user.user_id });
    } catch (error) {
        res.status(500).json({ error: "Login failed", details: error.message });
    }
});

app.put('/api/auth/password', async (req, res) => {
    try {
        const { user_id, new_password } = req.body;
        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters." });
        }
        
        const password_hash = await bcrypt.hash(new_password, 10);
        const { error } = await supabase.from('users').update({ password_hash }).eq('user_id', user_id);
        
        if (error) throw error;
        res.json({ status: "success", message: "Password updated successfully." });
    } catch (error) {
        res.status(500).json({ error: "Failed to update password." });
    }
});

// --- DASHBOARD SUMMARY ROUTE ---
app.post('/api/portfolio/summary', async (req, res) => {
    try {
        const { user_id } = req.body;
        const { data: dbData, error: dbError } = await supabase
            .from('portfolios')
            .select(`transactions (transaction_type, quantity, price_per_unit, assets(ticker_symbol))`)
            .eq('user_id', user_id).single();

        if (dbError || !dbData) return res.status(404).json({ error: "Portfolio not found." });

        const aggregated = {};

        // 1. Tally up shares and calculate average cost basis
        dbData.transactions.forEach(tx => {
            const ticker = tx.assets.ticker_symbol;
            if (!aggregated[ticker]) aggregated[ticker] = { shares: 0, total_cost: 0 };

            if (tx.transaction_type === 'BUY') {
                aggregated[ticker].shares += tx.quantity;
                aggregated[ticker].total_cost += (tx.quantity * tx.price_per_unit);
            } else if (tx.transaction_type === 'SELL') {
                // Approximate removing cost basis proportionally
                const avgPrice = aggregated[ticker].total_cost / aggregated[ticker].shares;
                aggregated[ticker].shares -= tx.quantity;
                aggregated[ticker].total_cost -= (tx.quantity * avgPrice);
            }
        });

        // Filter out sold assets
        const activeTickers = Object.keys(aggregated).filter(t => aggregated[t].shares > 0);

        // 2. Fetch live prices from Python
        let livePrices = {};
        if (activeTickers.length > 0) {
            try {
                const pyRes = await axios.post('https://HadiAhmad.pythonanywhere.com/live_prices', { tickers: activeTickers });
                livePrices = pyRes.data;
            } catch (err) {
                console.log("[Node.js] Warning: Could not reach Python for live prices.");
            }
        }

        // 3. Calculate Live Profit & Loss
        let totalInvested = 0;
        let totalLiveValue = 0;

        const holdings = activeTickers.map(ticker => {
            const shares = aggregated[ticker].shares;
            const invested = aggregated[ticker].total_cost;
            const livePrice = livePrices[ticker] || (invested / shares); // Fallback to break-even if API fails
            const liveValue = shares * livePrice;
            
            totalInvested += invested;
            totalLiveValue += liveValue;

            const percentReturn = ((liveValue - invested) / invested) * 100;

            return {
                ticker: ticker,
                shares: shares,
                invested_value: invested,
                live_value: liveValue,
                live_price: livePrice,
                percent_return: percentReturn
            };
        });

        const totalPercentReturn = totalInvested > 0 ? ((totalLiveValue - totalInvested) / totalInvested) * 100 : 0;

        res.json({ 
            status: "success", 
            totalInvested: totalInvested,
            totalLiveValue: totalLiveValue,
            totalPercentReturn: totalPercentReturn,
            holdings: holdings 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch summary" });
    }
});

// --- MANUAL TRANSACTION ROUTE ---
app.post('/api/portfolio/transaction', async (req, res) => {
    try {
        // Notice: We no longer ask the frontend for the 'price'!
        const { user_id, ticker, type, quantity } = req.body; 
        
        if (!user_id || !ticker || !type || !quantity) {
             return res.status(400).json({ error: "Ticker and Quantity are required." });
        }

        // 1. Ask Python for the live market price
        console.log(`[Node.js] Fetching live market price for ${ticker}...`);
        const pythonResponse = await axios.post('https://HadiAhmad.pythonanywhere.com/price', { ticker });
        const livePrice = pythonResponse.data.price;

        if (!livePrice) throw new Error("Could not fetch live price.");

        // 2. Find Portfolio
        const { data: portfolio } = await supabase.from('portfolios').select('portfolio_id').eq('user_id', user_id).single();
        
        // 3. Find or Create Asset
        let { data: asset } = await supabase.from('assets').select('asset_id').eq('ticker_symbol', ticker).single();
        if (!asset) {
            const { data: newAsset } = await supabase.from('assets').insert([{ ticker_symbol: ticker, asset_name: ticker, asset_type: 'STOCK' }]).select('asset_id').single();
            asset = newAsset;
        }

        // 4. Save Transaction using the LIVE PRICE
        await supabase.from('transactions').insert([{
            portfolio_id: portfolio.portfolio_id, 
            asset_id: asset.asset_id, 
            transaction_type: type, 
            quantity: parseFloat(quantity), 
            price_per_unit: livePrice 
        }]);

        // Send the live price back to the frontend so the user knows what they paid
        res.status(201).json({ status: "success", executed_price: livePrice });
    } catch (error) {
        console.error("[Transaction Error]", error.message);
        const errorMsg = error.response && error.response.data ? error.response.data.error : "Failed to add transaction";
        res.status(500).json({ error: errorMsg });
    }
});

// --- OPTIMIZATION ROUTE ---
app.post('/api/portfolio/optimize', async (req, res) => {
    try {
        const { user_id } = req.body;
        const { data: dbData } = await supabase.from('portfolios').select(`transactions (transaction_type, quantity, price_per_unit, assets(ticker_symbol))`).eq('user_id', user_id).single();

        const aggregatedPortfolio = {};
        dbData.transactions.forEach(tx => {
            const ticker = tx.assets.ticker_symbol;
            const value = tx.quantity * tx.price_per_unit;
            if (!aggregatedPortfolio[ticker]) aggregatedPortfolio[ticker] = 0;
            if (tx.transaction_type === 'BUY') aggregatedPortfolio[ticker] += value;
            else if (tx.transaction_type === 'SELL') aggregatedPortfolio[ticker] -= value;
        });

        const current_portfolio = Object.keys(aggregatedPortfolio)
            .filter(ticker => aggregatedPortfolio[ticker] > 0)
            .map(ticker => ({ ticker: ticker, value: aggregatedPortfolio[ticker] }));

        const tickers = current_portfolio.map(asset => asset.ticker);
        if (!tickers.includes('VOO')) tickers.push('VOO');

        const pythonResponse = await axios.post('https://HadiAhmad.pythonanywhere.com/optimize', { tickers });
        const targetAllocations = pythonResponse.data.metrics.optimized_portfolio.allocations;

        // Rebalancing logic
        const totalValue = current_portfolio.reduce((sum, asset) => sum + asset.value, 0);
        const actions = [];
        const allTickers = new Set([...current_portfolio.map(a => a.ticker), ...Object.keys(targetAllocations)]);

        allTickers.forEach(ticker => {
            const currentAsset = current_portfolio.find(a => a.ticker === ticker);
            const currentWeight = currentAsset ? (currentAsset.value / totalValue) * 100 : 0;
            const targetWeight = targetAllocations[ticker] || 0;
            const difference = targetWeight - currentWeight;

            if (Math.abs(difference) > 1.0) {
                const actionType = difference > 0 ? "BUY" : "SELL";
                actions.push({ ticker, action: actionType, instruction: `${actionType} ${Math.abs(difference).toFixed(2)}% of ${ticker}` });
            }
        });

        res.json({ status: "success", original_math: pythonResponse.data, rebalancing_actions: actions });
    } catch (error) {
        res.status(500).json({ error: "Analysis Failed" });
    } 
});

// --- WIPE ENTIRE PORTFOLIO ---
app.delete('/api/portfolio/reset', async (req, res) => {
    try {
        const { user_id } = req.body;
        
        // STEP 1: Find the user's portfolio_id from the portfolios table
        const { data: portfolioData, error: portError } = await supabase
            .from('portfolios')
            .select('portfolio_id')
            .eq('user_id', user_id)
            .single();

        if (portError || !portfolioData) {
            return res.status(400).json({ error: "Could not find a portfolio for this user." });
        }

        // STEP 2: Delete all transactions linked to that specific portfolio_id
        const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .eq('portfolio_id', portfolioData.portfolio_id);
            
        if (deleteError) throw deleteError;
        
        res.json({ status: "success", message: "Portfolio wiped successfully." });
    } catch (error) {
        console.error("Wipe Error:", error);
        res.status(500).json({ error: "Failed to wipe portfolio." });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`[Node.js] API Gateway running on http://localhost:${PORT}`));