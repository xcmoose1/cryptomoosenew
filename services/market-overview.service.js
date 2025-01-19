import { COINGECKO_CONFIG } from '../config/market-overview.config.js';

class MarketOverviewService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = COINGECKO_CONFIG.CACHE_DURATION;
        this.lastRequestTime = 0;
        this.requestDelay = 1100; // 1.1 seconds between requests to avoid rate limits
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async makeRequest(url, retries = 3) {
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

                if (response.status === 429) {
                    console.log('Rate limit hit, waiting before retry...');
                    await this.sleep(2000 * attempt); // Exponential backoff
                    continue;
                }

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`CoinGecko API error (${response.status}): ${text}`);
                }

                const data = await response.json();
                return data;
            } catch (error) {
                console.error(`Request attempt ${attempt} failed:`, error);
                if (attempt === retries) throw error;
                await this.sleep(1000 * attempt); // Exponential backoff
            }
        }
    }

    async getGlobalData() {
        try {
            console.log('Fetching global market data...');
            const cachedData = this.cache.get('global');
            if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
                console.log('Returning cached global data');
                return cachedData.data;
            }

            const url = `${COINGECKO_CONFIG.BASE_URL}${COINGECKO_CONFIG.ENDPOINTS.GLOBAL}?include_24hr_vol=true&include_24hr_change=true`;
            console.log('Fetching from CoinGecko:', url);
            
            const data = await this.makeRequest(url);
            console.log('Global data fetched successfully:', JSON.stringify(data, null, 2));
            this.updateCache('global', data);
            return data;
        } catch (error) {
            console.error('Error fetching global data:', error);
            throw error;
        }
    }

    async getTopChainsVolume() {
        try {
            console.log('Fetching top chains volume...');
            const cachedData = this.cache.get('chains_volume');
            if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
                console.log('Returning cached chains volume data');
                return cachedData.data;
            }

            const params = new URLSearchParams({
                vs_currency: COINGECKO_CONFIG.VS_CURRENCY,
                ids: COINGECKO_CONFIG.TOP_CHAINS.join(','),
                order: 'volume_desc',
                per_page: 10,
                page: 1,
                sparkline: false,
                price_change_percentage: '24h',
                interval: '24h'
            });

            const url = `${COINGECKO_CONFIG.BASE_URL}${COINGECKO_CONFIG.ENDPOINTS.COINS_MARKETS}?${params}`;
            console.log('Fetching from CoinGecko:', url);
            
            const data = await this.makeRequest(url);
            console.log('Chain volume data fetched successfully:', JSON.stringify(data, null, 2));
            
            const volumeData = data.map(coin => {
                // Map CoinGecko IDs to display names
                const displayNames = {
                    'bitcoin': 'BTC',
                    'ethereum': 'ETH',
                    'solana': 'SOL',
                    'binancecoin': 'BNB',
                    'avalanche-2': 'AVAX',
                    'ripple': 'XRP',
                    'cardano': 'ADA',
                    'the-open-network': 'TON'
                };

                return {
                    id: coin.id,
                    symbol: displayNames[coin.id] || coin.symbol.toUpperCase(),
                    volume: coin.total_volume || 0,
                    volume_change_24h: coin.price_change_percentage_24h || 0,
                    market_cap: coin.market_cap || 0
                };
            }).sort((a, b) => b.volume - a.volume); // Sort by volume

            this.updateCache('chains_volume', volumeData);
            return volumeData;
        } catch (error) {
            console.error('Error fetching chains volume:', error);
            throw error;
        }
    }

    async getMarketMetrics() {
        try {
            console.log('Fetching market metrics...');
            const [globalData, volumeData] = await Promise.all([
                this.getGlobalData(),
                this.getTopChainsVolume()
            ]);

            if (!globalData?.data?.total_volume?.usd) {
                console.error('Invalid global data structure:', globalData);
                throw new Error('Invalid response from CoinGecko global endpoint');
            }

            const totalVolume = volumeData.reduce((acc, curr) => acc + (curr.volume || 0), 0);
            
            const metrics = {
                market_cap_change_24h: globalData.data.market_cap_change_percentage_24h_usd || 0,
                total_volume_24h: globalData.data.total_volume.usd || 0,
                btc_dominance: globalData.data.market_cap_percentage.btc || 0,
                total_market_cap: globalData.data.total_market_cap.usd || 0,
                chains_volume: volumeData.map(chain => ({
                    ...chain,
                    volume_percentage: totalVolume > 0 ? (chain.volume / totalVolume) * 100 : 0
                }))
            };

            console.log('Market metrics compiled successfully:', JSON.stringify(metrics, null, 2));
            return metrics;
        } catch (error) {
            console.error('Error fetching market metrics:', error);
            throw error;
        }
    }

    updateCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}

// Export singleton instance
export const marketOverviewService = new MarketOverviewService();
