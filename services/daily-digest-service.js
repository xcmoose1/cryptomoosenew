import axios from 'axios';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

export default class DailyDigestService {
    constructor() {
        this.openai = new OpenAI();
        this.NEWS_CACHE_FILE = path.join(process.cwd(), 'data', 'daily_digest_cache.json');
        this.REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        this.NEWS_SOURCES = [
            {
                url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
                type: 'price'
            },
            {
                url: 'https://api.coingecko.com/api/v3/search/trending',
                type: 'trending'
            },
            {
                url: 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
                type: 'market'
            },
            {
                url: 'https://api.coingecko.com/api/v3/global',
                type: 'global'
            }
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
                data: null,
                marketData: null,
                lastUpdated: null,
                nextUpdate: null
            }));
        }
    }

    async getDigest(forceRefresh = false) {
        try {
            const cache = JSON.parse(fs.readFileSync(this.NEWS_CACHE_FILE, 'utf8'));
            const now = new Date();
            const lastUpdated = cache.lastUpdated ? new Date(cache.lastUpdated) : null;

            if (!forceRefresh && lastUpdated && (now - lastUpdated) < this.REFRESH_INTERVAL) {
                return {
                    success: true,
                    data: cache.data,
                    cached: true,
                    nextUpdate: cache.nextUpdate
                };
            }

            const marketData = await this.fetchMarketData();
            const analysis = await this.generateAnalysis(marketData);

            const newCache = {
                data: analysis,
                marketData: marketData,
                lastUpdated: now.toISOString(),
                nextUpdate: new Date(now.getTime() + this.REFRESH_INTERVAL).toISOString()
            };

            fs.writeFileSync(this.NEWS_CACHE_FILE, JSON.stringify(newCache));

            return {
                success: true,
                data: analysis,
                cached: false,
                nextUpdate: newCache.nextUpdate
            };

        } catch (error) {
            console.error('Error in getDigest:', error);
            return {
                success: false,
                error: error.message,
                cached: false
            };
        }
    }

    async fetchMarketData() {
        const marketData = {
            price: null,
            trending: [],
            market: null,
            global: null
        };
        
        for (const source of this.NEWS_SOURCES) {
            try {
                console.log(`Fetching from ${source.url}...`);
                const response = await this.axios.get(source.url);
                console.log(`Response from ${source.type}:`, JSON.stringify(response.data).slice(0, 200) + '...');
                
                switch(source.type) {
                    case 'price':
                        marketData.price = response.data.bitcoin?.usd;
                        break;
                    case 'trending':
                        // Only take symbol and price change
                        marketData.trending = (response.data.coins || []).slice(0, 3).map(coin => ({
                            symbol: coin.item.symbol,
                            price_change: coin.item.data?.price_change_percentage_24h?.usd
                        }));
                        break;
                    case 'market':
                        marketData.market = {
                            priceChange: response.data.priceChangePercent
                        };
                        break;
                    case 'global':
                        // Only take essential metrics
                        const globalData = response.data.data || {};
                        marketData.global = {
                            btc_dominance: globalData.market_cap_percentage?.btc,
                            total_market_cap_usd: globalData.total_market_cap?.usd
                        };
                        break;
                }
            } catch (error) {
                console.log(`Error fetching from ${source.url}: ${error.message}`);
                // Continue with other sources
            }
        }
        
        console.log('Final market data:', JSON.stringify(marketData, null, 2));

        return marketData;
    }

    async generateAnalysis(marketData) {
        // Clean and validate data
        const btcPrice = marketData.price ? Number(marketData.price).toLocaleString() : 'N/A';
        const priceChange = marketData.market?.priceChange ? Number(marketData.market.priceChange).toFixed(2) : 'N/A';
        const marketCap = marketData.global?.total_market_cap_usd ? 
            `$${(marketData.global.total_market_cap_usd / 1e9).toFixed(1)}B` : 'N/A';
        const btcDom = marketData.global?.btc_dominance ? 
            `${marketData.global.btc_dominance.toFixed(1)}%` : 'N/A';

        // Format trending coins with price changes
        const trending = marketData.trending
            .map(c => `${c.symbol.toUpperCase()}${c.price_change ? ` ${c.price_change > 0 ? '+' : ''}${c.price_change.toFixed(1)}%` : ''}`)
            .join(', ') || 'None';

        const prompt = `BTC $${btcPrice} (${priceChange}%) | MCap ${marketCap} | Dom ${btcDom}
Trending: ${trending}

Provide:
1. Market analysis
2. Trading strategy
3. Risk management
4. Key levels
5. Next moves`;

        // Debug log
        console.log('Prompt length:', prompt.length);
        console.log('Prompt:', prompt);

        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "Expert crypto analyst. Give actionable market analysis. Use double newlines between sections."
                }, {
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 1000
            });

            const response = completion.choices[0].message.content;
            const sections = response.split('\n\n');

            return {
                globalContext: sections[0] || '',
                marketAnalysis: sections[1] || '',
                sectorImpact: sections[2] || '',
                actionableInsights: sections[3] || '',
                outlook: sections[4] || ''
            };

        } catch (error) {
            console.error('Error generating analysis:', error);
            throw error;
        }
    }
- How could this impact the market?
- Which assets might be affected?
- How can members position themselves?
- Entry points and risk levels to watch
- Potential timeframe for the trade

Risk Factors & Warning Signs
- Key risks to watch
- Invalidation levels
- Position sizing recommendations
- Hedging suggestions if needed

Member Action Items
• Clear, numbered steps members should consider
• Specific entry/exit levels where relevant
• Risk management guidelines
• Portfolio adjustment suggestions

Remember:
- Be specific with trading suggestions
- Include both short and mid-term opportunities
- Always include risk management advice
- Make members feel you're personally guiding them

Articles: ${JSON.stringify(articles)}`;

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

    async getDigest(forceRefresh = false) {
        try {
            const now = Date.now();
            const cacheData = await this.readCache();

            // Return cached data if:
            // 1. Not a forced refresh
            // 2. Cache exists and is less than 6 hours old
            if (!forceRefresh && 
                cacheData.lastUpdated && 
                (now - new Date(cacheData.lastUpdated).getTime()) < this.REFRESH_INTERVAL &&
                cacheData.digest) {
                return {
                    success: true,
                    data: cacheData.digest,
                    nextUpdate: new Date(cacheData.lastUpdated).getTime() + this.REFRESH_INTERVAL
                };
            }

            // Generate new digest
            const articles = await this.fetchNews();
            const digest = await this.generateDigest(articles);
            
            // Update cache
            await this.writeCache({
                lastUpdated: new Date().toISOString(),
                digest
            });

            return {
                success: true,
                data: digest,
                nextUpdate: Date.now() + this.REFRESH_INTERVAL
            };

        } catch (error) {
            console.error('Error in getDigest:', error);
            return {
                success: false,
                error: 'Failed to generate digest'
            };
        }
    }

    async handleRequest(req) {
        const forceRefresh = req.query.refresh === 'true';
        return await this.getDigest(forceRefresh);
    }
}
