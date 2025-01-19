export const COINGECKO_CONFIG = {
    BASE_URL: 'https://api.coingecko.com/api/v3',
    ENDPOINTS: {
        GLOBAL: '/global',
        COINS_MARKETS: '/coins/markets',
        SIMPLE_PRICE: '/simple/price'
    },
    TOP_CHAINS: ['bitcoin', 'ethereum', 'solana', 'binancecoin', 'avalanche-2', 'ripple', 'cardano', 'the-open-network'],
    UPDATE_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
    CACHE_DURATION: 24 * 60 * 60 * 1000,  // 24 hours cache
    RETRIES: 3,
    RETRY_DELAY: 1000,
    VS_CURRENCY: 'usd'
};

export const HTX_CONFIG = {
    BASE_URL: 'https://api.htx.com',
    ENDPOINTS: {
        KLINES: '/market/history/kline',
        DEPTH: '/market/depth',
        TRADES: '/market/history/trade',
        TICKER: '/market/detail/merged'
    },
    UPDATE_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
    CACHE_DURATION: 24 * 60 * 60 * 1000,  // 24 hours cache
    RETRIES: 3,
    RETRY_DELAY: 1000
};
