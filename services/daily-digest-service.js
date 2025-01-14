import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default class DailyDigestService {
    constructor() {
        this.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        this.NEWS_CACHE_FILE = path.join(process.cwd(), 'data', 'daily_digest_cache.json');
        this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.NEWS_SOURCES = [
            'https://api.coingecko.com/api/v3/news',
            'https://newsapi.org/v2/top-headlines?country=us&category=business',
            'https://newsapi.org/v2/top-headlines?country=us&category=technology',
            // Add more news sources as needed
        ];
        
        this.axios = axios.create({
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'CryptoMoose/1.0'
            }
        });
        
        this.ensureFilesExist();
    }

    ensureFilesExist() {
        const dataDir = path.dirname(this.NEWS_CACHE_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.NEWS_CACHE_FILE)) {
            fs.writeFileSync(this.NEWS_CACHE_FILE, JSON.stringify({
                digest: null,
                articles: [],
                lastUpdated: null
            }));
        }
    }

    async fetchNews() {
        const articles = [];
        
        try {
            // Fetch from multiple sources
            for (const source of this.NEWS_SOURCES) {
                const response = await this.axios.get(source);
                if (response.data && response.data.articles) {
                    articles.push(...response.data.articles);
                }
            }

            // Additional crypto-specific sources
            const cryptoNews = await this.fetchCryptoNews();
            articles.push(...cryptoNews);

            return articles;
        } catch (error) {
            console.error('Error fetching news:', error);
            return [];
        }
    }

    async fetchCryptoNews() {
        // Implement specific crypto news fetching logic
        // This could include sources like CoinDesk, CryptoSlate, etc.
        return [];
    }

    async generateDigest(articles) {
        try {
            const prompt = `
                As a crypto expert journalist, create a comprehensive daily digest based on the following news articles.
                Focus on:
                1. Key market-moving events and their potential impact
                2. Important political and economic developments
                3. Technological advancements and adoption news
                4. Market sentiment analysis
                5. Actionable insights for traders and investors

                Format the response with these sections:
                - Market Overview
                - Key Events & Impact Analysis
                - Technical Developments
                - Market Opportunities
                - Risk Factors
                - Action Items

                Articles: ${JSON.stringify(articles)}
            `;

            const response = await this.axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 2000
            }, {
                headers: {
                    'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating digest:', error);
            throw error;
        }
    }

    async getDailyDigest() {
        try {
            const cacheData = JSON.parse(fs.readFileSync(this.NEWS_CACHE_FILE, 'utf8'));
            const now = new Date().getTime();

            // Check if cache is valid
            if (cacheData.lastUpdated && 
                (now - new Date(cacheData.lastUpdated).getTime()) < this.CACHE_DURATION &&
                cacheData.digest) {
                return cacheData.digest;
            }

            // Fetch fresh news and generate new digest
            const articles = await this.fetchNews();
            const digest = await this.generateDigest(articles);

            // Update cache
            fs.writeFileSync(this.NEWS_CACHE_FILE, JSON.stringify({
                digest,
                articles,
                lastUpdated: new Date().toISOString()
            }));

            return digest;
        } catch (error) {
            console.error('Error getting daily digest:', error);
            throw error;
        }
    }
}
