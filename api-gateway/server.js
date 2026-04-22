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

// 1. User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        // Hash the password securely (NFR3 Requirement)
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insert into Supabase
        const { data, error } = await supabase
            .from('users')
            .insert([{ email, password_hash }])
            .select('user_id, email')
            .single();

        if (error) throw error;

        // Automatically create an empty default portfolio for the new user
        await supabase
            .from('portfolios')
            .insert([{ user_id: data.user_id, name: "Main Portfolio" }]);

        res.status(201).json({ status: "success", message: "User registered successfully!", user: data });

    } catch (error) {
        console.error("[Register Error]", error.message);
        res.status(500).json({ error: "Registration failed", details: error.message });
    }
});

// 2. User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find the user by email
        const { data: user, error } = await supabase
            .from('users')
            .select('user_id, email, password_hash')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // Compare the submitted password with the hashed password in the DB
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // Generate the JWT token (FR1 Requirement)
        const token = jwt.sign(
            { user_id: user.user_id, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.status(200).json({
            status: "success",
            message: "Login successful!",
            token: token,
            user_id: user.user_id
        });

    } catch (error) {
        console.error("[Login Error]", error.message);
        res.status(500).json({ error: "Login failed", details: error.message });
    }
});

// --- BUSINESS LOGIC HELPER ---
function generateRebalancingActions(currentPortfolio, optimizedAllocations) {
    const totalValue = currentPortfolio.reduce((sum, asset) => sum + asset.value, 0);
    const actions = [];

    // Create a master list of all tickers (combining current holdings and Python's suggestions)
    const allTickers = new Set([
        ...currentPortfolio.map(a => a.ticker),
        ...Object.keys(optimizedAllocations)
    ]);

    // Loop through every single ticker
    allTickers.forEach(ticker => {
        // Find how much they currently own (default to 0 if they don't own it)
        const currentAsset = currentPortfolio.find(a => a.ticker === ticker);
        const currentWeight = currentAsset ? (currentAsset.value / totalValue) * 100 : 0;
        
        // Find how much they SHOULD own
        const targetWeight = optimizedAllocations[ticker] || 0;
        const difference = targetWeight - currentWeight;

        // If the difference is meaningful (> 1%), generate the instruction
        if (Math.abs(difference) > 1.0) {
            const actionType = difference > 0 ? "BUY" : "SELL";
            actions.push({
                ticker: ticker,
                action: actionType,
                amount_percent: Math.abs(difference).toFixed(2),
                instruction: `${actionType} ${Math.abs(difference).toFixed(2)}% of ${ticker}`
            });
        }
    });

    return actions;
}

// --- API ROUTE ---
app.post('/api/portfolio/optimize', async (req, res) => {
    try {
        const { user_id } = req.body;
        console.log(`[Node.js] Fetching database records for user: ${user_id}`);

        // 1. QUERY SUPABASE: Get all transactions for this user's portfolio
        const { data: dbData, error: dbError } = await supabase
            .from('portfolios')
            .select(`
                transactions (
                    quantity,
                    price_per_unit,
                    assets ( ticker_symbol )
                )
            `)
            .eq('user_id', user_id)
            .single();

        if (dbError || !dbData) throw new Error("Could not find portfolio in database.");

        // 2. FORMAT & AGGREGATE DATA: Combine multiple trades of the same ticker
        const aggregatedPortfolio = {};
        
        dbData.transactions.forEach(tx => {
            const ticker = tx.assets.ticker_symbol;
            const value = tx.quantity * tx.price_per_unit;
            
            if (aggregatedPortfolio[ticker]) {
                aggregatedPortfolio[ticker] += value; // Add to existing holding
            } else {
                aggregatedPortfolio[ticker] = value;  // Create new holding
            }
        });

        // Turn the aggregated object back into our array format
        const current_portfolio = Object.keys(aggregatedPortfolio).map(ticker => ({
            ticker: ticker,
            value: aggregatedPortfolio[ticker]
        }));

        console.log("[Node.js] Aggregated Portfolio:", current_portfolio);

        // 3. CALL PYTHON ENGINE
        const tickers = current_portfolio.map(asset => asset.ticker);
        
        // Ensure we always request VOO to give the engine a safe asset to pivot to
        if (!tickers.includes('VOO')) tickers.push('VOO');

        const pythonResponse = await axios.post('http://127.0.0.1:5000/optimize', { tickers });
        const optimizationData = pythonResponse.data;
        const targetAllocations = optimizationData.metrics.optimized_portfolio.allocations;

        // 4. GENERATE ADVICE
        const rebalancingAdvice = generateRebalancingActions(current_portfolio, targetAllocations);

        // 5. SEND TO FRONTEND
        res.json({
            status: "success",
            original_math: optimizationData,
            rebalancing_actions: rebalancingAdvice
        });

    } catch (error) {
        const errorMessage = error.response ? error.response.data.message : error.message;
        console.error("[Node.js] Error:", errorMessage);
        res.status(500).json({ error: "Analysis Failed", details: errorMessage });
    }
});

const PORT = 3000;

// ==========================================
// --- NEW: MANUAL TRANSACTION ENTRY (FR2) ---
// ==========================================
app.post('/api/portfolio/transaction', async (req, res) => {
    try {
        const { user_id, ticker, type, quantity, price } = req.body; 

        if (!user_id || !ticker || !type || !quantity || !price) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // 1. Find the user's Main Portfolio ID
        const { data: portfolio, error: portError } = await supabase
            .from('portfolios')
            .select('portfolio_id')
            .eq('user_id', user_id)
            .single();

        if (portError || !portfolio) return res.status(404).json({ error: "Portfolio not found." });

        // 2. Check if the Asset exists in the database. If not, add it!
        let { data: asset } = await supabase
            .from('assets')
            .select('asset_id')
            .eq('ticker_symbol', ticker.toUpperCase())
            .single();

        if (!asset) {
            const { data: newAsset, error: newAssetError } = await supabase
                .from('assets')
                .insert([{ 
                    ticker_symbol: ticker.toUpperCase(), 
                    asset_name: ticker.toUpperCase(), 
                    asset_type: 'STOCK' 
                }])
                .select('asset_id')
                .single();
                
            if (newAssetError) throw newAssetError;
            asset = newAsset;
        }

        // 3. Save the Transaction
        const { error: txError } = await supabase
            .from('transactions')
            .insert([{
                portfolio_id: portfolio.portfolio_id,
                asset_id: asset.asset_id,
                transaction_type: type.toUpperCase(), // 'BUY' or 'SELL'
                quantity: parseFloat(quantity),
                price_per_unit: parseFloat(price)
            }]);

        if (txError) throw txError;

        res.status(201).json({ status: "success", message: `Successfully added ${type} order for ${ticker}` });

    } catch (error) {
        console.error("[Transaction Error]", error.message);
        res.status(500).json({ error: "Failed to add transaction", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Node.js] API Gateway running on http://localhost:${PORT}`);
});