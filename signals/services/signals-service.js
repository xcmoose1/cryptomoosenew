import { SIGNALS_CONFIG } from '../config/signals-config.js';
import { RSI, MACD, EMA, SMA } from 'technicalindicators';
import { createTelegramService } from './telegram-service.js';
import pako from 'pako';

export class SignalsService {
    constructor() {
        this.ws = null;
        this.clients = new Set();
        this.candleHistory = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.isInitialized = false;
        this.lastStatusUpdate = Date.now();
        this.statusUpdateInterval = 5 * 60 * 1000; // 5 minutes
        this.processedCandles = 0;
        this.indicators = new Map();
        this.lastSignals = new Map();
        this.telegramService = null;
    }

    async initialize() {
        try {
            await this.setupWebSocket();
            console.log('SignalsService initialized successfully');
        } catch (error) {
            console.error('Error initializing SignalsService:', error);
            throw error;
        }
    }

    async initializeService() {
        try {
            // Initialize TelegramService
            this.telegramService = createTelegramService();
            
            // Start status updates
            this.startStatusUpdates();
            
            console.log('\n🔄 Initializing SignalsService...');
            console.log('📊 Preloading historical data for all pairs...');

            // Calculate required candle history size
            const requiredHistory = Math.max(
                SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD * 3,
                SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD * 3,
                SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD * 3
            );

            // Fetch historical data for all pairs
            const historyPromises = SIGNALS_CONFIG.TRADING_PAIRS.map(async (pair) => {
                try {
                    console.log(`📈 Fetching historical data for ${pair}...`);
                    const candles = await this.fetchHistoricalData(pair, requiredHistory);
                    if (candles && candles.length > 0) {
                        console.log(`✅ Loaded ${candles.length} historical candles for ${pair}`);
                        // Initialize indicators for this pair
                        await this.initializeIndicators(pair);
                    } else {
                        console.error(`❌ Failed to load historical data for ${pair}`);
                    }
                } catch (error) {
                    console.error(`❌ Error loading historical data for ${pair}:`, error);
                }
            });

            // Wait for all historical data to be loaded
            await Promise.all(historyPromises);
            console.log('✅ Historical data loaded for all pairs');

            this.isInitialized = true;
            console.log('\n🚀 SignalsService initialized successfully\n');
            
            // Send initial status update
            this.printSystemStatus();
            
            return true;
        } catch (error) {
            console.error('Error initializing services:', error);
            return false;
        }
    }

    formatSymbol(symbol) {
        // Convert BTC/USDT to btcusdt format for HTX API
        // Also handle special cases for HTX
        const formatted = symbol.replace('/', '').toLowerCase();
        
        // Special cases mapping for HTX
        const specialCases = {
            'manausdt': 'sandusdt',  // MANA is listed as SAND on HTX
            'oneusdtt': 'oneusdt'    // Fix ONE symbol
        };

        return specialCases[formatted] || formatted;
    }

    deformatSymbol(symbol) {
        // Convert btcusdt to BTC/USDT format for internal use
        const base = symbol.slice(0, -4).toUpperCase();
        const quote = symbol.slice(-4).toUpperCase();
        return `${base}/${quote}`;
    }

    async fetchHistoricalData(symbol, limit = 500) {
        try {
            console.log(`\n📊 Fetching ${limit} historical candles for ${symbol}...`);
            
            // Ensure we don't exceed API limits
            const maxLimit = Math.min(limit, 1000); // HTX API limit
            
            const response = await fetch(`${SIGNALS_CONFIG.API_BASE_URL}/market/history/kline?symbol=${symbol.toLowerCase()}&period=1min&size=${maxLimit}`);
            const data = await response.json();
            
            if (data['status'] === 'ok' && Array.isArray(data.data)) {
                // Sort candles from oldest to newest
                const candles = data.data.reverse().map(candle => ({
                    time: candle.id * 1000, // Convert to milliseconds
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.vol
                }));

                // Store in history
                this.candleHistory.set(symbol, candles);
                
                console.log(`✅ Fetched ${candles.length} historical candles for ${symbol}`);
                return candles;
            } else {
                console.error(`❌ Failed to fetch historical data for ${symbol}:`, data['err-msg'] || 'Unknown error');
                return null;
            }
        } catch (error) {
            console.error(`❌ Error fetching historical data for ${symbol}:`, error);
            return null;
        }
    }

    async initializeIndicators(symbol) {
        try {
            console.log(`\n📊 Initializing indicators for ${symbol}...`);
            
            if (!this.candleHistory.has(symbol)) {
                console.log(`No candle history for ${symbol}, fetching...`);
                await this.fetchHistoricalData(symbol, Math.max(
                    SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD * 2,
                    SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD * 2,
                    SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD * 2
                ));
            }

            const history = this.candleHistory.get(symbol);
            if (!history || history.length === 0) {
                throw new Error(`No historical data available for ${symbol}`);
            }

            // Extract close prices and volumes
            const closes = history.map(candle => parseFloat(candle.close));
            const volumes = history.map(candle => parseFloat(candle.volume));

            // Calculate initial SMA for EMA
            const smaFast = SMA.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.EMA.FAST_PERIOD,
                values: closes
            });

            const smaSlow = SMA.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD,
                values: closes
            });

            // Calculate EMAs using SMA as initial value
            const emaFast = EMA.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.EMA.FAST_PERIOD,
                values: closes,
                initValue: smaFast[0]
            });

            const emaSlow = EMA.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD,
                values: closes,
                initValue: smaSlow[0]
            });

            // Calculate RSI
            const rsi = RSI.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD,
                values: closes
            });

            // Calculate Volume MA
            const volumeMA = SMA.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD,
                values: volumes
            });

            // Store indicators
            this.indicators.set(symbol, {
                emaFast,
                emaSlow,
                rsi,
                volumeMA,
                lastUpdate: Date.now()
            });

            console.log(`✅ Indicators initialized for ${symbol}`);
            return true;
        } catch (error) {
            console.error(`Error initializing indicators for ${symbol}:`, error);
            return false;
        }
    }

    async updateCandleHistory(symbol, candle) {
        try {
            if (!this.candleHistory.has(symbol)) {
                this.candleHistory.set(symbol, []);
            }

            const history = this.candleHistory.get(symbol);
            
            // Add new candle
            history.push(candle);

            // Keep only the most recent candles
            const maxCandles = Math.max(
                SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD * 3,
                SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD * 3,
                SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD * 3
            );

            if (history.length > maxCandles) {
                this.candleHistory.set(symbol, history.slice(-maxCandles));
            }

            return true;
        } catch (error) {
            console.error(`Error updating candle history for ${symbol}:`, error);
            return false;
        }
    }

    async processCandle(symbol, candle) {
        try {
            // Initialize indicators if needed
            if (!this.indicators.has(symbol)) {
                await this.initializeIndicators(symbol);
                return;
            }

            // Update candle history
            await this.updateCandleHistory(symbol, candle);

            const ind = this.indicators.get(symbol);
            if (!ind) {
                console.error(`No indicators available for ${symbol}`);
                return;
            }

            // Get history for calculations
            const history = this.candleHistory.get(symbol);
            if (!history || history.length < SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD) {
                console.log(`Waiting for more historical data for ${symbol}`);
                return;
            }

            // Get recent closes for calculations
            const closes = history.map(candle => parseFloat(candle.close));
            const volumes = history.map(candle => parseFloat(candle.volume));

            // Calculate EMAs
            const fastPeriod = SIGNALS_CONFIG.ANALYSIS.EMA.FAST_PERIOD;
            const slowPeriod = SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD;

            // Calculate new EMAs
            const newEmaFast = EMA.calculate({
                period: fastPeriod,
                values: [...closes, parseFloat(candle.close)]
            });
            ind.emaFast = newEmaFast;

            const newEmaSlow = EMA.calculate({
                period: slowPeriod,
                values: [...closes, parseFloat(candle.close)]
            });
            ind.emaSlow = newEmaSlow;

            // Update RSI
            const newRSI = RSI.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD,
                values: [...closes, parseFloat(candle.close)]
            });
            ind.rsi = newRSI;

            // Update Volume MA
            const newVolumeMA = SMA.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD,
                values: [...volumes, parseFloat(candle.volume)]
            });
            ind.volumeMA = newVolumeMA;

            // Update last update time
            ind.lastUpdate = Date.now();

            // Check for signals
            await this.checkForSignals(symbol, candle);
        } catch (error) {
            console.error('Error processing candle:', error);
        }
    }

    async checkForSignals(symbol, candle) {
        try {
            // Initialize indicators if needed
            if (!this.indicators.has(symbol)) {
                await this.initializeIndicators(symbol);
                return; // Wait for next candle after initialization
            }

            const ind = this.indicators.get(symbol);
            if (!ind) {
                console.error(`No indicators available for ${symbol}`);
                return;
            }

            // Get current indicator values
            const rsi = ind.rsi[ind.rsi.length - 1];
            const emaFast = ind.emaFast[ind.emaFast.length - 1];
            const emaSlow = ind.emaSlow[ind.emaSlow.length - 1];
            const volumeMA = ind.volumeMA[ind.volumeMA.length - 1];

            // Skip if we don't have all required values
            if (typeof rsi !== 'number' || typeof emaFast !== 'number' || 
                typeof emaSlow !== 'number' || typeof volumeMA !== 'number') {
                console.log(`Still waiting for indicators to be ready for ${symbol}`);
                console.log('Current values:', { rsi, emaFast, emaSlow, volumeMA });
                return;
            }

            // Calculate volume ratio
            const currentVolume = parseFloat(candle.volume);
            const volumeRatio = currentVolume / volumeMA;

            // Determine trend
            const trend = emaFast > emaSlow ? 'bullish' : 'bearish';

            // Check for buy signal
            if (trend === 'bullish' && rsi < 30 && volumeRatio > 1.5) {
                const signal = {
                    type: 'BUY',
                    symbol,
                    price: parseFloat(candle.close),
                    time: new Date(candle.time).toISOString(),
                    trend,
                    rsi,
                    emaFast,
                    emaSlow,
                    volumeMA,
                    volumeRatio,
                    action: 'BUY',
                    reason: '💹 Buy signal triggered:\n• Bullish trend (Fast EMA > Slow EMA)\n• Oversold (RSI < 30)\n• High volume (>1.5x average)'
                };
                await this.sendSignal(signal);
            }
            // Check for sell signal
            else if (trend === 'bearish' && rsi > 70 && volumeRatio > 1.5) {
                const signal = {
                    type: 'SELL',
                    symbol,
                    price: parseFloat(candle.close),
                    time: new Date(candle.time).toISOString(),
                    trend,
                    rsi,
                    emaFast,
                    emaSlow,
                    volumeMA,
                    volumeRatio,
                    action: 'SELL',
                    reason: '📉 Sell signal triggered:\n• Bearish trend (Fast EMA < Slow EMA)\n• Overbought (RSI > 70)\n• High volume (>1.5x average)'
                };
                await this.sendSignal(signal);
            }
        } catch (error) {
            console.error('Error checking for signals:', error);
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

    async setupIndicators() {
        try {
            SIGNALS_CONFIG.TRADING_PAIRS.forEach(pair => {
                const history = this.candleHistory.get(pair);
                if (!history || history.length === 0) {
                    console.log(`No historical data available for ${pair}, skipping indicator initialization`);
                    return;
                }

                const closes = history.map(c => parseFloat(c.close));
                const volumes = history.map(c => parseFloat(c.volume));

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
            this.ws.close();
            this.ws = null;
        }

        console.log('Setting up new WebSocket connection...');
        const { WebSocket } = await import('ws');
        this.ws = new WebSocket(SIGNALS_CONFIG.WS_URL);

        // Wait for connection to be established
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 10000); // 10 second timeout

            this.ws.on('open', () => {
                console.log('WebSocket connected to HTX');
                this.isInitialized = true;
                this.reconnectAttempts = 0;
                clearTimeout(timeout);
                resolve();
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket connection error:', error);
                clearTimeout(timeout);
                reject(error);
            });
        });

        // Set up message handler
        this.ws.on('message', async (data) => {
            try {
                await this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
            }
        });

        this.ws.on('close', () => {
            console.log('WebSocket connection closed');
            this.isInitialized = false;
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => {
                    this.setupWebSocket();
                }, this.reconnectDelay);
            }
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        // Start subscribing to markets after successful connection
        console.log('Connection established, starting market subscriptions...');
        await this.subscribeToMarkets();
    }

    async subscribeToMarkets() {
        console.log('Starting market subscriptions...');
        const BATCH_SIZE = 5; // Process 5 pairs at a time
        const BATCH_DELAY = 2000; // 2 seconds between batches
        const SUBSCRIPTION_DELAY = 1000; // 1 second between individual subscriptions

        // Split trading pairs into batches
        const pairs = [...SIGNALS_CONFIG.TRADING_PAIRS];
        const batches = [];
        while (pairs.length > 0) {
            batches.push(pairs.splice(0, BATCH_SIZE));
        }

        console.log(`Split ${SIGNALS_CONFIG.TRADING_PAIRS.length} pairs into ${batches.length} batches`);

        // Process each batch with delay
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`Processing batch ${batchIndex + 1}/${batches.length}`);

            // Process each pair in the batch
            for (const pair of batch) {
                try {
                    const formattedSymbol = this.formatSymbol(pair);
                    const subRequest = {
                        sub: `market.${formattedSymbol}.kline.1min`,
                        id: formattedSymbol
                    };
                    console.log(`Subscribing to ${formattedSymbol}...`);
                    this.ws.send(JSON.stringify(subRequest));
                    
                    // Delay between individual subscriptions
                    await new Promise(resolve => setTimeout(resolve, SUBSCRIPTION_DELAY));
                } catch (error) {
                    console.error(`Error subscribing to ${pair}:`, error);
                }
            }

            // Delay between batches (except for the last batch)
            if (batchIndex < batches.length - 1) {
                console.log(`Batch ${batchIndex + 1} complete. Waiting ${BATCH_DELAY}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }

        console.log('All market subscriptions completed');

        // Setup ping interval
        const pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ ping: Date.now() }));
            } else if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                clearInterval(pingInterval);
            }
        }, 20000);
    }

    async handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(pako.inflate(data, { to: 'string' }));
            
            // Handle rate limit errors
            if (message.status === 'error' && message['err-code'] === 'invalid-parameter') {
                if (message['err-msg'] === 'request limit') {
                    console.log('Rate limit hit, will retry subscription later...');
                    // Add to retry queue
                    if (message.id) {
                        setTimeout(() => {
                            const subRequest = {
                                sub: `market.${message.id}.kline.1min`,
                                id: message.id
                            };
                            console.log(`Retrying subscription to ${message.id}...`);
                            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                                this.ws.send(JSON.stringify(subRequest));
                            }
                        }, 5000); // Wait 5 seconds before retrying
                    }
                    return;
                }
            }

            // Handle ping messages
            if (message.ping) {
                this.ws.send(JSON.stringify({ pong: message.ping }));
                return;
            }

            // Process market data
            if (message.ch && message.tick) {
                const symbol = this.deformatSymbol(message.ch.split('.')[1]);
                const candle = {
                    time: message.tick.id * 1000, // Convert to milliseconds
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
                    await this.processCandle(symbol, candle);
                }
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            if (error.message.includes('pako')) {
                console.error('Data decompression error. Raw data:', data);
            }
        }
    }

    async sendSignal(signal) {
        try {
            // Format the signal message
            const message = this.formatSignalMessage(signal);
            
            // Send to Telegram if service is available
            if (this.telegramService) {
                await this.telegramService.sendMessage(message);
            } else {
                console.log('Telegram service not available, printing signal locally:');
                console.log(message);
            }

            // Broadcast to WebSocket clients
            this.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'signal',
                        data: signal
                    }));
                }
            });

            // Store the signal
            if (!this.lastSignals.has(signal.symbol)) {
                this.lastSignals.set(signal.symbol, []);
            }
            const signals = this.lastSignals.get(signal.symbol);
            signals.push({
                ...signal,
                timestamp: Date.now()
            });

            // Keep only last 10 signals per symbol
            if (signals.length > 10) {
                signals.shift();
            }

            console.log(`✅ Signal sent for ${signal.symbol}`);
        } catch (error) {
            console.error('Error sending signal:', error);
        }
    }

    handleWebSocketConnection(ws) {
        console.log('Client connected to WebSocket');
        this.clients.add(ws);
        
        ws.on('close', () => {
            console.log('Client disconnected from WebSocket');
            this.clients.delete(ws);
        });

        // Send connection message
        ws.send(JSON.stringify({
            type: 'system',
            data: {
                message: '🔌 Connected to signal service',
                timestamp: Date.now(),
                status: 'connected'
            }
        }));
    }

    formatSignalMessage(signal) {
        try {
            if (!signal || typeof signal !== 'object') {
                throw new Error('Invalid signal object');
            }

            const {
                symbol = 'Unknown',
                price = 0,
                trend = 'unknown',
                rsi = 0,
                emaFast = 0,
                emaSlow = 0,
                volumeMA = 0,
                volumeRatio = 0,
                type = 'Unknown',
                action = 'Unknown',
                reason = 'No reason provided'
            } = signal;

            // Calculate targets and stop loss
            const stopLoss = type === 'BUY' ? price * 0.99 : price * 1.01;
            const target1 = type === 'BUY' ? price * 1.005 : price * 0.995;
            const target2 = type === 'BUY' ? price * 1.01 : price * 0.99;
            const target3 = type === 'BUY' ? price * 1.02 : price * 0.98;

            // Calculate risk/reward ratio
            const risk = Math.abs(price - stopLoss);
            const reward = Math.abs(target2 - price);
            const riskRewardRatio = (reward / risk).toFixed(2);

            // Determine market trend and MACD trend
            const marketTrend = trend === 'bullish' ? '📈 BULLISH' : '📉 BEARISH';
            const macdTrend = emaFast > emaSlow ? 'Bullish' : 'Bearish';
            const emaStatus = emaFast > emaSlow ? 'Above' : 'Below';
            const smaStatus = price > volumeMA ? 'Above' : 'Below';

            return `
🟢 SIGNAL ALERT: ${type} ${symbol}

💰 Entry Zone: ${price.toFixed(4)} - ${(price * 1.002).toFixed(4)}
🛑 Stop Loss: ${stopLoss.toFixed(4)}

🎯 Targets:
1️⃣ ${target1.toFixed(4)}
2️⃣ ${target2.toFixed(4)}
3️⃣ ${target3.toFixed(4)}

📊 Risk/Reward Ratio: 1:${riskRewardRatio}

📈 Market Analysis:
• Trend: ${marketTrend}
• RSI: ${rsi.toFixed(2)}
• Volume Ratio: ${volumeRatio.toFixed(2)}x

⚡️ Technical Indicators:
• MACD: ${macdTrend}
• EMA: Price ${emaStatus} EMA
• SMA: Price ${smaStatus} SMA

🔄 Trade on HTX:
${SIGNALS_CONFIG.REFERRAL_LINK}
• Up to 20% fee discount
• $5000 sign-up bonus
• Zero maker fees

#${symbol.replace('/', '')} #CryptoSignals #TradingSignals`;
        } catch (error) {
            console.error('Error formatting signal message:', error);
            return 'Error formatting signal message';
        }
    }
}

export const signalsService = new SignalsService();
