export class MarketOverview {
    constructor() {
        console.log('Initializing MarketOverview component');
        this.updateInterval = 5 * 60 * 1000; // 5 minutes
        this.container = document.querySelector('#dailyUpdateModal');
        this.modal = document.querySelector('#dailyUpdateModal');
        this.openBtn = document.querySelector('#openModalBtn');
        this.closeBtn = document.querySelector('#closeModalBtn');
        this.refreshBtn = document.querySelector('#refreshInsight');
        
        if (!this.container) console.error('Could not find #dailyUpdateModal');
        if (!this.openBtn) console.error('Could not find #openModalBtn');
        if (!this.closeBtn) console.error('Could not find #closeModalBtn');
        if (!this.refreshBtn) console.error('Could not find #refreshInsight');
        
        this.setupEventListeners();
        this.init();
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        // Modal controls
        this.openBtn?.addEventListener('click', () => {
            console.log('Open button clicked');
            this.modal.style.display = 'block';
            this.fetchAndUpdateData();
        });

        this.closeBtn?.addEventListener('click', () => {
            console.log('Close button clicked');
            this.modal.style.display = 'none';
        });

        this.refreshBtn?.addEventListener('click', () => {
            console.log('Refresh button clicked');
            this.fetchAndUpdateData();
        });

        // Close on click outside
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                console.log('Clicked outside modal');
                this.modal.style.display = 'none';
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modal.style.display === 'block') {
                console.log('Escape key pressed');
                this.modal.style.display = 'none';
            }
        });
    }

    async init() {
        console.log('Initializing market overview data');
        try {
            // Initial data fetch
            await this.fetchAndUpdateData();
            // Set up auto-refresh
            setInterval(() => {
                if (this.modal.style.display === 'block') {
                    console.log('Auto-refreshing market data');
                    this.fetchAndUpdateData();
                }
            }, this.updateInterval);
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

    async fetchAndUpdateData() {
        try {
            console.log('Fetching market overview data');
            this.showLoading();
            
            console.log('Making API request to /api/market-overview');
            const response = await fetch('/api/market-overview');
            console.log('API response status:', response.status);
            
            if (!response.ok) {
                const text = await response.text();
                console.error('API error response:', text);
                throw new Error(`Failed to fetch market overview: ${response.status} ${text}`);
            }
            
            let result;
            try {
                result = await response.json();
                console.log('API response parsed:', result);
            } catch (parseError) {
                console.error('Failed to parse API response:', parseError);
                throw new Error('Server returned invalid JSON response');
            }
            
            if (!result.success) {
                console.error('API returned error:', result.error);
                if (result.details) console.error('Error details:', result.details);
                throw new Error(result.error || 'Failed to generate market overview');
            }
            
            if (!result.data) {
                console.error('API response missing data field:', result);
                throw new Error('Invalid server response: missing data');
            }
            
            console.log('Updating UI with new data');
            this.updateUI(result.data);
            this.updateTimestamp(result.lastUpdated, result.nextUpdate);
            this.hideLoading();
        } catch (error) {
            console.error('Error updating market data:', error);
            this.showError(error.message);
            this.hideLoading();
        }
    }

    showLoading() {
        console.log('Showing loading state');
        const loadingEl = this.container.querySelector('#loadingUpdate');
        const contentEl = this.container.querySelector('#updateContent');
        const errorEl = this.container.querySelector('#updateError');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (contentEl) contentEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
    }

    hideLoading() {
        console.log('Hiding loading state');
        const loadingEl = this.container.querySelector('#loadingUpdate');
        const contentEl = this.container.querySelector('#updateContent');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
    }

    updateUI(data) {
        console.log('Updating UI components with data:', data);
        try {
            // Update technical stance
            const stanceEl = this.container.querySelector('.technical-stance .stance-value');
            if (stanceEl) {
                stanceEl.textContent = data.technical_stance;
                stanceEl.className = 'stance-value ' + this.getStanceClass(data.technical_stance);
            } else {
                console.error('Could not find technical stance element');
            }
            
            // Update metrics
            this.updateElement('.market-cap-change', data.metrics.market_cap_change);
            this.updateElement('.market-trend', data.metrics.market_trend);
            this.updateElement('.volume-analysis', data.metrics.volume_analysis);
            
            // Update market levels
            this.updateMarketLevels('.market-cap-levels', data.key_market_levels.total_market_cap);
            this.updateMarketLevels('.dominance-levels', data.key_market_levels.btc_dominance);
            
            // Update chain volumes
            this.updateChainVolumes(data.current_metrics.chains_volume);
            
            // Update catalysts
            this.updateList('.catalysts-list', data.catalysts);
            
            // Update risks
            this.updateList('.risks-list', data.risks);
            
            // Update market outlook
            if (data.market_outlook) {
                this.updateElement('.outlook-summary', data.market_outlook.summary);
                this.updateList('.outlook-analysis', data.market_outlook.analysis);
            } else {
                console.error('Invalid market outlook data:', data.market_outlook);
            }
            
            // Update upcoming events
            this.updateList('.events-list', data.upcoming_events);
            
            // Update sentiment score
            const sentimentEl = this.container.querySelector('.sentiment-score');
            if (sentimentEl) {
                sentimentEl.textContent = data.sentiment_score.toFixed(1);
            } else {
                console.error('Could not find sentiment score element');
            }
        } catch (error) {
            console.error('Error updating UI:', error);
            throw error;
        }
    }

    updateChainVolumes(volumeData) {
        const container = this.container.querySelector('.chain-volumes');
        if (!container) {
            console.error('Could not find chain volumes container');
            return;
        }

        try {
            const volumeHTML = volumeData.map(chain => {
                const changeClass = chain.volume_change_24h >= 0 ? 'positive' : 'negative';
                const changeIcon = chain.volume_change_24h >= 0 ? '↑' : '↓';
                
                return `
                    <div class="chain-volume-item">
                        <span class="chain-symbol">${chain.symbol}</span>
                        <span class="chain-volume">$${(chain.volume / 1e9).toFixed(2)}B</span>
                        <span class="volume-change ${changeClass}">
                            ${changeIcon} ${Math.abs(chain.volume_change_24h).toFixed(2)}%
                        </span>
                        <span class="volume-share">${chain.volume_percentage.toFixed(1)}% of total</span>
                    </div>
                `;
            }).join('');

            container.innerHTML = volumeHTML;
        } catch (error) {
            console.error('Error updating chain volumes:', error);
        }
    }

    updateMarketLevels(selector, levels) {
        const container = this.container.querySelector(selector);
        if (!container) {
            console.error('Could not find market levels container:', selector);
            return;
        }
        if (!levels) {
            console.error('No levels data provided for:', selector);
            return;
        }

        try {
            container.innerHTML = levels.map(level => 
                `<div class="market-level">${level}</div>`
            ).join('');
        } catch (error) {
            console.error('Error updating market levels:', error);
        }
    }

    updateElement(selector, content) {
        const element = this.container.querySelector(selector);
        if (element) {
            element.textContent = content;
        } else {
            console.error('Could not find element:', selector);
        }
    }

    updateList(selector, items) {
        const container = this.container.querySelector(selector);
        if (!container) {
            console.error('Could not find list container:', selector);
            return;
        }
        if (!items) {
            console.error('No items provided for:', selector);
            return;
        }

        try {
            container.innerHTML = items.map(item => 
                `<li class="list-item">${item}</li>`
            ).join('');
        } catch (error) {
            console.error('Error updating list:', error);
        }
    }

    getStanceClass(stance) {
        const stanceLower = stance?.toLowerCase() || '';
        if (stanceLower.includes('bullish')) return 'bullish';
        if (stanceLower.includes('bearish')) return 'bearish';
        return 'neutral';
    }

    updateTimestamp(lastUpdate, nextUpdate) {
        const lastUpdateEl = this.container.querySelector('.last-update');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = new Date(lastUpdate).toLocaleTimeString();
        } else {
            console.error('Could not find last update element');
        }
    }

    showError(message) {
        console.error('Showing error:', message);
        const errorEl = this.container.querySelector('#updateError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        } else {
            console.error('Could not find error element');
        }
    }
}

// Initialize the component
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing MarketOverview');
    new MarketOverview();
});
