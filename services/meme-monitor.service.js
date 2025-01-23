// Meme Token Monitor Service
import WebSocket from 'ws';
import TelegramBot from 'node-telegram-bot-api';
import { OpenAI } from 'openai';
import PriceMonitorService from './price-monitor.service.js';
import WhaleMonitorService from './whale-monitor.service.js';
import SocialMonitorService from './social-monitor.service.js';
import AIAnalysisService from './ai-analysis.service.js';

// Export the class
class MemeMonitorService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Use separate Telegram bot for MemeShoot
        this.telegramEnabled = false;
        if (process.env.MEMESHOOT_TELEGRAM_ENABLED === 'true' && process.env.MEMESHOOT_BOT_TOKEN && process.env.MEMESHOOT_CHANNEL_ID) {
            this.telegramBot = new TelegramBot(process.env.MEMESHOOT_BOT_TOKEN, { polling: false });
            this.channelId = process.env.MEMESHOOT_CHANNEL_ID;
            this.telegramEnabled = true;
            console.log('MemeShoot Telegram notifications enabled');
        } else {
            console.log('MemeShoot Telegram notifications disabled');
        }
        
        // Initialize monitoring services
        this.priceMonitor = new PriceMonitorService();
        this.whaleMonitor = new WhaleMonitorService();
        this.socialMonitor = new SocialMonitorService();
        this.aiAnalysis = new AIAnalysisService(this.openai);
        
        // Known meme tokens to monitor
        this.memeTokens = {
            'DOGE': {
                address: '0xba2ae424d960c26247dd6c32edc70b295c744c43',
                chain: 'bsc',
                symbol: 'DOGE',
                name: 'Dogecoin'
            },
            'SHIB': {
                address: '0x2859e4544c4bb03966803b044a93563bd2d0dd4d',
                chain: 'bsc',
                symbol: 'SHIB',
                name: 'Shiba Inu'
            },
            'PEPE': {
                address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
                chain: 'eth',
                symbol: 'PEPE',
                name: 'Pepe'
            }
        };

        // Initialize monitoring systems
        this.initializeWebSockets();
        this.setupAIAnalysis();
        this.startMonitoring();
    }

    async initializeWebSockets() {
        try {
            // Connect to various DEX websockets for real-time price data
            this.dexConnections = {};

            // Only initialize if we have the required API keys
            if (process.env.BSC_WS_KEY) {
                this.dexConnections.pancakeswap = new WebSocket(`wss://bsc-ws-node.nariox.org:443/${process.env.BSC_WS_KEY}`);
            }

            if (process.env.INFURA_KEY) {
                this.dexConnections.uniswap = new WebSocket(`wss://mainnet.infura.io/ws/v3/${process.env.INFURA_KEY}`);
            }

            // Setup message handlers for active connections
            Object.entries(this.dexConnections).forEach(([dex, ws]) => {
                ws.on('message', (data) => this.handleDEXData(dex, data));
                ws.on('error', (error) => {
                    console.error(`WebSocket error for ${dex}:`, error);
                    // Remove failed connection
                    delete this.dexConnections[dex];
                    // Schedule reconnection
                    setTimeout(() => this.reconnectWebSocket(dex), 5000);
                });
                ws.on('close', () => {
                    console.log(`WebSocket closed for ${dex}`);
                    // Schedule reconnection
                    setTimeout(() => this.reconnectWebSocket(dex), 5000);
                });
            });

            console.log('WebSocket initialization complete');
        } catch (error) {
            console.error('Error initializing WebSockets:', error);
            // Continue with other functionality
        }
    }

    async reconnectWebSocket(dex) {
        try {
            if (dex === 'pancakeswap' && process.env.BSC_WS_KEY) {
                this.dexConnections[dex] = new WebSocket(`wss://bsc-ws-node.nariox.org:443/${process.env.BSC_WS_KEY}`);
            } else if (dex === 'uniswap' && process.env.INFURA_KEY) {
                this.dexConnections[dex] = new WebSocket(`wss://mainnet.infura.io/ws/v3/${process.env.INFURA_KEY}`);
            }

            if (this.dexConnections[dex]) {
                this.dexConnections[dex].on('message', (data) => this.handleDEXData(dex, data));
                this.dexConnections[dex].on('error', (error) => {
                    console.error(`WebSocket error for ${dex}:`, error);
                    delete this.dexConnections[dex];
                    setTimeout(() => this.reconnectWebSocket(dex), 5000);
                });
            }
        } catch (error) {
            console.error(`Error reconnecting to ${dex}:`, error);
        }
    }

    setupAIAnalysis() {
        // Initialize AI parameters
        this.aiParameters = {
            pumpDetectionThreshold: 0.75,
            sentimentThreshold: 0.8,
            volumeMultiplier: 3,
            timeWindow: 3600 // 1 hour
        };
    }

    async startMonitoring() {
        // Start different monitoring processes
        this.monitorPrices();
        this.monitorSocialSentiment();
        this.monitorWhaleMovements();
        this.monitorTrendingTokens();
    }

    async monitorPrices() {
        setInterval(async () => {
            for (const [symbol, token] of Object.entries(this.memeTokens)) {
                try {
                    const priceData = await this.priceMonitor.fetchPriceData(token);
                    const volumeData = await this.priceMonitor.fetchVolumeData(token);
                    
                    if (priceData && volumeData) {
                        // Analyze for potential pump signals
                        const pumpSignal = await this.analyzePumpPotential(token, priceData, volumeData);
                        
                        if (pumpSignal.probability > this.aiParameters.pumpDetectionThreshold) {
                            await this.sendPumpAlert(token, pumpSignal);
                        }
                    }
                } catch (error) {
                    console.error(`Error monitoring ${symbol}:`, error);
                }
            }
        }, 30000); // Check every 30 seconds
    }

    async monitorSocialSentiment() {
        setInterval(async () => {
            for (const token of Object.values(this.memeTokens)) {
                try {
                    // Gather social media data
                    const twitterData = await this.socialMonitor.fetchTwitterSentiment(token);
                    const redditData = await this.socialMonitor.fetchRedditSentiment(token);
                    const telegramData = await this.socialMonitor.fetchTelegramActivity(token);

                    if (twitterData && redditData && telegramData) {
                        // Analyze social sentiment
                        const sentiment = await this.analyzeSocialSentiment({
                            twitter: twitterData,
                            reddit: redditData,
                            telegram: telegramData
                        });

                        if (sentiment.score > this.aiParameters.sentimentThreshold) {
                            await this.sendSentimentAlert(token, sentiment);
                        }
                    }
                } catch (error) {
                    console.error(`Error monitoring social sentiment for ${token.symbol}:`, error);
                }
            }
        }, 300000); // Check every 5 minutes
    }

    async monitorWhaleMovements() {
        setInterval(async () => {
            for (const token of Object.values(this.memeTokens)) {
                try {
                    const whaleMovements = await this.whaleMonitor.detectWhaleMovements(token);
                    if (whaleMovements.significant) {
                        await this.sendWhaleAlert(token, whaleMovements);
                    }
                } catch (error) {
                    console.error(`Error monitoring whale movements for ${token.symbol}:`, error);
                }
            }
        }, 60000); // Check every minute
    }

    async monitorTrendingTokens() {
        setInterval(async () => {
            try {
                // Get trending tokens from various sources
                const dexTrending = await this.priceMonitor.fetchDEXTrending();
                const socialTrending = await this.socialMonitor.fetchSocialTrending();
                const newListings = await this.priceMonitor.fetchNewListings();

                // Analyze potential opportunities
                const opportunities = await this.analyzeNewOpportunities({
                    dexTrending,
                    socialTrending,
                    newListings
                });

                if (opportunities.length > 0) {
                    await this.sendOpportunityAlert(opportunities);
                }
            } catch (error) {
                console.error('Error monitoring trending tokens:', error);
            }
        }, 900000); // Check every 15 minutes
    }

    async analyzePumpPotential(token, priceData, volumeData) {
        return this.aiAnalysis.analyzePumpPotential(token, priceData, volumeData);
    }

    async analyzeSocialSentiment(data) {
        return this.aiAnalysis.analyzeSocialSentiment(data);
    }

    async sendWhaleAlert(token, movements) {
        try {
            const message = `🐋 WHALE MOVEMENT DETECTED: ${token.name} ($${token.symbol})\n\nTransaction Type: ${movements.type}\nAmount: ${movements.amount} ${token.symbol}\nValue: $${movements.value}\n\nWallet Analysis:\n• Previous Transactions: ${movements.walletStats.previousTrades} previous trades\n• Success Rate: ${movements.walletStats.successRate}%\n• Pattern: ${movements.walletStats.pattern}\n\n#${token.symbol} #MemeShoot #WhaleAlert`;

            // Only send to Telegram if enabled
            if (this.telegramEnabled) {
                await this.telegramBot.sendMessage(this.channelId, message);
            }

            // Always send to WebSocket clients
            this.broadcastAlert({
                type: 'whale',
                tokenName: token.name,
                tokenSymbol: token.symbol,
                tokenAddress: token.address,
                chain: token.chain,
                details: message,
                time: 'Just now'
            });
        } catch (error) {
            console.error('Error sending whale alert:', error);
        }
    }

    async sendPumpAlert(token, signal) {
        try {
            const message = `🚀 POTENTIAL PUMP ALERT: ${token.name} ($${token.symbol})\n\nProbability: ${(signal.probability * 100).toFixed(2)}%\nTimeframe: ${signal.timeframe}\n\nReasons:\n${signal.reasons.map(r => `• ${r}`).join('\n')}\n\nCurrent Price: $${signal.currentPrice}\n24h Change: ${signal.priceChange24h}%\nVolume Increase: ${signal.volumeIncrease}x\n\n#${token.symbol} #MemeShoot #PumpAlert`;

            // Only send to Telegram if enabled
            if (this.telegramEnabled) {
                await this.telegramBot.sendMessage(this.channelId, message);
            }

            // Always send to WebSocket clients
            this.broadcastAlert({
                type: 'pump',
                tokenName: token.name,
                tokenSymbol: token.symbol,
                tokenAddress: token.address,
                chain: token.chain,
                details: message,
                time: 'Just now'
            });
        } catch (error) {
            console.error('Error sending pump alert:', error);
        }
    }

    async sendSentimentAlert(token, sentiment) {
        try {
            const message = `📊 SOCIAL SENTIMENT SPIKE: ${token.name} ($${token.symbol})\n\nSentiment Score: ${(sentiment.score * 100).toFixed(2)}%\n\nPlatform Activity:\n• Twitter: ${sentiment.twitter.activity} (${sentiment.twitter.sentiment})\n• Reddit: ${sentiment.reddit.activity} (${sentiment.reddit.sentiment})\n• Telegram: ${sentiment.telegram.activity} (${sentiment.telegram.sentiment})\n\nKey Topics:\n${sentiment.topics.map(t => `• ${t}`).join('\n')}\n\n#${token.symbol} #MemeShoot #SentimentAlert`;

            // Only send to Telegram if enabled
            if (this.telegramEnabled) {
                await this.telegramBot.sendMessage(this.channelId, message);
            }

            // Always send to WebSocket clients
            this.broadcastAlert({
                type: 'social',
                tokenName: token.name,
                tokenSymbol: token.symbol,
                tokenAddress: token.address,
                chain: token.chain,
                details: message,
                time: 'Just now'
            });
        } catch (error) {
            console.error('Error sending sentiment alert:', error);
        }
    }

    async sendOpportunityAlert(opportunities) {
        const message = `🎯 NEW MEME OPPORTUNITIES DETECTED\n\n${opportunities.map(opp => `${opp.name} ($${opp.symbol})\n• Chain: ${opp.chain}\n• Listed: ${opp.listedAgo}\n• Initial Liquidity: $${opp.liquidity}\n• Holders: ${opp.holders}\n• Safety Score: ${opp.safetyScore}/100\n• Potential: ${opp.potential}/100`).join('\n')}\n\nUse MemeShoot to analyze these tokens in detail!\n#MemeShoot #NewOpportunities`;

        await this.telegramBot.sendMessage(this.channelId, message);
    }

    broadcastAlert(alert) {
        // Send alert to all connected WebSocket clients
        const message = JSON.stringify({
            type: 'token_alert',
            data: alert
        });

        if (global.wss) {
            global.wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
    }
}

// Export as default
export default MemeMonitorService;
