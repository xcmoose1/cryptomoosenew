export class SignalsDisplay {
    constructor() {
        if (SignalsDisplay.instance) {
            return SignalsDisplay.instance;
        }
        SignalsDisplay.instance = this;
        
        this.signals = [];
        this.systemMessages = [];
        this.signalsContainer = document.getElementById('signals-container');
        this.setupWebSocket();
    }

    setupWebSocket() {
        // Use secure WebSocket if the page is served over HTTPS
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'system') {
                this.handleSystemMessage(data.data);
            } else if (data.type === 'signal') {
                this.handleSignal(data.data);
            }
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket connection closed, attempting to reconnect...');
            setTimeout(() => this.setupWebSocket(), 5000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleSystemMessage(message) {
        this.systemMessages.push(message);
        this.updateDisplay();
    }

    handleSignal(signal) {
        this.signals.push(signal);
        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.signalsContainer) return;

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
