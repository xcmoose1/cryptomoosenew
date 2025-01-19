export const COINGECKO_CONFIG = {
    BASE_URL: 'https://api.coingecko.com/api/v3',
    ENDPOINTS: {
        COINS_MARKETS: '/coins/markets',
        GLOBAL: '/global'
    },
    VS_CURRENCY: 'usd',
    UPDATE_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
    CACHE_DURATION: 24 * 60 * 60 * 1000,  // 24 hours cache
    RETRIES: 3,
    RETRY_DELAY: 1000
};
