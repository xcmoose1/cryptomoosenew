import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default class GemHunterService {
    constructor() {
        this.DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex';
        this.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        this.WATCHLIST_FILE = path.join(process.cwd(), 'data', 'watchlist.json');
        this.CACHE_FILE = path.join(process.cwd(), 'data', 'gem_cache.json');
        this.CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
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
        const dataDir = path.dirname(this.WATCHLIST_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Ensure watchlist file exists
        if (!fs.existsSync(this.WATCHLIST_FILE)) {
            fs.writeFileSync(this.WATCHLIST_FILE, JSON.stringify({
                gems: [],
                lastUpdated: new Date().toISOString()
            }));
        }
        
        // Ensure cache file exists
        if (!fs.existsSync(this.CACHE_FILE)) {
            fs.writeFileSync(this.CACHE_FILE, JSON.stringify({
                gems: [],
                lastUpdated: null
            }));
        }
    }

    async getWatchlist() {
        try {
            const data = JSON.parse(fs.readFileSync(this.WATCHLIST_FILE, 'utf8'));
            return data.gems || [];
        } catch (error) {
            console.error('Error reading watchlist:', error);
            return [];
        }
    }

    async addToWatchlist(gem) {
        try {
            const watchlist = await this.getWatchlist();
            const exists = watchlist.some(g => g.symbol === gem.symbol);
            
            if (!exists) {
                gem.addedAt = new Date().toISOString();
                gem.initialPrice = gem.price;
                gem.initialMarketCap = gem.marketCap;
                watchlist.push(gem);
                
                fs.writeFileSync(this.WATCHLIST_FILE, JSON.stringify({
                    gems: watchlist,
                    lastUpdated: new Date().toISOString()
                }, null, 2));
            }
        } catch (error) {
            console.error('Error adding to watchlist:', error);
        }
    }

    async removeFromWatchlist(symbol) {
        try {
            const watchlist = await this.getWatchlist();
            const updatedWatchlist = watchlist.filter(g => g.symbol !== symbol);
            
            fs.writeFileSync(this.WATCHLIST_FILE, JSON.stringify({
                gems: updatedWatchlist,
                lastUpdated: new Date().toISOString()
            }, null, 2));
        } catch (error) {
            console.error('Error removing from watchlist:', error);
        }
    }

    async getTrendingGems() {
        try {
            console.log('Fetching from DexScreener...');
            
            // Get fresh data from DexScreener
            const response = await this.axios.get(
                `${this.DEXSCREENER_API_URL}/search`, {
                    params: {
                        q: 'volume_desc'
                    }
                }
            );

            if (!Array.isArray(response.data.pairs)) {
                throw new Error('Invalid response from DexScreener');
            }

            console.log(`Found ${response.data.pairs.length} pairs`);

            const processedPairs = response.data.pairs
                .filter(pair => {
                    const marketCap = parseFloat(pair.fdv || 0);
                    const volume24h = parseFloat(pair.volume.h24 || 0);
                    const volumeToMcap = volume24h / marketCap;
                    const priceChange = parseFloat(pair.priceChange.h24 || 0);

                    // Exclude common rug pull patterns
                    if (volumeToMcap > 1.5) return false;
                    if (Math.abs(priceChange) > 25) return false;
                    if (marketCap < 300000) return false;
                    
                    // Exclude suspicious token names
                    const suspiciousTerms = ['castle', 'diamond', 'moon', 'safe', 'gem', 'gold', 'rocket', 'elon'];
                    if (suspiciousTerms.some(term => 
                        pair.baseToken.name.toLowerCase().includes(term) || 
                        pair.baseToken.symbol.toLowerCase().includes(term)
                    )) {
                        return false;
                    }

                    return (
                        marketCap <= 10000000 && // Max $10M mcap
                        volume24h > 1000 && // Minimum $1K volume
                        !pair.baseToken.symbol.toLowerCase().includes('weth') &&
                        !pair.baseToken.symbol.toLowerCase().includes('wbtc')
                    );
                })
                .map(pair => {
                    try {
                        const score = this.calculateGemScore(pair);
                        if (score <= 65) return null;

                        const gem = {
                            name: pair.baseToken.name,
                            symbol: pair.baseToken.symbol.toUpperCase(),
                            marketCap: parseFloat(pair.fdv || 0),
                            volume24h: parseFloat(pair.volume.h24 || 0),
                            priceChange24h: parseFloat(pair.priceChange.h24 || 0),
                            liquidity: parseFloat(pair.liquidity.usd || 0),
                            price: parseFloat(pair.priceUsd || 0),
                            url: `https://dexscreener.com/${pair.chainId}/${pair.pairAddress}`,
                            score: score,
                            chainId: pair.chainId,
                            chainName: this.getChainName(pair.chainId),
                            pairAddress: pair.pairAddress,
                            redFlags: []
                        };

                        // Generate insights
                        gem.insights = this.generateFallbackInsights(gem);

                        // Auto-add to watchlist if score is very high
                        if (score >= 85) {
                            this.addToWatchlist(gem);
                        }

                        return gem;
                    } catch (err) {
                        console.error('Error processing pair:', err);
                        return null;
                    }
                })
                .filter(pair => pair !== null)
                .sort((a, b) => b.score - a.score)
                .slice(0, 6);

            if (processedPairs.length === 0) {
                throw new Error('No pairs matched the filtering criteria');
            }

            // Update cache with new data
            fs.writeFileSync(this.CACHE_FILE, JSON.stringify({
                gems: processedPairs,
                lastUpdated: new Date().toISOString()
            }, null, 2));

            console.log('Updated cache with new gems data');
            return processedPairs;

        } catch (error) {
            console.error('Error in getTrendingGems:', error);
            try {
                const cache = JSON.parse(fs.readFileSync(this.CACHE_FILE, 'utf8'));
                return cache.gems || [];
            } catch (cacheError) {
                console.error('Error reading cache:', cacheError);
                return [];
            }
        }
    }

    async generateGPTInsights(gem) {
        try {
            const prompt = `Analyze this cryptocurrency data and provide 2-3 concise, insightful observations about its potential as an investment opportunity. Be specific and analytical, focusing on the metrics provided. Keep each insight under 100 characters:

Token: ${gem.name} (${gem.symbol})
Market Cap: $${gem.marketCap.toLocaleString()}
24h Volume: $${gem.volume24h.toLocaleString()}
24h Price Change: ${gem.priceChange24h.toFixed(2)}%
Volume/MCap Ratio: ${(gem.volume24h/gem.marketCap).toFixed(2)}`;

            const response = await this.axios.post('https://api.openai.com/v1/chat/completions', {
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "You are a cryptocurrency analyst providing brief, data-driven insights about trading opportunities. Focus on market metrics and technical analysis. Be concise and specific."
                }, {
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 150
            }, {
                headers: {
                    'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            const insights = response.data.choices[0].message.content
                .split('\n')
                .filter(line => line.trim())
                .slice(0, 2);

            return insights;
        } catch (error) {
            console.error('Error generating GPT insights:', error);
            return this.generateFallbackInsights(gem);
        }
    }

    calculateGemScore(pair) {
        const marketCap = parseFloat(pair.fdv || 0);
        const volume24h = parseFloat(pair.volume.h24 || 0);
        const liquidity = parseFloat(pair.liquidity.usd || 0);
        const priceChange = parseFloat(pair.priceChange.h24 || 0);

        let score = 0;

        // Market cap score (lower is better)
        if (marketCap <= 1000000) score += 30;
        else if (marketCap <= 5000000) score += 20;
        else if (marketCap <= 10000000) score += 10;

        // Volume score (higher is better)
        if (volume24h >= 100000) score += 20;
        else if (volume24h >= 50000) score += 15;
        else if (volume24h >= 10000) score += 10;

        // Liquidity score (higher is better)
        if (liquidity >= 50000) score += 20;
        else if (liquidity >= 25000) score += 15;
        else if (liquidity >= 10000) score += 10;

        // Price change score (moderate is better)
        if (Math.abs(priceChange) <= 10) score += 30;
        else if (Math.abs(priceChange) <= 20) score += 20;
        else if (Math.abs(priceChange) <= 30) score += 10;

        return Math.min(100, score);
    }

    generateFallbackInsights(gem) {
        const insights = [];
        
        // Volume to Market Cap Analysis
        const volumeToMcap = (gem.volume24h || 0) / (gem.marketCap || 1);
        if (volumeToMcap > 1) {
            insights.push(`Strong trading activity with ${volumeToMcap.toFixed(1)}x daily volume vs market cap`);
        } else if (volumeToMcap > 0.5) {
            insights.push(`Healthy trading volume at ${(volumeToMcap * 100).toFixed(1)}% of market cap`);
        }

        // Price Movement Analysis
        if (gem.priceChange24h > 15) {
            insights.push(`Significant upward momentum with ${gem.priceChange24h.toFixed(1)}% gain`);
        } else if (gem.priceChange24h < -15) {
            insights.push(`Potential dip buying opportunity at ${gem.priceChange24h.toFixed(1)}% below recent price`);
        } else if (Math.abs(gem.priceChange24h) < 5) {
            insights.push(`Price consolidation phase with stable ${gem.priceChange24h.toFixed(1)}% movement`);
        }

        return insights.slice(0, 2);
    }

    getChainName(chainId) {
        const chainMap = {
            'ethereum': 'ETH',
            'bsc': 'BSC',
            'polygon': 'MATIC',
            'arbitrum': 'ARB',
            'optimism': 'OP',
            'fantom': 'FTM',
            'avalanche': 'AVAX'
        };
        return chainMap[chainId] || chainId.toUpperCase();
    }

    getDexName(dexId) {
        if (!dexId) return 'Unknown DEX';
        return dexId
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
