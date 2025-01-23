// MemeShoot Core Functionality

class MemeShoot {
    constructor() {
        this.graphEndpoint = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2';
        this.moralisEndpoint = 'https://deep-index.moralis.io/api/v2';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.chainConfig = {
            eth: {
                name: 'Ethereum',
                rpc: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
                explorer: 'https://etherscan.io',
                dexScreener: 'https://dexscreener.com/ethereum',
                tokenPrefix: '0x'
            },
            bsc: {
                name: 'BNB Chain',
                rpc: 'https://bsc-dataseed.binance.org',
                explorer: 'https://bscscan.com',
                dexScreener: 'https://dexscreener.com/bsc',
                tokenPrefix: '0x'
            },
            sol: {
                name: 'Solana',
                rpc: 'https://api.mainnet-beta.solana.com',
                explorer: 'https://solscan.io',
                dexScreener: 'https://dexscreener.com/solana',
                tokenPrefix: ''  // Solana uses different address format
            },
            base: {
                name: 'Base',
                rpc: 'https://mainnet.base.org',
                explorer: 'https://basescan.org',
                dexScreener: 'https://dexscreener.com/base',
                tokenPrefix: '0x'
            }
        };
    }

    async analyzeToken(tokenAddress, chain) {
        try {
            // Check cache first
            const cachedData = this.getCache(tokenAddress, chain);
            if (cachedData) return cachedData;

            // Validate address format based on chain
            if (!this.isValidAddress(tokenAddress, chain)) {
                throw new Error(`Invalid token address format for ${this.chainConfig[chain].name}`);
            }

            // Get chain-specific configuration
            const chainConfig = this.chainConfig[chain];

            // Fetch basic token info
            const tokenInfo = await this.fetchTokenInfo(tokenAddress, chain);

            // Fetch price data
            const priceData = await this.fetchPriceData(tokenAddress, chain);

            // Fetch holder data
            const holderData = await this.fetchHolderData(tokenAddress, chain);

            // Analyze contract
            const contractAnalysis = await this.analyzeContract(tokenAddress, chain);

            // Compute scores
            const moonScore = this.calculateMoonScore(tokenInfo, priceData, holderData);
            const riskScore = this.calculateRiskScore(contractAnalysis, holderData);
            const fomoScore = this.calculateFomoScore(priceData, holderData);

            const analysis = {
                chain,
                chainConfig,
                tokenInfo,
                priceData,
                holderData,
                contractAnalysis,
                scores: {
                    moon: moonScore,
                    risk: riskScore,
                    fomo: fomoScore
                },
                timestamp: Date.now()
            };

            // Cache the results
            this.setCache(tokenAddress, chain, analysis);

            return analysis;
        } catch (error) {
            console.error('Error analyzing token:', error);
            throw error;
        }
    }

    async getBasicTokenInfo(tokenAddress, chain) {
        // Query TheGraph for token info
        const query = `{
            token(id: "${tokenAddress.toLowerCase()}") {
                symbol
                name
                decimals
                totalSupply
                txCount
                totalLiquidity
            }
        }`;

        try {
            const response = await fetch(this.graphEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const data = await response.json();
            return data.data.token;
        } catch (error) {
            console.error('Error fetching token info:', error);
            throw error;
        }
    }

    async getPriceData(tokenAddress, chain) {
        // Implementation will use TheGraph for price data
        // This is a placeholder for the actual implementation
        return {
            price: 0,
            priceChange24h: 0,
            volume24h: 0,
            liquidity: 0
        };
    }

    async getHolderData(tokenAddress, chain) {
        // Implementation will use direct RPC calls
        // This is a placeholder for the actual implementation
        return {
            totalHolders: 0,
            topHolders: [],
            holderDistribution: {}
        };
    }

    async getContractAnalysis(tokenAddress, chain) {
        // Implementation will use direct RPC calls and analysis
        // This is a placeholder for the actual implementation
        return {
            verified: false,
            ownershipRenounced: false,
            hasProxy: false,
            mintFunction: false,
            suspiciousFunctions: []
        };
    }

    calculateMoonScore(basicInfo, priceData, holderData) {
        // Implement moon score calculation
        // This is a placeholder for the actual implementation
        return Math.floor(Math.random() * 100);
    }

    calculateRiskScore(contractData, holderData) {
        // Implement risk score calculation
        // This is a placeholder for the actual implementation
        return Math.floor(Math.random() * 100);
    }

    calculateFomoScore(priceData, holderData) {
        // Implement FOMO score calculation
        // This is a placeholder for the actual implementation
        return Math.floor(Math.random() * 100);
    }

    getCache(key, chain) {
        const cached = this.cache.get(`${key}_${chain}`);
        if (!cached) return null;
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(`${key}_${chain}`);
            return null;
        }
        return cached;
    }

    setCache(key, chain, value) {
        this.cache.set(`${key}_${chain}`, { ...value, timestamp: Date.now() });
    }

    isValidAddress(address, chain) {
        switch (chain) {
            case 'eth':
            case 'bsc':
            case 'base':
                return /^0x[a-fA-F0-9]{40}$/.test(address);
            case 'sol':
                // Solana addresses are base58 encoded and typically 32-44 characters
                return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
            default:
                return false;
        }
    }

    async fetchTokenInfo(address, chain) {
        const config = this.chainConfig[chain];

        // Use chain-specific API endpoints
        const endpoint = chain === 'sol'
            ? `${config.rpc}/token/${address}`
            : `${config.rpc}/api?module=token&action=tokeninfo&contractaddress=${address}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch token info');

        const data = await response.json();
        return {
            name: data.name,
            symbol: data.symbol,
            decimals: data.decimals,
            totalSupply: data.totalSupply,
            // Add more fields as needed
        };
    }

    async fetchPriceData(address, chain) {
        const config = this.chainConfig[chain];

        // Use DexScreener API for consistent price data across chains
        const endpoint = `${config.dexScreener}/${address}`;
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch price data');

        const data = await response.json();
        return {
            price: data.price,
            priceChange24h: data.priceChange24h,
            volume24h: data.volume24h,
            liquidity: data.liquidity,
            // Add more fields as needed
        };
    }

    async fetchHolderData(address, chain) {
        const config = this.chainConfig[chain];

        // Use chain-specific explorer APIs
        const endpoint = chain === 'sol'
            ? `${config.explorer}/api/token/${address}/holders`
            : `${config.explorer}/api?module=token&action=tokenholderlist&contractaddress=${address}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch holder data');

        const data = await response.json();
        return {
            totalHolders: data.totalHolders,
            topHolders: data.holders.slice(0, 10),
            // Add more fields as needed
        };
    }

    async analyzeContract(address, chain) {
        const config = this.chainConfig[chain];

        // Use chain-specific explorer APIs for contract analysis
        const endpoint = chain === 'sol'
            ? `${config.explorer}/api/token/${address}/contract`
            : `${config.explorer}/api?module=contract&action=getsourcecode&address=${address}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to analyze contract');

        const data = await response.json();
        return {
            verified: data.verified,
            sourceCode: data.sourceCode,
            compiler: data.compiler,
            // Add more fields as needed
        };
    }

    // GPT-4 Integration Methods
    async getAIAnalysis(tokenData) {
        // This will be implemented when we integrate with our existing GPT-4 system
        return {
            riskAnalysis: "AI analysis not yet implemented",
            investmentAdvice: "AI advice not yet implemented",
            marketContext: "AI context not yet implemented"
        };
    }
}

// Token Feed Management
const tokenFeed = {
    alerts: [],
    maxAlerts: 50,
    currentFilter: 'all',

    addAlert(alert) {
        this.alerts.unshift(alert);
        if (this.alerts.length > this.maxAlerts) {
            this.alerts.pop();
        }
        this.updateFeedUI();
    },

    createAlertElement(alert) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `token-alert ${alert.type}`;
        
        const emoji = {
            pump: '🚀',
            whale: '🐋',
            social: '📈'
        };

        alertDiv.innerHTML = `
            <div class="alert-type ${alert.type}">${emoji[alert.type]}</div>
            <div class="alert-content">
                <div class="token-name">${alert.tokenName} (${alert.tokenSymbol})</div>
                <div class="alert-details">${alert.details}</div>
                <div class="alert-time">${alert.time}</div>
            </div>
            <div class="alert-actions">
                <button class="action-btn analyze-btn" data-address="${alert.tokenAddress}" data-chain="${alert.chain}">
                    Analyze
                </button>
                <button class="action-btn chart-btn" data-address="${alert.tokenAddress}" data-chain="${alert.chain}">
                    Chart
                </button>
            </div>
        `;

        // Add event listeners
        const analyzeBtn = alertDiv.querySelector('.analyze-btn');
        analyzeBtn.addEventListener('click', () => {
            document.getElementById('chainSelect').value = alert.chain;
            document.getElementById('tokenAddress').value = alert.tokenAddress;
            document.getElementById('analyzeBtn').click();
        });

        const chartBtn = alertDiv.querySelector('.chart-btn');
        chartBtn.addEventListener('click', () => {
            // Open chart in new tab
            const chartUrl = `https://dexscreener.com/${alert.chain}/${alert.tokenAddress}`;
            window.open(chartUrl, '_blank');
        });

        return alertDiv;
    },

    updateFeedUI() {
        const feedContainer = document.querySelector('.token-feed');
        if (!feedContainer) return;

        feedContainer.innerHTML = '';
        
        const filteredAlerts = this.currentFilter === 'all' 
            ? this.alerts 
            : this.alerts.filter(alert => alert.type === this.currentFilter);

        filteredAlerts.forEach(alert => {
            feedContainer.appendChild(this.createAlertElement(alert));
        });
    },

    setupFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update filter and refresh UI
                this.currentFilter = btn.dataset.filter;
                this.updateFeedUI();
            });
        });
    }
};

// Initialize MemeShoot
const memeShoot = new MemeShoot();

// Export for use in other scripts
window.memeShoot = { ...memeShoot, tokenFeed };

// Connect to WebSocket for real-time alerts
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsHost = window.location.host;
const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/memeshoot`);

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'alert') {
            tokenFeed.addAlert(data.alert);
        } else if (data.type === 'status') {
            // Update monitoring status
            const statusElement = document.getElementById(`${data.monitor}Status`);
            if (statusElement) {
                statusElement.textContent = data.message;
            }
        }
    } catch (error) {
        console.error('Error processing WebSocket message:', error);
    }
};

ws.onopen = () => {
    console.log('Connected to MemeShoot WebSocket');
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    console.log('Disconnected from MemeShoot WebSocket');
    // Try to reconnect after 5 seconds
    setTimeout(() => {
        window.location.reload();
    }, 5000);
};

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    tokenFeed.setupFilterButtons();
    updateMonitoringStatus();

    // Add event listener for analyze button
    const analyzeBtn = document.getElementById('analyzeBtn');
    const tokenInput = document.getElementById('tokenAddress');
    const chainSelect = document.getElementById('chainSelect');

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const tokenAddress = tokenInput.value.trim();
            const chain = chainSelect.value;

            if (!tokenAddress) {
                alert('Please enter a token address');
                return;
            }

            try {
                analyzeBtn.disabled = true;
                analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

                const analysis = await memeShoot.analyzeToken(tokenAddress, chain);
                
                // Add to token feed
                tokenFeed.addAlert({
                    type: 'pump',
                    tokenName: analysis.tokenInfo.name || 'Unknown Token',
                    tokenSymbol: analysis.tokenInfo.symbol || '???',
                    tokenAddress: tokenAddress,
                    chain: chain,
                    details: `🔍 New token analysis: Moon Score ${analysis.scores.moon}%`,
                    time: 'Just now'
                });

            } catch (error) {
                console.error('Error analyzing token:', error);
                alert('Error analyzing token. Please check the address and try again.');
            } finally {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '🚀 Analyze Token';
            }
        });
    }
});

// Update monitoring status
function updateMonitoringStatus() {
    const monitoringMessages = [
        { id: 'priceMonitorStatus', messages: [
            'Monitoring price movements...',
            'Analyzing volume patterns...',
            'Checking price momentum...'
        ]},
        { id: 'whaleMonitorStatus', messages: [
            'Tracking whale movements...',
            'Analyzing wallet patterns...',
            'Monitoring large transactions...'
        ]},
        { id: 'socialMonitorStatus', messages: [
            'Analyzing social sentiment...',
            'Tracking Twitter mentions...',
            'Monitoring Telegram activity...'
        ]},
        { id: 'aiAnalysisStatus', messages: [
            'Processing market data...',
            'Running AI predictions...',
            'Generating insights...'
        ]}
    ];

    monitoringMessages.forEach(monitor => {
        const element = document.getElementById(monitor.id);
        if (element) {
            setInterval(() => {
                const randomMessage = monitor.messages[Math.floor(Math.random() * monitor.messages.length)];
                element.textContent = randomMessage;
            }, 3000 + Math.random() * 2000);
        }
    });
}
