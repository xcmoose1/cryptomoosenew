// @ts-check
import { coingeckoSectorService } from '/services/coingecko-sector.service.js';
import { SECTOR_CONFIG } from '/config/sector-analysis.config.js';

class SectorAnalysisSection {
    constructor() {
        this.initialized = false;
        this.currentSector = 'gaming';
        this.updateInterval = null;
        this.countdownInterval = null;
        this.lastUpdateTime = null;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            await this.setupEventListeners();
            await this.updateAllData();
            this.startPeriodicUpdates();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize sector analysis:', error);
            throw error;
        }
    }

    setupEventListeners() {
        const sectorButtons = document.querySelectorAll('.sector-btn');
        sectorButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handleSectorChange(button.dataset.sector);
            });
        });
    }

    async handleSectorChange(sector) {
        if (!SECTOR_CONFIG.SECTOR_MAPPING[sector]) {
            console.error(`Invalid sector: ${sector}`);
            return;
        }

        // Update active button
        document.querySelectorAll('.sector-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sector === sector);
        });

        this.currentSector = sector;
        await this.updateAllData();
    }

    startPeriodicUpdates() {
        // Update every 6 hours
        this.updateInterval = setInterval(() => this.updateAllData(), SECTOR_CONFIG.UPDATE_INTERVAL);
        // Start countdown timer
        this.startCountdown();
    }

    startCountdown() {
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
            const nextUpdate = this.lastUpdateTime + SECTOR_CONFIG.UPDATE_INTERVAL;
            const timeLeft = nextUpdate - now;

            if (timeLeft <= 0) {
                // Time to update
                this.lastUpdateTime = now;
                this.updateCountdownDisplay(SECTOR_CONFIG.UPDATE_INTERVAL);
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
        try {
            // Update metrics first (most important)
            await this.updateSectorMetrics();
            
            // Then update insights and assets in parallel
            await Promise.all([
                this.updateSectorInsights(),
                this.updateTopAssets()
            ]);

            this.lastUpdateTime = Date.now();
        } catch (error) {
            console.error('Failed to update sector data:', error);
        }
    }

    async updateSectorMetrics() {
        try {
            const metrics = await coingeckoSectorService.getSectorMetrics(this.currentSector);
            
            document.getElementById('sectorMarketCap').textContent = this.formatMarketCap(metrics.marketCap);
            document.getElementById('sectorVolume').textContent = this.formatVolume(metrics.volume);
            document.getElementById('sectorChange').textContent = this.formatPercentage(metrics.change24h);
            document.getElementById('sectorProjects').textContent = metrics.numCoins.toString();

            // Update class for color coding
            const changeElement = document.getElementById('sectorChange');
            changeElement.classList.remove('positive', 'negative');
            changeElement.classList.add(metrics.change24h >= 0 ? 'positive' : 'negative');
        } catch (error) {
            console.error('Error updating sector metrics:', error);
            this.showError('metrics');
        }
    }

    async updateSectorInsights() {
        try {
            const insights = await coingeckoSectorService.generateSectorInsights(this.currentSector);
            
            document.getElementById('sectorTrends').textContent = insights.trends;
            document.getElementById('marketStructure').textContent = insights.structure;
            document.getElementById('sectorOpportunities').textContent = insights.opportunities;
        } catch (error) {
            console.error('Error updating sector insights:', error);
            this.showError('insights');
        }
    }

    async updateTopAssets() {
        const assetsList = document.getElementById('topAssetsList');
        if (!assetsList) return;
        
        try {
            const metrics = await coingeckoSectorService.getSectorMetrics(this.currentSector);
            const topAssets = metrics.topCoins;
            
            assetsList.innerHTML = topAssets.map(asset => `
                <div class="project-row">
                    <div class="coin-info">
                        <img src="${asset.image}" alt="${asset.name}" width="20" height="20">
                        <div class="name-symbol">
                            <span class="name">${asset.name}</span>
                            <span class="symbol">${asset.symbol.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="price-change">
                        <span class="price">${this.formatCompactPrice(asset.current_price)}</span>
                        <span class="change ${asset.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                            ${this.formatPercentage(asset.price_change_percentage_24h)}
                        </span>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error updating top assets:', error);
            assetsList.innerHTML = '<div class="loading">Error loading assets</div>';
        }
    }

    showError(section) {
        const elements = {
            metrics: ['sectorMarketCap', 'sectorVolume', 'sectorChange', 'sectorProjects'],
            insights: ['sectorTrends', 'marketStructure', 'sectorOpportunities']
        };

        elements[section]?.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Error loading data';
                element.classList.add('error');
            }
        });
    }

    formatMarketCap(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 2
        }).format(value);
    }

    formatVolume(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 2
        }).format(value);
    }

    formatPrice(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(value);
    }

    formatCompactPrice(value) {
        // For very small values (less than 0.01)
        if (value < 0.01) {
            return value.toFixed(6);
        }
        // For small values (less than 1)
        if (value < 1) {
            return value.toFixed(4);
        }
        // For medium values (less than 1000)
        if (value < 1000) {
            return value.toFixed(2);
        }
        // For large values, use compact notation
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 2
        }).format(value);
    }

    formatPercentage(value) {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    }

    destroy() {
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
    const section = new SectorAnalysisSection();
    await section.init();
    return section;
};
