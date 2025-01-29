export const HTX_CONFIG = {
    BASE_URL: 'https://api.htx.com',
    WS_URL: 'wss://api.htx.com/ws',
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
