// Load environment variables first, before any other imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Check if OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
    console.error('WARNING: OPENAI_API_KEY is not set in environment variables');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHANNEL_ID) {
    console.error('Missing required environment variables:');
    console.error('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
    console.error('TELEGRAM_CHANNEL_ID:', process.env.TELEGRAM_CHANNEL_ID);
    process.exit(1);
}

console.log('Environment variables loaded:');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
console.log('TELEGRAM_CHANNEL_ID:', process.env.TELEGRAM_CHANNEL_ID);

// Now import everything else
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import http from 'http';
import opportunitiesRouter from '../routes/opportunities.js';
import dailyDigestRouter from '../routes/daily-digest.js';
import klineRoutes from '../routes/klines.js';
import advancedTARoutes from '../routes/advanced-ta.js';
import marketIntelligenceRouter from '../routes/market-intelligence.js';
import indicatorsRouter from '../routes/indicators.js';
import authRoutes from '../routes/auth.js';
import userRoutes from '../routes/user.js';
import aiRoutes from '../routes/ai-insights.js';
import { HTXDailyService } from '../services/htx-daily.service.js';
import signalsRouter from '../signals/routes/signals-routes.js';
import marketOverviewRouter from '../routes/market-overview.js';
import binanceProxyRouter from '../routes/binance-proxy.js';
import { WebSocketServer } from 'ws';

// Rate Limiter implementation
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.weightLimit = 100;  // HTX limit per second
        this.ipLimit = 100;     // requests per second
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
    }

    cleanup() {
        const now = Date.now();
        for (const [ip, data] of this.requests.entries()) {
            if (now - data.timestamp > 60000) { // Remove entries older than 1 minute
                this.requests.delete(ip);
            }
        }
    }

    throttle(ip, weight = 1) {
        const now = Date.now();
        let data = this.requests.get(ip);
        
        if (!data) {
            data = {
                count: 0,
                weight: 0,
                timestamp: now
            };
            this.requests.set(ip, data);
        }
        
        // Reset counters if more than a second has passed
        if (now - data.timestamp > 1000) {
            data.count = 0;
            data.weight = 0;
            data.timestamp = now;
        }
        
        // Check limits
        if (data.count >= this.ipLimit || data.weight + weight > this.weightLimit) {
            return false;
        }
        
        // Update counters
        data.count++;
        data.weight += weight;
        return true;
    }
}

// Create Express app and server
const app = express();
const server = http.createServer(app);

// Initialize WebSocket server first
const wss = new WebSocketServer({ 
    server,
    path: '/ws'  // Specify WebSocket path
});

// Health check endpoint - make this the first route
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// Serve static files from root directory
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

// Mount API routes
app.use('/api/daily-digest', dailyDigestRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/klines', klineRoutes);
app.use('/api/advanced-ta', advancedTARoutes);
app.use('/api/market-intelligence', marketIntelligenceRouter);
app.use('/api/indicators', indicatorsRouter);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/signals', signalsRouter);
app.use('/api/market-overview', marketOverviewRouter);
app.use('/api/binance', binanceProxyRouter);

// Create a separate instance for daily updates
const htxDailyService = new HTXDailyService();

// Rate limiter middleware
const rateLimiter = new RateLimiter();
app.use((req, res, next) => {
    try {
        const weight = req.path.includes('/market/history') ? 2 : 1;
        if (rateLimiter.throttle(req.ip, weight)) {
            next();
        } else {
            res.status(429).json({
                status: 'error',
                message: 'Too many requests'
            });
        }
    } catch (error) {
        next(error);
    }
});

// Serve images
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

// Serve section files
app.use('/sections', express.static(path.join(__dirname, '..', 'sections')));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'new-ai-insights.html'));
});

// Daily digest route
app.get('/daily-digest', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'daily_digest.html'));
});

// Constants
const PORT = process.env.PORT || 10000;

// Initialize services and start server
async function initializeServices() {
    console.log('Initializing services...');
    const signalsService = new (await import('../signals/services/signals-service.js')).SignalsService();
    await signalsService.initialize();
    await signalsService.initializeService();
    return signalsService;
}

let signalsService;
initializeServices().then(s => {
    signalsService = s;
    // WebSocket connection handler
    wss.on('connection', (ws, req) => {
        console.log('WebSocket client connected from:', req.socket.remoteAddress);
        try {
            if (signalsService && typeof signalsService.handleWebSocketConnection === 'function') {
                signalsService.handleWebSocketConnection(ws);
            } else {
                console.error('SignalsService not properly initialized');
                ws.close();
            }
        } catch (error) {
            console.error('Error handling WebSocket connection:', error);
            ws.close();
        }
    });

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Server URL: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
        console.log(`WebSocket URL: ${process.env.RENDER_EXTERNAL_URL ? process.env.RENDER_EXTERNAL_URL.replace('http', 'ws') : `ws://localhost:${PORT}`}/ws`);
    });
}).catch(error => {
    console.error('Error initializing services:', error);
    process.exit(1);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const timeframeMap = {
    '1m': '1min',
    '3m': '3min',
    '5m': '5min',
    '15m': '15min',
    '30m': '30min',
    '1h': '60min',
    '2h': '120min',
    '4h': '4hour',
    '6h': '6hour',
    '12h': '12hour',
    '1d': '1day',
    '1w': '1week',
    '1M': '1mon'
};

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
