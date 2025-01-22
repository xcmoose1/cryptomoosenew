export class SignalsDisplay {
    constructor() {
        if (SignalsDisplay.instance) {
            return SignalsDisplay.instance;
        }
        SignalsDisplay.instance = this;
        
        this.signals = [];
        this.systemMessages = [];
        this.pairPrices = new Map();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
    }

    init() {
        console.log('SignalsDisplay: Initializing...');
        this.signalsGrid = document.querySelector('.signals-grid');
        this.pairList = document.querySelector('.pair-list');
        this.connectionStatus = document.querySelector('.connection-status');
        this.statusIndicator = document.querySelector('.status-indicator');
        this.statusText = this.connectionStatus.querySelector('span');
        
        if (!this.signalsGrid || !this.pairList) {
            console.error('SignalsDisplay: Could not find required elements!');
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
        const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}/signals`;
        
        console.log(`SignalsDisplay: Connecting to WebSocket at ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('SignalsDisplay: WebSocket connected');
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
            this.ws.send(JSON.stringify({ type: 'subscribe', data: { channel: 'signals' } }));
        };
        
        this.ws.onmessage = (event) => {
            console.log('SignalsDisplay: Received message:', event.data);
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'price_update') {
                    this.updatePairPrice(data.pair, data.price, data.change);
                } else if (data.type === 'signal') {
                    this.handleSignal(data.data);
                }
            } catch (error) {
                console.error('SignalsDisplay: Error parsing message:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('SignalsDisplay: WebSocket connection closed');
            this.updateConnectionStatus(false);
            
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
            this.updateConnectionStatus(false);
        };
    }

    updateConnectionStatus(connected) {
        if (this.statusIndicator && this.statusText) {
            this.statusIndicator.classList.toggle('connected', connected);
            this.statusText.textContent = connected ? 'Connected' : 'Connecting...';
        }
    }

    updatePairPrice(pair, price, change) {
        const pairItem = this.pairList.querySelector(`[data-pair="${pair}"]`);
        if (pairItem) {
            const priceElement = pairItem.querySelector('.pair-price');
            if (priceElement) {
                priceElement.textContent = price;
                priceElement.className = 'pair-price ' + (change > 0 ? 'price-up' : change < 0 ? 'price-down' : 'price-unchanged');
            }
        }
    }

    handleSignal(signal) {
        console.log('SignalsDisplay: Handling signal:', signal);
        this.signals.unshift(signal); // Add new signals to the beginning
        if (this.signals.length > 50) {
            this.signals.pop(); // Keep only the latest 50 signals
        }
        this.updateSignalsDisplay();
    }

    updateSignalsDisplay() {
        if (!this.signalsGrid) return;
        
        this.signalsGrid.innerHTML = this.signals.map(signal => `
            <div class="signal-card">
                <div class="signal-type ${signal.type.toLowerCase()}">${signal.type}</div>
                <div class="signal-pair">${signal.pair}</div>
                <div class="signal-price">${signal.price}</div>
                <div class="signal-time">
                    <i class="far fa-clock"></i>
                    ${new Date(signal.timestamp).toLocaleString()}
                </div>
            </div>
        `).join('');
    }
}

// Create and export singleton instance
const signalsDisplay = new SignalsDisplay();
export { signalsDisplay };
