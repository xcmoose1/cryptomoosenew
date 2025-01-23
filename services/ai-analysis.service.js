// AI Analysis Service
export class AIAnalysisService {
    constructor(openai) {
        this.openai = openai;
    }

    extractProbability(analysis) {
        try {
            // Extract probability from AI response
            const content = analysis.choices[0].message.content;
            const match = content.match(/probability:\s*(0\.\d+|\d+)/i);
            return match ? parseFloat(match[1]) : 0.5;
        } catch (error) {
            console.error('Error extracting probability:', error);
            return 0.5;
        }
    }

    extractReasons(analysis) {
        try {
            // Extract reasons from AI response
            const content = analysis.choices[0].message.content;
            const reasonsMatch = content.match(/reasons:([\s\S]*?)(?=\n\n|$)/i);
            if (reasonsMatch) {
                return reasonsMatch[1].split('\n')
                    .map(line => line.trim())
                    .filter(line => line.startsWith('-') || line.startsWith('•'))
                    .map(line => line.replace(/^[-•]\s*/, ''));
            }
            return ['Market conditions indicate potential movement'];
        } catch (error) {
            console.error('Error extracting reasons:', error);
            return ['Market analysis incomplete'];
        }
    }

    extractTimeframe(analysis) {
        try {
            // Extract timeframe from AI response
            const content = analysis.choices[0].message.content;
            const match = content.match(/timeframe:\s*([^\n]+)/i);
            return match ? match[1].trim() : '24 hours';
        } catch (error) {
            console.error('Error extracting timeframe:', error);
            return '24 hours';
        }
    }

    async analyzePumpPotential(token, priceData, volumeData) {
        try {
            const analysis = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "You are a crypto trading expert analyzing meme token pump potential."
                }, {
                    role: "user",
                    content: `Analyze pump potential for ${token.symbol} with the following data:
                             Price: ${JSON.stringify(priceData)}
                             Volume: ${JSON.stringify(volumeData)}
                             
                             Respond in this format:
                             Probability: (number between 0-1)
                             Timeframe: (expected timeframe)
                             Reasons:
                             - (reason 1)
                             - (reason 2)
                             ...`
                }]
            });

            return {
                probability: this.extractProbability(analysis),
                timeframe: this.extractTimeframe(analysis),
                reasons: this.extractReasons(analysis),
                currentPrice: priceData.price,
                priceChange24h: priceData.change24h,
                volumeIncrease: volumeData.volumeChange
            };
        } catch (error) {
            console.error('Error analyzing pump potential:', error);
            return {
                probability: 0,
                timeframe: '24 hours',
                reasons: ['Analysis error'],
                currentPrice: priceData.price,
                priceChange24h: priceData.change24h,
                volumeIncrease: volumeData.volumeChange
            };
        }
    }

    async analyzeSocialSentiment(data) {
        try {
            const analysis = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "You are analyzing social media sentiment for a cryptocurrency."
                }, {
                    role: "user",
                    content: `Analyze social sentiment from multiple platforms:
                             ${JSON.stringify(data, null, 2)}
                             
                             Calculate an overall sentiment score (0-1) and identify key topics.`
                }]
            });

            const content = analysis.choices[0].message.content;
            const scoreMatch = content.match(/score:\s*(0\.\d+|\d+)/i);
            const topicsMatch = content.match(/topics:([\s\S]*?)(?=\n\n|$)/i);

            return {
                score: scoreMatch ? parseFloat(scoreMatch[1]) : 0.5,
                topics: topicsMatch ? 
                    topicsMatch[1].split('\n')
                        .map(line => line.trim())
                        .filter(line => line.startsWith('-') || line.startsWith('•'))
                        .map(line => line.replace(/^[-•]\s*/, ''))
                    : ['General market interest'],
                twitter: data.twitter,
                reddit: data.reddit,
                telegram: data.telegram
            };
        } catch (error) {
            console.error('Error analyzing social sentiment:', error);
            return {
                score: 0.5,
                topics: ['Analysis incomplete'],
                twitter: data.twitter,
                reddit: data.reddit,
                telegram: data.telegram
            };
        }
    }
}
