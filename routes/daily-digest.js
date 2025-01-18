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

// News sources with proper type handling
const NEWS_SOURCES = [
    // JSON API Sources
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
    // RSS Feed Sources
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
    {
        name: 'Bitcoin Magazine',
        url: 'https://bitcoinmagazine.com/.rss/full/',
        type: 'rss'
    },
    // Traditional Finance RSS
    {
        name: 'FT Markets',
        url: 'https://www.ft.com/markets?format=rss',
        type: 'rss'
    },
    {
        name: 'WSJ Markets',
        url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
        type: 'rss'
    },
    // Central Bank News
    {
        name: 'Fed News',
        url: 'https://www.federalreserve.gov/feeds/press_monetary.xml',
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
                            source: source.name
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
                        date: new Date(item.pubDate || item.isoDate),
                        source: source.name
                    }));
                }
                return [];
            } catch (error) {
                console.log(`Error fetching from ${source.name}: ${error.message}`);
                return [];
            }
        });

        const allNews = await Promise.all(newsPromises);
        const flattenedNews = allNews.flat();
        console.log(`Total news items fetched: ${flattenedNews.length}`);
        
        // Sort by date and get the most recent 20 articles
        const sortedNews = flattenedNews
            .sort((a, b) => b.date - a.date)
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
        const now = Date.now();
        
        // Check cache first
        if (cache.data && cache.timestamp && (now - cache.timestamp < CACHE_DURATION)) {
            console.log('Returning cached digest...');
            return res.json(cache.data);
        }

        console.log('Cache miss or expired, fetching fresh data...');
        
        // Fetch fresh news
        const newsData = await fetchNewsFromSources();
        
        // Generate digest
        const digest = await generateDigestWithGPT4(newsData);
        
        // Update cache
        cache = {
            data: {
                digest,
                timestamp: now,
                newsCount: newsData.length
            },
            timestamp: now
        };
        
        res.json(cache.data);
    } catch (error) {
        console.error('Error in digest route:', error);
        res.status(500).json({ error: 'Failed to generate digest' });
    }
});

export default router;
