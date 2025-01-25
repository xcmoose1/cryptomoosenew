import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const CONTENT_PROMPTS = {
    market: `You are a professional crypto analyst writing a tweet. Use the following market data to create an insightful, engaging tweet about current market conditions. Include key levels and a clear perspective. Keep it under 280 characters. Use a confident but measured tone.

Market Data: {marketData}

Format:
- Start with a clear market observation
- Include 1-2 key price levels or metrics
- End with a concise insight
- Add relevant hashtags`,

    policy: `You are a crypto policy expert writing a tweet. Analyze the following policy development and its market implications. Keep it under 280 characters. Use a professional, analytical tone.

Policy Data: {policyData}

Format:
- Summarize the policy development
- Note potential market impact
- Include your expert perspective
- Add relevant hashtags`,

    historical: `You are a crypto market historian writing a tweet. Compare the current market conditions with historical patterns. Keep it under 280 characters. Use an educational, insightful tone.

Current Data: {currentData}
Historical Pattern: {historicalData}

Format:
- Note the historical parallel
- Highlight key similarities
- Share potential implications
- Add relevant hashtags`,

    signals: `You are a technical analyst writing a tweet about current market signals. Use the following data to create an actionable insight. Keep it under 280 characters. Use a precise, technical tone.

Signal Data: {signalData}

Format:
- Highlight key signal(s)
- Note important levels
- Share potential scenario
- Add relevant hashtags`
};

export async function generateContent(type, data) {
    try {
        // Validate and sanitize input data
        const sanitizedData = {
            marketData: data.marketData || 'Market data currently unavailable',
            policyData: data.policyData || 'Policy data currently unavailable',
            currentData: data.currentData || 'Current market data unavailable',
            historicalData: data.historicalData || 'Historical data unavailable',
            signalData: data.signalData || 'Signal data unavailable'
        };

        // Get the appropriate prompt
        const prompt = CONTENT_PROMPTS[type].replace(
            /\{(\w+)\}/g,
            (match, key) => sanitizedData[key] || 'Data unavailable'
        );

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a professional crypto analyst writing engaging social media content. Your tweets are insightful, data-driven, and maintain a professional tone. If data is unavailable, acknowledge it professionally and focus on what information you do have."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150,
            temperature: 0.7
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error generating content:', error);
        // Return a fallback message if GPT fails
        return `Analyzing the latest market movements. Stay tuned for updates. #CryptoMarkets #Trading`;
    }
}

export async function generateVariations(content, count = 3) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "Generate variations of the given tweet while maintaining the same key information and professional tone. Each variation should be unique in style but consistent in message."
                },
                {
                    role: "user",
                    content: `Generate ${count} variations of this tweet, keeping them under 280 characters:\n\n${content}`
                }
            ],
            max_tokens: 300,
            temperature: 0.8
        });

        return completion.choices[0].message.content.split('\n\n');
    } catch (error) {
        console.error('Error generating variations:', error);
        throw error;
    }
}
