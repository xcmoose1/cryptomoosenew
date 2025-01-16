import { SIGNALS_CONFIG } from '../config/signals-config.js';
import { RSI, MACD, EMA, SMA } from 'technicalindicators';
import WebSocket from 'ws';
import { createTelegramService } from './telegram-service.js';
import pako from 'pako';

export class SignalsService {
    constructor() {
        this.ws = null;
        this.candleHistory = new Map();
        this.indicators = new Map();
        this.lastSignals = new Map();
        this.telegramService = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.isInitialized = false;
        this.lastStatusUpdate = Date.now();
        this.statusUpdateInterval = 5 * 60 * 1000; // 5 minutes
        this.processedCandles = 0;
    }

    formatSymbol(symbol) {
        // Convert BTC/USDT to btcusdt format for HTX API
        return symbol.replace('/', '').toLowerCase();
    }

    deformatSymbol(symbol) {
        // Convert btcusdt to BTC/USDT format for internal use
        const base = symbol.slice(0, -4).toUpperCase();
        const quote = symbol.slice(-4).toUpperCase();
        return `${base}/${quote}`;
    }

    async fetchHistoricalData(symbol, limit = 100) {
        try {
            const formattedSymbol = this.formatSymbol(symbol);
            const url = `${SIGNALS_CONFIG.REST_URL}/market/history/kline?symbol=${formattedSymbol}&period=1min&size=${limit}`;
            
            console.log(`Fetching historical data from: ${url}`);
            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok) {
                console.error(`HTTP error for ${symbol}:`, data);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            if (data.status === 'ok' && Array.isArray(data.data)) {
                // HTX returns data in reverse chronological order, so we reverse it
                const candles = data.data.reverse().map(k => ({
                    time: k.id * 1000, // Convert to milliseconds
                    open: k.open,
                    high: k.high,
                    low: k.low,
                    close: k.close,
                    volume: k.vol
                }));
                
                this.candleHistory.set(symbol, candles);
                console.log(`Loaded ${candles.length} historical candles for ${symbol}`);
                return candles;
            } else {
                console.error(`Invalid response data for ${symbol}:`, data);
                // Initialize with empty array but don't throw error to allow other pairs to continue
                this.candleHistory.set(symbol, []);
                return [];
            }
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error);
            // Initialize with empty array to allow other pairs to continue
            this.candleHistory.set(symbol, []);
            return [];
        }
    }

    async initialize() {
        try {
            console.log('\n=== Initializing SignalsService ===');
            this.telegramService = createTelegramService();
            
            // Start status updates
            this.startStatusUpdates();
            
            // Fetch historical data for all pairs
            console.log('\n📊 Fetching historical data for all pairs...');
            const historyPromises = SIGNALS_CONFIG.TRADING_PAIRS.map(pair => 
                this.fetchHistoricalData(pair, Math.max(
                    SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD * 2,
                    SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD * 2,
                    SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD * 2
                ))
            );
            
            await Promise.all(historyPromises);
            console.log('✅ Historical data fetched for all pairs');
            
            await this.setupIndicators();
            await this.setupWebSocket();
            this.isInitialized = true;
            console.log('\n🚀 SignalsService initialized successfully\n');
            
            // Send initial status update
            this.printSystemStatus();
        } catch (error) {
            console.error('❌ Failed to initialize SignalsService:', error);
            throw error;
        }
    }

    startStatusUpdates() {
        setInterval(() => {
            this.printSystemStatus();
        }, this.statusUpdateInterval);
    }

    printSystemStatus() {
        const now = new Date().toISOString();
        const uptime = Math.floor((Date.now() - this.lastStatusUpdate) / 1000);
        const activeSymbols = Array.from(this.indicators.keys());
        
        console.log('\n=== System Status Update ===');
        console.log(`🕒 Time: ${now}`);
        console.log(`⚡ System Status: ${this.isInitialized ? 'Active' : 'Initializing'}`);
        console.log(`📈 Monitoring: ${activeSymbols.length} pairs`);
        console.log(`🔄 Processed Candles: ${this.processedCandles}`);
        console.log(`⏱️ Uptime: ${uptime} seconds`);
        console.log(`\n🎯 Active Trading Pairs:`);
        activeSymbols.forEach(symbol => {
            const indicators = this.indicators.get(symbol);
            const lastSignal = this.lastSignals.get(symbol);
            console.log(`   ${symbol}: ${lastSignal ? `Last signal: ${lastSignal.type} @ ${new Date(lastSignal.time).toISOString()}` : 'No signals yet'}`);
        });
        console.log('\n=== End Status Update ===\n');
        
        this.lastStatusUpdate = Date.now();
    }

    isIndicatorReady(pair) {
        const indicators = this.indicators.get(pair);
        if (!indicators) return false;

        // Check if all indicators have valid values
        const lastRSI = indicators.rsi.getResult();
        const lastEMAFast = indicators.emaFast.getResult();
        const lastEMASlow = indicators.emaSlow.getResult();
        const lastVolumeMA = indicators.volumeMA.getResult();

        return (
            Array.isArray(lastRSI) && lastRSI.length > 0 &&
            Array.isArray(lastEMAFast) && lastEMAFast.length > 0 &&
            Array.isArray(lastEMASlow) && lastEMASlow.length > 0 &&
            Array.isArray(lastVolumeMA) && lastVolumeMA.length > 0
        );
    }

    async setupIndicators() {
        try {
            SIGNALS_CONFIG.TRADING_PAIRS.forEach(pair => {
                const history = this.candleHistory.get(pair);
                if (!history || history.length === 0) {
                    console.log(`No historical data available for ${pair}, skipping indicator initialization`);
                    return;
                }

                const closes = history.map(c => c.close);
                const volumes = history.map(c => c.volume);

                // Check if we have enough data points
                const requiredDataPoints = Math.max(
                    SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD,
                    SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD,
                    SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD
                );

                if (closes.length < requiredDataPoints) {
                    console.log(`Insufficient data points for ${pair}. Have ${closes.length}, need ${requiredDataPoints}`);
                    return;
                }

                // Initialize indicators with the complete historical data
                const indicators = {
                    rsi: new RSI({ 
                        period: SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD,
                        values: closes
                    }),
                    emaFast: new EMA({ 
                        period: SIGNALS_CONFIG.ANALYSIS.EMA.FAST_PERIOD,
                        values: closes
                    }),
                    emaSlow: new EMA({ 
                        period: SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD,
                        values: closes
                    }),
                    volumeMA: new SMA({ 
                        period: SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD,
                        values: volumes
                    })
                };

                // Store the initialized indicators
                this.indicators.set(pair, indicators);
                console.log(`Indicators successfully initialized for ${pair} with ${closes.length} data points`);
            });
        } catch (error) {
            console.error('Error setting up indicators:', error);
            throw error; // Propagate the error to handle it in the initialization
        }
    }

    async setupWebSocket() {
        if (this.ws) {
            console.log('Closing existing WebSocket connection...');
            this.ws.terminate();
            this.ws = null;
        }

        console.log('Setting up new WebSocket connection...');
        this.ws = new WebSocket(SIGNALS_CONFIG.WS_URL);

        this.ws.on('open', () => {
            console.log('WebSocket connected to HTX');
            this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            
            // Subscribe to each trading pair
            SIGNALS_CONFIG.TRADING_PAIRS.forEach(pair => {
                const formattedSymbol = this.formatSymbol(pair);
                const subRequest = {
                    sub: `market.${formattedSymbol}.kline.1min`,
                    id: formattedSymbol
                };
                console.log(`Subscribing to ${formattedSymbol}...`);
                this.ws.send(JSON.stringify(subRequest));
            });
        });

        this.ws.on('message', async (data) => {
            try {
                await this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
            }
        });

        this.ws.on('close', () => {
            console.log('WebSocket connection closed');
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Reconnect attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`);
                setTimeout(() => {
                    this.setupWebSocket();
                }, this.reconnectDelay * this.reconnectAttempts); // Exponential backoff
            } else {
                console.error('Max reconnection attempts reached');
            }
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        // Setup ping interval
        const pingInterval = setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ ping: Date.now() }));
            } else if (this.ws.readyState === WebSocket.CLOSED) {
                clearInterval(pingInterval);
            }
        }, 20000);
    }

    async handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(pako.inflate(data, { to: 'string' }));

            // Handle ping/pong
            if (message.ping) {
                this.ws.send(JSON.stringify({ pong: message.ping }));
                return;
            }

            if (message.ch && message.tick) {
                const symbol = this.deformatSymbol(message.ch.split('.')[1]);
                const candle = {
                    time: message.tick.id * 1000,
                    open: message.tick.open,
                    high: message.tick.high,
                    low: message.tick.low,
                    close: message.tick.close,
                    volume: message.tick.vol
                };

                this.updateCandleHistory(symbol, candle);
                this.processedCandles++;
                
                // Log processing status every 100 candles
                if (this.processedCandles % 100 === 0) {
                    console.log(`\n🔄 Processed ${this.processedCandles} candles. Actively monitoring market conditions...`);
                }

                if (this.isInitialized) {
                    await this.processSignals(symbol);
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            if (error.message.includes('pako')) {
                console.error('Data decompression error. Raw data:', data);
            }
        }
    }

    updateCandleHistory(symbol, candle) {
        if (!this.candleHistory.has(symbol)) {
            this.candleHistory.set(symbol, []);
        }
        
        const history = this.candleHistory.get(symbol);
        history.push(candle);
        
        // Keep last 100 candles for analysis
        if (history.length > 100) {
            history.shift();
        }
    }

    async processSignals(symbol) {
        try {
            if (!this.isIndicatorReady(symbol)) {
                console.log(`Waiting for previous EMA values for ${symbol}`);
                return;
            }

            const indicators = this.indicators.get(symbol);
            if (!indicators) {
                console.error(`No indicators found for ${symbol}`);
                return;
            }

            // Get the latest indicator values
            const rsi = indicators.rsi.getResult().slice(-1)[0];
            const emaFast = indicators.emaFast.getResult().slice(-1)[0];
            const emaSlow = indicators.emaSlow.getResult().slice(-1)[0];
            const volumeMA = indicators.volumeMA.getResult().slice(-1)[0];

            const history = this.candleHistory.get(symbol);
            const closes = history.map(c => c.close);
            const volumes = history.map(c => c.volume);

            // Calculate indicators
            indicators.rsi.nextValue(closes[closes.length - 1]);
            indicators.emaFast.nextValue(closes[closes.length - 1]);
            indicators.emaSlow.nextValue(closes[closes.length - 1]);
            indicators.volumeMA.nextValue(volumes[volumes.length - 1]);

            // Get previous values for crossover detection
            const prevEmaFast = indicators.emaFast.result[indicators.emaFast.result.length - 2];
            const prevEmaSlow = indicators.emaSlow.result[indicators.emaSlow.result.length - 2];
            
            // Skip if we don't have previous values yet
            if (!prevEmaFast || !prevEmaSlow) {
                console.log(`Waiting for previous EMA values for ${symbol}`);
                return;
            }
            
            // Current values
            const currentClose = closes[closes.length - 1];
            const currentVolume = volumes[volumes.length - 1];
            
            // Calculate volume ratio
            const volumeRatio = currentVolume / volumeMA;
            
            let signal = null;
            
            // BUY Signal Conditions
            if (
                prevEmaFast < prevEmaSlow && // Previous state
                emaFast > emaSlow && // Current crossover
                rsi < 70 && // Not overbought
                volumeRatio > 1.5 // Volume confirmation
            ) {
                signal = {
                    type: 'BUY',
                    symbol,
                    price: currentClose,
                    rsi,
                    emaFast,
                    emaSlow,
                    volumeRatio: volumeRatio.toFixed(2),
                    time: new Date().toISOString()
                };
            }
            // SELL Signal Conditions
            else if (
                prevEmaFast > prevEmaSlow && // Previous state
                emaFast < emaSlow && // Current crossover
                rsi > 30 && // Not oversold
                volumeRatio > 1.5 // Volume confirmation
            ) {
                signal = {
                    type: 'SELL',
                    symbol,
                    price: currentClose,
                    rsi,
                    emaFast,
                    emaSlow,
                    volumeRatio: volumeRatio.toFixed(2),
                    time: new Date().toISOString()
                };
            }

            if (signal) {
                const lastSignal = this.lastSignals.get(symbol);
                // Check 1-hour cooldown and maximum concurrent trades
                if (!lastSignal || Date.now() - lastSignal.time > 3600000) {
                    this.lastSignals.set(symbol, { 
                        type: signal.type, 
                        time: Date.now(),
                        price: currentClose
                    });
                    await this.sendSignal(signal);
                }
            }
        } catch (error) {
            console.error('Error processing signals:', error);
        }
    }

    async sendSignal(signal) {
        if (!this.telegramService) {
            console.error('Telegram service not initialized');
            return;
        }

        try {
            const message = `${signal.type === 'BUY' ? '🟢' : '🔴'} ${signal.type} Signal for ${signal.symbol}\n\n` +
                          `💰 Price: ${signal.price}\n` +
                          `📊 RSI: ${signal.rsi.toFixed(2)}\n` +
                          `📈 EMA Crossover:\n` +
                          `   Fast(9): ${signal.emaFast.toFixed(2)}\n` +
                          `   Slow(21): ${signal.emaSlow.toFixed(2)}\n` +
                          `📊 Volume: ${signal.volumeRatio}x average\n` +
                          `⏰ Time: ${signal.time}\n\n` +
                          `#${signal.symbol.replace('/', '')} #${signal.type} #Crypto`;
            
            await this.telegramService.sendMessage(message);
            console.log(`\n🎯 Signal sent for ${signal.symbol}: ${signal.type}`);
            console.log(`   Price: ${signal.price}`);
            console.log(`   RSI: ${signal.rsi.toFixed(2)}`);
            console.log(`   EMAs: ${signal.emaFast.toFixed(2)} / ${signal.emaSlow.toFixed(2)}`);
            console.log(`   Volume: ${signal.volumeRatio}x average\n`);
        } catch (error) {
            console.error('Error sending signal:', error);
        }
    }
}

export const signalsService = new SignalsService();
