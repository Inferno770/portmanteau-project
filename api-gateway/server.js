require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors'); 

const app = express();
app.use(cors()); 
app.use(express.json());

// --- DATABASE CONNECTION ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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

        // 2. FORMAT DATA: Turn the raw database rows into our current_portfolio array
        const current_portfolio = dbData.transactions.map(tx => ({
            ticker: tx.assets.ticker_symbol,
            value: tx.quantity * tx.price_per_unit
        }));

        console.log("[Node.js] Portfolio found:", current_portfolio);

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
app.listen(PORT, () => {
    console.log(`[Node.js] API Gateway running on http://localhost:${PORT}`);
});