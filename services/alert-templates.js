// Alert templates for different scenarios when GPT-4 is unavailable

export const AlertTemplates = {
    // Pump Alert Templates
    PUMP: {
        STRONG: {
            title: '🚨 Strong Pump Signal Detected',
            template: (token, data) => `
🚀 ${token.name} ($${token.symbol}) showing strong momentum!

📊 Key Metrics:
• Price: $${data.currentPrice}
• 24h Change: ${data.priceChange24h}%
• Volume Increase: ${data.volumeIncrease}x

⚡️ Signals:
${data.reasons.map(reason => `• ${reason}`).join('\n')}

🔍 Analysis: High confidence pump signal based on price action and volume
#${token.symbol} #Crypto #PumpAlert
            `.trim()
        },
        MODERATE: {
            title: '📈 Potential Pump Signal',
            template: (token, data) => `
📊 ${token.name} ($${token.symbol}) Price Alert

💹 Market Data:
• Current: $${data.currentPrice}
• 24h Change: ${data.priceChange24h}%
• Volume: ${data.volumeIncrease}x normal

📝 Notes:
${data.reasons.map(reason => `• ${reason}`).join('\n')}

#${token.symbol} #Trading
            `.trim()
        },
        WEAK: {
            title: '👀 Movement Detected',
            template: (token, data) => `
${token.name} ($${token.symbol}) Update:
• Price: $${data.currentPrice}
• 24h: ${data.priceChange24h}%
• Vol: ${data.volumeIncrease}x

${data.reasons[0] || 'Monitoring price action'}
#${token.symbol}
            `.trim()
        }
    },

    // Social Sentiment Templates
    SENTIMENT: {
        BULLISH: {
            title: '🔥 High Social Activity',
            template: (token, data) => `
${token.name} ($${token.symbol}) Social Analysis:

📱 Social Metrics:
• Twitter: ${data.twitter.mentions} mentions
• Reddit: ${data.reddit.posts} posts
• Telegram: ${data.telegram.members} members

🔥 Key Topics:
${data.topics.map(topic => `• ${topic}`).join('\n')}

💡 Strong social sentiment detected
#${token.symbol} #CryptoSocial
            `.trim()
        },
        NEUTRAL: {
            title: '📊 Social Activity Update',
            template: (token, data) => `
${token.name} ($${token.symbol}) Social Update:
• Twitter Activity: ${data.twitter.mentions} mentions
• Reddit Posts: ${data.reddit.posts}
• TG Members: ${data.telegram.members}

${data.topics.length > 0 ? '📝 Topics:\n' + data.topics.map(t => `• ${t}`).join('\n') : ''}
#${token.symbol}
            `.trim()
        },
        BEARISH: {
            title: '⚠️ Declining Social Interest',
            template: (token, data) => `
${token.name} ($${token.symbol}):
Social activity below average
• TW: ${data.twitter.mentions}
• Reddit: ${data.reddit.posts}
• TG: ${data.telegram.members}

Monitor for changes
#${token.symbol}
            `.trim()
        }
    },

    // Whale Movement Templates
    WHALE: {
        LARGE: {
            title: '🐋 Major Whale Movement',
            template: (token, data) => `
🚨 Large ${token.symbol} Whale Movement:

💰 Transaction Details:
• Amount: ${data.amount} ${token.symbol}
• Value: $${data.value}
• Type: ${data.type}

🔍 Wallet Analysis:
• Wallet Age: ${data.walletAge}
• Previous Activity: ${data.previousActivity}

⚠️ Potential market impact
#${token.symbol} #WhaleAlert
            `.trim()
        },
        MEDIUM: {
            title: '🐟 Significant Transfer',
            template: (token, data) => `
${token.symbol} Transfer Alert:
• Amount: ${data.amount} ${token.symbol}
• Value: $${data.value}
• ${data.type}

#${token.symbol} #Crypto
            `.trim()
        }
    },

    // Price Action Templates
    PRICE: {
        BREAKOUT: {
            title: '💥 Breakout Alert',
            template: (token, data) => `
${token.name} ($${token.symbol}) BREAKOUT:
• Price: $${data.price}
• Break Level: $${data.breakLevel}
• Volume: ${data.volume}x average

${data.reason || 'Technical breakout detected'}
#${token.symbol} #CryptoBreakout
            `.trim()
        },
        SUPPORT: {
            title: '📍 Support Test',
            template: (token, data) => `
${token.symbol} testing support:
$${data.price} at ${data.level}
Vol: ${data.volume}x avg
#${token.symbol}
            `.trim()
        }
    },

    // Generic Alert Template
    GENERIC: {
        template: (token, type, data) => `
${token.name} ($${token.symbol}) Alert:
Type: ${type}
Details: ${JSON.stringify(data, null, 2)}
#${token.symbol}
        `.trim()
    }
};

// Helper function to select template based on signal strength
export function selectTemplate(category, data) {
    switch (category) {
        case 'PUMP':
            if (data.probability > 0.7) return AlertTemplates.PUMP.STRONG;
            if (data.probability > 0.4) return AlertTemplates.PUMP.MODERATE;
            return AlertTemplates.PUMP.WEAK;
            
        case 'SENTIMENT':
            if (data.score > 0.7) return AlertTemplates.SENTIMENT.BULLISH;
            if (data.score > 0.4) return AlertTemplates.SENTIMENT.NEUTRAL;
            return AlertTemplates.SENTIMENT.BEARISH;
            
        case 'WHALE':
            return data.value > 1000000 ? 
                AlertTemplates.WHALE.LARGE : 
                AlertTemplates.WHALE.MEDIUM;
                
        case 'PRICE':
            return data.isBreakout ? 
                AlertTemplates.PRICE.BREAKOUT : 
                AlertTemplates.PRICE.SUPPORT;
                
        default:
            return AlertTemplates.GENERIC;
    }
}

// Format alert message using template
export function formatAlert(category, token, data) {
    try {
        const template = selectTemplate(category, data);
        return {
            title: template.title || `${token.symbol} Alert`,
            message: template.template(token, data)
        };
    } catch (error) {
        console.error('Error formatting alert:', error);
        return {
            title: `${token.symbol} Update`,
            message: AlertTemplates.GENERIC.template(token, category, data)
        };
    }
}
