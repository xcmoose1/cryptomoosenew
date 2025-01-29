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

## AmCharts Integration Guide

### Overview
This section provides a comprehensive guide on integrating AmCharts 5 into your project, specifically for creating cryptocurrency charts. We'll cover everything from basic setup to advanced features and troubleshooting.

### Prerequisites
- A valid AmCharts 5 license key (required for certain features)
- Basic understanding of HTML, CSS, and JavaScript
- Modern web browser with JavaScript enabled

### Step-by-Step Integration

#### 1. Loading Required Scripts
```html
<!-- Always load these scripts in this exact order -->
<script src="https://cdn.amcharts.com/lib/5/index.js"></script>
<script src="https://cdn.amcharts.com/lib/5/xy.js"></script>
<script src="https://cdn.amcharts.com/lib/5/themes/Dark.js"></script>
<script src="https://cdn.amcharts.com/lib/5/themes/Animated.js"></script>

<!-- Optional: Only if you need stock charts -->
<script src="https://cdn.amcharts.com/lib/5/stock.js"></script>
```

**Important Notes:**
- Scripts must be loaded in the correct order as shown above
- Place scripts at the bottom of the `<body>` tag for optimal loading
- Never initialize charts before scripts are fully loaded
- Use `defer` attribute if placing scripts in `<head>`

#### 2. HTML Structure
```html
<!-- Container for the chart -->
<div id="chartdiv" style="width: 100%; height: 500px;"></div>

<!-- Optional: Controls for chart interaction -->
<div class="controls">
    <button class="timeframe-btn">1H</button>
    <button class="indicator-btn">MA</button>
</div>
```

#### 3. License Configuration
```javascript
// Add this before any chart initialization
am5.addLicense("YOUR-LICENSE-KEY");
```

#### 4. Basic Chart Initialization
```javascript
// Wait for window load to ensure all scripts are ready
window.addEventListener('load', async () => {
    // Create root
    const root = am5.Root.new("chartdiv");
    
    // Set themes
    root.setThemes([
        am5themes_Dark.new(root),
        am5themes_Animated.new(root)
    ]);

    // Create chart
    const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
            panX: true,
            panY: true,
            wheelX: "panX",
            wheelY: "zoomX",
            pinchZoomX: true
        })
    );
});
```

#### 5. Creating Axes
```javascript
// Create X-axis (time-based)
const xAxis = chart.xAxes.push(
    am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: "minute", count: 1 },
        renderer: am5xy.AxisRendererX.new(root, {
            minGridDistance: 50,
            pan: "zoom"
        })
    })
);

// Create Y-axis (value-based)
const yAxis = chart.yAxes.push(
    am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, {
            pan: "zoom"
        })
    })
);
```

#### 6. Creating Series (Candlesticks)
```javascript
const series = chart.series.push(
    am5xy.CandlestickSeries.new(root, {
        name: "BTC/USDT",
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: "Close",
        openValueYField: "Open",
        lowValueYField: "Low",
        highValueYField: "High",
        valueXField: "Date",
        tooltip: am5.Tooltip.new(root, {
            pointerOrientation: "horizontal",
            labelText: "[bold]{name}[/]\nOpen: {openValueY}\nHigh: {highValueY}\nLow: {lowValueY}\nClose: {valueY}"
        })
    })
);
```

#### 7. Setting Colors and Styles
```javascript
// Set colors for rising and falling candles
series.columns.template.states.create("riseFromOpen", {
    fill: am5.color(0x00ff00),
    stroke: am5.color(0x00ff00)
});

series.columns.template.states.create("dropFromOpen", {
    fill: am5.color(0xff0000),
    stroke: am5.color(0xff0000)
});
```

#### 8. Adding Interactive Features
```javascript
// Add cursor
chart.set("cursor", am5xy.XYCursor.new(root, {
    behavior: "none",
    xAxis: xAxis,
    yAxis: yAxis
}));

// Add scrollbar
chart.set("scrollbarX", am5.Scrollbar.new(root, {
    orientation: "horizontal"
}));
```

### Common Pitfalls and Solutions

1. **Scripts Loading Order**
   - Problem: "Cannot read properties of undefined"
   - Solution: Ensure scripts are loaded in correct order and wait for window.load

2. **Chart Not Displaying**
   - Check container div has explicit height
   - Verify data format matches series field names exactly
   - Console.log data before setting to series

3. **Performance Issues**
   - Limit data points (500-1000 recommended)
   - Use data grouping for large datasets
   - Enable progressive loading for real-time data

### Best Practices

1. **Memory Management**
   ```javascript
   // Dispose chart when component unmounts
   root.dispose();
   ```

2. **Error Handling**
   ```javascript
   try {
       // Chart initialization code
   } catch (error) {
       console.error('Chart initialization failed:', error);
       // Fallback or error display logic
   }
   ```

3. **Data Updates**
   ```javascript
   // Efficient data updates
   series.data.setAll(data); // For complete refresh
   series.data.push(newData); // For adding single points
   ```

### Advanced Features

#### 1. Technical Indicators
```javascript
// Example: Adding Moving Average
const maSeries = chart.series.push(
    am5xy.LineSeries.new(root, {
        name: "MA(20)",
        xAxis: xAxis,
        yAxis: yAxis,
        valueXField: "Date",
        valueYField: "MA",
        stroke: am5.color(0x00ff00)
    })
);
```

#### 2. Real-time Updates
```javascript
// Example: WebSocket integration
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    series.data.push({
        Date: data.k.t,
        Open: parseFloat(data.k.o),
        High: parseFloat(data.k.h),
        Low: parseFloat(data.k.l),
        Close: parseFloat(data.k.c)
    });
};
```

### Debugging Tips

1. **Enable Verbose Logging**
   ```javascript
   am5.debug = true;
   ```

2. **Check Data Format**
   ```javascript
   console.log('Data sample:', {
       expectedFormat: {
           Date: 1643673600000,
           Open: 38000,
           High: 38500,
           Low: 37800,
           Close: 38200
       },
       actualData: data[0]
   });
   ```

3. **Verify DOM Ready**
   ```javascript
   console.log('Chart container:', document.getElementById('chartdiv'));
   console.log('Container dimensions:', {
       width: chartDiv.offsetWidth,
       height: chartDiv.offsetHeight
   });
   ```

### Additional Resources

1. [AmCharts 5 Documentation](https://www.amcharts.com/docs/v5/)
2. [API Reference](https://www.amcharts.com/docs/v5/reference/)
3. [Examples Gallery](https://www.amcharts.com/demos/)

### Support and Troubleshooting

If you encounter issues:
1. Check browser console for errors
2. Verify all prerequisites are met
3. Review the implementation against this guide
4. Search [AmCharts Support Forum](https://www.amcharts.com/support/forum/)

For project-specific questions, create an issue in our repository.

## Binance Integration Guide

### Overview
This section explains how to properly integrate Binance's API to fetch kline (candlestick) data and handle real-time updates. We'll cover both REST API and WebSocket implementations, along with proper error handling and rate limiting.

### Prerequisites
- Node.js server for proxy implementation (to avoid CORS issues)
- Basic understanding of REST APIs and WebSockets
- Familiarity with async/await and Promises

### Server-Side Setup (Proxy)

#### 1. Create Proxy Route
```javascript
// routes/binance-proxy.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

router.get('/klines', async (req, res) => {
    try {
        const { symbol, interval, limit } = req.query;
        const url = `${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

#### 2. Mount Proxy in Express Server
```javascript
// server.js
const express = require('express');
const app = express();
const binanceProxy = require('./routes/binance-proxy');

app.use('/api/binance', binanceProxy);
```

### Client-Side Implementation

#### 1. Binance Handler Class
```javascript
// js/config/binance-config.js
export class BinanceHandler {
    constructor() {
        this.baseUrl = 'http://localhost:3000/api/binance';
        this.timeframes = {
            '1m': '1m',
            '3m': '3m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1h',
            '2h': '2h',
            '4h': '4h',
            '6h': '6h',
            '8h': '8h',
            '12h': '12h',
            '1d': '1d',
            '3d': '3d',
            '1w': '1w',
            '1M': '1M'
        };
    }

    async makeRequest(endpoint, params = {}) {
        try {
            const queryParams = new URLSearchParams(params).toString();
            const url = `${this.baseUrl}${endpoint}?${queryParams}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    timeframeToInterval(timeframe) {
        return this.timeframes[timeframe] || '1h';
    }

    async getKlines(symbol, timeframe, limit = 500) {
        try {
            const params = {
                symbol: symbol.toUpperCase(),
                interval: this.timeframeToInterval(timeframe),
                limit: limit
            };
            
            const data = await this.makeRequest('/klines', params);
            
            // Validate response format
            if (!Array.isArray(data)) {
                throw new Error('Invalid response format');
            }

            return data;
        } catch (error) {
            console.error('Failed to fetch klines:', error);
            throw error;
        }
    }
}

// Create singleton instance
export const binanceHandler = new BinanceHandler();
```

### Understanding Kline Data

#### Kline Array Structure
Each kline (candlestick) from Binance API is an array with the following structure:
```javascript
[
    0  => Kline open time (timestamp in ms),
    1  => Open price,
    2  => High price,
    3  => Low price,
    4  => Close price,
    5  => Volume,
    6  => Kline close time,
    7  => Quote asset volume,
    8  => Number of trades,
    9  => Taker buy base asset volume,
    10 => Taker buy quote asset volume,
    11 => Unused field
]
```

#### Data Processing for AmCharts
```javascript
// Convert Binance data format to AmCharts format
function processKlineData(klines) {
    return klines.map(k => ({
        Date: k[0],  // timestamp
        Open: parseFloat(k[1]),
        High: parseFloat(k[2]),
        Low: parseFloat(k[3]),
        Close: parseFloat(k[4]),
        Volume: parseFloat(k[5])
    }));
}
```

### Real-time Updates with WebSocket

#### 1. WebSocket Setup
```javascript
class BinanceWebSocket {
    constructor(symbol, interval, onUpdate) {
        this.baseUrl = 'wss://stream.binance.com:9443/ws';
        this.symbol = symbol.toLowerCase();
        this.interval = interval;
        this.onUpdate = onUpdate;
        this.ws = null;
    }

    connect() {
        const streamName = `${this.symbol}@kline_${this.interval}`;
        this.ws = new WebSocket(`${this.baseUrl}/${streamName}`);

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.e === 'kline') {
                const kline = data.k;
                const candlestick = {
                    Date: kline.t,
                    Open: parseFloat(kline.o),
                    High: parseFloat(kline.h),
                    Low: parseFloat(kline.l),
                    Close: parseFloat(kline.c),
                    Volume: parseFloat(kline.v)
                };
                this.onUpdate(candlestick);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            // Implement reconnection logic if needed
            setTimeout(() => this.connect(), 5000);
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}
```

#### 2. Integration with AmCharts
```javascript
// Example usage in chart class
class BTCChart {
    constructor() {
        this.websocket = null;
        // ... other initialization code
    }

    setupRealTimeUpdates() {
        this.websocket = new BinanceWebSocket('BTCUSDT', '1m', (candlestick) => {
            const lastDataItem = this.mainSeries.data.getIndex(this.mainSeries.data.length - 1);
            
            if (lastDataItem && lastDataItem.Date === candlestick.Date) {
                // Update existing candle
                this.mainSeries.data.setIndex(this.mainSeries.data.length - 1, candlestick);
            } else {
                // Add new candle
                this.mainSeries.data.push(candlestick);
            }
        });
        this.websocket.connect();
    }

    dispose() {
        if (this.websocket) {
            this.websocket.disconnect();
        }
        // ... other cleanup code
    }
}
```

### Error Handling and Rate Limiting

#### 1. Rate Limit Implementation
```javascript
class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
    }

    async throttle() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = this.timeWindow - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.requests.push(now);
    }
}

// Usage in BinanceHandler
class BinanceHandler {
    constructor() {
        // Binance allows 1200 requests per minute
        this.rateLimiter = new RateLimiter(1000, 60000);
        // ... other initialization code
    }

    async makeRequest(endpoint, params = {}) {
        await this.rateLimiter.throttle();
        // ... rest of makeRequest implementation
    }
}
```

#### 2. Error Recovery
```javascript
class BinanceHandler {
    async getKlinesWithRetry(symbol, timeframe, limit = 500, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.getKlines(symbol, timeframe, limit);
            } catch (error) {
                if (attempt === maxRetries) throw error;
                
                const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
}
```

### Best Practices

1. **Data Management**
   - Cache frequently accessed data
   - Implement proper error boundaries
   - Use WebSocket for real-time updates
   - Handle reconnection scenarios

2. **Performance**
   - Limit initial data load (500-1000 candles)
   - Implement pagination for historical data
   - Use proper data structures for quick updates

3. **Error Handling**
   - Implement retry mechanisms
   - Handle network errors gracefully
   - Provide user feedback for API issues

4. **Security**
   - Always use proxy server to hide API keys
   - Implement rate limiting
   - Validate all input data

### Troubleshooting

1. **CORS Issues**
   - Ensure proxy server is properly configured
   - Check server error logs
   - Verify proxy endpoints match client configuration

2. **Rate Limiting**
   - Monitor API usage
   - Implement proper throttling
   - Cache frequently accessed data

3. **WebSocket Issues**
   - Implement reconnection logic
   - Handle connection drops
   - Monitor connection state

For more details on Binance API endpoints and WebSocket streams, refer to the [official Binance API documentation](https://binance-docs.github.io/apidocs/).

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
