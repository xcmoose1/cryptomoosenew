export class SignalsDisplay {
    constructor() {
        if (SignalsDisplay.instance) {
            return SignalsDisplay.instance;
        }
        SignalsDisplay.instance = this;
        
        this.signals = [];
        this.systemMessages = [];
        this.signalsContainer = null;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
    }

    init() {
        console.log('SignalsDisplay: Initializing...');
        this.signalsContainer = document.getElementById('signals-container');
        if (!this.signalsContainer) {
            console.error('SignalsDisplay: Could not find signals container!');
            return;
        }
        this.setupWebSocket();
        console.log('SignalsDisplay: Initialization complete');
    }

    setupWebSocket() {
        if (this.ws) {
            console.log('SignalsDisplay: WebSocket already exists, closing...');
            this.ws.close();
        }

        // Use secure WebSocket if the page is served over HTTPS
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log(`SignalsDisplay: Connecting to WebSocket at ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('SignalsDisplay: WebSocket connected');
            this.reconnectAttempts = 0;
            // Add initial connection message
            this.handleSystemMessage({
                message: '🔌 Connected to signal service',
                timestamp: Date.now(),
                status: 'connected'
            });
        };
        
        this.ws.onmessage = (event) => {
            console.log('SignalsDisplay: Received message:', event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'system') {
                    this.handleSystemMessage(data.data);
                } else if (data.type === 'signal') {
                    this.handleSignal(data.data);
                }
            } catch (error) {
                console.error('SignalsDisplay: Error parsing message:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('SignalsDisplay: WebSocket connection closed');
            this.handleSystemMessage({
                message: '🔌 Disconnected from signal service',
                timestamp: Date.now(),
                status: 'disconnected'
            });
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`SignalsDisplay: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                setTimeout(() => this.setupWebSocket(), this.reconnectDelay);
            } else {
                console.error('SignalsDisplay: Max reconnection attempts reached');
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('SignalsDisplay: WebSocket error:', error);
        };
    }

    handleSystemMessage(message) {
        console.log('SignalsDisplay: Handling system message:', message);
        this.systemMessages.push(message);
        this.updateDisplay();
    }

    handleSignal(signal) {
        console.log('SignalsDisplay: Handling signal:', signal);
        this.signals.push(signal);
        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.signalsContainer) {
            console.error('SignalsDisplay: No signals container found!');
            return;
        }

        console.log('SignalsDisplay: Updating display');
        
        // Clear the container
        this.signalsContainer.innerHTML = '';

        // Display system messages first
        this.systemMessages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'system-message';
            messageDiv.innerHTML = `
                <div class="message-content">
                    <span class="message-text">${msg.message}</span>
                    <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
            `;
            this.signalsContainer.appendChild(messageDiv);
        });

        // Display signals
        this.signals.forEach(signal => {
            const signalDiv = document.createElement('div');
            signalDiv.className = `signal-card ${signal.type.toLowerCase()}`;
            signalDiv.innerHTML = `
                <div class="signal-header">
                    <span class="signal-pair">${signal.pair}</span>
                    <span class="signal-type">${signal.type}</span>
                    <span class="signal-time">${new Date(signal.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="signal-body">
                    <div class="signal-price">Entry: ${signal.price}</div>
                    <div class="signal-stop">Stop: ${signal.stopLoss}</div>
                    <div class="signal-targets">
                        ${signal.targets.map((t, i) => `<div>Target ${i + 1}: ${t}</div>`).join('')}
                    </div>
                </div>
            `;
            this.signalsContainer.appendChild(signalDiv);
        });
    }
}

// Create and export singleton instance
const signalsDisplay = new SignalsDisplay();
export { signalsDisplay };
