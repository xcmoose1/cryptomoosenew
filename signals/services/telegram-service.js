import TelegramBot from 'node-telegram-bot-api';

class TelegramService {
    constructor(botToken, channelId) {
        if (!botToken || !channelId) {
            throw new Error('TelegramService requires both botToken and channelId');
        }

        // Clean the token - remove any whitespace or quotes
        this.botToken = botToken.trim().replace(/["']/g, '');
        this.channelId = channelId;
        
        // Initialize bot with polling disabled (we don't need to receive messages)
        this.bot = new TelegramBot(this.botToken, { polling: false });
        
        // Initialize HTX referral link
        this.HTX_REFERRAL = 'https://www.htx.com/invite/en-us/1f?invite_code=5duia223';
        
        console.log('TelegramService initialized with:');
        console.log('- Bot Token:', this.botToken);
        console.log('- Bot Token Length:', this.botToken.length);
        console.log('- Channel ID:', this.channelId);
    }

    calculateRiskReward(entry, stopLoss, target) {
        const risk = Math.abs(entry - stopLoss);
        const reward = Math.abs(target - entry);
        const ratio = (reward / risk).toFixed(2);
        return { risk, reward, ratio };
    }

    async sendMessage(message) {
        try {
            // First verify the bot
            console.log('Verifying bot...');
            const me = await this.bot.getMe();
            console.log('Bot info:', me);

            console.log('Sending message to channel:', this.channelId);
            const result = await this.bot.sendMessage(this.channelId, message, { parse_mode: 'HTML' });
            console.log('Message sent successfully:', result);
            return result;
        } catch (error) {
            console.error('Failed to send message:', error.message);
            if (error.response) {
                console.error('Full error response:', JSON.stringify(error.response, null, 2));
            }
            throw error;
        }
    }

    async sendSignal({ 
        pair, 
        type, 
        price, 
        stopLoss, 
        targets, 
        timeframe, 
        confidence, 
        volume24h, 
        marketTrend,
        rsi,
        macd,
        ema,
        sma,
        volumeRatio 
    }) {
        const entryPrice = parseFloat(price.split(' - ')[0].replace(',', ''));
        const { risk, reward, ratio } = this.calculateRiskReward(entryPrice, parseFloat(stopLoss.replace(',', '')), parseFloat(targets[0].split(' ')[0].replace(',', '')));
        
        const emoji = type === 'LONG' ? '🟢' : '🔴';
        const trendEmoji = marketTrend === 'BULLISH' ? '📈' : marketTrend === 'BEARISH' ? '📉' : '📊';
        
        const signal = `
${emoji} SIGNAL ALERT: ${type} ${pair} ${timeframe ? `(${timeframe})` : ''}

💰 Entry Zone: ${price}
🛑 Stop Loss: ${stopLoss}

🎯 Targets:
${targets.map((t, i) => `${i === 0 ? '1️⃣' : i === 1 ? '2️⃣' : '3️⃣'} ${t}`).join('\n')}

📊 Risk/Reward Ratio: 1:${ratio}

📈 Market Analysis:
• Trend: ${trendEmoji} ${marketTrend}
• RSI: ${rsi ? rsi.toFixed(2) : 'N/A'}
• Volume Ratio: ${volumeRatio ? volumeRatio.toFixed(2) : 'N/A'}x

⚡️ Technical Indicators:
• MACD: ${macd || 'N/A'}
• EMA: ${ema || 'N/A'}
• SMA: ${sma || 'N/A'}

🔄 Trade on HTX:
${this.HTX_REFERRAL}
• Up to 20% fee discount
• $5000 sign-up bonus
• Zero maker fees

#${pair.replace('/', '')} #CryptoSignals #TradingSignals`;
        
        return this.sendMessage(signal);
    }
}

const createTelegramService = () => {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
        throw new Error('Missing required environment variables for Telegram service');
    }
    return new TelegramService(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHANNEL_ID);
};

export { TelegramService, createTelegramService };
