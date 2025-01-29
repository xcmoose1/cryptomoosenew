export class BinanceHandler {
    constructor() {
        this.baseUrl = 'https://api.binance.com/api/v3';  // Use Binance API directly
        console.log('[BinanceHandler] Initialized with base URL:', this.baseUrl);
    }

    async makeRequest(endpoint, params = {}) {
        try {
            // Build URL with query parameters
            const queryParams = new URLSearchParams(params).toString();
            const url = `${this.baseUrl}${endpoint}?${queryParams}`;
            console.log('[BinanceHandler] Making request to:', url);
            console.log('[BinanceHandler] Request parameters:', params);

            const startTime = Date.now();
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            const endTime = Date.now();
            console.log(`[BinanceHandler] Request took ${endTime - startTime}ms`);
            
            if (!response.ok) {
                console.error('[BinanceHandler] HTTP error:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: url
                });
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('[BinanceHandler] Response metadata:', {
                dataType: typeof data,
                isArray: Array.isArray(data),
                length: Array.isArray(data) ? data.length : 'N/A',
                sample: Array.isArray(data) ? data.slice(0, 2) : data
            });
            return data;
        } catch (error) {
            console.error('[BinanceHandler] API request failed:', error);
            console.error('[BinanceHandler] Error stack:', error.stack);
            console.error('[BinanceHandler] Request details:', {
                endpoint,
                params,
                url: `${this.baseUrl}${endpoint}?${new URLSearchParams(params).toString()}`
            });
            throw error;
        }
    }

    async getKlines(symbol, interval, limit = 500) {
        try {
            const params = {
                symbol: symbol,
                interval: interval,
                limit: limit
            };

            const data = await this.makeRequest('/klines', params);
            
            // Validate klines data
            if (!Array.isArray(data)) {
                throw new Error('Invalid klines data format');
            }

            // Log first candle for debugging
            if (data.length > 0) {
                console.log('[BinanceHandler] First candle:', {
                    openTime: new Date(data[0][0]),
                    open: data[0][1],
                    high: data[0][2],
                    low: data[0][3],
                    close: data[0][4],
                    volume: data[0][5],
                    closeTime: new Date(data[0][6]),
                    quoteVolume: data[0][7],
                    trades: data[0][8],
                    takerBuyBaseVol: data[0][9],
                    takerBuyQuoteVol: data[0][10]
                });
            }

            return data;
        } catch (error) {
            console.error('[BinanceHandler] Error fetching klines:', error);
            throw error;
        }
    }

    timeframeToInterval(timeframe) {
        const mapping = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1h',
            '4h': '4h',
            '1d': '1d',
            '1w': '1w',
            '1M': '1M'
        };
        const interval = mapping[timeframe] || '1h';
        console.log('[BinanceHandler] Mapped timeframe:', {
            input: timeframe,
            output: interval,
            availableTimeframes: Object.keys(mapping)
        });
        return interval;
    }

    async getKlinesOld(symbol, timeframe, limit = 500) {
        try {
            console.log('[BinanceHandler] Getting klines:', {
                symbol,
                timeframe,
                limit,
                timestamp: new Date().toISOString()
            });

            const interval = this.timeframeToInterval(timeframe);
            const params = {
                symbol: symbol.toUpperCase(),
                interval: interval,
                limit: limit
            };

            console.log('[BinanceHandler] Requesting klines with params:', params);
            const response = await this.makeRequest('/klines', params);
            
            if (!Array.isArray(response)) {
                console.error('[BinanceHandler] Invalid response format:', {
                    type: typeof response,
                    value: response
                });
                throw new Error('Invalid response format: expected array');
            }

            // Validate kline data structure
            if (response.length > 0) {
                const firstKline = response[0];
                const lastKline = response[response.length - 1];
                
                // Check kline structure
                if (!Array.isArray(firstKline) || firstKline.length < 6) {
                    console.error('[BinanceHandler] Invalid kline format:', {
                        expected: ['timestamp', 'open', 'high', 'low', 'close', 'volume', '...'],
                        received: firstKline
                    });
                    throw new Error('Invalid kline data structure');
                }

                console.log('[BinanceHandler] Klines data summary:', {
                    total: response.length,
                    timeRange: {
                        start: new Date(firstKline[0]).toISOString(),
                        end: new Date(lastKline[0]).toISOString()
                    },
                    firstKline: {
                        time: new Date(firstKline[0]).toISOString(),
                        open: firstKline[1],
                        high: firstKline[2],
                        low: firstKline[3],
                        close: firstKline[4],
                        volume: firstKline[5]
                    },
                    lastKline: {
                        time: new Date(lastKline[0]).toISOString(),
                        open: lastKline[1],
                        high: lastKline[2],
                        low: lastKline[3],
                        close: lastKline[4],
                        volume: lastKline[5]
                    }
                });
            } else {
                console.warn('[BinanceHandler] No klines data received for:', {
                    symbol,
                    interval,
                    limit
                });
            }

            return response;
        } catch (error) {
            console.error('[BinanceHandler] Failed to fetch klines:', error);
            console.error('[BinanceHandler] Error stack:', error.stack);
            console.error('[BinanceHandler] Request context:', {
                symbol,
                timeframe,
                limit,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
}

// Create a singleton instance
export const binanceHandler = new BinanceHandler();
