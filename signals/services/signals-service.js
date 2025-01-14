import { SIGNALS_CONFIG } from '../config/signals-config.js';
import { RSI, MACD, EMA, SMA } from 'technicalindicators';
import WebSocket from 'ws';
import { createTelegramService } from './telegram-service.js';
import pako from 'pako';

export class SignalsService {
    constructor() {
        this.ws = null;
        this.signals = new Map();
        this.subscriptions = new Map();
        this.lastSignals = new Map();
        this.indicators = new Map();
        this.telegramBot = null;  
        this.candleHistory = new Map(); 
    }

    async initialize() {
        try {
            this.telegramBot = createTelegramService();
            
            await this.connectWebSocket();
            await this.setupIndicators();
            this.startMonitoring();
        } catch (error) {
            console.error('Failed to initialize SignalsService:', error);
            throw error;
        }
    }

    startMonitoring() {
        SIGNALS_CONFIG.TRADING_PAIRS.forEach(pair => {
            this.subscriptions.set(pair, {
                lastCheck: Date.now(),
                indicators: new Map()
            });
            
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                // Convert pair format (e.g., 'BTC/USDT' to 'btcusdt')
                const formattedPair = pair.replace('/', '').toLowerCase();
                const subscribeMsg = {
                    sub: `market.${formattedPair}.kline.1min`,
                    id: `${formattedPair}-${Date.now()}`
                };
                this.ws.send(JSON.stringify(subscribeMsg));
                console.log(`Subscribed to ${formattedPair} klines`);
            }
        });

        console.log('Started monitoring for pairs:', SIGNALS_CONFIG.TRADING_PAIRS);
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(SIGNALS_CONFIG.WS_URL);

            this.ws.on('open', () => {
                console.log('WebSocket connected to HTX');
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    // HTX sends gzipped data
                    const text = pako.inflate(data, { to: 'string' });
                    const message = JSON.parse(text);

                    // Handle ping messages
                    if (message.ping) {
                        this.ws.send(JSON.stringify({
                            pong: message.ping
                        }));
                        return;
                    }

                    this.handleWebSocketMessage(message);
                } catch (err) {
                    console.error('Failed to process message:', err);
                }
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('WebSocket connection closed');
                setTimeout(() => this.connectWebSocket(), 5000); // Reconnect after 5 seconds
            });
        });
    }

    handleWebSocketMessage(message) {
        try {
            // Handle ping messages from HTX
            if (message.ping) {
                this.ws.send(JSON.stringify({ pong: message.ping }));
                return;
            }

            if (message.ch && message.tick) {
                const [_, symbol, __, period] = message.ch.split('.');
                const tick = message.tick;
                
                if (tick) { 
                    this.updateCandleHistory(symbol.toUpperCase(), {
                        time: tick.id * 1000,
                        open: parseFloat(tick.open),
                        high: parseFloat(tick.high),
                        low: parseFloat(tick.low),
                        close: parseFloat(tick.close),
                        volume: parseFloat(tick.vol),
                        closeTime: (tick.id + 60) * 1000,
                        isFinal: true
                    });
                    
                    this.processSignals(symbol.toUpperCase());
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            console.log('Raw message:', message);
        }
    }

    async setupIndicators() {
        SIGNALS_CONFIG.TRADING_PAIRS.forEach(pair => {
            this.indicators.set(pair, {
                rsi: new RSI({ period: 14, values: [] }),
                macd: new MACD({
                    fastPeriod: 12,
                    slowPeriod: 26,
                    signalPeriod: 9,
                    SimpleMAOscillator: false,
                    SimpleMASignal: false,
                    values: []
                }),
                emaFast: new EMA({ period: 9, values: [] }),
                emaSlow: new EMA({ period: 21, values: [] }),
                volumeMA: new SMA({ period: 20, values: [] })
            });
        });
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
        
        // Calculate indicators
        const rsi = indicators.rsi.nextValue(closes[closes.length - 1]);
        const emaFast = indicators.emaFast.nextValue(closes[closes.length - 1]);
        const emaSlow = indicators.emaSlow.nextValue(closes[closes.length - 1]);
        const volumeMA = indicators.volumeMA.nextValue(volumes[volumes.length - 1]);
        
        // Get previous values for crossover detection
        const prevEmaFast = indicators.emaFast.result[indicators.emaFast.result.length - 2];
        const prevEmaSlow = indicators.emaSlow.result[indicators.emaSlow.result.length - 2];
        
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
            
            await this.telegramBot.sendMessage(message);
            console.log(`Signal sent for ${signal.symbol}: ${signal.type}`);
        } catch (error) {
            console.error('Error sending signal:', error);
        }
    }
}

export const signalsService = new SignalsService();
