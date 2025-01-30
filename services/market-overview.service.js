// Market Overview Service
class MarketOverviewService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes default cache
    }

    async fetchWithCache(url, options = {}) {
        const cacheKey = url;
        const cachedData = this.cache.get(cacheKey);
        
        if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
            return cachedData.data;
        }

        try {
            const response = await fetch(url, options);
            const text = await response.text();
            
            if (!response.ok) {
                throw new Error(`API error (${response.status}): ${text}`);
            }
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error(`Invalid JSON response: ${text}`);
            }

            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    // Add new methods here for your preferred market data source
}

export const marketOverviewService = new MarketOverviewService();
