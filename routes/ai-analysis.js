import OpenAI from 'openai';
import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Rate limiting
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: 'Too many AI analysis requests, please try again later'
});

// Cache for AI responses
const aiCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

router.post('/analyze', aiLimiter, async (req, res) => {
    try {
        const { messages } = req.body;
        
        // Generate cache key from the request
        const cacheKey = JSON.stringify(messages);
        
        // Check cache
        const cachedResponse = getCache(cacheKey);
        if (cachedResponse) {
            return res.json(cachedResponse);
        }

        // Call OpenAI API
        const completion = await openai.createChatCompletion({
            model: "gpt-4",
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
        });

        const analysis = completion.data.choices[0].message.content;
        
        // Structure the response
        const structuredAnalysis = structureAnalysis(analysis);
        
        // Cache the response
        setCache(cacheKey, structuredAnalysis);

        res.json(structuredAnalysis);
    } catch (error) {
        console.error('AI Analysis Error:', error);
        res.status(500).json({
            error: 'Failed to generate AI analysis',
            details: error.message
        });
    }
});

function structureAnalysis(rawAnalysis) {
    try {
        // This function will parse the GPT-4 response and structure it
        // The actual implementation will depend on the response format we get
        
        return {
            riskAssessment: extractRiskAssessment(rawAnalysis),
            investmentPotential: extractInvestmentPotential(rawAnalysis),
            marketPsychology: extractMarketPsychology(rawAnalysis),
            tradingStrategy: extractTradingStrategy(rawAnalysis)
        };
    } catch (error) {
        console.error('Analysis Structuring Error:', error);
        return getFallbackAnalysis();
    }
}

function extractRiskAssessment(analysis) {
    // Implementation will depend on the GPT-4 response format
    return {
        summary: '',
        keyPoints: [],
        riskLevel: ''
    };
}

function extractInvestmentPotential(analysis) {
    // Implementation will depend on the GPT-4 response format
    return {
        summary: '',
        pros: [],
        cons: [],
        recommendation: ''
    };
}

function extractMarketPsychology(analysis) {
    // Implementation will depend on the GPT-4 response format
    return {
        currentPhase: '',
        sentiment: '',
        catalysts: []
    };
}

function extractTradingStrategy(analysis) {
    // Implementation will depend on the GPT-4 response format
    return {
        entryPoints: [],
        exitPoints: [],
        stopLoss: '',
        timeframe: ''
    };
}

function getFallbackAnalysis() {
    return {
        riskAssessment: {
            summary: 'Analysis temporarily unavailable',
            keyPoints: ['Please try again later'],
            riskLevel: 'Unknown'
        },
        investmentPotential: {
            summary: 'Analysis temporarily unavailable',
            pros: [],
            cons: [],
            recommendation: 'Unable to provide recommendation at this time'
        },
        marketPsychology: {
            currentPhase: 'Unknown',
            sentiment: 'Neutral',
            catalysts: []
        },
        tradingStrategy: {
            entryPoints: [],
            exitPoints: [],
            stopLoss: 'N/A',
            timeframe: 'N/A'
        }
    };
}

function getCache(key) {
    const cached = aiCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
        aiCache.delete(key);
        return null;
    }
    return cached.data;
}

function setCache(key, data) {
    aiCache.set(key, {
        data,
        timestamp: Date.now()
    });
}

export default router;
