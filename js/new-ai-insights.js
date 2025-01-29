// Import configurations
import { HTX_CONFIG, htxHandler } from './config/htx-config.js';

class AIInsights {
    constructor() {
        this.currentSection = 'market-analysis';
        this.globalUpdateInterval = 4 * 60 * 60 * 1000; // 4 hours
        this.quickUpdateInterval = 60 * 60 * 1000; // 1 hour
        this.lastGlobalUpdate = null;
        this.lastQuickUpdate = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadSection(this.currentSection);
        this.startUpdateCycle();
        this.updateCountdown();
    }

    setupEventListeners() {
        // Navigation handling
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.loadSection(section);
            });
        });
    }

    async loadSection(sectionName) {
        const contentDiv = document.getElementById('section-content');
        
        try {
            console.log(`Loading section: ${sectionName}`);
            // Load section content
            const response = await fetch(`sections/new-${sectionName}/new-${sectionName}.html`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            console.log('Section HTML loaded');
            contentDiv.innerHTML = html;

            // Load section-specific CSS
            this.loadCSS(sectionName);

            // Load and initialize section-specific JavaScript
            await this.loadAndInitJS(sectionName);

            // Update navigation
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.section === sectionName) {
                    item.classList.add('active');
                }
            });

            // Update current section
            this.currentSection = sectionName;
            
            // Update section insights
            this.updateSectionInsights();
        } catch (error) {
            console.error(`Error loading section ${sectionName}:`, error);
            contentDiv.innerHTML = '<div class="error-message">Error loading section content</div>';
        }
    }

    loadCSS(sectionName) {
        const cssId = `section-${sectionName}-css`;
        if (!document.getElementById(cssId)) {
            const link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = `sections/new-${sectionName}/new-${sectionName}.css`;
            document.head.appendChild(link);
        }
    }

    async loadAndInitJS(sectionName) {
        try {
            console.log(`Loading JS for section: ${sectionName}`);
            const module = await import(`../sections/new-${sectionName}/new-${sectionName}.js`);
            
            if (sectionName === 'market-analysis') {
                console.log('Initializing market analysis module');
                module.initializeMarketAnalysis();
            } else if (sectionName === 'pattern-analysis') {
                console.log('Initializing pattern analysis module');
                new module.default();
            } else if (sectionName === 'volume-profile') {
                console.log('Initializing volume profile module');
                module.initializeVolumeProfile();
            }
            // Add other section initializations here
            
            console.log(`JS for ${sectionName} loaded and initialized`);
        } catch (error) {
            console.error(`Error loading JS for ${sectionName}:`, error);
        }
    }

    async startUpdateCycle() {
        // Initial updates
        await this.updateGlobalInsights();
        await this.updateSectionInsights();

        // Set up update intervals
        setInterval(() => this.updateGlobalInsights(), this.globalUpdateInterval);
        setInterval(() => this.updateSectionInsights(), this.quickUpdateInterval);
    }

    async updateGlobalInsights() {
        try {
            const response = await fetch('/api/new-ai-analysis/global');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.status === 'success') {
                this.displayGlobalInsights(data.data);
            }
        } catch (error) {
            console.error('Error updating global insights:', error);
        }
    }

    async updateSectionInsights() {
        try {
            console.log('[AIInsights] Updating section insights for:', this.currentSection);
            
            const response = await fetch(`/api/new-ai-analysis/section/${this.currentSection}`);
            console.log('[AIInsights] Response status:', response.status);
            
            if (!response.ok) {
                console.error('[AIInsights] Error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    section: this.currentSection
                });
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('[AIInsights] Received data:', data);
            
            if (data.status === 'success') {
                console.log('[AIInsights] Displaying insights:', data.data.insights);
                this.displayInsights(data.data.insights);
            } else {
                console.error('[AIInsights] Invalid data format:', data);
            }
        } catch (error) {
            console.error('[AIInsights] Error updating section insights:', error);
            console.error('[AIInsights] Current section:', this.currentSection);
            console.error('[AIInsights] Error stack:', error.stack);
        }
    }

    displayInsights(insights) {
        console.log('[AIInsights] Displaying insights:', insights);
        const container = document.getElementById('section-insights');
        if (!container) {
            console.warn('[AIInsights] No insights container found');
            return;
        }

        try {
            container.innerHTML = insights.map(insight => `
                <div class="insight-item ${insight.type}">
                    <div class="insight-content">
                        <div class="message">${insight.message}</div>
                        <div class="confidence">Confidence: ${(insight.confidence * 100).toFixed(1)}%</div>
                    </div>
                </div>
            `).join('');
            console.log('[AIInsights] Insights rendered successfully');
        } catch (error) {
            console.error('[AIInsights] Error rendering insights:', error);
            console.error('[AIInsights] Insights data:', insights);
        }
    }

    displayGlobalInsights(data) {
        const container = document.getElementById('global-insights');
        if (!container) return;

        container.innerHTML = `
            <div class="global-metrics">
                <div class="metric">
                    <span class="label">Market Condition</span>
                    <span class="value">${data.marketCondition}</span>
                </div>
                <div class="metric">
                    <span class="label">Risk Level</span>
                    <span class="value">${data.riskLevel}</span>
                </div>
            </div>
            <div class="key-metrics">
                <div class="metric">
                    <span class="label">BTC Dominance</span>
                    <span class="value">${data.keyMetrics.btcDominance.toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="label">Total Market Cap</span>
                    <span class="value">$${(data.keyMetrics.totalMarketCap / 1e12).toFixed(2)}T</span>
                </div>
            </div>
            <div class="global-insights">
                ${data.insights.map(insight => `
                    <div class="insight-item ${insight.type}">
                        <div class="insight-content">
                            <span class="message">${insight.message}</span>
                            <span class="confidence">${Math.round(insight.confidence * 100)}% confidence</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateCountdown() {
        const countdown = document.getElementById('update-countdown');
        
        setInterval(() => {
            if (this.lastGlobalUpdate) {
                const nextUpdate = new Date(this.lastGlobalUpdate.getTime() + this.globalUpdateInterval);
                const remaining = nextUpdate - new Date();
                
                const hours = Math.floor(remaining / (60 * 60 * 1000));
                const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
                
                countdown.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new AIInsights();
});
