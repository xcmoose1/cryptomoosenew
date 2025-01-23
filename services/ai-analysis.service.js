// AI Analysis Service
class AIAnalysisService {
    constructor(openai) {
        this.openai = openai;
        // Initialize caches with TTL
        this.analysisCache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
        
        // Initialize thresholds for traditional analysis
        this.thresholds = {
            significantPriceChange: 5, // 5% price change
            significantVolumeChange: 2, // 2x volume increase
            minSocialMentions: 100,    // minimum social mentions
        };
    }

    clearOldCache() {
        const now = Date.now();
        for (const [key, value] of this.analysisCache.entries()) {
            if (now - value.timestamp > this.cacheTTL) {
                this.analysisCache.delete(key);
            }
        }
    }

    getCachedAnalysis(key) {
        this.clearOldCache();
        const cached = this.analysisCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }

    setCachedAnalysis(key, data) {
        this.analysisCache.set(key, {
            timestamp: Date.now(),
            data
        });
    }

    // Traditional analysis without GPT-4
    analyzeTraditional(priceData, volumeData) {
        const priceChange = Math.abs(priceData.change24h);
        const volumeChange = volumeData.volumeChange;
        
        let probability = 0;
        const reasons = [];
        
        // Price analysis
        if (priceChange > this.thresholds.significantPriceChange) {
            probability += 0.3;
            reasons.push(`Price changed by ${priceChange.toFixed(2)}% in 24h`);
        }
        
        // Volume analysis
        if (volumeChange > this.thresholds.significantVolumeChange) {
            probability += 0.3;
            reasons.push(`Volume increased ${volumeChange.toFixed(1)}x`);
        }
        
        // Trend analysis
        if (priceData.change24h > 0 && volumeChange > 1) {
            probability += 0.2;
            reasons.push('Positive price trend with increasing volume');
        }
        
        return {
            probability: Math.min(probability, 1),
            reasons,
            confidence: 0.7
        };
    }

    // Traditional social sentiment analysis
    analyzeSocialTraditional(data) {
        let score = 0;
        const topics = [];
        
        // Twitter analysis
        if (data.twitter.mentions > this.thresholds.minSocialMentions) {
            score += 0.3;
            topics.push(`High Twitter activity: ${data.twitter.mentions} mentions`);
        }
        
        // Reddit analysis
        if (data.reddit.posts > this.thresholds.minSocialMentions / 2) {
            score += 0.3;
            topics.push(`Active Reddit discussion: ${data.reddit.posts} posts`);
        }
        
        // Telegram analysis
        if (data.telegram.members > 1000) {
            score += 0.2;
            topics.push(`Large Telegram community: ${data.telegram.members} members`);
        }
        
        return {
            score: Math.min(score, 1),
            topics,
            confidence: 0.7
        };
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
            // Generate cache key
            const cacheKey = `pump_${token.symbol}_${priceData.price}_${volumeData.volumeChange}`;
            
            // Check cache first
            const cached = this.getCachedAnalysis(cacheKey);
            if (cached) {
                return cached;
            }
            
            // Do traditional analysis first
            const traditionalAnalysis = this.analyzeTraditional(priceData, volumeData);
            
            // Only use GPT-4 if traditional analysis shows significant potential
            if (traditionalAnalysis.probability < 0.5) {
                return traditionalAnalysis;
            }

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

            const result = {
                probability: this.extractProbability(analysis),
                timeframe: this.extractTimeframe(analysis),
                reasons: this.extractReasons(analysis),
                currentPrice: priceData.price,
                priceChange24h: priceData.change24h,
                volumeIncrease: volumeData.volumeChange
            };

            // Cache the result
            this.setCachedAnalysis(cacheKey, result);
            return result;

        } catch (error) {
            console.error('Error analyzing pump potential:', error);
            // Fall back to traditional analysis on error
            return this.analyzeTraditional(priceData, volumeData);
        }
    }

    async analyzeSocialSentiment(data) {
        try {
            // Generate cache key
            const cacheKey = `sentiment_${JSON.stringify(data)}`;
            
            // Check cache first
            const cached = this.getCachedAnalysis(cacheKey);
            if (cached) {
                return cached;
            }
            
            // Do traditional analysis first
            const traditionalAnalysis = this.analyzeSocialTraditional(data);
            
            // Only use GPT-4 if there's significant social activity
            if (traditionalAnalysis.score < 0.5) {
                return traditionalAnalysis;
            }

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

            const result = {
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

            // Cache the result
            this.setCachedAnalysis(cacheKey, result);
            return result;

        } catch (error) {
            console.error('Error analyzing social sentiment:', error);
            // Fall back to traditional analysis on error
            return this.analyzeSocialTraditional(data);
        }
    }
}

// Export as default
export default AIAnalysisService;
