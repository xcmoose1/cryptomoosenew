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
        
        // HTX referral link
        this.HTX_REFERRAL = 'https://www.htx.com/en-us/invite/en-us/1f?invite_code=2bgu2223';
        
        console.log('TelegramService initialized with:');
        console.log('- Bot Token:', this.botToken);
        console.log('- Bot Token Length:', this.botToken.length);
        console.log('- Channel ID:', this.channelId);
    }

    calculateRiskReward(entry, stopLoss, target) {
        const risk = Math.abs(((entry - stopLoss) / entry) * 100);
        const reward = Math.abs(((target - entry) / entry) * 100);
        return { risk, reward, ratio: (reward / risk).toFixed(2) };
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

    async sendSignal({ pair, type, price, stopLoss, targets, timeframe, confidence, volume24h, marketTrend }) {
        const entryPrice = parseFloat(price.split(' - ')[0].replace(',', ''));
        const { risk, reward, ratio } = this.calculateRiskReward(entryPrice, parseFloat(stopLoss.replace(',', '')), parseFloat(targets[0].split(' ')[0].replace(',', '')));
        
        const emoji = type === 'LONG' ? '🟢' : '🔴';
        const trendEmoji = marketTrend === 'BULLISH' ? '📈' : marketTrend === 'BEARISH' ? '📉' : '📊';
        
        const signal = `
${emoji} <b>CRYPTO SIGNAL: ${type} ${pair}</b>
${timeframe ? `⏱️ Timeframe: ${timeframe}\n` : ''}
${trendEmoji} Market Trend: ${marketTrend}

💰 <b>ENTRY:</b> ${price}
🛑 <b>STOP:</b> ${stopLoss} (${risk.toFixed(2)}% risk)
🎯 <b>TARGETS:</b>
${targets.map((t, i) => `   ${i + 1}. ${t}`).join('\n')}

📊 <b>METRICS:</b>
• R/R Ratio: 1:${ratio}
• Confidence: ${confidence}
• 24h Vol: $${volume24h}M

⚠️ <b>RISK MANAGEMENT:</b>
• Position Size: 1-2% max
• Use SL & TP orders
• Move SL to BE after 1st target

🔗 <b>TRADE NOW:</b>
${this.HTX_REFERRAL}
• 60% fee discount
• $10K bonus

#${pair.replace('/', '')} #Crypto #Trading
`;
        
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
