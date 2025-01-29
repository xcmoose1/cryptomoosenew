import express from 'express';
const router = express.Router();

// Sample data for testing
const sectionData = {
    'market-analysis': {
        insights: [
            { type: 'trend', message: 'Strong upward trend detected in BTC/USDT', confidence: 0.85 },
            { type: 'support', message: 'Key support level identified at $42,500', confidence: 0.78 },
            { type: 'volume', message: 'Above average volume in the last 4 hours', confidence: 0.92 }
        ]
    },
    'market-intelligence': {
        insights: [
            { type: 'sentiment', message: 'Overall market sentiment is bullish', confidence: 0.82 },
            { type: 'news', message: 'Positive regulatory developments in major markets', confidence: 0.75 },
            { type: 'social', message: 'High social media engagement around DeFi tokens', confidence: 0.88 }
        ]
    },
    'traditional-markets': {
        insights: [
            { type: 'correlation', message: 'Strong correlation with S&P 500 index', confidence: 0.79 },
            { type: 'forex', message: 'USD weakness contributing to crypto strength', confidence: 0.83 },
            { type: 'commodities', message: 'Gold showing inverse correlation', confidence: 0.71 }
        ]
    },
    'volume-profile': {
        insights: [
            { type: 'volume', message: 'High volume node detected at $43,200', confidence: 0.89 },
            { type: 'poc', message: 'Point of Control shifted upward in last 4 hours', confidence: 0.85 },
            { type: 'vwap', message: 'Price trading above VWAP, bullish signal', confidence: 0.78 },
            { type: 'delta', message: 'Positive delta divergence forming', confidence: 0.82 }
        ]
    }
};

// Get insights for a specific section
router.get('/section/:sectionId', (req, res) => {
    try {
        console.log('[AIAnalysis] Received request for section:', req.params.sectionId);
        const { sectionId } = req.params;
        
        // Validate section ID
        if (!sectionId) {
            console.error('[AIAnalysis] No section ID provided');
            return res.status(400).json({
                status: 'error',
                message: 'Section ID is required'
            });
        }

        console.log('[AIAnalysis] Looking up data for section:', sectionId);
        const data = sectionData[sectionId];

        if (data) {
            console.log('[AIAnalysis] Found data for section:', sectionId);
            res.json({
                status: 'success',
                data: data
            });
        } else {
            console.error('[AIAnalysis] Section not found:', sectionId);
            console.error('[AIAnalysis] Available sections:', Object.keys(sectionData));
            res.status(404).json({
                status: 'error',
                message: `Section '${sectionId}' not found`,
                availableSections: Object.keys(sectionData)
            });
        }
    } catch (error) {
        console.error('[AIAnalysis] Error processing section request:', error);
        console.error('[AIAnalysis] Error stack:', error.stack);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Get global market analysis
router.get('/global', (req, res) => {
    try {
        console.log('[AIAnalysis] Processing global insights request');
        res.json({
            status: 'success',
            data: {
                marketCondition: 'bullish',
                riskLevel: 'moderate',
                keyMetrics: {
                    btcDominance: 45.2,
                    totalMarketCap: 2.1e12,
                    dailyVolume: 98.5e9
                },
                insights: [
                    { type: 'trend', message: 'Market showing strong recovery signs', confidence: 0.88 },
                    { type: 'risk', message: 'Moderate volatility expected', confidence: 0.75 },
                    { type: 'opportunity', message: 'DeFi sector showing momentum', confidence: 0.82 }
                ]
            }
        });
        console.log('[AIAnalysis] Global insights sent successfully');
    } catch (error) {
        console.error('[AIAnalysis] Error processing global request:', error);
        console.error('[AIAnalysis] Error stack:', error.stack);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
});

export default router;
