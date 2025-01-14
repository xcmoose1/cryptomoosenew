import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import Parser from 'rss-parser';

dotenv.config();
const parser = new Parser();

const router = express.Router();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Cache for storing the last API response
let cache = {
    data: null,
    timestamp: null
};

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// RSS feeds for major crypto news sources
const NEWS_SOURCES = [
    // Crypto News
    {
        name: 'CoinDesk',
        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/'
    },
    {
        name: 'Cointelegraph',
        url: 'https://cointelegraph.com/rss'
    },
    {
        name: 'Bitcoin Magazine',
        url: 'https://bitcoinmagazine.com/.rss/full/'
    },
    {
        name: 'Decrypt',
        url: 'https://decrypt.co/feed'
    },
    {
        name: 'The Block',
        url: 'https://www.theblock.co/rss.xml'
    },
    {
        name: 'CryptoSlate',
        url: 'https://cryptoslate.com/feed/'
    },
    // Traditional Market News
    {
        name: 'Reuters Markets',
        url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best'
    },
    {
        name: 'MarketWatch',
        url: 'http://feeds.marketwatch.com/marketwatch/topstories/'
    },
    {
        name: 'Yahoo Finance',
        url: 'https://finance.yahoo.com/news/rssindex'
    },
    {
        name: 'CNBC Markets',
        url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html'
    },
    {
        name: 'Investing.com',
        url: 'https://www.investing.com/rss/news.rss'
    },
    {
        name: 'Seeking Alpha',
        url: 'https://seekingalpha.com/market_currents.xml'
    },
    {
        name: 'Zero Hedge',
        url: 'https://feeds.feedburner.com/zerohedge/feed'
    },
    // Economic News
    {
        name: 'IMF News',
        url: 'https://www.imf.org/en/News/RSS'
    },
    {
        name: 'World Bank',
        url: 'https://www.worldbank.org/en/news/rss.xml'
    },
    {
        name: 'Federal Reserve',
        url: 'https://www.federalreserve.gov/feeds/press_all.xml'
    }
];

async function fetchNewsFromSources() {
    try {
        console.log(`Fetching news from ${NEWS_SOURCES.length} sources...`);
        const newsPromises = NEWS_SOURCES.map(async source => {
            try {
                console.log(`Fetching news from ${source.name}...`);
                const feed = await parser.parseURL(source.url);
                console.log(`Successfully fetched ${feed.items.length} items from ${source.name}`);
                return feed.items.slice(0, 5).map(item => ({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    source: source.name,
                    categories: item.categories || [],
                    description: item.contentSnippet || item.description || ''
                }));
            } catch (error) {
                console.error(`Error fetching from ${source.name}:`, error.message);
                return [];
            }
        });

        const allNews = await Promise.all(newsPromises);
        const flattenedNews = allNews.flat();
        console.log(`Total news items fetched: ${flattenedNews.length}`);
        
        // Sort by date and get the most recent 20 articles
        const sortedNews = flattenedNews
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 20);
            
        console.log(`Returning ${sortedNews.length} most recent articles`);
        return sortedNews;
    } catch (error) {
        console.error('Error in fetchNewsFromSources:', error);
        throw error;
    }
}

async function generateDigestWithGPT4(newsData) {
    try {
        console.log('Starting digest generation with GPT-4...');
        console.log(`Processing ${newsData.length} news items`);
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `You are CryptoMoose's expert market analyst and journalist. Create a comprehensive daily digest that connects global events to crypto markets. Your analysis should:

                1. GLOBAL CONTEXT
                - Analyze how global economic events affect crypto
                - Connect political developments to market sentiment
                - Identify macro trends that could impact crypto
                - Track institutional money flow and sentiment

                2. MARKET ANALYSIS
                - Overall crypto market sentiment and trends
                - Key price levels and technical patterns
                - Volume analysis and market dynamics
                - Correlation with traditional markets

                3. SECTOR IMPACT
                - How news affects different crypto sectors (DeFi, L1s, NFTs, etc.)
                - Sector rotation and capital flow analysis
                - Emerging trends and opportunities
                - Risk assessment by sector

                4. ACTIONABLE INSIGHTS
                - Clear trading and investment implications
                - Risk management considerations
                - Potential opportunities to watch
                - Defensive positioning strategies

                5. FORWARD OUTLOOK
                - Short-term market catalysts (24-48 hours)
                - Medium-term trends to watch (1-2 weeks)
                - Key upcoming events and their potential impact
                - Risk factors and warning signs

                Format Guidelines:
                - Use bullet points for clarity
                - Highlight key metrics and data points
                - Include specific price levels where relevant
                - Add confidence levels to predictions
                - Separate short-term vs long-term implications
                
                Recent news to analyze: ${JSON.stringify(newsData)}
                Current time: ${new Date().toISOString()}`
            }],
            temperature: 0.7,
            max_tokens: 2500
        });

        console.log('Successfully received GPT-4 response');
        const response = completion.choices[0].message.content;
        
        const digest = {
            globalContext: extractSection(response, "GLOBAL CONTEXT"),
            marketAnalysis: extractSection(response, "MARKET ANALYSIS"),
            sectorImpact: extractSection(response, "SECTOR IMPACT"),
            actionableInsights: extractSection(response, "ACTIONABLE INSIGHTS"),
            outlook: extractSection(response, "FORWARD OUTLOOK")
        };

        console.log('Successfully extracted all sections');
        return digest;
    } catch (error) {
        console.error('Error in generateDigestWithGPT4:', error);
        throw error;
    }
}

function extractSection(text, sectionName) {
    try {
        const regex = new RegExp(`${sectionName}[\\s\\S]*?(?=(?:GLOBAL CONTEXT|MARKET ANALYSIS|SECTOR IMPACT|ACTIONABLE INSIGHTS|FORWARD OUTLOOK|$))`, 'i');
        const match = text.match(regex);
        return match ? match[0].replace(sectionName, '').trim() : `No ${sectionName.toLowerCase()} data available.`;
    } catch (error) {
        console.error(`Error extracting ${sectionName}:`, error);
        return `Error extracting ${sectionName.toLowerCase()} data.`;
    }
}

// Add CORS headers for this route
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

router.get('/', async (req, res) => {
    try {
        console.log('Received request for daily digest');
        
        // Check if we have cached data less than 12 hours old
        const now = Date.now();
        if (cache.data && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
            console.log('Returning cached digest data');
            return res.json({
                success: true,
                data: cache.data,
                cached: true,
                nextUpdate: new Date(cache.timestamp + CACHE_DURATION).toISOString()
            });
        }

        console.log('Cache miss or expired, fetching fresh data');
        // Fetch fresh news data
        const newsData = await fetchNewsFromSources();
        if (!newsData || newsData.length === 0) {
            console.error('No news data available');
            throw new Error('No news data available');
        }
        
        console.log(`Successfully fetched ${newsData.length} news items`);
        
        // Generate new digest
        const digest = await generateDigestWithGPT4(newsData);
        
        // Validate digest format
        if (!digest || typeof digest !== 'object') {
            console.error('Invalid digest format generated');
            throw new Error('Invalid digest format generated');
        }
        
        console.log('Successfully generated new digest');
        
        // Update cache
        cache = {
            data: digest,
            timestamp: now
        };

        console.log('Updated cache with new digest');

        res.json({
            success: true,
            data: digest,
            cached: false,
            nextUpdate: new Date(now + CACHE_DURATION).toISOString()
        });
    } catch (error) {
        console.error('Error in daily digest endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate daily digest',
            errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

export default router;
