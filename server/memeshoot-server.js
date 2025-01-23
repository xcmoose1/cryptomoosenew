import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import WebSocket from 'ws';
import { MemeMonitorService } from '../services/meme-monitor.service.js';

// Create Express app
const app = express();
const server = http.createServer(app);

// Create WebSocket server for MemeShoot clients
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set();

// Initialize MemeMonitor service
const memeMonitor = new MemeMonitorService();

// Connect to main server
const mainServerWs = new WebSocket(process.env.MAIN_SERVER_URL);

mainServerWs.on('open', () => {
    console.log('Connected to main server');
});

mainServerWs.on('error', (error) => {
    console.error('Error connecting to main server:', error);
});

mainServerWs.on('close', () => {
    console.log('Disconnected from main server, attempting to reconnect...');
    setTimeout(() => {
        mainServerWs.connect(process.env.MAIN_SERVER_URL);
    }, 5000);
});

// Handle WebSocket connections from clients
wss.on('connection', (ws) => {
    // Add client to set
    clients.add(ws);
    console.log('MemeShoot client connected, total clients:', clients.size);

    // Send initial status
    ws.send(JSON.stringify({
        type: 'status',
        monitor: 'priceMonitor',
        message: 'Monitoring price movements...'
    }));

    // Handle client disconnection
    ws.on('close', () => {
        clients.delete(ws);
        console.log('MemeShoot client disconnected, remaining clients:', clients.size);
    });
});

// Broadcast alert to all connected clients and main server
function broadcastAlert(alert) {
    const message = JSON.stringify({
        type: 'alert',
        alert
    });

    // Send to clients
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });

    // Send to main server
    if (mainServerWs.readyState === WebSocket.OPEN) {
        mainServerWs.send(message);
    }
}

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Health check endpoint
app.get('/healthz', (req, res) => {
    res.status(200).send('OK');
});

// Start server
const PORT = process.env.PORT || 10001;
server.listen(PORT, () => {
    console.log(`MemeShoot worker running on port ${PORT}`);
});

// Export for use in other modules
export { broadcastAlert };
