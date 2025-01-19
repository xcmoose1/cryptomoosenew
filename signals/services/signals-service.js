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
            this.isInitialized = true;
            console.log('\n🚀 SignalsService initialized successfully\n');
            
            // Send initial status update
            this.printSystemStatus();
        } catch (error) {
            console.error('Error initializing services:', error);
            throw error;
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

    async fetchHistoricalData(symbol, limit = 100) {
        try {
            const formattedSymbol = this.formatSymbol(symbol);
            const url = `${SIGNALS_CONFIG.REST_URL}/market/history/kline?symbol=${formattedSymbol}&period=1min&size=${limit}`;
            
            console.log(`Fetching historical data for ${symbol}...`);
            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'ok' && data.data) {
                // HTX returns data in reverse chronological order, so we need to reverse it
                const candles = data.data.reverse().map(candle => ({
                    time: candle.id * 1000,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                    volume: candle.vol
                }));

                // Initialize or update candle history
                if (!this.candleHistory.has(formattedSymbol)) {
                    this.candleHistory.set(formattedSymbol, []);
                }
                const history = this.candleHistory.get(formattedSymbol);
                history.push(...candles);

                // Keep only the most recent candles
                const maxCandles = Math.max(
                    SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD * 3,
                    SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD * 3,
                    SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD * 3
                );
                if (history.length > maxCandles) {
                    history.splice(0, history.length - maxCandles);
                }

                console.log(`✅ Loaded ${candles.length} historical candles for ${symbol}`);
                
                // Initialize indicators for this symbol
                await this.initializeIndicators(formattedSymbol);
            } else {
                console.error(`Failed to fetch historical data for ${symbol}:`, data);
            }
        } catch (error) {
            console.error(`Error fetching historical data for ${symbol}:`, error);
        }
    }

    async initializeIndicators(symbol) {
        try {
            if (!this.indicators.has(symbol)) {
                this.indicators.set(symbol, {
                    emaFast: [],
                    emaSlow: [],
                    rsi: [],
                    volumeMA: []
                });
            }

            const candles = this.candleHistory.get(symbol);
            if (!candles || candles.length === 0) {
                console.log(`No historical data available for ${symbol}`);
                return false;
            }

            const ind = this.indicators.get(symbol);
            const closes = candles.map(c => parseFloat(c.close));
            const volumes = candles.map(c => parseFloat(c.volume));

            // Calculate initial EMAs
            const fastPeriod = SIGNALS_CONFIG.ANALYSIS.EMA.FAST_PERIOD;
            const slowPeriod = SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD;
            
            // Calculate EMAs using SMA for the first value
            const fastSMA = closes.slice(0, fastPeriod).reduce((a, b) => a + b) / fastPeriod;
            const slowSMA = closes.slice(0, slowPeriod).reduce((a, b) => a + b) / slowPeriod;
            
            ind.emaFast = [fastSMA];
            ind.emaSlow = [slowSMA];

            // Calculate subsequent EMA values
            const fastAlpha = 2 / (fastPeriod + 1);
            const slowAlpha = 2 / (slowPeriod + 1);

            for (let i = fastPeriod; i < closes.length; i++) {
                const prevFastEMA = ind.emaFast[ind.emaFast.length - 1];
                const newFastEMA = (closes[i] - prevFastEMA) * fastAlpha + prevFastEMA;
                ind.emaFast.push(newFastEMA);
            }

            for (let i = slowPeriod; i < closes.length; i++) {
                const prevSlowEMA = ind.emaSlow[ind.emaSlow.length - 1];
                const newSlowEMA = (closes[i] - prevSlowEMA) * slowAlpha + prevSlowEMA;
                ind.emaSlow.push(newSlowEMA);
            }

            // Calculate RSI
            ind.rsi = RSI.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD,
                values: closes
            });

            // Calculate Volume MA
            ind.volumeMA = SMA.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD,
                values: volumes
            });

            console.log(`✅ Initialized indicators for ${symbol} with ${ind.emaFast.length} EMA values`);
            return true;
        } catch (error) {
            console.error(`Error initializing indicators for ${symbol}:`, error);
            return false;
        }
    }

    isIndicatorReady(symbol) {
        const ind = this.indicators.get(symbol);
        if (!ind) return false;

        const minLength = Math.max(
            SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD,
            SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD,
            SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD
        );

        return ind.emaFast.length >= minLength &&
               ind.emaSlow.length >= minLength &&
               ind.rsi.length >= SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD &&
               ind.volumeMA.length >= SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD;
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
            // First update candle history
            const historyUpdated = await this.updateCandleHistory(symbol, candle);
            if (!historyUpdated) {
                console.error(`Failed to update candle history for ${symbol}`);
                return;
            }

            if (!this.indicators.has(symbol)) {
                const initialized = await this.initializeIndicators(symbol);
                if (!initialized) {
                    console.log(`Failed to initialize indicators for ${symbol}`);
                    return;
                }
            }

            if (!this.isIndicatorReady(symbol)) {
                await this.initializeIndicators(symbol);
                if (!this.isIndicatorReady(symbol)) {
                    console.log(`Still waiting for indicators to be ready for ${symbol}`);
                    return;
                }
            }

            const ind = this.indicators.get(symbol);
            const history = this.candleHistory.get(symbol);
            
            // Get the last n+1 closes for EMA calculation
            const closes = history.slice(-Math.max(
                SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD,
                SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD
            ) - 1).map(c => parseFloat(c.close));
            
            // Add current candle
            closes.push(parseFloat(candle.close));

            // Update EMAs
            const fastAlpha = 2 / (SIGNALS_CONFIG.ANALYSIS.EMA.FAST_PERIOD + 1);
            const slowAlpha = 2 / (SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD + 1);

            if (ind.emaFast.length > 0) {
                const prevFastEMA = ind.emaFast[ind.emaFast.length - 1];
                const newFastEMA = (parseFloat(candle.close) - prevFastEMA) * fastAlpha + prevFastEMA;
                ind.emaFast.push(newFastEMA);
            }

            if (ind.emaSlow.length > 0) {
                const prevSlowEMA = ind.emaSlow[ind.emaSlow.length - 1];
                const newSlowEMA = (parseFloat(candle.close) - prevSlowEMA) * slowAlpha + prevSlowEMA;
                ind.emaSlow.push(newSlowEMA);
            }

            // Update RSI using the full history needed for calculation
            const rsiValues = RSI.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD,
                values: closes
            });
            ind.rsi = rsiValues;

            // Update Volume MA
            const volumes = history.slice(-SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD).map(c => parseFloat(c.volume));
            volumes.push(parseFloat(candle.volume));
            
            const volumeMAValues = SMA.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD,
                values: volumes
            });
            ind.volumeMA = volumeMAValues;

            // Keep arrays at a reasonable size
            const maxSize = Math.max(
                SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD * 2,
                SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD * 2,
                SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD * 2
            );

            ind.emaFast = ind.emaFast.slice(-maxSize);
            ind.emaSlow = ind.emaSlow.slice(-maxSize);
            ind.rsi = ind.rsi.slice(-maxSize);
            ind.volumeMA = ind.volumeMA.slice(-maxSize);

            this.processedCandles++;
            if (this.processedCandles % 100 === 0) {
                console.log(`🔄 Processed ${this.processedCandles} candles. Actively monitoring market conditions...`);
            }

            // Check for signals
            await this.checkForSignals(symbol, candle);
        } catch (error) {
            console.error(`Error processing candle for ${symbol}:`, error);
            console.error(error.stack);
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

    async checkForSignals(symbol, candle) {
        try {
            if (!this.indicators.has(symbol)) {
                await this.initializeIndicators(symbol);
            }

            const ind = this.indicators.get(symbol);
            if (!ind) {
                console.error(`No indicators available for ${symbol}`);
                return;
            }

            // Get the latest indicator values
            const rsi = ind.rsi[ind.rsi.length - 1];
            const emaFast = ind.emaFast[ind.emaFast.length - 1];
            const emaSlow = ind.emaSlow[ind.emaSlow.length - 1];
            const volumeMA = ind.volumeMA[ind.volumeMA.length - 1];

            const history = this.candleHistory.get(symbol);
            const closes = history.map(c => parseFloat(c.close));
            const volumes = history.map(c => parseFloat(c.volume));

            // Calculate indicators
            const newRSI = RSI.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD,
                values: closes
            });
            ind.rsi.push(newRSI[newRSI.length - 1]);

            const newVolumeMA = SMA.calculate({
                period: SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD,
                values: volumes
            });
            ind.volumeMA.push(newVolumeMA[newVolumeMA.length - 1]);

            // Get previous values for crossover detection
            const prevEmaFast = ind.emaFast[ind.emaFast.length - 2];
            const prevEmaSlow = ind.emaSlow[ind.emaSlow.length - 2];
            
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
            console.error('Error checking for signals:', error);
        }
    }

    async sendSignal(signal) {
        console.log('\n=== SIGNAL BROADCAST STARTED ===');
        console.log('Signal to broadcast:', {
            type: signal.type,
            symbol: signal.symbol,
            price: signal.price,
            timestamp: new Date().toISOString()
        });

        // Calculate prices
        const entryPrice = signal.price;
        const stopLossPrice = signal.type === 'BUY' 
            ? entryPrice * 0.99  // 1% below entry for buy
            : entryPrice * 1.01; // 1% above entry for sell
        
        // Calculate targets (these are examples)
        const target1 = signal.type === 'BUY' ? entryPrice * 1.005 : entryPrice * 0.995;
        const target2 = signal.type === 'BUY' ? entryPrice * 1.01 : entryPrice * 0.99;
        const target3 = signal.type === 'BUY' ? entryPrice * 1.02 : entryPrice * 0.98;

        // Determine market trend based on RSI
        const marketTrend = signal.rsi > 60 ? 'BULLISH' : signal.rsi < 40 ? 'BEARISH' : 'NEUTRAL';

        // Format confidence level based on indicators
        const confidence = signal.rsi > 60 || signal.rsi < 40 ? 'HIGH' : 'MEDIUM';

        // Format telegram message
        const telegramMessage = `
${signal.type === 'BUY' ? '🟢' : '🔴'} <b>SIGNAL ALERT: ${signal.type} ${signal.symbol}</b>

💰 <b>Entry Zone:</b> ${entryPrice.toFixed(4)} - ${(entryPrice * 1.002).toFixed(4)}
🛑 <b>Stop Loss:</b> ${stopLossPrice.toFixed(4)}

🎯 <b>Targets:</b>
1️⃣ ${target1.toFixed(4)}
2️⃣ ${target2.toFixed(4)}
3️⃣ ${target3.toFixed(4)}

📊 <b>Risk/Reward Ratio:</b> 1:${((target2 - entryPrice)/(entryPrice - stopLossPrice)).toFixed(2)}

📈 <b>Market Analysis:</b>
• Trend: ${marketTrend}
• RSI: ${signal.rsi.toFixed(2)}
• Volume Ratio: ${signal.volumeRatio}x

⚡️ <b>Technical Indicators:</b>
• MACD: ${signal.macd > 0 ? 'Bullish' : 'Bearish'}
• EMA: Price ${signal.emaStatus}
• SMA: Price ${signal.smaStatus}

🔄 <b>Trade on HTX:</b>
${this.HTX_REFERRAL}
• Up to 20% fee discount
• $5000 sign-up bonus
• Zero maker fees

#${signal.symbol.replace('/', '')} #CryptoSignals #TradingSignals`;

        // Send to Telegram
        console.log('Sending signal to Telegram...');
        await this.telegramService.sendMessage(telegramMessage);
        console.log('Signal sent to Telegram successfully');
        
        // Create a simplified version of the signal for WebSocket clients
        const wsSignal = {
            type: signal.type,
            symbol: signal.symbol,
            price: signal.price,
            rsi: signal.rsi,
            volumeRatio: signal.volumeRatio,
            stopLoss: stopLossPrice,
            targets: [target1, target2, target3],
            confidence,
            marketTrend,
            timestamp: new Date().toISOString()
        };

        // Broadcast to all connected WebSocket clients
        console.log(`Broadcasting signal to ${this.clients.size} WebSocket clients...`);
        const wsMessage = JSON.stringify({
            type: 'signal',
            data: wsSignal
        });
        
        let successCount = 0;
        let failCount = 0;

        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(wsMessage);
                    successCount++;
                    console.log('Signal sent to WebSocket client successfully');
                } catch (error) {
                    failCount++;
                    console.error('Error sending signal to WebSocket client:', error);
                }
            } else {
                console.log('Client not ready, state:', client.readyState);
            }
        });

        console.log(`=== SIGNAL BROADCAST COMPLETED ===
• Total WebSocket Clients: ${this.clients.size}
• Successful Sends: ${successCount}
• Failed Sends: ${failCount}
• Signal Type: ${signal.type}
• Symbol: ${signal.symbol}
• Price: ${signal.price}
• Timestamp: ${new Date().toISOString()}
========================\n`);
    }

    handleWebSocketConnection(ws) {
        console.log('New WebSocket client connected');
        
        // Add to clients set
        this.clients.add(ws);

        // Setup ping-pong
        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        // Handle client messages
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                console.log('Received message from client:', message);
                // Handle client messages if needed
            } catch (error) {
                console.error('Error handling client message:', error);
            }
        });

        // Handle client disconnect
        ws.on('close', () => {
            console.log('WebSocket client disconnected');
            this.clients.delete(ws);
        });

        // Send initial connection success message
        ws.send(JSON.stringify({
            type: 'connection',
            status: 'connected',
            timestamp: Date.now()
        }));

        // Set up ping interval for this connection
        const pingInterval = setInterval(() => {
            if (!ws.isAlive) {
                console.log('Terminating inactive client connection');
                clearInterval(pingInterval);
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        }, 30000);
    }
}

export const signalsService = new SignalsService();
