import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import Parser from 'rss-parser';
import DailyDigestService from '../services/daily-digest-service.js'; 

dotenv.config();
const parser = new Parser();

const router = express.Router();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
const digestService = new DailyDigestService(); 

// Cache for storing the last API response
let cache = {
    data: null,
    timestamp: null
};

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// News sources with proper type handling
const NEWS_SOURCES = [
    // Market Data APIs
    {
        name: 'Yahoo Finance Market Data',
        url: 'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d',
        type: 'json',
        transform: (data) => [{
            title: 'S&P 500 Market Update',
            description: `Current: ${data?.chart?.result?.[0]?.meta?.regularMarketPrice || 'N/A'} | Change: ${data?.chart?.result?.[0]?.meta?.regularMarketChangePercent?.toFixed(2) || 'N/A'}%`,
            link: 'https://finance.yahoo.com/quote/%5EGSPC',
            date: new Date()
        }]
    },
    // Traditional Finance News
    {
        name: 'Yahoo Finance News',
        url: 'https://finance.yahoo.com/news/rssindex',
        type: 'rss'
    },
    {
        name: 'Reuters Markets',
        url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
        type: 'rss'
    },
    {
        name: 'Bloomberg Markets',
        url: 'https://feeds.bloomberg.com/markets/news.rss',
        type: 'rss'
    },
    // Crypto News
    {
        name: 'CryptoCompare News',
        url: 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&api_key=' + process.env.CRYPTOCOMPARE_API_KEY,
        type: 'json',
        transform: (data) => data.Data.map(item => ({
            title: item.title,
            description: item.body,
            link: item.url,
            date: new Date(item.published_on * 1000)
        }))
    },
    {
        name: 'CoinDesk',
        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
        type: 'rss'
    },
    {
        name: 'Cointelegraph',
        url: 'https://cointelegraph.com/rss',
        type: 'rss'
    },
    // Economic Data
    {
        name: 'Fed News',
        url: 'https://www.federalreserve.gov/feeds/press_monetary.xml',
        type: 'rss'
    },
    {
        name: 'IMF News',
        url: 'https://www.imf.org/en/News/RSS',
        type: 'rss'
    },
    // Stock Market News
    {
        name: 'Seeking Alpha',
        url: 'https://seekingalpha.com/market_currents.xml',
        type: 'rss'
    },
    {
        name: 'CNBC Markets',
        url: 'https://www.cnbc.com/id/20409666/device/rss/rss.html',
        type: 'rss'
    },
    {
        name: 'MarketWatch',
        url: 'http://feeds.marketwatch.com/marketwatch/marketpulse/',
        type: 'rss'
    }
];

async function fetchNewsFromSources() {
    try {
        console.log(`Fetching news from ${NEWS_SOURCES.length} sources...`);
        
        const newsPromises = NEWS_SOURCES.map(async source => {
            try {
                console.log(`Fetching news from ${source.name}...`);
                
                if (source.type === 'json') {
                    const response = await axios.get(source.url);
                    if (response.data) {
                        const items = source.transform(response.data);
                        console.log(`Successfully fetched ${items.length} items from ${source.name}`);
                        return items.map(item => ({
                            ...item,
                            source: source.name,
                            pubDate: item.pubDate || new Date().toISOString()
                        }));
                    }
                    return [];
                } else if (source.type === 'rss') {
                    const feed = await parser.parseURL(source.url);
                    console.log(`Successfully fetched ${feed.items.length} items from ${source.name}`);
                    return feed.items.map(item => ({
                        title: item.title,
                        description: item.contentSnippet || item.content,
                        link: item.link,
                        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
                        source: source.name
                    }));
                }
                return [];
            } catch (error) {
                console.error(`Error fetching from ${source.name}:`, error.message);
                return [];
            }
        });

        const newsArrays = await Promise.all(newsPromises);
        const allNews = newsArrays.flat();
        
        console.log(`Total news items fetched: ${allNews.length}`);
        console.log('Returning 20 most recent articles');
        
        return allNews;
    } catch (error) {
        console.error('Error in fetchNewsFromSources:', error);
        throw error;
    }
}

async function generateDigestWithGPT4(newsData) {
    try {
        // Take only the 8 most recent articles and create very concise summaries
        const sortedNews = newsData
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 8)
            .map(item => ({
                title: item.title.substring(0, 100), // Limit title length
                source: item.source,
                summary: item.description 
                    ? item.description.substring(0, 150) + '...' // Very short summary
                    : 'No description available'
            }));

        const prompt = {
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a crypto market analyst. Create a concise market digest. Be brief but insightful."
                },
                {
                    role: "user",
                    content: `Based on these recent crypto news items, create a brief market digest with:
1. Market Summary (2 sentences)
2. Key Developments (3 bullet points)
3. Trading Insights (2 bullet points)
4. Risk Factors (1-2 bullet points)

News: ${JSON.stringify(sortedNews, null, 1)}`
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        };

        const completion = await openai.chat.completions.create(prompt);
        return completion.choices[0].message.content;

    } catch (error) {
        console.error('Error in generateDigestWithGPT4:', error);
        throw new Error('Failed to generate market digest: ' + error.message);
    }
}

function extractSection(text, sectionName) {
    const regex = new RegExp(`${sectionName}[:\\n]([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
}

// Add CORS headers for this route
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Route to get the latest news digest
router.get('/', async (req, res) => {
    try {
        // Get news data
        console.log('Fetching news...');
        const newsData = await fetchNewsFromSources();
        console.log(`Fetched ${newsData.length} news items`);
        
        // Get the 20 most recent articles
        const recentNews = newsData
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 20);
        
        // Generate analysis using news
        const analysis = await digestService.generateAnalysis(recentNews);
        
        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Error in daily digest route:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get latest digest data
router.get('/latest', async (req, res) => {
    try {
        // Get news data
        const newsData = await fetchNewsFromSources();
        
        // Generate digest if cache is empty or expired
        if (!cache.data || !cache.timestamp || (Date.now() - cache.timestamp > CACHE_DURATION)) {
            const digest = await generateDigestWithGPT4(newsData);
            cache.data = digest;
            cache.timestamp = Date.now();
        }
        
        res.json({
            timestamp: cache.timestamp,
            highlights: cache.data.highlights || [],
            marketSummary: cache.data.marketSummary || '',
            policyUpdates: cache.data.policyUpdates || [],
            technicalAnalysis: cache.data.technicalAnalysis || ''
        });
    } catch (error) {
        console.error('Error getting latest digest:', error);
        res.status(500).json({
            error: 'Failed to get latest digest',
            details: error.message
        });
    }
});

export default router;
