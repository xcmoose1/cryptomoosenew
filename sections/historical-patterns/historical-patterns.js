// @ts-check

// Historical Patterns Module
import { HISTORICAL_PATTERNS_CONFIG } from './config/historical-patterns-config.js';
import { createChart } from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';

class HistoricalPatternsSection {
    constructor() {
        this.initialized = false;
        this.currentPattern = HISTORICAL_PATTERNS_CONFIG.PATTERNS.CYCLICAL;
        this.currentTimeframe = '1y';
        this.charts = {};
        this.data = [];
    }

    async init() {
        if (this.initialized) return;
        
        try {
            await this.setupEventListeners();
            await this.initializeCharts();
            await this.updateAllData();
            this.startPeriodicUpdates();
            this.initialized = true;
            console.log('Historical Patterns section initialized successfully');
        } catch (error) {
            console.error('Failed to initialize historical patterns:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Pattern type selector
        const patternSelect = document.getElementById('patternType');
        if (patternSelect) {
            patternSelect.addEventListener('change', (e) => {
                this.handlePatternChange(e.target.value);
            });
        }

        // Timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.timeframe-btn').forEach(btn => 
                    btn.classList.remove('active'));
                button.classList.add('active');
                this.handleTimeframeChange(button.dataset.timeframe);
            });
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            Object.values(this.charts).forEach(chart => {
                const container = chart.container;
                if (container) {
                    chart.resize(container.clientWidth, 
                        HISTORICAL_PATTERNS_CONFIG.CHART.DEFAULT_HEIGHT);
                }
            });
        });
    }

    initializeCharts() {
        const chartContainers = ['patternChart', 'comparisonChart'];
        
        for (const containerId of chartContainers) {
            const container = document.getElementById(containerId);
            if (!container) continue;

            this.charts[containerId] = createChart(container, {
                width: container.clientWidth,
                height: HISTORICAL_PATTERNS_CONFIG.CHART.DEFAULT_HEIGHT,
                layout: {
                    background: { color: HISTORICAL_PATTERNS_CONFIG.CHART.COLORS.BACKGROUND },
                    textColor: HISTORICAL_PATTERNS_CONFIG.CHART.COLORS.TEXT,
                },
                grid: {
                    vertLines: { color: HISTORICAL_PATTERNS_CONFIG.CHART.COLORS.GRID },
                    horzLines: { color: HISTORICAL_PATTERNS_CONFIG.CHART.COLORS.GRID },
                },
            });
        }
    }

    async updateAllData() {
        try {
            await Promise.all([
                this.updatePatternAnalysis(),
                this.updateCorrelations(),
                this.updatePredictions()
            ]);
        } catch (error) {
            console.error('Failed to update pattern data:', error);
            throw error;
        }
    }

    startPeriodicUpdates() {
        setInterval(() => this.updateAllData(), 
            HISTORICAL_PATTERNS_CONFIG.UPDATE_INTERVAL);
    }

    async handlePatternChange(pattern) {
        if (!Object.values(HISTORICAL_PATTERNS_CONFIG.PATTERNS).includes(pattern)) {
            console.error('Invalid pattern type:', pattern);
            return;
        }
        this.currentPattern = pattern;
        await this.updateAllData();
    }

    async handleTimeframeChange(timeframe) {
        if (!HISTORICAL_PATTERNS_CONFIG.TIMEFRAMES[timeframe]) {
            console.error('Invalid timeframe:', timeframe);
            return;
        }
        this.currentTimeframe = timeframe;
        await this.updateAllData();
    }

    async updatePatternAnalysis() {
        try {
            const data = await this.fetchPatternData();
            if (!this.validateData(data)) {
                throw new Error('Invalid pattern data received');
            }
            
            // Update strength indicator
            const strengthIndicator = document.getElementById('strengthIndicator');
            if (strengthIndicator) {
                strengthIndicator.style.width = `${data.strength}%`;
            }

            // Update confidence and accuracy
            this.updateMetric('confidenceLevel', data.confidence);
            this.updateMetric('historicalAccuracy', data.accuracy);

            // Update pattern chart
            this.updateChart('patternChart', data.chartData);
        } catch (error) {
            console.error('Error updating pattern analysis:', error);
            this.showError('pattern-analysis');
        }
    }

    async updateCorrelations() {
        try {
            const correlations = await this.fetchCorrelations();
            if (!this.validateCorrelations(correlations)) {
                throw new Error('Invalid correlation data received');
            }
            
            this.updateMetric('patternRecognition', correlations.pattern);
            this.updateMetric('statisticalAnalysis', correlations.statistics);
            this.updateMetric('cyclePosition', correlations.cycle);
            this.updateMetric('volatilityAnalysis', correlations.volatility);
        } catch (error) {
            console.error('Error updating correlations:', error);
            this.showError('correlations');
        }
    }

    async updatePredictions() {
        try {
            const predictions = await this.fetchPredictions();
            if (!this.validatePredictions(predictions)) {
                throw new Error('Invalid prediction data received');
            }
            
            // Update prediction chart
            this.updateChart('predictionChart', predictions.chartData);

            // Update prediction cards
            this.updatePredictionCard('shortTermPrediction', predictions.shortTerm);
            this.updatePredictionCard('mediumTermPrediction', predictions.mediumTerm);
            this.updatePredictionCard('longTermPrediction', predictions.longTerm);
        } catch (error) {
            console.error('Error updating predictions:', error);
            this.showError('predictions');
        }
    }

    // Helper methods
    updateMetric(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    updatePredictionCard(id, data) {
        const card = document.getElementById(id);
        if (!card) return;

        const priceElement = card.querySelector('.prediction-price');
        const changeElement = card.querySelector('.prediction-change');

        if (priceElement) {
            priceElement.textContent = this.formatCurrency(data.price);
        }

        if (changeElement) {
            changeElement.textContent = this.formatPercentage(data.change);
            changeElement.className = `prediction-change ${data.change >= 0 ? 'positive' : 'negative'}`;
        }
    }

    updateChart(chartId, data) {
        const chart = this.charts[chartId];
        if (!chart || !data) return;

        // Clear existing series
        chart.removeSeries();

        // Add new series based on data type
        if (data.type === 'candlestick') {
            const series = chart.addCandlestickSeries({
                upColor: HISTORICAL_PATTERNS_CONFIG.CHART.COLORS.UP,
                downColor: HISTORICAL_PATTERNS_CONFIG.CHART.COLORS.DOWN,
            });
            series.setData(data.candles);
        } else if (data.type === 'line') {
            const series = chart.addLineSeries({
                color: HISTORICAL_PATTERNS_CONFIG.CHART.COLORS.PATTERN,
            });
            series.setData(data.points);
        }
    }

    // Data validation methods
    validateData(data) {
        return data && 
               typeof data.strength === 'number' &&
               typeof data.confidence === 'number' &&
               typeof data.accuracy === 'number' &&
               data.chartData;
    }

    validateCorrelations(correlations) {
        return correlations &&
               typeof correlations.pattern === 'string' &&
               typeof correlations.statistics === 'string' &&
               typeof correlations.cycle === 'string' &&
               typeof correlations.volatility === 'string';
    }

    validatePredictions(predictions) {
        return predictions &&
               predictions.shortTerm &&
               predictions.mediumTerm &&
               predictions.longTerm &&
               predictions.chartData;
    }

    // Formatting methods
    formatPercentage(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value / 100);
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    showError(section) {
        const errorMessages = {
            'pattern-analysis': 'Error loading pattern analysis',
            'correlations': 'Error loading correlations',
            'predictions': 'Error loading predictions'
        };

        // Update relevant section with error message
        const elements = document.querySelectorAll(`.${section} .loading`);
        elements.forEach(el => {
            el.textContent = errorMessages[section];
            el.classList.add('error');
        });
    }
}

// Create and export singleton instance
const historicalPatterns = new HistoricalPatternsSection();
export { historicalPatterns };

// Export init function for section loader
export function init() {
    return historicalPatterns.init();
}
