import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/klines', async (req, res) => {
    try {
        const { symbol, interval, limit } = req.query;
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        res.json(data);
    } catch (error) {
        console.error('Binance proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Binance' });
    }
});

export default router;
