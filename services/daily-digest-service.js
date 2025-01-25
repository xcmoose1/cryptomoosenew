import axios from 'axios';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import Parser from 'rss-parser';

export default class DailyDigestService {
    constructor() {
        // Initialize OpenAI with API key from environment
        if (!process.env.OPENAI_API_KEY) {
            console.error('OPENAI_API_KEY is not set in environment variables');
        }
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        this.NEWS_CACHE_FILE = path.join(process.cwd(), 'data', 'daily_digest_cache.json');
        this.REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        
        // News sources configuration
        this.NEWS_SOURCES = [
            {
                name: 'Reuters Business',
                url: 'https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best',
                type: 'rss'
            },
            {
                name: 'Bloomberg Markets',
                url: 'https://www.bloomberg.com/feeds/markets',
                type: 'rss'
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
            }
        ];
        
        this.axios = axios.create({
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'CryptoMoose/1.0'
            }
        });
        
        this.parser = new Parser();
        
        this.ensureFilesExist();
    }

    ensureFilesExist() {
        const dataDir = path.dirname(this.NEWS_CACHE_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.NEWS_CACHE_FILE)) {
            fs.writeFileSync(this.NEWS_CACHE_FILE, JSON.stringify({
                data: {
                    analysis: '',
                    lastUpdated: null
                },
                newsData: null,
                lastUpdated: null,
                nextUpdate: null
            }));
        }
    }

    async getDigest(forceRefresh = false) {
        try {
            // Check cache first if not forcing refresh
            if (!forceRefresh) {
                const cachedData = await this.readCache();
                if (cachedData && Date.now() - cachedData.timestamp < this.REFRESH_INTERVAL) {
                    console.log('Returning cached digest data');
                    return {
                        success: true,
                        data: cachedData.data,
                        newsData: cachedData.newsData,
                        cached: true,
                        lastUpdated: new Date(cachedData.timestamp),
                        nextUpdate: new Date(cachedData.timestamp + this.REFRESH_INTERVAL)
                    };
                }
            }

            console.log('Fetching fresh news data...');
            const newsData = await this.fetchNews();
            console.log('News data fetched:', newsData);

            // Generate analysis based on news data
            const analysisData = await this.generateAnalysis(newsData);
            console.log('Analysis generated');

            const digestData = {
                analysis: analysisData.analysis,
                lastUpdated: new Date()
            };

            // Cache the data
            await this.writeCache({
                data: digestData,
                newsData: newsData,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: digestData,
                newsData: newsData,
                cached: false,
                lastUpdated: new Date(),
                nextUpdate: new Date(Date.now() + this.REFRESH_INTERVAL)
            };

        } catch (error) {
            console.error('Error in getDigest:', error);
            return {
                success: false,
                error: error.message || 'Failed to generate digest',
                cached: false
            };
        }
    }

    async fetchNews() {
        const news = {
            traditional: [],
            crypto: []
        };

        for (const source of this.NEWS_SOURCES) {
            try {
                console.log(`Fetching news from ${source.name}...`);
                const feed = await this.parser.parseURL(source.url);
                
                // Get the latest 5 articles from each source
                const articles = feed.items.slice(0, 5).map(item => ({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    source: source.name
                }));

                // Categorize news
                if (source.name.toLowerCase().includes('coin')) {
                    news.crypto.push(...articles);
                } else {
                    news.traditional.push(...articles);
                }
            } catch (error) {
                console.error(`Error fetching news from ${source.name}:`, error);
            }
        }

        return news;
    }

    async generateAnalysis(newsData) {
        try {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OpenAI API key is not configured');
            }

            if (!newsData || newsData.length === 0) {
                throw new Error('No news data provided');
            }

            console.log(`Generating analysis with ${newsData.length} news items...`);

            const prompt = `Latest Market News:
${newsData.map(article => `- ${article.title} (${article.source})`).join('\n')}

Write a comprehensive and engaging market analysis article that reads like a top-tier financial news piece. The article should be detailed (around 1000-1200 words) and naturally flow between topics without formal sections.

Key elements to include:
- A compelling headline that captures the day's most significant story
- A strong opening that hooks readers and sets the context
- Natural transitions between different market aspects (crypto, traditional, etc.)
- Deep analysis of key events and their interconnections
- Expert insights and forward-looking perspectives
- Clear takeaways for investors woven throughout the narrative

Style Guidelines:
- Write in a clear, engaging style that sophisticated readers will appreciate
- Use subheadings naturally within the text to improve readability
- Highlight important points with strong statements
- Include relevant quotes or expert opinions
- Use analogies and real-world examples to explain complex topics
- Make it personal - help readers understand why they should care
- Be specific about opportunities and risks, but avoid technical trading advice

Format the text with HTML for better presentation:
- Use <h1> for the main headline
- Use <h2> tags sparingly for natural subheadings (in a journalistic style)
- Use <strong> tags to emphasize key points
- Use <div class="highlight"> for particularly important insights
- Use <blockquote> for notable quotes or key takeaways

The goal is to create a compelling narrative that helps readers understand the big picture and make smarter decisions. Think Bloomberg Opinion or Financial Times analysis piece, but with more depth and natural flow between topics.`;

            console.log('Sending request to OpenAI...');

            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a world-class financial journalist with a talent for making complex market events clear and relevant to readers. Your writing style combines the narrative flair of a feature writer with the deep insight of a market expert. Focus on telling compelling stories that help readers understand what's happening in the markets and why it matters to them."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2500
            });

            return { analysis: completion.choices[0].message.content };

        } catch (error) {
            console.error('Error generating analysis:', error);
            throw error;
        }
    }

    async readCache() {
        try {
            const cacheData = JSON.parse(fs.readFileSync(this.NEWS_CACHE_FILE, 'utf8'));
            return cacheData;
        } catch (error) {
            console.error('Error reading cache:', error);
            return null;
        }
    }

    async writeCache(data) {
        try {
            fs.writeFileSync(this.NEWS_CACHE_FILE, JSON.stringify(data));
        } catch (error) {
            console.error('Error writing cache:', error);
        }
    }

    async handleRequest(req) {
        const forceRefresh = req.query.refresh === 'true';
        return await this.getDigest(forceRefresh);
    }
}
