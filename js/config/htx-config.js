// HTX Configuration
// @ts-check

// Configuration object for HTX API
export const HTX_CONFIG = {
    // Base URLs
    WS_URL: 'wss://api.huobi.pro/ws',
    REST_URL: 'https://api.huobi.pro',
    
    // Market data configuration
    MARKET_CONFIG: {
        DEFAULT_SYMBOL: 'btcusdt',
        DEFAULT_INTERVAL: '1min',
        SUPPORTED_INTERVALS: ['1min', '5min', '15min', '30min', '60min', '4hour', '1day'],
        MAX_KLINES: 2000,
        UPDATE_INTERVAL: 1000,
        RETRY_DELAY: 2000,
        MAX_RETRIES: 3,
        ENDPOINT_SWITCH_DELAY: 5000
    },
    
    // WebSocket channels
    CHANNELS: {
        KLINE: (symbol, period) => `market.${symbol}.kline.${period}`,
        TRADE: symbol => `market.${symbol}.trade.detail`,
        DEPTH: symbol => `market.${symbol}.depth.step0`,
        DETAIL: symbol => `market.${symbol}.detail`
    },
    
    // REST API endpoints
    ENDPOINTS: {
        MARKET: {
            KLINE: '/market/history/kline',
            DETAIL: '/market/detail',
            TICKERS: '/market/tickers',
            DEPTH: '/market/depth',
            TRADE: '/market/history/trade'
        }
    },
    
    // API rate limits
    RATE_LIMITS: {
        REQUESTS_PER_SECOND: 10,
        ORDERS_PER_SECOND: 5,
        WEIGHT_PER_MINUTE: 1200
    },
    
    // Market pairs
    DEFAULT_PAIRS: ['btcusdt', 'ethusdt', 'xrpusdt'],
    
    // Timeframes mapping from display to API values
    TIMEFRAMES: {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1h': '60min',
        '4h': '4hour',
        '1d': '1day'
    },
    
    // Default values
    DEFAULTS: {
        PAIR: 'btcusdt',
        TIMEFRAME: '1min'
    },
    
    VERSION: 'v1',
    RETRY_DELAY: 1000,  // 1 second
    MAX_RETRIES: 3,
    TIMEOUT: 10000,
};

export const HTX_INTERVALS = {
    ONE_MINUTE: '1min',
    THREE_MINUTES: '3min',
    FIVE_MINUTES: '5min',
    FIFTEEN_MINUTES: '15min',
    THIRTY_MINUTES: '30min',
    ONE_HOUR: '60min',
    TWO_HOURS: '120min',
    FOUR_HOURS: '4hour',
    SIX_HOURS: '6hour',
    TWELVE_HOURS: '12hour',
    ONE_DAY: '1day',
    ONE_WEEK: '1week',
    ONE_MONTH: '1mon'
};

// Format functions
export function formatSymbol(symbol) {
    return symbol.toLowerCase();
}

export function formatKlineData(data) {
    if (!data || !Array.isArray(data)) {
        return [];
    }
    
    return data.map(kline => ({
        time: kline.id * 1000,
        open: parseFloat(kline.open),
        high: parseFloat(kline.high),
        low: parseFloat(kline.low),
        close: parseFloat(kline.close),
        volume: parseFloat(kline.vol)
    }));
}

export class HTXHandler {
    constructor() {
        this.baseUrl = 'https://api.huobi.pro';
        this.apiKey = '';
        this.apiSecret = '';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async init() {
        try {
            // Initialize any required resources
            console.log('HTX Handler initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize HTX Handler:', error);
            throw error;
        }
    }

    async makeRequest(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseUrl);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        console.log('Making request to:', url.toString());

        try {
            console.log('Fetching data...');
            const response = await fetch(url);
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Raw API response:', data);
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getKlines(symbol, period, size = 500) {
        try {
            console.log('Getting klines for:', { symbol, period, size });
            const params = {
                symbol: symbol,
                period: period,
                size: size
            };
            console.log('Request params:', params);
            
            const endpoint = '/market/history/kline';
            console.log('Using endpoint:', endpoint);
            const response = await this.makeRequest(endpoint, params);
            console.log('API Response:', response);
            
            if (response && response.status === 'ok' && Array.isArray(response.data)) {
                // Sort data by timestamp ascending
                const sortedData = response.data.sort((a, b) => a.id - b.id);
                const formattedData = sortedData.map(item => ({
                    date: new Date(item.id * 1000), // Convert timestamp to Date
                    open: parseFloat(item.open),
                    high: parseFloat(item.high),
                    low: parseFloat(item.low),
                    close: parseFloat(item.close),
                    volume: parseFloat(item.vol || item.amount || 0)
                }));
                console.log('First data point:', formattedData[0]);
                console.log('Last data point:', formattedData[formattedData.length - 1]);
                return formattedData;
            } else {
                console.error('Invalid response structure:', response);
                throw new Error('Invalid kline data received');
            }
        } catch (error) {
            console.error('Failed to fetch klines:', error);
            throw error;
        }
    }

    formatSymbol(symbol) {
        return symbol.toLowerCase();
    }

    timeframeToPeriod(timeframe) {
        const mapping = {
            '1h': '60min',
            '4h': '4hour',
            '1d': '1day'
        };
        const period = mapping[timeframe];
        console.log('Mapped timeframe', timeframe, 'to period:', period);
        return period || '60min';
    }
}

// Create singleton instance
export const htxHandler = new HTXHandler();
