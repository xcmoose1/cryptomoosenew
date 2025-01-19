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

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Sections Not Loading
- **Issue**: Dashboard sections (Market Analysis, Altcoin Analysis, etc.) not appearing
- **Solutions**:
  - Check browser console for JavaScript errors
  - Verify all section files exist in correct structure: `/sections/{section-name}/{section-name}.{html|js|css}`
  - Clear browser cache and refresh
  - Ensure section loader is properly initialized in members.html

#### 2. API Rate Limits
- **Issue**: Data not updating or showing errors
- **Solutions**:
  - Check API rate limit status in browser console
  - Verify request throttling is working (2-second delay between requests)
  - Use cached data when available (24-hour cache for most endpoints)
  - If persistent, consider upgrading to API pro plans

#### 3. Performance Issues
- **Issue**: Slow loading times or high CPU usage
- **Solutions**:
  - Enable browser caching
  - Check network tab for large file transfers
  - Verify update intervals are not too frequent
  - Monitor memory usage in browser dev tools

#### 4. Data Inconsistencies
- **Issue**: Incorrect or outdated market data
- **Solutions**:
  - Clear local storage cache
  - Check API endpoint status
  - Verify timezone settings
  - Ensure all services are properly initialized

#### 5. UI/Layout Problems
- **Issue**: Broken layouts or styling issues
- **Solutions**:
  - Verify CSS classes are not duplicated
  - Check responsive design breakpoints
  - Clear browser cache and reload
  - Test in different browsers

### Getting Help
If you encounter issues not covered here:
1. Check the latest commits in the repository
2. Open an issue with detailed description and screenshots
3. Join our community chat for real-time support
4. Review documentation for recent changes

### Contributing
Found a bug or want to contribute a fix? Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed description
4. Include any relevant updates to this troubleshooting guide

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
