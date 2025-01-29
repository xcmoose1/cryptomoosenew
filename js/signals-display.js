export class SignalsDisplay {
    constructor() {
        this.ws = null;
        this.signals = [];
        this.systemMessages = [];
        this.signalsContainer = null;
        this.pairsList = null;
        this.currentFilter = 'all';
        this.selectedPair = null;
        
        // List of monitored pairs
        this.monitoredPairs = [
            'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'SOL/USDT', 
            'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT', 'LINK/USDT',
            'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'ETC/USDT', 'XLM/USDT',
            'ALGO/USDT', 'NEAR/USDT', 'FTM/USDT', 'SAND/USDT', 'MANA/USDT',
            'AAVE/USDT', 'GRT/USDT', 'SNX/USDT', 'CRV/USDT'
        ];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
    }

    async init() {
        console.log('SignalsDisplay: Initializing...');
        this.signalsContainer = document.getElementById('signals-container');
        this.pairsList = document.getElementById('pairs-list');
        
        if (!this.signalsContainer || !this.pairsList) {
            console.error('SignalsDisplay: Could not find required containers!');
            return;
        }

        // Initialize pairs list
        this.updatePairsList();

        // Setup filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.updateDisplay();
            });
        });

        // Load historical signals first
        await this.loadHistoricalSignals();
        
        // Then setup WebSocket for live updates
        this.setupWebSocket();
        console.log('SignalsDisplay: Initialization complete');
    }

    setupWebSocket() {
        if (this.ws) {
            console.log('SignalsDisplay: WebSocket already exists, closing...');
            this.ws.close();
        }

        // Use secure WebSocket (wss) when on HTTPS
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log(`SignalsDisplay: Connecting to WebSocket at ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('SignalsDisplay: WebSocket connected');
            this.reconnectAttempts = 0;
            // Subscribe to signals
            this.ws.send(JSON.stringify({ type: 'subscribe', channel: 'signals' }));
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
                    this.handleSystemMessage(data);
                } else if (data.type === 'signal') {
                    this.handleSignal(data);
                } else if (data.type === 'status') {
                    this.handleSystemMessage({
                        message: `📊 ${data.message}`,
                        timestamp: Date.now(),
                        status: 'info'
                    });
                } else if (data.type === 'pairs') {
                    this.updatePairsList(data.pairs);
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

    async loadHistoricalSignals() {
        try {
            const response = await fetch('/api/signals/history');
            const data = await response.json();
            
            if (data.success) {
                this.signals = data.signals;
                this.updateDisplay();
            }
        } catch (error) {
            console.error('SignalsDisplay: Error loading historical signals:', error);
        }
    }

    updatePairsList(pairs = this.monitoredPairs) {
        if (!this.pairsList) return;
        
        this.pairsList.innerHTML = pairs.map(pair => `
            <div class="pair-item ${this.selectedPair === pair ? 'active' : ''}" data-pair="${pair}">
                <span class="pair-name">${pair}</span>
                <div class="loading-indicator"></div>
            </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.pair-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.pair-item').forEach(p => p.classList.remove('active'));
                item.classList.add('active');
                this.selectedPair = item.dataset.pair;
                this.updateDisplay();
            });
        });
    }

    updateDisplay() {
        if (!this.signalsContainer) return;

        let filteredSignals = this.signals;

        // Filter by pair if one is selected
        if (this.selectedPair) {
            filteredSignals = filteredSignals.filter(signal => signal.pair === this.selectedPair);
        }

        // Apply status filter
        switch (this.currentFilter) {
            case 'active':
                filteredSignals = filteredSignals.filter(signal => !signal.completed);
                break;
            case 'completed':
                filteredSignals = filteredSignals.filter(signal => signal.completed);
                break;
            case 'wins':
                filteredSignals = filteredSignals.filter(signal => signal.completed && signal.isWin);
                break;
            case 'losses':
                filteredSignals = filteredSignals.filter(signal => signal.completed && !signal.isWin);
                break;
        }

        // Sort signals by timestamp, newest first
        filteredSignals.sort((a, b) => b.timestamp - a.timestamp);

        // Update the display
        this.signalsContainer.innerHTML = filteredSignals.length ? 
            filteredSignals.map(signal => this.createSignalCard(signal)).join('') :
            '<div class="no-signals">No signals found</div>';

        // Add event listeners to action buttons
        this.addSignalCardListeners();
    }

    handleSystemMessage(message) {
        console.log('SignalsDisplay: Handling system message:', message);
        // Format the timestamp
        const timestamp = new Date().toLocaleTimeString();
        
        // Update connection status with formatted time
        const statusElement = document.querySelector('.connection-status');
        if (statusElement) {
            statusElement.innerHTML = `🔌 Connected to signal service ${timestamp}`;
        }
        
        this.systemMessages.push({
            ...message,
            timestamp
        });
        this.updateDisplay();
    }

    handleSignal(signal) {
        console.log('SignalsDisplay: Handling signal:', signal);
        
        // Add new signal to the beginning of the array
        this.signals.unshift(signal);
        
        // Keep only last 100 signals in memory
        if (this.signals.length > 100) {
            this.signals = this.signals.slice(0, 100);
        }

        this.updateDisplay();
    }

    createSignalCard(signal) {
        const isActive = !signal.completed;
        const profitClass = signal.profitPercent > 0 ? 'profit-positive' : 'profit-negative';
        
        return `
            <div class="signal-card ${signal.completed ? 'completed' : 'active'}" data-signal-id="${signal.id}">
                <div class="signal-header">
                    <span class="signal-pair">${signal.pair}</span>
                    <span class="signal-type ${signal.type.toLowerCase()}">${signal.type}</span>
                    <span class="signal-time">${new Date(signal.timestamp).toLocaleString()}</span>
                </div>
                <div class="signal-body">
                    <div class="signal-price">
                        <span>Entry: ${signal.price}</span>
                        ${signal.exitPrice ? `<span>Exit: ${signal.exitPrice}</span>` : ''}
                    </div>
                    ${signal.profitPercent ? `
                        <div class="signal-profit ${profitClass}">
                            ${signal.profitPercent.toFixed(2)}%
                        </div>
                    ` : ''}
                    ${isActive ? `
                        <div class="signal-actions">
                            <button class="signal-action" data-action="win">Mark as Win</button>
                            <button class="signal-action" data-action="loss">Mark as Loss</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    addSignalCardListeners() {
        document.querySelectorAll('.signal-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const signalId = e.target.closest('.signal-card').dataset.signalId;
                const action = e.target.dataset.action;
                this.handleSignalAction(signalId, action);
            });
        });
    }

    async handleSignalAction(signalId, action) {
        try {
            const response = await fetch('/api/signals/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    signalId,
                    action
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update signal');
            }
            
            const data = await response.json();
            if (data.success) {
                this.handleSignalUpdate(data);
            }
        } catch (error) {
            console.error('Error updating signal:', error);
        }
    }

    handleSignalUpdate(data) {
        // Update the signal in our list
        const index = this.signals.findIndex(s => s.id === data.signal.id);
        if (index !== -1) {
            this.signals[index] = data.signal;
        }

        this.updateDisplay();
    }
}

// Create and export singleton instance
const signalsDisplay = new SignalsDisplay();
export { signalsDisplay };
