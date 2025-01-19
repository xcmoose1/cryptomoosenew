export const COINGECKO_CONFIG = {
    BASE_URL: 'https://api.coingecko.com/api/v3',
    ENDPOINTS: {
        COINS_MARKETS: '/coins/markets',
        GLOBAL: '/global'
    },
    VS_CURRENCY: 'usd',
    UPDATE_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours
    CACHE_DURATION: 6 * 60 * 60 * 1000,  // 6 hours cache
    RETRIES: 3,
    RETRY_DELAY: 1000
};
