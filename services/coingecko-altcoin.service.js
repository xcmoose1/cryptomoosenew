// @ts-check
import { COINGECKO_CONFIG } from '../config/altcoin-analysis.config.js';

/**
 * Service for fetching altcoin-specific data from CoinGecko
 */
class CoinGeckoAltcoinService {
    constructor() {
        this.baseUrl = COINGECKO_CONFIG.BASE_URL;
        this.cache = new Map();
        this.cacheTimeout = COINGECKO_CONFIG.CACHE_DURATION;
        this.lastRequestTime = 0;
        this.requestDelay = COINGECKO_CONFIG.RETRY_DELAY;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async makeRequest(url, retries = COINGECKO_CONFIG.RETRIES) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Ensure we don't exceed rate limits
                const now = Date.now();
                const timeSinceLastRequest = now - this.lastRequestTime;
                if (timeSinceLastRequest < this.requestDelay) {
                    await this.sleep(this.requestDelay - timeSinceLastRequest);
                }

                console.log(`Making request to ${url} (attempt ${attempt}/${retries})`);
                const response = await fetch(url);
                this.lastRequestTime = Date.now();

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                return data;
            } catch (error) {
                console.error(`Request failed (attempt ${attempt}/${retries}):`, error);
                if (attempt === retries) throw error;
                await this.sleep(this.requestDelay * attempt); // Exponential backoff
            }
        }
    }

    /**
     * Get cached data or fetch new data
     */
    async getCachedData(key, fetchFn) {
        const now = Date.now();
        const cached = this.cache.get(key);
        
        if (cached && now - cached.timestamp < this.cacheTimeout) {
            console.log(`Returning cached data for ${key}`);
            return cached.data;
        }

        console.log(`Fetching fresh data for ${key}`);
        const data = await fetchFn();
        this.cache.set(key, { data, timestamp: now });
        return data;
    }

    /**
     * Fetch market data for all altcoins (excluding Bitcoin)
     */
    async getAltcoinMarketData() {
        const params = new URLSearchParams({
            vs_currency: COINGECKO_CONFIG.VS_CURRENCY,
            order: 'market_cap_desc',
            per_page: '250',
            sparkline: 'false',
            price_change_percentage: '24h,7d'
        });

        const url = `${this.baseUrl}${COINGECKO_CONFIG.ENDPOINTS.COINS_MARKETS}?${params}`;
        const data = await this.getCachedData('altcoin_market', () => this.makeRequest(url));
        // Filter out Bitcoin
        return data.filter(coin => coin.id !== 'bitcoin');
    }

    /**
     * Get altcoin market dominance
     */
    async getAltcoinDominance() {
        const url = `${this.baseUrl}${COINGECKO_CONFIG.ENDPOINTS.GLOBAL}`;
        const data = await this.getCachedData('altcoin_dominance', () => this.makeRequest(url));
        // Calculate total altcoin dominance (100% - BTC dominance)
        return 100 - data.data.market_cap_percentage.btc;
    }

    /**
     * Calculate altcoin fear and greed index based on market metrics
     */
    async calculateAltcoinFearGreed() {
        const marketData = await this.getAltcoinMarketData();
        
        // Calculate volatility score (based on price changes)
        const volatilityScore = marketData.reduce((acc, coin) => {
            const volatility = Math.abs(coin.price_change_percentage_24h || 0);
            return acc + (volatility > 10 ? 0 : volatility > 5 ? 50 : 100);
        }, 0) / marketData.length;

        // Calculate market momentum (based on 24h changes)
        const momentumScore = marketData.reduce((acc, coin) => {
            const change = coin.price_change_percentage_24h || 0;
            return acc + (change < -10 ? 0 : change > 10 ? 100 : 50 + (change * 5));
        }, 0) / marketData.length;

        // Calculate volume score
        const volumeScore = marketData.reduce((acc, coin) => {
            const volumeMarketRatio = (coin.total_volume || 0) / (coin.market_cap || 1);
            return acc + (volumeMarketRatio > 0.5 ? 100 : volumeMarketRatio * 200);
        }, 0) / marketData.length;

        // Weighted average of all metrics
        const fearGreedIndex = Math.round(
            (volatilityScore * 0.4) + 
            (momentumScore * 0.4) + 
            (volumeScore * 0.2)
        );

        return {
            value: fearGreedIndex,
            label: fearGreedIndex < 20 ? 'Extreme Fear' :
                   fearGreedIndex < 40 ? 'Fear' :
                   fearGreedIndex < 60 ? 'Neutral' :
                   fearGreedIndex < 80 ? 'Greed' : 'Extreme Greed'
        };
    }

    /**
     * Get market trends for different market cap segments
     */
    async getMarketTrends() {
        const marketData = await this.getAltcoinMarketData();
        
        // Helper to calculate trend metrics for a segment
        const calculateSegmentMetrics = (coins) => {
            const avg24h = coins.reduce((sum, coin) => sum + (coin.price_change_percentage_24h || 0), 0) / coins.length;
            const avg7d = coins.reduce((sum, coin) => sum + (coin.price_change_percentage_7d_in_currency || 0), 0) / coins.length;
            
            return {
                trend: avg24h > 5 ? 'Strong Bullish' :
                       avg24h > 2 ? 'Bullish' :
                       avg24h < -5 ? 'Strong Bearish' :
                       avg24h < -2 ? 'Bearish' : 'Neutral',
                change24h: avg24h.toFixed(2),
                change7d: avg7d.toFixed(2)
            };
        };

        // Split into market cap segments
        const largeCap = marketData.slice(0, 20);
        const midCap = marketData.slice(20, 100);
        const smallCap = marketData.slice(100, 250);

        return {
            largeCap: calculateSegmentMetrics(largeCap),
            midCap: calculateSegmentMetrics(midCap),
            smallCap: calculateSegmentMetrics(smallCap)
        };
    }

    /**
     * Get market volatility score
     */
    async getMarketVolatility() {
        const marketData = await this.getAltcoinMarketData();
        
        // Calculate average 24h high-low volatility of top 100 coins
        const volatility = marketData.slice(0, 100).reduce((sum, coin) => {
            const highLowDiff = ((coin.high_24h || 0) - (coin.low_24h || 0)) / (coin.low_24h || 1) * 100;
            return sum + highLowDiff;
        }, 0) / 100;

        return {
            value: volatility.toFixed(2),
            label: volatility > 15 ? 'Very High' :
                   volatility > 10 ? 'High' :
                   volatility > 5 ? 'Moderate' :
                   volatility > 2 ? 'Low' : 'Very Low'
        };
    }
}

// Export singleton instance
export const coingeckoAltcoinService = new CoinGeckoAltcoinService();
