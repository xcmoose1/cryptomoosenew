import { SIGNALS_CONFIG } from '../config/signals-config.js';
import { RSI, MACD, EMA, SMA } from 'technicalindicators';
import { createTelegramService } from './telegram-service.js';
import pako from 'pako';
import WebSocket from 'ws';
import fs from 'fs/promises';
import path from 'path';

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
        this.initializingPairs = new Set();
        this.subscribedPairs = new Set();
        this.pingInterval = null;
        this.signalHistoryFile = path.join(process.cwd(), 'signals', 'data', 'signals-history.json');
        this.signalHistory = { signals: [], lastUpdate: new Date().toISOString() };
        this.trackRecordFile = path.join(process.cwd(), 'signals', 'data', 'track-record.json');
        this.trackRecord = {
            totalSignals: 0,
            wins: 0,
            losses: 0,
            activeSignals: [],
            completedSignals: [],
            lastUpdate: new Date().toISOString()
        };
        
        // List of all monitored pairs
        this.monitoredPairs = [
            'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'SOL/USDT', 
            'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT', 'LINK/USDT',
            'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'ETC/USDT', 'XLM/USDT',
            'ALGO/USDT', 'NEAR/USDT', 'FTM/USDT', 'SAND/USDT', 'MANA/USDT',
            'AAVE/USDT', 'GRT/USDT', 'SNX/USDT', 'CRV/USDT'
        ];
    }

    async initialize() {
        try {
            console.log('\n🔄 Initializing SignalsService...');
            
            // Load signal history and track record
            await Promise.all([
                this.loadSignalHistory(),
                this.loadTrackRecord()
            ]);
            
            // Initialize TelegramService
            this.telegramService = createTelegramService();
            
            // Setup WebSocket connection
            await this.setupWebSocket();
            
            // Start processing pairs
            await this.startBatchProcessing();
            
            console.log('\n✅ SignalsService initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing SignalsService:', error);
            return false;
        }
    }

    async loadSignalHistory() {
        try {
            const data = await fs.readFile(this.signalHistoryFile, 'utf8');
            this.signalHistory = JSON.parse(data);
            console.log(`📚 Loaded ${this.signalHistory.signals.length} historical signals`);
        } catch (error) {
            console.log('No signal history found, starting fresh');
            this.signalHistory = { signals: [], lastUpdate: new Date().toISOString() };
            await this.saveSignalHistory();
        }
    }

    async saveSignalHistory() {
        try {
            // Keep only the last 1000 signals to manage file size
            if (this.signalHistory.signals.length > 1000) {
                this.signalHistory.signals = this.signalHistory.signals.slice(-1000);
            }
            this.signalHistory.lastUpdate = new Date().toISOString();
            await fs.writeFile(this.signalHistoryFile, JSON.stringify(this.signalHistory, null, 2));
        } catch (error) {
            console.error('Error saving signal history:', error);
        }
    }

    async loadTrackRecord() {
        try {
            const data = await fs.readFile(this.trackRecordFile, 'utf8');
            this.trackRecord = JSON.parse(data);
            console.log(`📊 Loaded track record: ${this.trackRecord.wins} wins, ${this.trackRecord.losses} losses`);
        } catch (error) {
            console.log('No track record found, starting fresh');
            await this.saveTrackRecord();
        }
    }

    async saveTrackRecord() {
        try {
            this.trackRecord.lastUpdate = new Date().toISOString();
            await fs.writeFile(this.trackRecordFile, JSON.stringify(this.trackRecord, null, 2));
        } catch (error) {
            console.error('Error saving track record:', error);
        }
    }

    async updateSignalStatus(signalId, status, exitPrice) {
        const signal = this.trackRecord.activeSignals.find(s => s.id === signalId);
        if (!signal) return;

        const entryPrice = parseFloat(signal.price);
        const currentPrice = parseFloat(exitPrice);
        const isLong = signal.type.toLowerCase() === 'buy' || signal.type.toLowerCase() === 'long';
        
        // Calculate profit/loss
        let profitPercent;
        if (isLong) {
            profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
        } else {
            profitPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
        }

        // Update signal status
        signal.status = status;
        signal.exitPrice = exitPrice;
        signal.profitPercent = profitPercent;
        signal.completedAt = new Date().toISOString();

        // Move to completed signals
        this.trackRecord.activeSignals = this.trackRecord.activeSignals.filter(s => s.id !== signalId);
        this.trackRecord.completedSignals.push(signal);

        // Update stats
        if (profitPercent > 0) {
            this.trackRecord.wins++;
        } else {
            this.trackRecord.losses++;
        }

        await this.saveTrackRecord();
        
        // Broadcast update to clients
        this.broadcastToClients({
            type: 'signalUpdate',
            data: {
                signal,
                trackRecord: this.getTrackRecordStats()
            }
        });
    }

    getTrackRecordStats() {
        const total = this.trackRecord.wins + this.trackRecord.losses;
        const winRate = total > 0 ? (this.trackRecord.wins / total) * 100 : 0;
        
        // Calculate average profit
        const completedSignals = this.trackRecord.completedSignals;
        const totalProfit = completedSignals.reduce((sum, signal) => sum + signal.profitPercent, 0);
        const avgProfit = completedSignals.length > 0 ? totalProfit / completedSignals.length : 0;

        return {
            totalSignals: total,
            wins: this.trackRecord.wins,
            losses: this.trackRecord.losses,
            winRate: winRate.toFixed(2),
            avgProfit: avgProfit.toFixed(2),
            activeSignals: this.trackRecord.activeSignals.length
        };
    }

    async sendSignal(signal) {
        try {
            // Add timestamp and unique ID to signal
            signal.timestamp = new Date().toISOString();
            signal.id = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Format the signal message
            const message = this.formatSignalMessage(signal.symbol, signal.type, signal.price, signal.trend, signal.rsi, signal.volumeRatio, signal.emaFast, signal.emaSlow, signal.volumeMA);
            
            // Add to active signals
            this.trackRecord.activeSignals.push({
                ...signal,
                status: 'active',
                message
            });
            this.trackRecord.totalSignals++;
            await this.saveTrackRecord();
            
            // Store in history
            this.signalHistory.signals.push({
                ...signal,
                message,
                sentAt: signal.timestamp
            });
            await this.saveSignalHistory();
            
            // Send to Telegram if available
            if (this.telegramService) {
                await this.telegramService.sendMessage(message);
            }
            
            // Broadcast to clients
            this.broadcastToClients({
                type: 'signal',
                data: {
                    ...signal,
                    message,
                    trackRecord: this.getTrackRecordStats()
                }
            });
            
            return true;
        } catch (error) {
            console.error('Error sending signal:', error);
            return false;
        }
    }

    async getHistoricalSignals({ type = 'all', limit = 100, startDate = null, endDate = null } = {}) {
        try {
            let signals = [...this.signalHistory.signals];
            
            // Apply filters
            if (type !== 'all') {
                signals = signals.filter(s => s.type.toLowerCase() === type.toLowerCase());
            }
            
            if (startDate) {
                signals = signals.filter(s => new Date(s.timestamp) >= new Date(startDate));
            }
            
            if (endDate) {
                signals = signals.filter(s => new Date(s.timestamp) <= new Date(endDate));
            }
            
            // Sort by timestamp descending and limit results
            return signals
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting historical signals:', error);
            return [];
        }
    }

    async getSignalStats() {
        try {
            const signals = this.signalHistory.signals;
            const now = new Date();
            const last24h = new Date(now - 24 * 60 * 60 * 1000);
            const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
            
            return {
                total: signals.length,
                last24h: signals.filter(s => new Date(s.timestamp) >= last24h).length,
                last7d: signals.filter(s => new Date(s.timestamp) >= last7d).length,
                byType: {
                    buy: signals.filter(s => s.type.toLowerCase() === 'buy' || s.type.toLowerCase() === 'long').length,
                    sell: signals.filter(s => s.type.toLowerCase() === 'sell' || s.type.toLowerCase() === 'short').length
                }
            };
        } catch (error) {
            console.error('Error getting signal stats:', error);
            return null;
        }
    }

    async setupWebSocket() {
        try {
            console.log('\n🔄 Setting up WebSocket connection...');
            
            // Close existing connection if any
            if (this.ws) {
                try {
                    this.ws.terminate();
                } catch (err) {
                    console.error('Error terminating existing WebSocket:', err);
                }
                this.ws = null;
            }
            
            return new Promise((resolve, reject) => {
                try {
                    this.ws = new WebSocket(SIGNALS_CONFIG.WS_URL);
                    
                    this.ws.on('open', () => {
                        console.log('✅ WebSocket connected');
                        this.reconnectAttempts = 0;
                        this.setupPingInterval();
                        
                        // Resubscribe to all pairs
                        if (this.subscribedPairs.size > 0) {
                            console.log(`Resubscribing to ${this.subscribedPairs.size} pairs...`);
                            for (const symbol of this.subscribedPairs) {
                                this.subscribeToSymbol(symbol);
                            }
                        }
                        
                        resolve();
                    });

                    this.ws.on('close', () => {
                        console.log('WebSocket disconnected');
                        if (this.pingInterval) {
                            clearInterval(this.pingInterval);
                            this.pingInterval = null;
                        }
                        
                        // Only attempt reconnect if we haven't reached max attempts
                        if (this.reconnectAttempts < this.maxReconnectAttempts) {
                            setTimeout(() => this.handleReconnect(), this.reconnectDelay);
                        } else {
                            console.log('Max reconnection attempts reached');
                        }
                    });

                    this.ws.on('error', (error) => {
                        console.error('WebSocket error:', error);
                        reject(error);
                    });

                } catch (error) {
                    console.error('Error creating WebSocket:', error);
                    reject(error);
                }
            });
        } catch (error) {
            console.error('Error in setupWebSocket:', error);
            throw error;
        }
    }

    async initializeService() {
        try {
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
            const formattedSymbol = this.formatSymbol(symbol);
            console.log(`\n📊 Fetching ${limit} historical candles for ${symbol} (${formattedSymbol})...`);
            
            // Ensure we don't exceed API limits but get enough data
            const maxLimit = Math.min(limit, 2000); // HTX API limit is 2000
            
            // Add retry logic
            let retries = 3;
            let lastError;
            
            while (retries > 0) {
                try {
                    // Use 1min klines for most accurate data
                    const url = `${SIGNALS_CONFIG.REST_URL}/market/history/kline?symbol=${formattedSymbol}&period=1min&size=${maxLimit}`;
                    console.log(`Fetching from: ${url}`);
                    
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    
                    if (data && data.status === 'ok' && Array.isArray(data.data) && data.data.length > 0) {
                        // Sort candles from oldest to newest
                        const candles = data.data.reverse().map(candle => ({
                            time: candle.id * 1000, // Convert to milliseconds
                            open: parseFloat(candle.open),
                            high: parseFloat(candle.high),
                            low: parseFloat(candle.low),
                            close: parseFloat(candle.close),
                            volume: parseFloat(candle.vol)
                        }));

                        if (candles.length > 0) {
                            console.log(`✅ Fetched ${candles.length} historical candles for ${symbol}`);
                            // Verify we have enough data
                            if (candles.length < Math.min(100, limit)) {
                                throw new Error(`Insufficient candles received: ${candles.length}`);
                            }
                            // Store in history
                            this.candleHistory.set(symbol, candles);
                            return candles;
                        } else {
                            throw new Error('Received empty candles array');
                        }
                    } else {
                        throw new Error(data['err-msg'] || 'Invalid response format');
                    }
                } catch (error) {
                    lastError = error;
                    retries--;
                    if (retries > 0) {
                        console.log(`Retrying fetch for ${symbol}, ${retries} attempts remaining...`);
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                    }
                }
            }
            
            console.error(`❌ Failed to fetch historical data for ${symbol} after all retries:`, lastError);
            return null;
        } catch (error) {
            console.error(`❌ Error fetching historical data for ${symbol}:`, error);
            return null;
        }
    }

    async initializeIndicators(symbol) {
        try {
            // Check if already initializing this pair
            if (this.initializingPairs.has(symbol)) {
                console.log(`Already initializing indicators for ${symbol}, skipping duplicate call`);
                return true;
            }
            
            // Mark as initializing
            this.initializingPairs.add(symbol);
            
            console.log(`\n📊 Initializing indicators for ${symbol}...`);
            
            // Calculate required candles based on the longest period needed
            const requiredCandles = Math.max(
                SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD * 3,
                SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD * 3,
                SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD * 3,
                100 // Minimum candles needed for reliable signals
            );
            
            try {
                // Always fetch fresh data when initializing indicators
                const candles = await this.fetchHistoricalData(symbol, requiredCandles);
                if (!candles || candles.length < requiredCandles) {
                    throw new Error(`Failed to fetch sufficient historical data for ${symbol}. Need ${requiredCandles} candles, got ${candles ? candles.length : 0}`);
                }

                // Extract close prices and volumes
                const closes = candles.map(candle => candle.close);
                const volumes = candles.map(candle => candle.volume);

                // Calculate initial indicators
                const smaFast = SMA.calculate({
                    period: SIGNALS_CONFIG.ANALYSIS.EMA.FAST_PERIOD,
                    values: closes
                });

                const smaSlow = SMA.calculate({
                    period: SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD,
                    values: closes
                });

                const emaFast = EMA.calculate({
                    period: SIGNALS_CONFIG.ANALYSIS.EMA.FAST_PERIOD,
                    values: closes
                });

                const emaSlow = EMA.calculate({
                    period: SIGNALS_CONFIG.ANALYSIS.EMA.SLOW_PERIOD,
                    values: closes
                });

                const rsi = RSI.calculate({
                    period: SIGNALS_CONFIG.ANALYSIS.RSI.PERIOD,
                    values: closes
                });

                const volumeMA = SMA.calculate({
                    period: SIGNALS_CONFIG.ANALYSIS.VOLUME.MA_PERIOD,
                    values: volumes
                });

                // Verify we have valid indicator values
                if (!emaFast.length || !emaSlow.length || !rsi.length || !volumeMA.length) {
                    throw new Error(`Failed to calculate indicators for ${symbol}`);
                }

                // Store indicators
                this.indicators.set(symbol, {
                    emaFast,
                    emaSlow,
                    rsi,
                    volumeMA,
                    lastUpdate: Date.now()
                });

                console.log(`✅ Indicators initialized for ${symbol} with ${candles.length} candles`);
                return true;
            } finally {
                // Always remove from initializing set, even if there was an error
                this.initializingPairs.delete(symbol);
            }
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
            const closes = history.map(candle => candle.close);
            const volumes = history.map(candle => candle.volume);

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

            // Determine trend and indicator states
            const trend = emaFast > emaSlow ? 'BULLISH' : 'BEARISH';
            const emaState = emaFast > emaSlow ? 'Price Above EMA' : 'Price Below EMA';
            const smaState = candle.close > volumeMA ? 'Price Above SMA' : 'Price Below SMA';
            const macdState = emaFast > emaSlow ? 'Bullish' : 'Bearish';

            // Calculate price range for entry
            const currentPrice = parseFloat(candle.close);
            const spread = currentPrice * 0.001; // 0.1% spread
            const entryLow = (currentPrice - spread).toFixed(4);
            const entryHigh = (currentPrice + spread).toFixed(4);
            const entryPrice = currentPrice; // Use middle price for R:R calculations

            // Calculate stop loss and targets based on ATR or fixed percentage
            const stopLossPercent = 0.01; // 1%
            const target1Percent = 0.015; // 1.5%
            const target2Percent = 0.025; // 2.5%
            const target3Percent = 0.035; // 3.5%

            let stopLoss, targets;
            if (trend === 'BULLISH') {
                stopLoss = (currentPrice * (1 - stopLossPercent)).toFixed(4);
                targets = [
                    (currentPrice * (1 + target1Percent)).toFixed(4),
                    (currentPrice * (1 + target2Percent)).toFixed(4),
                    (currentPrice * (1 + target3Percent)).toFixed(4)
                ];
            } else {
                stopLoss = (currentPrice * (1 + stopLossPercent)).toFixed(4);
                targets = [
                    (currentPrice * (1 - target1Percent)).toFixed(4),
                    (currentPrice * (1 - target2Percent)).toFixed(4),
                    (currentPrice * (1 - target3Percent)).toFixed(4)
                ];
            }

            // Calculate average R:R ratio across all targets
            const riskPips = Math.abs(entryPrice - parseFloat(stopLoss));
            const rewardPips = targets.map(t => Math.abs(entryPrice - parseFloat(t)));
            const avgRewardPips = rewardPips.reduce((a, b) => a + b, 0) / rewardPips.length;
            const riskRewardRatio = (avgRewardPips / riskPips).toFixed(2);

            // Check for buy signal
            if (trend === 'BULLISH' && rsi < SIGNALS_CONFIG.ANALYSIS.RSI.OVERSOLD && volumeRatio > SIGNALS_CONFIG.ANALYSIS.VOLUME.THRESHOLD) {
                const signal = {
                    type: 'LONG',
                    pair: symbol,
                    price: `${entryLow} - ${entryHigh}`,
                    stopLoss,
                    targets,
                    timeframe: SIGNALS_CONFIG.TIMEFRAME,
                    marketTrend: trend,
                    rsi: rsi.toFixed(2),
                    macd: macdState,
                    ema: emaState,
                    sma: smaState,
                    volumeRatio,
                    riskRewardRatio
                };
                await this.sendSignal(signal);
            }
            // Check for sell signal
            else if (trend === 'BEARISH' && rsi > SIGNALS_CONFIG.ANALYSIS.RSI.OVERBOUGHT && volumeRatio > SIGNALS_CONFIG.ANALYSIS.VOLUME.THRESHOLD) {
                const signal = {
                    type: 'SHORT',
                    pair: symbol,
                    price: `${entryLow} - ${entryHigh}`,
                    stopLoss,
                    targets,
                    timeframe: SIGNALS_CONFIG.TIMEFRAME,
                    marketTrend: trend,
                    rsi: rsi.toFixed(2),
                    macd: macdState,
                    ema: emaState,
                    sma: smaState,
                    volumeRatio,
                    riskRewardRatio
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
        try {
            console.log('\n🔄 Setting up WebSocket connection...');
            
            // Close existing connection if any
            if (this.ws) {
                try {
                    this.ws.terminate();
                } catch (err) {
                    console.error('Error terminating existing WebSocket:', err);
                }
                this.ws = null;
            }
            
            return new Promise((resolve, reject) => {
                try {
                    this.ws = new WebSocket(SIGNALS_CONFIG.WS_URL);
                    
                    this.ws.on('open', () => {
                        console.log('✅ WebSocket connected');
                        this.reconnectAttempts = 0;
                        this.setupPingInterval();
                        
                        // Resubscribe to all pairs
                        if (this.subscribedPairs.size > 0) {
                            console.log(`Resubscribing to ${this.subscribedPairs.size} pairs...`);
                            for (const symbol of this.subscribedPairs) {
                                this.subscribeToSymbol(symbol);
                            }
                        }
                        
                        resolve();
                    });

                    this.ws.on('close', () => {
                        console.log('WebSocket disconnected');
                        if (this.pingInterval) {
                            clearInterval(this.pingInterval);
                            this.pingInterval = null;
                        }
                        
                        // Only attempt reconnect if we haven't reached max attempts
                        if (this.reconnectAttempts < this.maxReconnectAttempts) {
                            setTimeout(() => this.handleReconnect(), this.reconnectDelay);
                        } else {
                            console.log('Max reconnection attempts reached');
                        }
                    });

                    this.ws.on('error', (error) => {
                        console.error('WebSocket error:', error);
                        reject(error);
                    });

                } catch (error) {
                    console.error('Error creating WebSocket:', error);
                    reject(error);
                }
            });
        } catch (error) {
            console.error('Error in setupWebSocket:', error);
            throw error;
        }
    }

    setupPingInterval() {
        // Clear existing interval if any
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        // Setup new ping interval
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ ping: Date.now() }));
            } else {
                clearInterval(this.pingInterval);
                this.handleReconnect();
            }
        }, 20000);
    }

    async processBatch(batch, batchNumber, totalBatches) {
        try {
            console.log(`Processing batch ${batchNumber}/${totalBatches}`);
            
            // Process pairs sequentially to avoid race conditions
            for (const pair of batch) {
                try {
                    // Subscribe to market data
                    await this.subscribeToSymbol(pair);
                    
                    // Small delay between subscriptions
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`Error processing ${pair}:`, error);
                }
            }
            
            console.log(`Batch ${batchNumber} complete. Waiting 2000ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error('Error processing batch:', error);
        }
    }

    async startBatchProcessing() {
        try {
            // Split pairs into batches of 5
            const BATCH_SIZE = 5;
            const pairs = [...SIGNALS_CONFIG.TRADING_PAIRS];
            const batches = [];
            
            for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
                batches.push(pairs.slice(i, i + BATCH_SIZE));
            }
            
            console.log(`Split ${pairs.length} pairs into ${batches.length} batches`);
            
            // Process batches sequentially
            for (let i = 0; i < batches.length; i++) {
                await this.processBatch(batches[i], i + 1, batches.length);
            }
            
            console.log('\n✅ All pairs processed and subscribed');
            
            // Start periodic status updates
            this.startStatusUpdates();
        } catch (error) {
            console.error('Error in batch processing:', error);
        }
    }

    async subscribeToSymbol(symbol) {
        try {
            const formattedSymbol = this.formatSymbol(symbol);
            if (!formattedSymbol) {
                console.error(`Invalid symbol format: ${symbol}`);
                return;
            }

            // Check if we're already subscribed
            if (this.subscribedPairs.has(formattedSymbol)) {
                console.log(`Already subscribed to ${formattedSymbol}, skipping...`);
                return;
            }

            // Initialize indicators if not already done
            if (!this.indicators.has(symbol)) {
                console.log(`📊 Initializing indicators for ${symbol}...`);
                await this.initializeIndicators(symbol);
            }

            const sub = {
                "sub": `market.${formattedSymbol}.kline.1min`,
                "id": `${formattedSymbol}`
            };

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(sub));
                this.subscribedPairs.add(formattedSymbol);
            } else {
                console.log(`WebSocket not ready for ${symbol}, state: ${this.ws ? this.ws.readyState : 'null'}`);
            }
        } catch (error) {
            console.error(`Error subscribing to ${symbol}:`, error);
        }
    }

    async unsubscribeFromSymbol(symbol) {
        try {
            const formattedSymbol = this.formatSymbol(symbol);
            
            if (!this.subscribedPairs.has(formattedSymbol)) {
                console.log(`Not subscribed to ${symbol}, skipping unsubscribe...`);
                return;
            }

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                // Unsubscribe from kline data
                const unsubscribeMsg = {
                    unsub: `market.${formattedSymbol}.kline.1min`,
                    id: `${formattedSymbol}`
                };
                this.ws.send(JSON.stringify(unsubscribeMsg));

                // Unsubscribe from trade data
                const tradeUnsubscribeMsg = {
                    unsub: `market.${formattedSymbol}.trade.detail`,
                    id: `${formattedSymbol}`
                };
                this.ws.send(JSON.stringify(tradeUnsubscribeMsg));

                // Remove from subscribed set
                this.subscribedPairs.delete(formattedSymbol);
                
                console.log(`Unsubscribed from ${symbol}`);
            }
        } catch (error) {
            console.error(`Error unsubscribing from ${symbol}:`, error);
        }
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
                this.processedCandles++;
                
                // Throttle processing messages
                const now = Date.now();
                if (now - this.lastProcessedCandleMessage >= this.processedCandleMessageThrottle) {
                    console.log(`\n🔄 Processed ${this.processedCandles} candles. Actively monitoring market conditions...`);
                    this.lastProcessedCandleMessage = now;
                }

                // Process the candle data
                await this.processMarketData(message);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            if (error.message.includes('pako')) {
                console.error('Data decompression error. Raw data:', data);
            }
        }
    }

    async processMarketData(message) {
        try {
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
            
            // Log processing status every 100 candles
            if (this.processedCandles % 100 === 0) {
                console.log(`\n🔄 Processed ${this.processedCandles} candles. Actively monitoring market conditions...`);
            }

            if (this.isInitialized) {
                await this.processCandle(symbol, candle);
            }
        } catch (error) {
            console.error('Error processing market data:', error);
        }
    }

    async sendSignal(signal) {
        try {
            // Add timestamp and unique ID to signal
            signal.timestamp = new Date().toISOString();
            signal.id = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Format the signal message
            const message = this.formatSignalMessage(signal.symbol, signal.type, signal.price, signal.trend, signal.rsi, signal.volumeRatio, signal.emaFast, signal.emaSlow, signal.volumeMA);
            
            // Add to active signals
            this.trackRecord.activeSignals.push({
                ...signal,
                status: 'active',
                message
            });
            this.trackRecord.totalSignals++;
            await this.saveTrackRecord();
            
            // Store in history
            this.signalHistory.signals.push({
                ...signal,
                message,
                sentAt: signal.timestamp
            });
            await this.saveSignalHistory();
            
            // Send to Telegram if available
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
            if (!this.lastSignals.has(signal.pair)) {
                this.lastSignals.set(signal.pair, []);
            }
            const signals = this.lastSignals.get(signal.pair);
            signals.push({
                ...signal,
                timestamp: Date.now()
            });

            // Keep only last 10 signals per symbol
            if (signals.length > 10) {
                signals.shift();
            }

            console.log(`✅ Signal sent for ${signal.pair}`);
        } catch (error) {
            console.error('Error sending signal:', error);
        }
    }

    handleWebSocketConnection(ws) {
        if (!ws || typeof ws.send !== 'function') {
            console.error('Invalid WebSocket connection');
            return;
        }

        console.log('Client connected to WebSocket');
        this.clients.add(ws);
        
        // Send initial state
        try {
            ws.send(JSON.stringify({
                type: 'system',
                data: {
                    message: '🔌 Connected to signal service',
                    timestamp: Date.now(),
                    status: 'connected',
                    pairs: Array.from(this.indicators.keys()),
                    processedCandles: this.processedCandles,
                    isInitialized: this.isInitialized
                }
            }));

            // Send current status update
            this.printSystemStatus();
        } catch (error) {
            console.error('Error sending initial state:', error);
        }

        // Handle client messages
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('Received message from client:', data);
                // Handle any client messages here
            } catch (error) {
                console.error('Error handling client message:', error);
            }
        });
        
        ws.on('close', () => {
            console.log('Client disconnected from WebSocket');
            this.clients.delete(ws);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.clients.delete(ws);
        });
    }

    async handleReconnect() {
        try {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            // Clear subscribed pairs before reconnecting
            this.subscribedPairs.clear();
            
            await this.setupWebSocket();
        } catch (error) {
            console.error('Reconnection failed:', error);
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => this.handleReconnect(), this.reconnectDelay);
            } else {
                console.log('Max reconnection attempts reached');
            }
        }
    }
}

export const signalsService = new SignalsService();
