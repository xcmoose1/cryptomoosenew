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
• Volume Ratio: ${signal.volumeRatio.toFixed(2)}x

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
