import { HTX_CONFIG as htxConfig } from '../config/market-overview.config.js';

export class HTXDailyService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
        this.ws = null;
        this.subscriptions = new Map();
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            await this.initWebSocket();
            this.initialized = true;
            console.log('HTX Daily Service initialized');
        } catch (error) {
            console.error('Failed to initialize HTX Daily Service:', error);
            throw error;
        }
    }

    async initWebSocket() {
        return new Promise((resolve, reject) => {
            console.log('Connecting to HTX WebSocket...');
            this.ws = new WebSocket(htxConfig.WS_URL);
            
            this.ws.onopen = () => {
                console.log('HTX WebSocket connected');
                resolve();
            };
            
            this.ws.onerror = (error) => {
                console.error('HTX WebSocket error:', error);
                reject(error);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.ch && this.subscriptions.has(data.ch)) {
                        const symbol = data.ch.split('.')[1].toUpperCase();
                        if (data.tick && typeof data.tick.close === 'number') {
                            this.updateCache(symbol, data.tick.close);
                        }
                    }
                } catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('HTX WebSocket closed, attempting to reconnect...');
                this.initialized = false;
                setTimeout(() => this.init(), htxConfig.MARKET_CONFIG.RETRY_DELAY);
            };
        });
    }

    async getCurrentPrice(symbol) {
        try {
            // Ensure service is initialized
            if (!this.initialized) {
                await this.init();
            }

            // Check cache first
            const cachedData = this.cache.get(symbol);
            if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
                return cachedData.price;
            }

            const formattedSymbol = this.getFormattedSymbol(symbol);
            
            // Use REST API for immediate price
            const response = await fetch(`${htxConfig.REST_URL}/market/detail/merged?symbol=${formattedSymbol}`);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'ok' && data.tick && typeof data.tick.close === 'number') {
                // Update cache
                this.updateCache(symbol, data.tick.close);
                
                // Subscribe to real-time updates if not already subscribed
                if (!this.subscriptions.has(formattedSymbol)) {
                    this.subscribeToSymbol(formattedSymbol);
                }
                
                return data.tick.close;
            } else {
                throw new Error('Invalid response format from API');
            }
        } catch (error) {
            console.error('Error in getCurrentPrice:', error);
            throw new Error(`Failed to fetch price for ${symbol}: ${error.message}`);
        }
    }

    subscribeToSymbol(symbol) {
        const channel = htxConfig.CHANNELS.DETAIL(symbol);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const sub = { sub: channel, id: Date.now() };
            this.ws.send(JSON.stringify(sub));
            this.subscriptions.set(channel, true);
            console.log(`Subscribed to ${symbol} updates`);
        }
    }

    updateCache(symbol, price) {
        this.cache.set(symbol, {
            price,
            timestamp: Date.now()
        });
    }

    getFormattedSymbol(symbol) {
        const symbolMap = {
            'HBAR': 'hbar', 'TON': 'ton', 'ALGO': 'algo',
            'GRT': 'grt', 'CHZ': 'chz', 'VET': 'vet',
            'MANA': 'mana', 'ZIL': 'zil', 'IOTA': 'iota',
            'GALA': 'gala', 'ZRX': 'zrx', 'ENJ': 'enj',
            'AUDIO': 'audio', 'FLOW': 'flowusdt', 'MASK': 'mask',
            'ANKR': 'ankr', 'ARB': 'arb', 'KAVA': 'kava',
            'ONE': 'one', 'CFX': 'cfx', 'SKL': 'skl',
            'SUI': 'sui', 'UNI': 'uni', 'BTC': 'btc',
            'DOT': 'dot', 'ATOM': 'atom', 'LINK': 'link',
            'SOL': 'sol', 'XRP': 'xrp', 'ADA': 'ada',
            'AVAX': 'avax', 'DOGE': 'doge', 'SHIB': 'shib',
            'TRX': 'trx', 'LTC': 'ltc', 'ETC': 'etc',
            'ETH': 'eth'
        };
        const lowercaseSymbol = symbolMap[symbol] || symbol.toLowerCase();
        return lowercaseSymbol + (lowercaseSymbol.endsWith('usdt') ? '' : 'usdt');
    }
}
