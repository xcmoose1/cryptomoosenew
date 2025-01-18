import { htxConfig } from '../config/daily-update.config.js';

export class HTXDailyService {
    constructor() {
        this.baseUrl = 'https://api.huobi.pro';  // Using public API endpoint
    }

    async getCurrentPrice(symbol) {
        try {
            // Special cases for certain symbols
            const symbolMap = {
                'HBAR': 'hbar',
                'TON': 'ton',
                'ALGO': 'algo',
                'GRT': 'grt',
                'CHZ': 'chz',
                'VET': 'vet',
                'MANA': 'mana',
                'ZIL': 'zil',
                'IOTA': 'iota',
                'GALA': 'gala',
                'ZRX': 'zrx',
                'ENJ': 'enj',
                'AUDIO': 'audio',
                'FLOW': 'flowusdt',
                'MASK': 'mask',
                'ANKR': 'ankr',
                'ARB': 'arb',
                'KAVA': 'kava',
                'ONE': 'one',
                'CFX': 'cfx',
                'SKL': 'skl',
                'SUI': 'sui',
                'UNI': 'uni',
                'BTC': 'btc',
                'DOT': 'dot',
                'ATOM': 'atom',
                'LINK': 'link',
                'SOL': 'sol',
                'XRP': 'xrp',
                'ADA': 'ada',
                'AVAX': 'avax',
                'DOGE': 'doge',
                'SHIB': 'shib',
                'TRX': 'trx',
                'LTC': 'ltc',
                'ETC': 'etc',
                'ETH': 'eth'
            };
            const formattedSymbol = symbolMap[symbol] || symbol.toLowerCase();
            // Using HTX's public market detail ticker endpoint
            const response = await fetch(`${this.baseUrl}/market/detail/merged?symbol=${formattedSymbol}usdt`);
            
            if (!response.ok) {
                throw new Error(`HTX API error: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'ok' && data.tick) {
                return data.tick.close;  // Current price
            } else {
                throw new Error('Invalid response format from HTX');
            }
        } catch (error) {
            console.error('Error fetching price from HTX:', error);
            throw error;
        }
    }
}
