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
    }

    formatSymbol(symbol) {
        // Remove slash for WebSocket subscription
        return symbol.replace('/', '').toLowerCase();
    }

    deformatSymbol(symbol) {
        // Add slash back for indicator tracking
        const base = symbol.slice(0, -4).toUpperCase();
        const quote = symbol.slice(-4).toUpperCase();
        return `${base}/${quote}`;
    }

    async initialize() {
        try {
            console.log('Initializing SignalsService...');
            this.telegramService = createTelegramService();
            await this.setupIndicators();
            await this.setupWebSocket();
            this.isInitialized = true;
            console.log('SignalsService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SignalsService:', error);
            throw error;
        }
    }

    async setupIndicators() {
        try {
            SIGNALS_CONFIG.TRADING_PAIRS.forEach(pair => {
                // Initialize with empty arrays first
                const indicators = {
                    rsi: new RSI({ period: 14, values: [] }),
                    emaFast: new EMA({ period: 9, values: [] }),
                    emaSlow: new EMA({ period: 21, values: [] }),
                    volumeMA: new SMA({ period: 20, values: [] })
                };
                
                // Get existing history if available
                const history = this.candleHistory.get(pair);
                if (history && history.length > 0) {
                    const closes = history.map(c => c.close);
                    const volumes = history.map(c => c.volume);
                    
                    // Pre-calculate indicators with existing data
                    closes.forEach(price => {
                        indicators.rsi.nextValue(price);
                        indicators.emaFast.nextValue(price);
                        indicators.emaSlow.nextValue(price);
                    });
                    
                    volumes.forEach(vol => {
                        indicators.volumeMA.nextValue(vol);
                    });
                }
                
                this.indicators.set(pair, indicators);
                console.log(`Indicators initialized for ${pair}`);
            });
        } catch (error) {
            console.error('Error setting up indicators:', error);
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
        const history = this.candleHistory.get(symbol);
        if (!history || history.length < 30) return;

        const closes = history.map(c => c.close);
        const volumes = history.map(c => c.volume);
        
        const indicators = this.indicators.get(symbol);
        if (!indicators) {
            console.log(`Initializing indicators for ${symbol}`);
            await this.setupIndicators();
            return;
        }

        // Calculate indicators
        const rsi = indicators.rsi.nextValue(closes[closes.length - 1]);
        const emaFast = indicators.emaFast.nextValue(closes[closes.length - 1]);
        const emaSlow = indicators.emaSlow.nextValue(closes[closes.length - 1]);
        const volumeMA = indicators.volumeMA.nextValue(volumes[volumes.length - 1]);
        
        // Skip if any indicator returns undefined (not enough data yet)
        if (!rsi || !emaFast || !emaSlow || !volumeMA) {
            console.log(`Waiting for enough data for ${symbol}`);
            return;
        }
        
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
            console.log(`Signal sent for ${signal.symbol}: ${signal.type}`);
        } catch (error) {
            console.error('Error sending signal:', error);
            // Don't throw the error to prevent breaking the signal processing loop
        }
    }
}

export const signalsService = new SignalsService();
