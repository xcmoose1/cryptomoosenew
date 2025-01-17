import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { HTXDailyService } from '../services/htx-daily.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI();
const htxService = new HTXDailyService();

async function getCurrentBTCPrice() {
    return await htxService.getCurrentPrice('btc');
}

async function generateDailyUpdate() {
    try {
        const currentPrice = await getCurrentBTCPrice(); // You'll need to implement this using your preferred crypto API
        
        const prompt = `You are a professional crypto analyst and trader writing for CryptoMoose's members. Your task is to analyze the latest market developments and news, then create a comprehensive yet engaging article that helps members make informed trading decisions.

Based on the current BTC price of $${currentPrice} and recent market events, write an article that:

1. Starts with the most impactful news or market events (political, economic, or technical)
2. Explains how these events affect the crypto market
3. Provides specific, actionable trading advice for different scenarios
4. Includes risk management tips
5. Offers a market outlook with potential scenarios members should watch for

Make your analysis detailed but accessible. Include specific price levels, potential entry/exit points, and risk management strategies where relevant. If discussing political events (like elections), explain how different outcomes might affect the market and what positions members might consider.

Format your response as a JSON with a single 'content' field containing the article text. Use markdown formatting for headers and emphasis.

Example structure (but make it flow naturally):
- Key Market Events & Analysis
- How This Affects Your Trading
- What to Watch For
- Risk Management Tips
- Market Outlook

Be specific with numbers, prices, and percentages. Make it feel like professional trading advice while maintaining compliance by including necessary disclaimers.
}

Ensure all price levels are realistic based on the current BTC price. Include actual upcoming crypto events.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        const update = JSON.parse(completion.choices[0].message.content);
        
        // Update the HTML content
        let htmlPath = path.join(__dirname, '..', 'dashboard.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        // Update technical stance
        html = updateSection(html, 'stance-value', update.technical_stance);
        
        // Update metrics
        html = updateMetric(html, 'rsi', update.metrics.rsi);
        html = updateMetric(html, 'macd', update.metrics.macd);
        html = updateMetric(html, 'volume', update.metrics.volume);
        
        // Update price levels
        html = updatePriceLevels(html, update.price_levels);
        
        // Update catalysts
        html = updateListSection(html, 'catalysts', update.catalysts);
        
        // Update risks
        html = updateListSection(html, 'risks', update.risks);
        
        // Update outlook
        html = updateOutlook(html, update.outlook);
        
        // Update events
        html = updateListSection(html, 'events', update.events);
        
        // Update sentiment score
        html = updateSentiment(html, update.sentiment_score);
        
        // Update timestamp
        const now = new Date().toLocaleString();
        html = updateLastUpdated(html, `Updated: ${now}`);

        fs.writeFileSync(htmlPath, html);
        console.log('Daily update completed successfully');
    } catch (error) {
        console.error('Error generating daily update:', error);
    }
}

function updateSection(html, className, value) {
    const regex = new RegExp(`<span class="${className}.*?">[^<]*</span>`);
    return html.replace(regex, `<span class="${className}">${value}</span>`);
}

function updateMetric(html, metric, value) {
    const regex = new RegExp(`<span class="value" data-metric="${metric}">[^<]*</span>`);
    return html.replace(regex, `<span class="value" data-metric="${metric}">${value}</span>`);
}

function updatePriceLevels(html, levels) {
    let result = html;
    
    // Update resistance levels
    const resistanceRegex = /<div class="resistance">[\s\S]*?<ul>([\s\S]*?)<\/ul>/;
    const resistanceHtml = levels.resistance.map(price => `<li>${price}</li>`).join('\n');
    result = result.replace(resistanceRegex, `<div class="resistance">\n<h4>Resistance</h4>\n<ul>${resistanceHtml}</ul>`);
    
    // Update support levels
    const supportRegex = /<div class="support">[\s\S]*?<ul>([\s\S]*?)<\/ul>/;
    const supportHtml = levels.support.map(price => `<li>${price}</li>`).join('\n');
    result = result.replace(supportRegex, `<div class="support">\n<h4>Support</h4>\n<ul>${supportHtml}</ul>`);
    
    return result;
}

function updateListSection(html, section, items) {
    const regex = new RegExp(`<div class="${section}">[\s\S]*?<ul>([\s\S]*?)<\/ul>`);
    const itemsHtml = items.map(item => `<li>${item}</li>`).join('\n');
    return html.replace(regex, `<div class="${section}">\n<h4>${section.charAt(0).toUpperCase() + section.slice(1)}</h4>\n<ul>${itemsHtml}</ul>`);
}

function updateOutlook(html, outlook) {
    const regex = /<div class="outlook">[\s\S]*?<p>([\s\S]*?)<\/p>/;
    return html.replace(regex, `<div class="outlook">\n<h4>7-Day Outlook</h4>\n<p>${outlook}</p>`);
}

function updateSentiment(html, score) {
    const regex = /<span class="score .*?">[^<]*<\/span>/;
    const sentiment = score >= 7 ? 'positive' : score >= 4 ? 'neutral' : 'negative';
    return html.replace(regex, `<span class="score ${sentiment}">${score}</span>`);
}

function updateLastUpdated(html, timestamp) {
    const regex = /<div class="last-updated">[^<]*<\/div>/;
    return html.replace(regex, `<div class="last-updated">${timestamp}</div>`);
}

// Run update every 24 hours
generateDailyUpdate();
setInterval(generateDailyUpdate, 24 * 60 * 60 * 1000);
