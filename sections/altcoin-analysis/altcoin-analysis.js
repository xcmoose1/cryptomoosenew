// @ts-check

class AltcoinAnalysisSection {
    constructor() {
        console.log('AltcoinAnalysisSection: Constructor called');
        this.initialized = false;
        this.updateInterval = null;
        this.countdownInterval = null;
        this.lastUpdateTime = null;
    }

    async init() {
        console.log('AltcoinAnalysisSection: Init started');
        if (this.initialized) {
            console.log('AltcoinAnalysisSection: Already initialized');
            return;
        }
        
        try {
            console.log('AltcoinAnalysisSection: Updating all data...');
            await this.updateAllData();
            console.log('AltcoinAnalysisSection: Starting periodic updates...');
            this.startPeriodicUpdates();
            this.initialized = true;
            console.log('AltcoinAnalysisSection: Initialized successfully');
        } catch (error) {
            console.error('AltcoinAnalysisSection: Failed to initialize:', error);
            throw error;
        }
    }

    startPeriodicUpdates() {
        console.log('AltcoinAnalysisSection: Starting periodic updates...');
        // Update every 6 hours
        this.updateInterval = setInterval(() => this.updateAllData(), 21600000);
        // Start countdown timer
        this.startCountdown();
    }

    startCountdown() {
        console.log('AltcoinAnalysisSection: Starting countdown timer...');
        // Clear existing interval if any
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Set last update time if not set
        if (!this.lastUpdateTime) {
            this.lastUpdateTime = Date.now();
        }

        // Update countdown every second
        this.countdownInterval = setInterval(() => {
            const now = Date.now();
            const nextUpdate = this.lastUpdateTime + 21600000;
            const timeLeft = nextUpdate - now;

            if (timeLeft <= 0) {
                // Time to update
                this.lastUpdateTime = now;
                this.updateCountdownDisplay(21600000);
            } else {
                this.updateCountdownDisplay(timeLeft);
            }
        }, 1000);
    }

    updateCountdownDisplay(timeLeft) {
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);

        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const element = document.getElementById('updateCountdown');
        if (element) {
            element.textContent = display;
        }
    }

    async updateAllData() {
        console.log('AltcoinAnalysisSection: Updating all data...');
        try {
            // Update all sections in parallel
            console.log('AltcoinAnalysisSection: Updating market metrics, trends, and overview...');
            await Promise.all([
                this.updateMarketMetrics(),
                this.updateMarketTrends(),
                this.generateMarketOverview()
            ]);
            // Update last update time
            this.lastUpdateTime = Date.now();
            console.log('AltcoinAnalysisSection: All data updated successfully');
        } catch (error) {
            console.error('AltcoinAnalysisSection: Failed to update altcoin data:', error);
        }
    }

    async updateMarketMetrics() {
        console.log('AltcoinAnalysisSection: Updating market metrics...');
        try {
            // Implement your preferred data source here
            const data = await this.getMarketData();

            console.log('AltcoinAnalysisSection: Market metrics updated successfully');
            // Update UI elements
            this.updateElement('altcoinDominance', `${data.globalData.btcDominance.toFixed(2)}%`);
            this.updateElement('altcoinFearGreed', "N/A");
            this.updateElement('marketVolatility', "N/A");

            // Update trading strategy based on fear & greed
            this.updateTradingStrategy(50);
        } catch (error) {
            console.error('AltcoinAnalysisSection: Error updating market metrics:', error);
        }
    }

    async updateMarketTrends() {
        console.log('AltcoinAnalysisSection: Updating market trends...');
        try {
            // Implement your preferred data source here
            const data = await this.getMarketData();

            console.log('AltcoinAnalysisSection: Market trends updated successfully');
            // Update Large Cap
            this.updateElement('largecapTrend', "N/A");
            this.updateElement('largecap24h', "N/A");
            this.updateElement('largecap7d', "N/A");

            // Update Mid Cap
            this.updateElement('midcapTrend', "N/A");
            this.updateElement('midcap24h', "N/A");
            this.updateElement('midcap7d', "N/A");

            // Update Small Cap
            this.updateElement('smallcapTrend', "N/A");
            this.updateElement('smallcap24h', "N/A");
            this.updateElement('smallcap7d', "N/A");
        } catch (error) {
            console.error('AltcoinAnalysisSection: Error updating market trends:', error);
        }
    }

    async generateMarketOverview() {
        console.log('AltcoinAnalysisSection: Generating market overview...');
        try {
            // Implement your preferred data source here
            const data = await this.getMarketData();

            console.log('AltcoinAnalysisSection: Market overview generated successfully');
            // Generate market overview text
            const overview = this.generateOverviewText(data);
            this.updateElement('marketOverview', overview);
        } catch (error) {
            console.error('AltcoinAnalysisSection: Error generating market overview:', error);
        }
    }

    async getMarketData() {
        // Implement your preferred data source here
        return {
            globalData: {
                totalMarketCap: 0,
                totalVolume: 0,
                btcDominance: 0
            },
            topAltcoins: []
        };
    }

    updateTradingStrategy(fearGreedValue) {
        console.log('AltcoinAnalysisSection: Updating trading strategy...');
        let strategy;
        
        if (fearGreedValue <= 20) {
            strategy = "Extreme fear indicates potential buying opportunities. Consider DCA strategy for quality altcoins.";
        } else if (fearGreedValue <= 40) {
            strategy = "Market fear presents selective buying opportunities. Focus on large-cap altcoins.";
        } else if (fearGreedValue <= 60) {
            strategy = "Neutral market conditions. Balance positions and monitor key support/resistance levels.";
        } else if (fearGreedValue <= 80) {
            strategy = "Greed signals caution. Consider taking profits on highly profitable positions.";
        } else {
            strategy = "Extreme greed suggests potential market top. Consider reducing high-risk positions.";
        }

        console.log('AltcoinAnalysisSection: Trading strategy updated successfully');
        this.updateElement('tradingStrategy', strategy);
    }

    generateOverviewText(data) {
        console.log('AltcoinAnalysisSection: Generating market overview text...');
        let overview = "The altcoin market is currently showing neutral sentiment ";
        
        // Add specific insights based on market conditions
        if (data.globalData.totalMarketCap > 1000000000000) {
            overview += "with strong market capitalization.";
        } else {
            overview += "with weak market capitalization.";
        }

        console.log('AltcoinAnalysisSection: Market overview text generated successfully');
        return overview;
    }

    updateElement(elementId, value, numericValue = null) {
        console.log('AltcoinAnalysisSection: Updating element...');
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = value;

        // Add color classes for numeric values
        if (numericValue !== null) {
            element.classList.remove('positive', 'negative');
            if (numericValue > 0) {
                element.classList.add('positive');
            } else if (numericValue < 0) {
                element.classList.add('negative');
            }
        }
        console.log('AltcoinAnalysisSection: Element updated successfully');
    }

    destroy() {
        console.log('AltcoinAnalysisSection: Destroying...');
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }
}

// Export the init function that returns a promise
export const init = async () => {
    const section = new AltcoinAnalysisSection();
    await section.init();
    return section;
};
