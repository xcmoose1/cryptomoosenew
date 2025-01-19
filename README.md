# CryptoMoose - Advanced Crypto Market Analysis Platform

## Overview
CryptoMoose is a comprehensive cryptocurrency market analysis platform that provides real-time market data, technical analysis, on-chain metrics, and sector analysis. Built with modern web technologies and integrating multiple free APIs, it offers professional-grade analysis tools without subscription costs.

## Key Features

### 1. News Center
- Professional crypto market analysis and insights
- Reliable news aggregation from trusted sources:
  - CryptoCompare News API (real-time)
  - CoinDesk RSS
  - Cointelegraph RSS
  - Bitcoin Magazine RSS
  - Financial Times Markets
  - Wall Street Journal Markets
  - Federal Reserve Updates
- Daily market digest featuring:
  - Market sentiment analysis
  - Global economic impact analysis
  - Crypto market trends
  - Trading opportunities
  - Risk management advice
- AI-powered analysis using GPT-4:
  - Concise, actionable insights
  - Market context integration
  - Trading strategy recommendations
  - Key price levels and trends
- Smart caching system (12-hour refresh)
- Clean, modern interface with real-time updates

### 2. Technical Analysis Hub
- Real-time price data from HTX Exchange
- Multiple timeframe support (1m to 1W)
- Advanced technical indicators
- Pattern recognition
- Volume analysis with dynamic profile
- Support/Resistance detection
- Multi-timeframe analysis

### 3. Learning Center
- Comprehensive trading courses
- Technical analysis guides
- Risk management tutorials
- Market psychology lessons
- Interactive learning modules

### 4. Market Intelligence
- Real-time market sentiment indicators
- Sector performance tracking
- On-chain analytics
- Whale activity monitoring
- Cross-market correlation analysis

### 5. Trading Signals
- Automated trading signal generation
- Technical analysis indicators
- Real-time signal notifications via Telegram
- Signal history and performance tracking

### 6. Social Media Strategy
- Thoughtful market analysis and insights
- Integration with Buffer for scheduled posting
- Focus on macro trends and policy impacts
- Community engagement and thought leadership

#### Content Philosophy
Our social media presence aims to provide deep, thoughtful analysis that connects market movements with broader context:
- Political and policy implications
- Historical pattern analysis
- Institutional money flows
- Global macro trends

#### Content Types
1. **Market Analysis with Context**
   - Connect price action with global events
   - Highlight institutional movements
   - Provide actionable insights

2. **Policy Impact Analysis**
   - Political developments affecting crypto
   - Regulatory landscape changes
   - Global policy shifts

3. **Historical Pattern Analysis**
   - Market cycle comparisons
   - Behavioral analysis
   - Pattern recognition

#### Writing Style Guide
- Conversational yet professional tone
- Focus on narrative and context
- Connect technical analysis with real-world events
- Encourage discussion and engagement
- Avoid hyperbole and excessive emojis
- Maintain credibility while being accessible

#### Posting Schedule
- Strategic content: 4-6 times daily
- Market updates: Based on significant movements
- Weekly deep dives: Policy and trend analysis
- Monthly market outlook: Comprehensive analysis

### 7. Market Overview
The Market Overview feature provides a comprehensive daily analysis of the cryptocurrency market using AI-powered insights and real-time data from CoinGecko. It includes:

- Total market capitalization and 24h changes
- BTC dominance analysis
- Chain-specific volume analysis
- Technical stance and market trends
- Key support/resistance levels
- Market catalysts and risks
- Upcoming events
- Market sentiment score

The overview is automatically updated every 5 minutes to ensure fresh data, while using intelligent caching to prevent API rate limits.

## Technology Stack

### Frontend
- Modern HTML5/CSS3/JavaScript
- Real-time WebSocket connections
- Responsive design for all devices
- Dark theme optimized for traders

### Backend
- Node.js with Express
- OpenAI GPT-4 integration
- RSS feed aggregation
- Intelligent caching system
- Rate limiting protection

### APIs and Data Sources
- HTX Exchange WebSocket API
- CryptoCompare News API
- Professional RSS feeds:
  - Major crypto news sources
  - Traditional finance outlets
  - Central bank updates
- OpenAI GPT-4 API
- Free market data APIs
- CryptoRank API
- Finnhub API
- AlphaVantage API
- Buffer API for social media automation
- CoinGecko API for market data

## Setup and Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/cryptomoose.git
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Add your OpenAI API key, CryptoRank API key, Finnhub API key, AlphaVantage API key, Telegram bot token, and Telegram channel ID to .env
```

4. Start the server
```bash
node server.js
```

5. Access the platform
```
http://localhost:3000
```

## Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key for GPT-4 integration
- `CRYPTORANK_API_KEY`: Your CryptoRank API key
- `FINNHUB_API_KEY`: Your Finnhub API key
- `ALPHAVANTAGE_API_KEY`: Your AlphaVantage API key
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `TELEGRAM_CHANNEL_ID`: Your Telegram channel ID
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

## Troubleshooting

### Daily Digest Issues

#### 1. "Cannot GET /daily_digest.html" Error
If you see this error, check that:
- The server is running (`node server/server.js`)
- Static file serving is properly configured in `server.js`
- The file exists in the root directory

Solution:
```javascript
// In server.js, ensure you have:
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        } else if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));
```

#### 2. "Failed to fetch digest" Error
This usually occurs when:
- The data directory doesn't exist
- Cache file permissions are incorrect
- OpenAI API key is missing or invalid

Solutions:
1. Check data directory:
```javascript
// In daily-digest-service.js:
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
```

2. Verify environment variables:
```bash
# In .env file:
OPENAI_API_KEY=your_api_key_here
```

3. Clear the cache:
```bash
rm -f data/daily_digest_cache.json
```

#### 3. WebSocket Connection Issues
If you see WebSocket errors:
1. Check that the WebSocket server is properly initialized
2. Ensure proper error handling is in place
3. Verify the client is using the correct WebSocket URL

Solution:
```javascript
// In server.js:
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});
```

### Market Overview Issues

#### 1. "Failed to parse market analysis response" Error
This error occurs when there's an issue with the OpenAI API response. To fix:
- Check that your OpenAI API key is valid and properly set in `.env`
- Ensure you have sufficient API credits
- Try refreshing the page and clicking the update button again
- Check the browser console and server logs for specific error details

If the error persists:
1. Stop the server
2. Clear the browser cache
3. Delete the `.env` file and recreate it with your API key
4. Restart the server with `node server/server.js`

#### 2. Loading State Stuck
If the market overview stays in "Loading..." state:
- Check that the server is running
- Verify your internet connection
- Check the browser console for errors
- Try closing and reopening the modal

#### 3. Missing or Incorrect Data
If you see incomplete or incorrect market data:
- Ensure CoinGecko API is accessible (sometimes it has rate limits)
- Check that all required environment variables are set
- Try clearing your browser cache
- Restart the server

### General Debugging Tips
1. Check server logs for errors
2. Verify all required dependencies are installed
3. Ensure proper CORS headers are set
4. Check file permissions in the data directory
5. Verify API keys and environment variables

For any other issues, please submit a GitHub issue with:
- Error message and stack trace
- Steps to reproduce
- Environment details (Node.js version, OS, etc.)

## Features in Development
- Enhanced social sentiment analysis
- Advanced pattern recognition
- Portfolio tracking system
- Custom alert system
- Mobile app version

## Contributing
We welcome contributions! Please see our contributing guidelines for more details.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Support
For support, please join our community:
- Telegram: [CryptoMoose Community]
- GitHub Issues: [Report a bug]

## Acknowledgments
- HTX Exchange for real-time market data
- OpenAI for GPT-4 API
- All the news sources that provide RSS feeds
- Our amazing community of traders and developers
- CryptoRank for market data
- Finnhub for market data
- AlphaVantage for market data
- CoinGecko for market data
