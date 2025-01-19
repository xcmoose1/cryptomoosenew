// @ts-check
import { SECTOR_CONFIG } from '../config/sector-analysis.config.js';

/**
 * Service for fetching sector-specific data from CoinGecko
 */
class CoinGeckoSectorService {
    constructor() {
        this.baseUrl = SECTOR_CONFIG.BASE_URL;
        this.cache = new Map();
        this.cacheTimeout = SECTOR_CONFIG.CACHE_DURATION;
        this.lastRequestTime = 0;
        this.requestDelay = SECTOR_CONFIG.RETRY_DELAY;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async makeRequest(url, retries = SECTOR_CONFIG.RETRIES) {
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
     * Get all coins in a specific sector
     */
    async getSectorCoins(sectorId) {
        const sector = SECTOR_CONFIG.SECTOR_MAPPING[sectorId];
        if (!sector) throw new Error(`Invalid sector: ${sectorId}`);

        // Try primary category first
        try {
            const params = new URLSearchParams({
                vs_currency: SECTOR_CONFIG.VS_CURRENCY,
                category: sector.id,
                order: 'market_cap_desc',
                per_page: '50',
                sparkline: 'false',
                price_change_percentage: '24h,7d'
            });

            const url = `${this.baseUrl}${SECTOR_CONFIG.ENDPOINTS.CATEGORY}?${params}`;
            const data = await this.getCachedData(`sector_${sectorId}`, () => this.makeRequest(url));
            
            if (data && data.length > 0) {
                return data;
            }

            // If primary category returns no data and we have includes, try those
            if (sector.includes && sector.includes.length > 0) {
                for (const includeCategory of sector.includes) {
                    params.set('category', includeCategory);
                    const includeUrl = `${this.baseUrl}${SECTOR_CONFIG.ENDPOINTS.CATEGORY}?${params}`;
                    const includeData = await this.makeRequest(includeUrl);
                    if (includeData && includeData.length > 0) {
                        this.cache.set(`sector_${sectorId}`, { data: includeData, timestamp: Date.now() });
                        return includeData;
                    }
                }
            }

            // If still no data, try coin list with symbol matching
            if (sector.symbols) {
                const coinsParams = new URLSearchParams({
                    vs_currency: SECTOR_CONFIG.VS_CURRENCY,
                    order: 'market_cap_desc',
                    per_page: '250',
                    sparkline: 'false',
                    price_change_percentage: '24h,7d'
                });

                const coinsUrl = `${this.baseUrl}${SECTOR_CONFIG.ENDPOINTS.COINS_MARKETS}?${coinsParams}`;
                const allCoins = await this.makeRequest(coinsUrl);
                
                const filteredCoins = allCoins.filter(coin => 
                    sector.symbols.some(symbol => 
                        coin.symbol.toLowerCase() === symbol.toLowerCase() ||
                        coin.id.toLowerCase() === symbol.toLowerCase()
                    )
                );

                if (filteredCoins.length > 0) {
                    this.cache.set(`sector_${sectorId}`, { data: filteredCoins, timestamp: Date.now() });
                    return filteredCoins;
                }
            }

            // If we get here, we couldn't find any data
            throw new Error(`No data found for sector: ${sectorId}`);
        } catch (error) {
            console.error(`Error fetching sector coins for ${sectorId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate sector metrics
     */
    async getSectorMetrics(sectorId) {
        const coins = await this.getSectorCoins(sectorId);
        
        const marketCap = coins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
        const volume = coins.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
        
        // Calculate weighted average change
        const totalWeight = coins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
        const weightedChange = coins.reduce((sum, coin) => {
            const weight = coin.market_cap / totalWeight;
            return sum + (coin.price_change_percentage_24h * weight);
        }, 0);

        return {
            marketCap,
            volume,
            change24h: weightedChange,
            numCoins: coins.length,
            topCoins: coins.slice(0, 10)
        };
    }

    /**
     * Get sector correlation data
     */
    async getSectorCorrelation(sectorId) {
        const coins = await this.getSectorCoins(sectorId);
        const changes = coins.map(coin => coin.price_change_percentage_24h);
        
        // Calculate standard deviation
        const mean = changes.reduce((sum, change) => sum + change, 0) / changes.length;
        const variance = changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;
        const stdDev = Math.sqrt(variance);

        return {
            mean,
            stdDev,
            correlation: stdDev / Math.abs(mean) // Higher means more dispersed/less correlated
        };
    }

    /**
     * Generate sector insights
     */
    async generateSectorInsights(sectorId) {
        const [metrics, correlation] = await Promise.all([
            this.getSectorMetrics(sectorId),
            this.getSectorCorrelation(sectorId)
        ]);

        const sector = SECTOR_CONFIG.SECTOR_MAPPING[sectorId];
        let insights = {
            trends: '',
            structure: '',
            opportunities: ''
        };

        // Market Trends
        if (metrics.change24h > 5) {
            insights.trends = `${sector.name} sector showing strong bullish momentum with ${metrics.change24h.toFixed(2)}% gain.`;
        } else if (metrics.change24h < -5) {
            insights.trends = `${sector.name} sector experiencing bearish pressure with ${metrics.change24h.toFixed(2)}% decline.`;
        } else {
            insights.trends = `${sector.name} sector consolidating with ${metrics.change24h.toFixed(2)}% change.`;
        }

        // Market Structure
        if (correlation.correlation > 1.5) {
            insights.structure = 'High dispersion in returns suggests individual project evaluation is crucial.';
        } else if (correlation.correlation < 0.5) {
            insights.structure = 'Strong correlation indicates sector-wide momentum.';
        } else {
            insights.structure = 'Moderate correlation suggests balanced market conditions.';
        }

        // Opportunities
        const topPerformers = metrics.topCoins
            .filter(coin => coin.price_change_percentage_24h > 0)
            .slice(0, 3);
        
        if (topPerformers.length > 0) {
            insights.opportunities = `Leading projects: ${topPerformers.map(coin => coin.symbol.toUpperCase()).join(', ')}`;
        } else {
            insights.opportunities = 'No clear leaders in current market conditions.';
        }

        return insights;
    }
}

// Create and export singleton instance
export const coingeckoSectorService = new CoinGeckoSectorService();
