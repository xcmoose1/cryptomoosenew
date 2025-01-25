import express from 'express';
import axios from 'axios';

const router = express.Router();

// Cache for market data
let marketCache = {
    data: null,
    timestamp: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const HTX_API_URL = 'https://api.htx.com';

async function fetchMarketData() {
    try {
        // Fetch from HTX API
        const [btcData, ethData] = await Promise.all([
            axios.get(`${HTX_API_URL}/market/detail/merged?symbol=btcusdt`),
            axios.get(`${HTX_API_URL}/market/detail/merged?symbol=ethusdt`)
        ]);

        const calculateChange = (data) => {
            const close = data.tick.close;
            const open = data.tick.open;
            return ((close - open) / open) * 100;
        };

        return {
            bitcoin: {
                price: btcData.data.tick.close,
                change24h: calculateChange(btcData.data),
                volume: btcData.data.tick.vol,
                high: btcData.data.tick.high,
                low: btcData.data.tick.low
            },
            ethereum: {
                price: ethData.data.tick.close,
                change24h: calculateChange(ethData.data),
                volume: ethData.data.tick.vol,
                high: ethData.data.tick.high,
                low: ethData.data.tick.low
            }
        };
    } catch (error) {
        console.error('Error fetching market data:', error);
        return null;
    }
}

// Get current market data
router.get('/current', async (req, res) => {
    try {
        // Check cache
        if (marketCache.data && marketCache.timestamp && (Date.now() - marketCache.timestamp < CACHE_DURATION)) {
            return res.json(marketCache.data);
        }

        // Fetch fresh data
        const data = await fetchMarketData();
        if (!data) {
            throw new Error('Failed to fetch market data');
        }

        // Update cache
        marketCache.data = data;
        marketCache.timestamp = Date.now();

        // Generate summary
        const btcChange = data.bitcoin.change24h.toFixed(2);
        const ethChange = data.ethereum.change24h.toFixed(2);
        
        res.json({
            data,
            summary: `BTC: $${data.bitcoin.price.toLocaleString()} (${btcChange}%) | ETH: $${data.ethereum.price.toLocaleString()} (${ethChange}%)`,
            analysis: `Bitcoin ${btcChange > 0 ? 'up' : 'down'} ${Math.abs(btcChange)}% and Ethereum ${ethChange > 0 ? 'up' : 'down'} ${Math.abs(ethChange)}% in the last 24 hours.`,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error in /current endpoint:', error);
        res.status(500).json({
            error: 'Failed to get current market data',
            details: error.message
        });
    }
});

// Get historical data
router.get('/historical', async (req, res) => {
    try {
        const response = await axios.get(`${HTX_API_URL}/market/history/kline?symbol=btcusdt&period=1day&size=30`);
        
        const prices = response.data.data.map(k => [k.id * 1000, k.close]);
        const patterns = analyzePatterns(prices);
        
        res.json({
            patterns,
            data: response.data,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error in /historical endpoint:', error);
        res.status(500).json({
            error: 'Failed to get historical data',
            details: error.message
        });
    }
});

function analyzePatterns(prices) {
    // Simple pattern analysis
    const priceChanges = prices.map(([timestamp, price], index, arr) => {
        if (index === 0) return 0;
        return ((price - arr[index - 1][1]) / arr[index - 1][1]) * 100;
    }).slice(1);

    const avgChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    const volatility = Math.sqrt(priceChanges.map(x => Math.pow(x - avgChange, 2)).reduce((a, b) => a + b, 0) / priceChanges.length);

    return {
        trend: avgChange > 0 ? 'bullish' : 'bearish',
        avgDailyChange: avgChange.toFixed(2) + '%',
        volatility: volatility.toFixed(2) + '%',
        analysis: `Market showing ${avgChange > 0 ? 'bullish' : 'bearish'} trend with ${volatility.toFixed(2)}% volatility over the past 30 days.`
    };
}

export default router;
