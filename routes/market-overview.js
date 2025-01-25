import express from 'express';
import OpenAI from 'openai';
import { marketOverviewService } from '../services/market-overview.service.js';

const router = express.Router();

// Initialize OpenAI with API key from environment
if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in environment variables');
}
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Cache for market updates
let updateCache = {
    data: null,
    timestamp: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

router.get('/', async (req, res) => {
    try {
        console.log('Market overview request received');
        
        // Check cache first
        if (updateCache.data && Date.now() - updateCache.timestamp < CACHE_DURATION) {
            console.log('Returning cached market data');
            return res.json({
                success: true,
                data: updateCache.data,
                cached: true,
                lastUpdated: new Date(updateCache.timestamp),
                nextUpdate: new Date(updateCache.timestamp + CACHE_DURATION)
            });
        }

        console.log('Fetching fresh market data...');
        // Get market metrics
        const metrics = await marketOverviewService.getMarketMetrics();
        console.log('Market metrics fetched:', JSON.stringify(metrics, null, 2));
        
        // Format the metrics for GPT prompt
        const prompt = `You are a professional crypto market analyst. Based on the following market data, provide a detailed market overview. Your response must be ONLY valid JSON without any additional text or explanation. Do not include any markdown formatting or code blocks. Just return the raw JSON object.

Market Data:
Total Market Cap: $${(metrics.total_market_cap / 1e12).toFixed(2)}T
24h Market Cap Change: ${metrics.market_cap_change_24h.toFixed(2)}%
BTC Dominance: ${metrics.btc_dominance.toFixed(2)}%
24h Volume: $${(metrics.total_volume_24h / 1e9).toFixed(2)}B

Chain Volumes:
${metrics.chains_volume.map(chain => 
    `${chain.symbol}: $${(chain.volume / 1e9).toFixed(2)}B (${chain.volume_change_24h.toFixed(2)}% 24h change)`
).join('\n')}

You must return a JSON object that matches this EXACT structure. Do not deviate from this format:

{
    "technical_stance": "Bearish",
    "metrics": {
        "market_cap_change": "Market cap decreased by 2.5% in the last 24 hours",
        "market_trend": "Downward trend with weak momentum",
        "volume_analysis": "Below average volume indicating selling pressure"
    },
    "key_market_levels": {
        "total_market_cap": [
            "Current: $2.1T",
            "Support: $1.9T",
            "Resistance: $2.3T"
        ],
        "btc_dominance": [
            "Current: 48.2%",
            "Support: 47%",
            "Resistance: 50%"
        ]
    },
    "catalysts": [
        "ETF approval momentum",
        "Institutional adoption increasing",
        "Technical breakout signals"
    ],
    "risks": [
        "Regulatory uncertainty",
        "Market volatility",
        "Macroeconomic headwinds"
    ],
    "market_outlook": {
        "summary": "The market is currently bearish with a cautious outlook due to recent declines",
        "analysis": [
            "BTC showing weakness below key resistance levels, suggesting potential further downside",
            "Altcoin market experiencing increased selling pressure and volatility",
            "Institutional interest remains strong despite short-term bearish price action",
            "Risk management and strategic position sizing recommended in current conditions"
        ]
    },
    "upcoming_events": [
        "Bitcoin Halving - April 2024: Block rewards will decrease from 6.25 to 3.125 BTC",
        "Ethereum Shanghai Fork - Q1 2024: Major network upgrade enabling staked ETH withdrawals",
        "US SEC Spot ETF Decisions - Q2 2024: Multiple altcoin ETF applications under review"
    ],
    "sentiment_score": 4.5
}

IMPORTANT: 
1. The response must be valid JSON
2. All fields are required
3. Arrays must have exactly 3 items
4. sentiment_score must be a number between 0 and 10
5. Do not add any explanation or text outside the JSON object`;

        console.log('Requesting OpenAI analysis...');
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [{ 
                role: "system", 
                content: "You are a crypto market analyst. You must respond with ONLY valid JSON that exactly matches the required structure. No markdown, no text, just the JSON object."
            }, {
                role: "user",
                content: prompt
            }],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 1000
        });

        console.log('OpenAI response received');
        let analysis;
        try {
            // Remove any potential markdown code block markers and whitespace
            const content = completion.choices[0].message.content
                .replace(/^\`\`\`json\s*/, '')
                .replace(/\`\`\`\s*$/, '')
                .trim();
            
            console.log('Cleaned response:', content);
            
            // Parse the JSON
            analysis = JSON.parse(content);
            console.log('Parsed analysis:', JSON.stringify(analysis, null, 2));
        } catch (error) {
            console.error('Failed to parse OpenAI response:', error);
            console.log('Raw response:', completion.choices[0].message.content);
            throw new Error('Failed to parse market analysis response');
        }

        // Ensure market outlook has the correct structure
        if (!analysis.market_outlook || typeof analysis.market_outlook !== 'object') {
            analysis.market_outlook = {
                summary: "The market is currently bearish with a cautious outlook due to recent declines",
                analysis: [
                    "BTC showing weakness below key resistance levels, suggesting potential further downside",
                    "Altcoin market experiencing increased selling pressure and volatility",
                    "Institutional interest remains strong despite short-term bearish price action",
                    "Risk management and strategic position sizing recommended in current conditions"
                ]
            };
        } else if (!analysis.market_outlook.analysis || !Array.isArray(analysis.market_outlook.analysis)) {
            analysis.market_outlook.analysis = [
                "BTC showing weakness below key resistance levels, suggesting potential further downside",
                "Altcoin market experiencing increased selling pressure and volatility",
                "Institutional interest remains strong despite short-term bearish price action",
                "Risk management and strategic position sizing recommended in current conditions"
            ];
        } else if (analysis.market_outlook.analysis.length !== 4) {
            // Pad or trim the array to exactly 4 items
            while (analysis.market_outlook.analysis.length < 4) {
                analysis.market_outlook.analysis.push("Market conditions require careful monitoring and risk management");
            }
            analysis.market_outlook.analysis = analysis.market_outlook.analysis.slice(0, 4);
        }

        if (!analysis.market_outlook.summary) {
            analysis.market_outlook.summary = "The market is currently bearish with a cautious outlook due to recent declines";
        }

        // Validate response structure
        const requiredFields = [
            'technical_stance',
            'metrics',
            'key_market_levels',
            'catalysts',
            'risks',
            'market_outlook',
            'upcoming_events',
            'sentiment_score'
        ];
        
        // Check for missing fields
        const missingFields = requiredFields.filter(field => !(field in analysis));
        if (missingFields.length > 0) {
            throw new Error(`OpenAI response missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Validate metrics structure
        if (!analysis.metrics || typeof analysis.metrics !== 'object') {
            throw new Error('Invalid metrics structure');
        }
        if (!analysis.metrics.market_cap_change || !analysis.metrics.market_trend || !analysis.metrics.volume_analysis) {
            throw new Error('Missing required metrics fields');
        }
        
        // Validate market levels structure
        if (!analysis.key_market_levels || !analysis.key_market_levels.total_market_cap || !analysis.key_market_levels.btc_dominance) {
            throw new Error('Invalid market levels structure');
        }
        if (!Array.isArray(analysis.key_market_levels.total_market_cap) || analysis.key_market_levels.total_market_cap.length !== 3) {
            throw new Error('total_market_cap must be an array with exactly 3 items');
        }
        if (!Array.isArray(analysis.key_market_levels.btc_dominance) || analysis.key_market_levels.btc_dominance.length !== 3) {
            throw new Error('btc_dominance must be an array with exactly 3 items');
        }
        
        // Validate arrays
        ['catalysts', 'risks', 'upcoming_events'].forEach(field => {
            if (!Array.isArray(analysis[field]) || analysis[field].length !== 3) {
                throw new Error(`${field} must be an array with exactly 3 items`);
            }
        });
        
        // Validate sentiment score
        if (typeof analysis.sentiment_score !== 'number' || analysis.sentiment_score < 0 || analysis.sentiment_score > 10) {
            analysis.sentiment_score = 5.0;
        }
        
        console.log('Analysis parsed and validated successfully');
        
        // Combine metrics with AI analysis
        const marketUpdate = {
            ...analysis,
            current_metrics: {
                total_market_cap: metrics.total_market_cap,
                total_volume_24h: metrics.total_volume_24h,
                btc_dominance: metrics.btc_dominance,
                chains_volume: metrics.chains_volume
            }
        };

        // Update cache
        updateCache = {
            data: marketUpdate,
            timestamp: Date.now()
        };

        console.log('Sending response to client');
        res.json({
            success: true,
            data: marketUpdate,
            cached: false,
            lastUpdated: new Date(updateCache.timestamp),
            nextUpdate: new Date(updateCache.timestamp + CACHE_DURATION)
        });
    } catch (error) {
        console.error('Market overview error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate market overview',
            details: error.stack
        });
    }
});

export default router;
