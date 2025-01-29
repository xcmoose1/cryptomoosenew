import { binanceHandler } from '/js/config/binance-config.js';
import { AutoDetectionChart } from './auto-detection.js';

let btcChart;
let autoDetectionChart;

export function initializeMarketAnalysis() {
    console.log('Initializing market analysis...');

    // First, create the HTML structure
    const container = document.getElementById('section-content');
    if (!container) {
        console.error('Could not find section-content container');
        return;
    }

    // Insert the HTML structure
    container.innerHTML = `
        <style>
            .auto-level-btn {
                background: var(--color-surface);
                color: var(--color-text);
                border: 1px solid var(--color-border);
                padding: 8px 16px;
                margin: 0 4px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
            }

            .auto-level-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .auto-level-btn.active {
                background: var(--color-primary);
                color: var(--color-bg);
                border-color: var(--color-primary);
            }

            .auto-level-btn i {
                font-size: 8px;
                margin-right: 6px;
                position: relative;
                top: -2px;
            }
        </style>
        <div class="market-analysis-container" style="margin: 0; padding: 0;">
            <div class="chart-controls" style="margin: 0; padding: 5px;">
                <div class="crypto-selector" style="margin: 0 10px 0 0; padding: 0; display: inline-block;">
                    <select id="cryptoSelect" style="background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); padding: 8px; border-radius: 4px;">
                        <option value="BTC">BTC/USDT</option>
                        <option value="ETH">ETH/USDT</option>
                    </select>
                </div>
                <div class="timeframes" style="margin: 0; padding: 0;">
                    <button class="timeframe-btn active" data-timeframe="1h">1H</button>
                    <button class="timeframe-btn" data-timeframe="4h">4H</button>
                    <button class="timeframe-btn" data-timeframe="1d">1D</button>
                </div>
                <div class="indicators" style="margin: 0; padding: 0;">
                    <button class="indicator-btn" data-indicator="ma20">MA(20)</button>
                    <button class="indicator-btn" data-indicator="ma50">MA(50)</button>
                    <button class="indicator-btn" data-indicator="ma200">MA(200)</button>
                    <button class="indicator-btn" data-indicator="env">MA Envelope</button>
                    <button class="indicator-btn" data-indicator="zigzag">ZigZag</button>
                    <button class="indicator-btn" data-indicator="bb">Bollinger Bands</button>
                    <button class="indicator-btn" data-indicator="supertrend">SuperTrend</button>
                    <button class="indicator-btn" data-indicator="ichimoku">Ichimoku</button>
                    <button class="indicator-btn" data-indicator="keltner">Keltner</button>
                    <button class="indicator-btn" data-indicator="psar">PSAR</button>
                    <button class="indicator-btn" data-indicator="hullma">Hull MA</button>
                </div>
            </div>
            <div id="chartdiv" style="width: 100%; height: 400px; margin: 0; padding: 0;"></div>
            <div id="analysis-container" class="analysis-container" style="margin: 0; padding: 0;"></div>
            
            <!-- Auto-detection Section -->
            <div class="section-header" style="margin: 20px 0 10px 0; padding: 0;">
                <h3 style="color: var(--color-text); margin: 0;">Auto-detected Levels</h3>
                <div class="auto-detection-controls" style="margin: 10px 0; padding: 0;">
                    <button class="auto-level-btn" data-level="pivotPoints">
                        <i class="fas fa-circle"></i> Pivot Points
                    </button>
                    <button class="auto-level-btn" data-level="srZones">
                        <i class="fas fa-circle"></i> S/R Zones
                    </button>
                    <button class="auto-level-btn" data-level="fibRetracement">
                        <i class="fas fa-circle"></i> Fib Retracement
                    </button>
                    <button class="auto-level-btn" data-level="fibExtension">
                        <i class="fas fa-circle"></i> Fib Extension
                    </button>
                    <button class="auto-level-btn" data-level="priceChannels">
                        <i class="fas fa-circle"></i> Channels
                    </button>
                    <button class="auto-level-btn" data-level="trendLines">
                        <i class="fas fa-circle"></i> Trends
                    </button>
                    <button class="auto-level-btn" data-level="highLowMarkers">
                        <i class="fas fa-circle"></i> High/Low
                    </button>
                    <button class="auto-level-btn" data-level="rangeStats">
                        <i class="fas fa-circle"></i> Range Stats
                    </button>
                </div>
            </div>
            <div id="autodetection-chartdiv" style="width: 100%; height: 400px; margin: 0; padding: 0;"></div>
            <div id="auto-detection-summary" class="technical-summary" style="margin: 20px 0; padding: 15px; background: rgba(30, 34, 45, 0.95); border-radius: 5px;">
                <h3 style="margin: 0 0 15px 0; color: #ffffff;">Technical Analysis Summary</h3>
                <div class="summary-content" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                </div>
            </div>
        </div>
    `;

    // Add license
    am5.addLicense("AM5S-5602-4210-7362-8604");

    class BTCChart {
        constructor() {
            console.log('BTCChart constructor called');
            this.currentTimeframe = '1h';
            this.activeIndicators = new Set();
            this.indicatorSeries = {};
            this.root = null;
            this.chart = null;
            this.mainSeries = null;
            this.indicators = {};
            this.xAxis = null;
            this.yAxis = null;
            this.crypto = 'BTC';
        }

        async init() {
            try {
                console.log('Initializing chart...');
                
                // Ensure chartdiv exists
                const chartDiv = document.getElementById('chartdiv');
                if (!chartDiv) {
                    throw new Error('Chart container not found');
                }
                console.log('Chart container found:', chartDiv);
                
                // Create root
                this.root = am5.Root.new("chartdiv");
                console.log('Root created');
                
                // Set themes
                this.root.setThemes([
                    am5themes_Dark.new(this.root),
                    am5.Theme.new(this.root)
                ]);
                console.log('Themes set');

                // Create chart
                this.chart = this.root.container.children.push(
                    am5xy.XYChart.new(this.root, {
                        panX: true,
                        panY: true,
                        wheelX: "panX",
                        wheelY: "zoomX",
                        layout: this.root.verticalLayout,
                        pinchZoomX: true,
                        paddingTop: 0,
                        paddingBottom: 0,
                        paddingLeft: 0,
                        paddingRight: 0,
                        marginTop: 0,
                        marginBottom: 0,
                        marginLeft: 0,
                        marginRight: 0
                    })
                );
                console.log('Chart created');

                // Remove padding and spacing
                this.root.container.set("paddingTop", 0);
                this.root.container.set("paddingBottom", 0);
                this.root.container.set("paddingLeft", 0);
                this.root.container.set("paddingRight", 0);
                this.root.container.set("marginTop", 0);
                this.root.container.set("marginBottom", 0);
                this.root.container.set("marginLeft", 0);
                this.root.container.set("marginRight", 0);

                // Reduce spacing between elements
                this.chart.set("spacing", 0);
                this.chart.plotContainer.set("margin", 0);
                this.chart.plotContainer.set("padding", 0);

                // Create axes
                this.xAxis = this.chart.xAxes.push(
                    am5xy.DateAxis.new(this.root, {
                        baseInterval: { timeUnit: "minute", count: 1 },
                        renderer: am5xy.AxisRendererX.new(this.root, {
                            minGridDistance: 50,
                            pan: "zoom"
                        })
                    })
                );
                console.log('X axis created');

                this.yAxis = this.chart.yAxes.push(
                    am5xy.ValueAxis.new(this.root, {
                        renderer: am5xy.AxisRendererY.new(this.root, {
                            pan: "zoom"
                        })
                    })
                );
                console.log('Y axis created');

                // Create series
                this.mainSeries = this.chart.series.push(
                    am5xy.CandlestickSeries.new(this.root, {
                        name: `${this.crypto}/USDT`,
                        xAxis: this.xAxis,
                        yAxis: this.yAxis,
                        valueYField: "Close",
                        openValueYField: "Open",
                        lowValueYField: "Low",
                        highValueYField: "High",
                        valueXField: "Date",
                        tooltip: am5.Tooltip.new(this.root, {
                            pointerOrientation: "horizontal",
                            labelText: "[bold]{name}[/]\nOpen: {openValueY}\nHigh: {highValueY}\nLow: {lowValueY}\nClose: {valueY}"
                        })
                    })
                );
                console.log('Series created');

                // Set colors
                this.mainSeries.columns.template.states.create("riseFromOpen", {
                    fill: am5.color(0x00ff00),
                    stroke: am5.color(0x00ff00)
                });

                this.mainSeries.columns.template.states.create("dropFromOpen", {
                    fill: am5.color(0xff0000),
                    stroke: am5.color(0xff0000)
                });
                console.log('Colors set');

                // Add cursor
                this.chart.set("cursor", am5xy.XYCursor.new(this.root, {
                    behavior: "none",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis
                }));
                console.log('Cursor added');

                // Add scrollbar
                this.chart.set("scrollbarX", am5.Scrollbar.new(this.root, {
                    orientation: "horizontal"
                }));
                console.log('Scrollbar added');

                // Load initial data
                await this.loadData();
                console.log('Initial data loaded');

                // Make stuff animate on load
                this.mainSeries.appear(1000);
                this.chart.appear(1000, 100);
                console.log('Animations started');

            } catch (error) {
                console.error('Error initializing chart:', error);
                throw error;
            }
        }

        async loadData() {
            try {
                console.log('Loading data for timeframe:', this.currentTimeframe);
                this.mainSeries.data.clear();
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const klines = await binanceHandler.getKlines(`${this.crypto}USDT`, this.currentTimeframe);
                const data = klines.map(k => ({
                    Date: k[0],
                    Open: parseFloat(k[1]),
                    High: parseFloat(k[2]),
                    Low: parseFloat(k[3]),
                    Close: parseFloat(k[4])
                }));

                console.log('Data loaded:', data.length, 'candles');
                this.mainSeries.data.setAll(data);
                return data;
            } catch (error) {
                console.error('Error loading data:', error);
                throw error;
            }
        }

        setupEventListeners() {
            console.log('Setting up event listeners');
            // Timeframe buttons
            document.querySelectorAll('.timeframe-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const timeframe = e.target.dataset.timeframe;
                    if (timeframe === this.currentTimeframe) return;
                    
                    // Update active state
                    document.querySelector('.timeframe-btn.active')?.classList.remove('active');
                    e.target.classList.add('active');
                    
                    // Update timeframe and reload data
                    this.currentTimeframe = timeframe;
                    const data = await this.loadData();
                    
                    // Reload active indicators
                    const activeIndicators = Array.from(this.activeIndicators);
                    for (const type in this.indicatorSeries) {
                        if (Array.isArray(this.indicatorSeries[type])) {
                            this.indicatorSeries[type].forEach(s => s.dispose());
                        } else {
                            this.indicatorSeries[type].dispose();
                        }
                    }
                    this.indicatorSeries = {};
                    this.indicators = {};
                    this.activeIndicators.clear();
                    
                    for (const indicator of activeIndicators) {
                        await this.addIndicator(indicator);
                    }
                    
                    this.updateOverallAnalysis();
                });
            });

            // Indicator buttons
            document.querySelectorAll('.indicator-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const indicator = e.target.dataset.indicator;
                    console.log('Indicator clicked:', indicator);
                    
                    if (this.activeIndicators.has(indicator)) {
                        await this.removeIndicator(indicator);
                        e.target.classList.remove('active');
                    } else {
                        await this.addIndicator(indicator);
                        e.target.classList.add('active');
                    }
                    
                    // Update analysis after toggling indicator
                    this.updateOverallAnalysis();
                });
            });

            // Crypto selector
            document.getElementById('cryptoSelect').addEventListener('change', async (e) => {
                const crypto = e.target.value;
                if (crypto === this.crypto) return;
                
                this.crypto = crypto;
                this.mainSeries.name = `${crypto}/USDT`;
                
                // Reload data
                await this.loadData();
                
                // Reload active indicators
                const activeIndicators = Array.from(this.activeIndicators);
                for (const type in this.indicatorSeries) {
                    if (Array.isArray(this.indicatorSeries[type])) {
                        this.indicatorSeries[type].forEach(s => s.dispose());
                    } else {
                        this.indicatorSeries[type].dispose();
                    }
                }
                this.indicatorSeries = {};
                this.indicators = {};
                this.activeIndicators.clear();
                
                for (const indicator of activeIndicators) {
                    await this.addIndicator(indicator);
                }
                
                this.updateOverallAnalysis();
            });
            console.log('Event listeners set up');
        }

        async addIndicator(type) {
            if (this.activeIndicators.has(type)) {
                console.log(`Indicator ${type} already active`);
                return;
            }

            try {
                let result;
                switch (type) {
                    case 'bb':
                        result = await this.addBollingerBands();
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                        }
                        break;
                    case 'ma20':
                        result = await this.addMovingAverage(20);
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                        }
                        break;
                    case 'ma50':
                        result = await this.addMovingAverage(50);
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                        }
                        break;
                    case 'ma200':
                        result = await this.addMovingAverage(200);
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                        }
                        break;
                    case 'zigzag':
                        result = await this.addZigZag();
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                            this.activeIndicators.add(type);
                        }
                        break;
                    case 'supertrend':
                        result = await this.addSuperTrend();
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                        }
                        break;
                    case 'ichimoku':
                        result = await this.addIchimoku();
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                        }
                        break;
                    case 'hullma':
                        result = await this.addHullMA();
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                        }
                        break;
                    case 'keltner':
                        result = await this.addKeltnerChannels();
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                        }
                        break;
                    case 'psar':
                        result = await this.addPSAR();
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                        }
                        break;
                    case 'env':
                        result = await this.addMAEnvelope();
                        if (result) {
                            this.indicators[type] = result.data;
                            this.indicatorSeries[type] = result.series;
                        }
                        break;
                    default:
                        console.log(`Unknown indicator type: ${type}`);
                        return;
                }

                if (result) {
                    this.activeIndicators.add(type);
                    document.querySelector(`[data-indicator="${type}"]`)?.classList.add('active');
                    
                    // Update analysis whenever an indicator is added
                    this.updateOverallAnalysis();
                }
            } catch (error) {
                console.error(`Error adding indicator ${type}:`, error);
            }
        }

        async removeIndicator(type) {
            console.log(`Removing indicator: ${type}`);
            if (this.indicatorSeries[type]) {
                if (Array.isArray(this.indicatorSeries[type])) {
                    this.indicatorSeries[type].forEach(series => {
                        if (series && !series.isDisposed()) {
                            series.dispose();
                        }
                    });
                } else if (this.indicatorSeries[type] && !this.indicatorSeries[type].isDisposed()) {
                    this.indicatorSeries[type].dispose();
                }
                delete this.indicatorSeries[type];
                delete this.indicators[type];
                this.activeIndicators.delete(type);
                document.querySelector(`[data-indicator="${type}"]`)?.classList.remove('active');
            }
            this.updateOverallAnalysis();
        }

        async removeAllIndicators() {
            const types = Object.keys(this.indicatorSeries);
            for (const type of types) {
                await this.removeIndicator(type);
            }
        }

        async addMovingAverage(period) {
            console.log(`Adding MA${period}...`);
            const data = this.mainSeries.data.values;
            
            if (!data || data.length === 0) {
                console.error('No data available for MA calculation');
                return;
            }

            // Calculate MA
            const maData = [];
            for (let i = period - 1; i < data.length; i++) {
                const slice = data.slice(i - period + 1, i + 1);
                const sum = slice.reduce((acc, val) => acc + val.Close, 0);
                const ma = sum / period;
                
                maData.push({
                    Date: data[i].Date,
                    ma: ma
                });
            }

            console.log(`MA${period} Data calculated:`, maData);

            // Create series
            const series = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: `MA(${period})`,
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "ma",
                    valueXField: "Date",
                    stroke: period === 20 ? am5.color("#4CAF50") :
                            period === 50 ? am5.color("#2196F3") :
                            am5.color("#9C27B0"),
                    strokeWidth: 2,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: `MA${period}: {valueY}`
                    })
                })
            );

            // Set data
            series.data.setAll(maData);
            
            console.log(`MA${period} Series created and data set`);
            
            return {
                series: series,
                data: maData
            };
        }

        async addMAEnvelope() {
            console.log('Adding MA Envelope...');
            const period = 20;
            const deviation = 0.025; // 2.5% envelope
            const data = this.mainSeries.data.values;
            
            if (!data || data.length === 0) {
                console.error('No data available for MA Envelope calculation');
                return;
            }

            // Calculate MA and Envelope bands
            const envelopeData = [];
            for (let i = period - 1; i < data.length; i++) {
                const slice = data.slice(i - period + 1, i + 1);
                const sum = slice.reduce((acc, val) => acc + val.Close, 0);
                const ma = sum / period;
                
                envelopeData.push({
                    Date: data[i].Date,
                    Upper: ma * (1 + deviation),
                    Lower: ma * (1 - deviation),
                    MA: ma
                });
            }

            console.log('MA Envelope Data calculated:', envelopeData);

            // Create series for upper band
            const upperSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Upper Envelope",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "Upper",
                    valueXField: "Date",
                    stroke: am5.color("#FF6B6B"),
                    strokeWidth: 2,
                    strokeDasharray: [2, 2],
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Upper Envelope: {valueY}"
                    })
                })
            );

            // Create series for lower band
            const lowerSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Lower Envelope",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "Lower",
                    valueXField: "Date",
                    stroke: am5.color("#FF6B6B"),
                    strokeWidth: 2,
                    strokeDasharray: [2, 2],
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Lower Envelope: {valueY}"
                    })
                })
            );

            // Create series for middle MA line
            const maSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "MA(20)",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "MA",
                    valueXField: "Date",
                    stroke: am5.color("#4CAF50"),
                    strokeWidth: 2,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "MA(20): {valueY}"
                    })
                })
            );

            // Set data
            upperSeries.data.setAll(envelopeData);
            lowerSeries.data.setAll(envelopeData);
            maSeries.data.setAll(envelopeData);

            console.log('MA Envelope Series created and data set');
            
            return {
                series: [upperSeries, lowerSeries, maSeries],
                data: envelopeData
            };
        }

        async addBollingerBands() {
            console.log('Adding Bollinger Bands...');
            const period = 20;
            const stdDev = 2;
            const data = this.mainSeries.data.values;
            
            if (!data || data.length === 0) {
                console.error('No data available for BB calculation');
                return;
            }

            // Calculate SMA and Standard Deviation
            const bbData = [];
            for (let i = period - 1; i < data.length; i++) {
                const slice = data.slice(i - period + 1, i + 1);
                const prices = slice.map(d => d.Close);
                
                const sma = prices.reduce((a, b) => a + b) / period;
                const variance = prices.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
                const stdev = Math.sqrt(variance);
                
                bbData.push({
                    time: data[i].Date,
                    middleBand: sma,
                    upperBand: sma + stdDev * stdev,
                    lowerBand: sma - stdDev * stdev
                });
            }

            console.log('BB Data calculated:', bbData);

            // Create series for upper, middle, and lower bands
            const upperBandSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Upper BB",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "upperBand",
                    valueXField: "time",
                    stroke: am5.color("#FF6B6B"),
                    strokeWidth: 2,
                    strokeDasharray: [2, 2],
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Upper BB: {valueY}"
                    })
                })
            );

            const middleBandSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Middle BB",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "middleBand",
                    valueXField: "time",
                    stroke: am5.color("#4CAF50"),
                    strokeWidth: 2,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Middle BB: {valueY}"
                    })
                })
            );

            const lowerBandSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Lower BB",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "lowerBand",
                    valueXField: "time",
                    stroke: am5.color("#FF6B6B"),
                    strokeWidth: 2,
                    strokeDasharray: [2, 2],
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Lower BB: {valueY}"
                    })
                })
            );

            // Set data
            upperBandSeries.data.setAll(bbData);
            middleBandSeries.data.setAll(bbData);
            lowerBandSeries.data.setAll(bbData);

            console.log('BB Series created and data set');
            
            // Store both the series and the data
            const bbInfo = {
                series: [upperBandSeries, middleBandSeries, lowerBandSeries],
                data: bbData
            };
            
            return bbInfo;
        }

        async addSuperTrend() {
            const data = this.mainSeries.data.values;
            if (!data || data.length === 0) return;

            // SuperTrend parameters - adjusted for stability
            const period = 10;
            const multiplier = 3;
            
            const atr = [];
            const supertrend = [];
            let prevFinalUpperBand = 0;
            let prevFinalLowerBand = 0;
            let prevTrend = null;

            // Calculate ATR first
            let sumTr = 0;
            for (let i = 0; i < data.length; i++) {
                const high = data[i].High;
                const low = data[i].Low;
                const close = i > 0 ? data[i-1].Close : data[i].Open;

                // True Range calculation
                const tr = Math.max(
                    high - low,
                    Math.abs(high - close),
                    Math.abs(low - close)
                );

                // ATR calculation
                if (i < period) {
                    sumTr += tr;
                    atr.push(tr);
                } else {
                    if (i === period) {
                        atr.push(sumTr / period);
                    } else {
                        atr.push((atr[i-1] * (period - 1) + tr) / period);
                    }
                }
            }

            // Calculate SuperTrend
            for (let i = 0; i < data.length; i++) {
                const currentAtr = atr[i];
                const high = data[i].High;
                const low = data[i].Low;
                const prevHigh = data[i-1] ? data[i-1].High : high;
                const prevLow = data[i-1] ? data[i-1].Low : low;

                // Calculate SuperTrend
                let upperBand = (high + low) / 2 + (multiplier * currentAtr);
                let lowerBand = (high + low) / 2 - (multiplier * currentAtr);

                if (i > 0) {
                    upperBand = Math.min(upperBand, prevFinalUpperBand);
                    lowerBand = Math.max(lowerBand, prevFinalLowerBand);
                }

                let trend = prevTrend;
                if (i === 0) {
                    trend = data[i].Close > ((high + low) / 2);
                } else {
                    const prevSuperTrend = supertrend[i-1].supertrend;
                    trend = data[i].Close > prevSuperTrend;
                }

                // Set SuperTrend value
                const supertrendValue = trend ? lowerBand : upperBand;

                supertrend.push({
                    time: data[i].Date,
                    supertrend: supertrendValue,
                    upperBand,
                    lowerBand,
                    trend,
                    close: data[i].Close,
                    distance: (Math.abs(data[i].Close - supertrendValue) / data[i].Close) * 100,
                    periods: i > 0 && trend === supertrend[i-1].trend ? supertrend[i-1].periods + 1 : 1
                });

                prevTrend = trend;
                prevFinalUpperBand = upperBand;
                prevFinalLowerBand = lowerBand;
            }

            // Create series for bullish and bearish points separately
            const upTrendSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "SuperTrend Up",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "supertrend",
                    valueXField: "time",
                    stroke: am5.color("#00ff00"),
                    strokeWidth: 2,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "SuperTrend (Bullish): {valueY}"
                    })
                })
            );

            const downTrendSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "SuperTrend Down",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "supertrend",
                    valueXField: "time",
                    stroke: am5.color("#ff0000"),
                    strokeWidth: 2,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "SuperTrend (Bearish): {valueY}"
                    })
                })
            );

            // Split data into up and down trends
            const upTrendData = supertrend.filter(d => d.trend);
            const downTrendData = supertrend.filter(d => !d.trend);

            // Set data
            upTrendSeries.data.setAll(upTrendData);
            downTrendSeries.data.setAll(downTrendData);

            // Get current trend info for analysis
            const lastPoint = supertrend[supertrend.length - 1];
            const currentPrice = data[data.length - 1].Close;
            const signal = lastPoint.trend ? 'bullish' : 'bearish';
            const distance = lastPoint.distance.toFixed(2);
            const trendDuration = lastPoint.periods;

            // Generate analysis
            const analysis = [
                `Price ${lastPoint.trend ? 'above' : 'below'} SuperTrend - ${lastPoint.trend ? 'uptrend continues' : 'downtrend continues'}`,
                `Price significantly ${lastPoint.trend ? 'above' : 'below'} SuperTrend - potential over${lastPoint.trend ? 'extension' : 'extension'}`,
                `Strong trend in place - trend has maintained direction for extended period`
            ];

            const metrics = {
                'Current Level': currentPrice.toFixed(2),
                'Distance': distance + '%',
                'Direction': lastPoint.trend ? 'Bullish' : 'Bearish',
                'Trend Duration': trendDuration + ' periods'
            };

            // Add to analysis container
            const analysisContainer = document.getElementById('analysis-container');
            if (analysisContainer) {
                analysisContainer.innerHTML += this.generateAnalysisHTML(
                    'SuperTrend',
                    signal,
                    analysis,
                    metrics,
                    lastPoint.trend ? 'Look for continuation above SuperTrend' : 'Watch for break above SuperTrend',
                    currentPrice
                );
            }

            return {
                series: [upTrendSeries, downTrendSeries],
                data: supertrend
            };
        }

        async addIchimoku() {
            const data = this.mainSeries.data.values;
            if (!data || data.length === 0) return;

            // Ichimoku parameters
            const tenkanPeriod = 9;
            const kijunPeriod = 26;
            const senkouPeriod = 52;
            const displacement = 26;

            const ichimokuData = [];
            const futureData = [];

            // Calculate values for each data point
            for (let i = 0; i < data.length + displacement; i++) {
                const dataPoint = i < data.length ? data[i] : null;
                const pastDataAvailable = i >= senkouPeriod;
                const tenkanDataAvailable = i >= tenkanPeriod;
                const kijunDataAvailable = i >= kijunPeriod;

                // Helper function to get period high/low
                const getPeriodHighLow = (startIdx, period) => {
                    let high = -Infinity;
                    let low = Infinity;
                    for (let j = 0; j < period && (startIdx - j) >= 0 && (startIdx - j) < data.length; j++) {
                        const price = data[startIdx - j];
                        high = Math.max(high, price.High);
                        low = Math.min(low, price.Low);
                    }
                    return { high, low };
                };

                // Calculate Tenkan-sen (Conversion Line)
                let tenkanSen = null;
                if (tenkanDataAvailable) {
                    const { high, low } = getPeriodHighLow(i, tenkanPeriod);
                    tenkanSen = (high + low) / 2;
                }

                // Calculate Kijun-sen (Base Line)
                let kijunSen = null;
                if (kijunDataAvailable) {
                    const { high, low } = getPeriodHighLow(i, kijunPeriod);
                    kijunSen = (high + low) / 2;
                }

                // Calculate Senkou Span A (Leading Span A)
                let senkouSpanA = null;
                if (tenkanSen !== null && kijunSen !== null) {
                    senkouSpanA = (tenkanSen + kijunSen) / 2;
                }

                // Calculate Senkou Span B (Leading Span B)
                let senkouSpanB = null;
                if (pastDataAvailable) {
                    const { high, low } = getPeriodHighLow(i, senkouPeriod);
                    senkouSpanB = (high + low) / 2;
                }

                // Calculate Chikou Span (Lagging Span)
                let chikouSpan = null;
                if (i >= displacement && i < data.length) {
                    chikouSpan = data[i - displacement].Close;
                }

                const point = {
                    time: dataPoint ? dataPoint.Date : data[data.length - 1].Date + (i - data.length + 1) * (data[1].Date - data[0].Date),
                    tenkanSen,
                    kijunSen,
                    senkouSpanA,
                    senkouSpanB,
                    chikouSpan
                };

                if (i < data.length) {
                    ichimokuData.push(point);
                } else {
                    futureData.push(point);
                }
            }

            // Create series for each line
            const tenkanSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Tenkan-sen",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "tenkanSen",
                    valueXField: "time",
                    stroke: am5.color("#FF4081"),
                    strokeWidth: 1.5,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Tenkan-sen: {valueY}"
                    })
                })
            );

            const kijunSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Kijun-sen",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "kijunSen",
                    valueXField: "time",
                    stroke: am5.color("#2196F3"),
                    strokeWidth: 1.5,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Kijun-sen: {valueY}"
                    })
                })
            );

            // Create cloud series
            const cloudSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Kumo Cloud",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "senkouSpanA",
                    openValueYField: "senkouSpanB",
                    valueXField: "time",
                    fill: am5.color("#4CAF50"),
                    fillOpacity: 0.2,
                    stroke: undefined
                })
            );

            // Create series for Chikou Span
            const chikouSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Chikou Span",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "chikouSpan",
                    valueXField: "time",
                    stroke: am5.color("#9C27B0"),
                    strokeWidth: 1.5,
                    strokeDasharray: [2, 2],
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Chikou Span: {valueY}"
                    })
                })
            );

            // Set data
            tenkanSeries.data.setAll([...ichimokuData, ...futureData]);
            kijunSeries.data.setAll([...ichimokuData, ...futureData]);
            cloudSeries.data.setAll([...ichimokuData, ...futureData]);
            chikouSeries.data.setAll(ichimokuData);

            return {
                series: [tenkanSeries, kijunSeries, cloudSeries, chikouSeries],
                data: ichimokuData
            };
        }

        addKeltnerChannels() {
            const period = 20;
            const multiplier = 2;
            
            const upperSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Keltner Upper",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueXField: "Date",
                    valueYField: "Upper",
                    stroke: period === 20 ? am5.color("#4CAF50") :
                            period === 50 ? am5.color("#2196F3") :
                            am5.color("#9C27B0"),
                    strokeWidth: 2,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Keltner Upper: {valueY}"
                    })
                })
            );

            const middleSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Keltner Middle",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueXField: "Date",
                    valueYField: "Middle",
                    stroke: period === 20 ? am5.color("#4CAF50") :
                            period === 50 ? am5.color("#2196F3") :
                            am5.color("#9C27B0"),
                    strokeDasharray: [2, 2],
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Keltner Middle: {valueY}"
                    })
                })
            );

            const lowerSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Keltner Lower",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueXField: "Date",
                    valueYField: "Lower",
                    stroke: period === 20 ? am5.color("#4CAF50") :
                            period === 50 ? am5.color("#2196F3") :
                            am5.color("#9C27B0"),
                    strokeWidth: 2,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Keltner Lower: {valueY}"
                    })
                })
            );

            const data = this.mainSeries.data.values;
            const keltnerData = [];

            // Calculate True Range for ATR
            const trueRanges = [];
            for (let i = 1; i < data.length; i++) {
                const high = data[i].High;
                const low = data[i].Low;
                const prevClose = data[i-1].Close;
                
                const tr = Math.max(
                    high - low,
                    Math.abs(high - prevClose),
                    Math.abs(low - prevClose)
                );
                trueRanges.push(tr);
            }

            // Calculate ATR
            const atrValues = [];
            let atr = trueRanges.slice(0, period).reduce((a, b) => a + b) / period;
            atrValues.push(atr);

            for (let i = period; i < trueRanges.length; i++) {
                atr = ((atr * (period - 1)) + trueRanges[i]) / period;
                atrValues.push(atr);
            }

            // Calculate Keltner Channels
            let ema = data[0].Close;
            for (let i = 0; i < data.length; i++) {
                ema = i === 0 ? data[i].Close : ema + (data[i].Close - ema) / period;
                
                if (i >= period - 1) {
                    const atr = atrValues[i - (period - 1)];
                    keltnerData.push({
                        Date: data[i].Date,
                        Upper: ema + (multiplier * atr),
                        Middle: ema,
                        Lower: ema - (multiplier * atr)
                    });
                }
            }

            upperSeries.data.setAll(keltnerData);
            middleSeries.data.setAll(keltnerData);
            lowerSeries.data.setAll(keltnerData);
            
            this.indicators['keltner'] = [upperSeries, middleSeries, lowerSeries];
        }

        async addPSAR() {
            console.log('Adding PSAR...');
            const data = this.mainSeries.data.values;
            
            if (!data || data.length === 0) {
                console.error('No data available for PSAR calculation');
                return;
            }

            // PSAR Parameters - adjusted for better trend detection
            const initialAF = 0.02;
            const maxAF = 0.2;
            const increment = 0.02;

            const psarData = [];
            let isLong;
            let psar;
            let extremePoint;
            let accelerationFactor;

            // Initialize with a more accurate trend detection using first few bars
            const lookback = Math.min(5, data.length);
            let upCount = 0;
            let downCount = 0;
            
            for(let i = 1; i < lookback; i++) {
                if(data[i].Close > data[i-1].Close) upCount++;
                else if(data[i].Close < data[i-1].Close) downCount++;
            }
            
            // Set initial trend based on price action
            isLong = upCount >= downCount;
            
            if(isLong) {
                psar = Math.min(...data.slice(0, lookback).map(d => d.Low));
                extremePoint = Math.max(...data.slice(0, lookback).map(d => d.High));
            } else {
                psar = Math.max(...data.slice(0, lookback).map(d => d.High));
                extremePoint = Math.min(...data.slice(0, lookback).map(d => d.Low));
            }
            
            accelerationFactor = initialAF;

            // Add first point
            psarData.push({
                Date: data[0].Date,
                Value: psar,
                isLong: isLong
            });

            // Calculate PSAR for remaining points
            for (let i = 1; i < data.length; i++) {
                const high = data[i].High;
                const low = data[i].Low;
                const prevHigh = data[i-1].High;
                const prevLow = data[i-1].Low;

                // Calculate PSAR
                psar = psar + accelerationFactor * (extremePoint - psar);

                // Ensure PSAR doesn't penetrate prices and check for trend reversal
                let trendReversal = false;
                
                if (isLong) {
                    if (low < psar) {
                        isLong = false;
                        psar = extremePoint;
                        extremePoint = low;
                        accelerationFactor = initialAF;
                        trendReversal = true;
                    }
                } else {
                    if (high > psar) {
                        isLong = true;
                        psar = extremePoint;
                        extremePoint = high;
                        accelerationFactor = initialAF;
                        trendReversal = true;
                    }
                }

                if (!trendReversal) {
                    if (isLong) {
                        if (high > extremePoint) {
                            extremePoint = high;
                            accelerationFactor = Math.min(accelerationFactor + increment, maxAF);
                        }
                        psar = Math.min(psar, prevLow, low);
                    } else {
                        if (low < extremePoint) {
                            extremePoint = low;
                            accelerationFactor = Math.min(accelerationFactor + increment, maxAF);
                        }
                        psar = Math.max(psar, prevHigh, high);
                    }
                }

                psarData.push({
                    Date: data[i].Date,
                    Value: psar,
                    isLong: isLong
                });
            }

            // Create series for bullish and bearish points separately
            const bullishSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "PSAR Bullish",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "Value",
                    valueXField: "Date",
                    stroke: undefined,
                    fill: undefined,
                    minBulletDistance: 5
                })
            );

            const bearishSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "PSAR Bearish",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "Value",
                    valueXField: "Date",
                    stroke: undefined,
                    fill: undefined,
                    minBulletDistance: 5
                })
            );

            // Create bullets for both series - slightly bigger dots
            bullishSeries.bullets.push(() => {
                return am5.Bullet.new(this.root, {
                    sprite: am5.Circle.new(this.root, {
                        radius: 2, // Increased from 1.5
                        fill: am5.color("#00ff00"),
                        stroke: am5.color("#00ff00"),
                        strokeWidth: 0
                    })
                });
            });

            bearishSeries.bullets.push(() => {
                return am5.Bullet.new(this.root, {
                    sprite: am5.Circle.new(this.root, {
                        radius: 2, // Increased from 1.5
                        fill: am5.color("#ff0000"),
                        stroke: am5.color("#ff0000"),
                        strokeWidth: 0
                    })
                });
            });

            // Split data into bullish and bearish points
            const bullishPoints = psarData.filter(d => d.isLong);
            const bearishPoints = psarData.filter(d => !d.isLong);

            // Set data
            bullishSeries.data.setAll(bullishPoints);
            bearishSeries.data.setAll(bearishPoints);
            
            return {
                series: [bullishSeries, bearishSeries],
                data: psarData
            };
        }

        async addZigZag() {
            console.log('Adding ZigZag...');
            const deviation = 0.035; // Increased to 3.5% for more significant swings
            const data = this.mainSeries.data.values;
            
            if (!data || data.length === 0) {
                console.error('No data available for ZigZag calculation');
                return;
            }

            // Find pivot points
            const zigzagData = [];
            let trend = 0;
            let lastPivot = { index: 0, value: data[0].High, type: 'high', date: data[0].Date };
            let lastExtreme = lastPivot;
            
            zigzagData.push({ Date: lastPivot.date, Value: lastPivot.value });

            for (let i = 1; i < data.length; i++) {
                const currentHigh = data[i].High;
                const currentLow = data[i].Low;
                const currentDate = data[i].Date;

                if (trend >= 0) {
                    // Looking for higher highs or a reversal
                    if (currentHigh > lastExtreme.value) {
                        // New high found
                        lastExtreme = { index: i, value: currentHigh, type: 'high', date: currentDate };
                    } else if (currentLow <= lastExtreme.value * (1 - deviation)) {
                        // Reversal found - add the last extreme as a pivot
                        if (lastExtreme.index !== lastPivot.index) {
                            zigzagData.push({ Date: lastExtreme.date, Value: lastExtreme.value });
                            lastPivot = lastExtreme;
                        }
                        // Start tracking new low
                        lastExtreme = { index: i, value: currentLow, type: 'low', date: currentDate };
                        trend = -1;
                    }
                } else {
                    // Looking for lower lows or a reversal
                    if (currentLow < lastExtreme.value) {
                        // New low found
                        lastExtreme = { index: i, value: currentLow, type: 'low', date: currentDate };
                    } else if (currentHigh >= lastExtreme.value * (1 + deviation)) {
                        // Reversal found - add the last extreme as a pivot
                        if (lastExtreme.index !== lastPivot.index) {
                            zigzagData.push({ Date: lastExtreme.date, Value: lastExtreme.value });
                            lastPivot = lastExtreme;
                        }
                        // Start tracking new high
                        lastExtreme = { index: i, value: currentHigh, type: 'high', date: currentDate };
                        trend = 1;
                    }
                }
            }

            // Add the final extreme point if it's significant
            if (lastExtreme.index !== lastPivot.index && 
                ((trend >= 0 && lastExtreme.value > lastPivot.value) || 
                 (trend < 0 && lastExtreme.value < lastPivot.value))) {
                zigzagData.push({ Date: lastExtreme.date, Value: lastExtreme.value });
            }

            console.log('ZigZag Data calculated:', zigzagData);

            // Create series
            const series = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "ZigZag",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "Value",
                    valueXField: "Date",
                    stroke: am5.color("#FF1493"), // Deep pink color
                    strokeWidth: 2,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "ZigZag: {valueY}"
                    })
                })
            );

            // Set data
            series.data.setAll(zigzagData);
            
            console.log('ZigZag Series created and data set');
            
            return {
                series: series,
                data: zigzagData
            };
        }

        async addHullMA() {
            console.log('Adding Hull MA...');
            const period = 20; // Base period
            const data = this.mainSeries.data.values;
            
            if (!data || data.length === 0) {
                console.error('No data available for Hull MA calculation');
                return;
            }

            // Calculate Hull MA: HMA = WMA(2*WMA(n/2) - WMA(n))
            const hullData = [];
            
            // Function to calculate Weighted Moving Average
            const calculateWMA = (prices, len) => {
                const result = [];
                for (let i = len - 1; i < prices.length; i++) {
                    let sum = 0;
                    let weightSum = 0;
                    for (let j = 0; j < len; j++) {
                        const weight = len - j;
                        sum += prices[i - j].Close * weight;
                        weightSum += weight;
                    }
                    result.push(sum / weightSum);
                }
                return result;
            };

            // Calculate first WMA with period n
            const wmaPeriod = calculateWMA(data, period);
            
            // Calculate second WMA with period n/2
            const wmaHalfPeriod = calculateWMA(data, Math.floor(period/2));
            
            // Calculate 2*WMA(n/2) - WMA(n)
            const diffData = [];
            const startIdx = period - 1;
            for (let i = 0; i < wmaHalfPeriod.length; i++) {
                if (i + startIdx >= data.length) break;
                diffData.push({
                    Date: data[i + startIdx].Date,
                    Close: 2 * wmaHalfPeriod[i] - wmaPeriod[i]
                });
            }
            
            // Calculate final WMA with sqrt(period)
            const sqrtPeriod = Math.floor(Math.sqrt(period));
            const finalWMA = calculateWMA(diffData, sqrtPeriod);
            
            // Create final Hull MA data
            for (let i = 0; i < finalWMA.length; i++) {
                const dataIndex = i + startIdx + sqrtPeriod - 1;
                if (dataIndex >= data.length) break;
                hullData.push({
                    Date: data[dataIndex].Date,
                    Value: finalWMA[i]
                });
            }

            // Create series
            const series = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Hull MA",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "Value",
                    valueXField: "Date",
                    stroke: am5.color("#9C27B0"), // Purple color
                    strokeWidth: 2,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Hull MA: {valueY}"
                    })
                })
            );

            // Set data
            series.data.setAll(hullData);
            
            return {
                series: series,
                data: hullData
            };
        }

        async addKeltnerChannels() {
            console.log('Adding Keltner Channels...');
            const period = 20;
            const multiplier = 2;
            const data = this.mainSeries.data.values;
            
            if (!data || data.length === 0) {
                console.error('No data available for Keltner Channels calculation');
                return;
            }

            const keltnerData = [];
            
            // Calculate EMA
            const emaData = [];
            const k = 2 / (period + 1);
            let ema = data[0].Close;
            
            // Calculate ATR
            const calculateATR = () => {
                const trueRanges = [];
                for (let i = 1; i < data.length; i++) {
                    const high = data[i].High;
                    const low = data[i].Low;
                    const prevClose = data[i-1].Close;
                    
                    const tr = Math.max(
                        high - low,
                        Math.abs(high - prevClose),
                        Math.abs(low - prevClose)
                    );
                    trueRanges.push(tr);
                }
                
                // Calculate ATR using Simple Moving Average
                const atrValues = [];
                let atr = trueRanges.slice(0, period).reduce((a, b) => a + b) / period;
                atrValues.push(atr);
                
                for (let i = period; i < trueRanges.length; i++) {
                    atr = ((atr * (period - 1)) + trueRanges[i]) / period;
                    atrValues.push(atr);
                }
                
                return atrValues;
            };
            
            const atrValues = calculateATR();
            
            // Calculate Keltner Channels
            for (let i = 0; i < data.length; i++) {
                ema = i === 0 ? data[i].Close : ema + k * (data[i].Close - ema);
                
                if (i >= period - 1) {
                    const atr = atrValues[i - (period - 1)];
                    keltnerData.push({
                        Date: data[i].Date,
                        Middle: ema,
                        Upper: ema + (multiplier * atr),
                        Lower: ema - (multiplier * atr)
                    });
                }
            }

            // Create series for middle line
            const middleSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Keltner Middle",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "Middle",
                    valueXField: "Date",
                    stroke: am5.color("#FFA726"), // Orange color
                    strokeWidth: 2,
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Keltner Middle: {valueY}"
                    })
                })
            );

            // Create series for upper band
            const upperSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Keltner Upper",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "Upper",
                    valueXField: "Date",
                    stroke: am5.color("#FFA726"),
                    strokeDasharray: [2, 2],
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Keltner Upper: {valueY}"
                    })
                })
            );

            // Create series for lower band
            const lowerSeries = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: "Keltner Lower",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    valueYField: "Lower",
                    valueXField: "Date",
                    stroke: am5.color("#FFA726"),
                    strokeDasharray: [2, 2],
                    tooltip: am5.Tooltip.new(this.root, {
                        labelText: "Keltner Lower: {valueY}"
                    })
                })
            );

            // Set data
            middleSeries.data.setAll(keltnerData);
            upperSeries.data.setAll(keltnerData);
            lowerSeries.data.setAll(keltnerData);
            
            return {
                series: [middleSeries, upperSeries, lowerSeries],
                data: keltnerData
            };
        }

        updateOverallAnalysis() {
            console.log('Updating analysis...');
            const analysisContainer = document.getElementById('analysis-container');
            
            // Add CSS if not already added
            if (!document.getElementById('analysis-styles')) {
                const styleSheet = document.createElement('style');
                styleSheet.id = 'analysis-styles';
                styleSheet.textContent = `
                    #analysis-container {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 10px;
                        padding: 10px;
                        max-height: 500px;
                        overflow-y: auto;
                    }
                    .analysis-box {
                        background: #1a1a1a;
                        border: 1px solid #333;
                        border-radius: 8px;
                        padding: 10px;
                        margin-bottom: 0;
                        font-size: 0.9em;
                    }
                    .analysis-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 8px;
                        border-bottom: 1px solid #333;
                        padding-bottom: 5px;
                    }
                    .analysis-header h3 {
                        margin: 0;
                        font-size: 1em;
                        color: #fff;
                    }
                    .signal {
                        font-weight: bold;
                        padding: 2px 6px;
                        border-radius: 4px;
                        background: #2a2a2a;
                    }
                    .metrics-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 5px;
                        margin-bottom: 8px;
                        font-size: 0.85em;
                    }
                    .metric-item {
                        display: flex;
                        justify-content: space-between;
                        background: #2a2a2a;
                        padding: 3px 6px;
                        border-radius: 4px;
                    }
                    .metric-label {
                        color: #888;
                    }
                    .metric-value {
                        font-weight: bold;
                    }
                    .analysis-points {
                        margin: 5px 0;
                        padding-left: 20px;
                        font-size: 0.85em;
                    }
                    .analysis-points li {
                        margin-bottom: 3px;
                        color: #ccc;
                    }
                    .recommendation {
                        font-size: 0.85em;
                        color: #4CAF50;
                        margin-top: 5px;
                        padding: 5px;
                        background: #2a2a2a;
                        border-radius: 4px;
                    }
                `;
                document.head.appendChild(styleSheet);
            }

            let analysisContent = '';
            const activeIndicators = this.activeIndicators;
            console.log('Active indicators:', Array.from(activeIndicators));
            
            if (activeIndicators.size === 0) {
                analysisContainer.innerHTML = '<p>Enable indicators to see analysis</p>';
                return;
            }

            // Bollinger Bands Analysis
            if (this.indicators?.bb) {
                console.log('BB Data:', this.indicators.bb);
                const bbData = this.indicators.bb;
                if (bbData && bbData.length > 0) {
                    const lastBB = bbData[bbData.length - 1];
                    const prevBB = bbData[bbData.length - 2];
                    
                    console.log('Last BB:', lastBB);
                    console.log('Prev BB:', prevBB);

                    let bbSignal = '';
                    let bbAnalysis = [];
                    
                    if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > lastBB.middleBand) {
                        bbSignal = '🟢 BULLISH';
                        if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > lastBB.upperBand) {
                            bbAnalysis.push('Price above upper band - potential overbought');
                        } else {
                            bbAnalysis.push('Price above middle band - upward momentum');
                        }
                    } else if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close < lastBB.middleBand) {
                        bbSignal = '🔴 BEARISH';
                        if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close < lastBB.lowerBand) {
                            bbAnalysis.push('Price below lower band - potential oversold');
                        } else {
                            bbAnalysis.push('Price below middle band - downward pressure');
                        }
                    } else {
                        bbSignal = '🟡 NEUTRAL';
                        if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > lastBB.MA) {
                            bbAnalysis.push('Price between MA and upper band - moderate bullish');
                        } else {
                            bbAnalysis.push('Price between MA and lower band - moderate bearish');
                        }
                    }
                    
                    // Band expansion/contraction
                    const currentBandWidth = lastBB.upperBand - lastBB.lowerBand;
                    const prevBandWidth = prevBB.upperBand - prevBB.lowerBand;
                    if (currentBandWidth > prevBandWidth) {
                        bbAnalysis.push('Bands starting to expand - volatility increasing');
                    } else {
                        bbAnalysis.push('Bands contracting - volatility decreasing');
                    }

                    // Volume analysis
                    if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > this.mainSeries.data.values[this.mainSeries.data.values.length - 2].Close) {
                        bbAnalysis.push('Volume increasing on upward move');
                    } else if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close < this.mainSeries.data.values[this.mainSeries.data.values.length - 2].Close) {
                        bbAnalysis.push('Volume increasing on downward move');
                    }

                    console.log('BB Signal:', bbSignal);
                    console.log('BB Analysis:', bbAnalysis);
                    
                    analysisContent += this.generateAnalysisHTML(
                        'Bollinger Bands',
                        bbSignal,
                        bbAnalysis,
                        {
                            'Upper Band': lastBB.upperBand.toFixed(2),
                            'Middle Band': lastBB.middleBand.toFixed(2),
                            'Lower Band': lastBB.lowerBand.toFixed(2)
                        },
                        this.getBBRecommendation(bbSignal, bbAnalysis),
                        this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close
                    );
                }
            }

            // Moving Average Analysis
            if (this.indicators?.ma20) {
                console.log('MA20 Data:', this.indicators.ma20);
                const ma20Data = this.indicators.ma20;
                if (ma20Data && ma20Data.length > 0) {
                    const lastMA20 = ma20Data[ma20Data.length - 1];
                    const prevMA20 = ma20Data[ma20Data.length - 2];
                    
                    console.log('Last MA20:', lastMA20);
                    console.log('Prev MA20:', prevMA20);

                    let maSignal = '';
                    let maAnalysis = [];
                    
                    if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > lastMA20.ma) {
                        maSignal = '🟢 BULLISH Signal';
                        maAnalysis.push('Price above MA20 - upward momentum');
                    } else {
                        maSignal = '🔴 BEARISH Signal';
                        maAnalysis.push('Price below MA20 - bearish trend');
                    }

                    // Volume analysis
                    if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > this.mainSeries.data.values[this.mainSeries.data.values.length - 2].Close) {
                        maAnalysis.push('Volume increasing on upward move');
                    } else if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close < this.mainSeries.data.values[this.mainSeries.data.values.length - 2].Close) {
                        maAnalysis.push('Volume increasing on downward move');
                    }

                    // Trend strength
                    if (lastMA20.ma > prevMA20.ma) {
                        maAnalysis.push('MA20 trending upward - bullish momentum');
                    } else if (lastMA20.ma < prevMA20.ma) {
                        maAnalysis.push('MA20 trending downward - bearish pressure');
                    }

                    console.log('MA Signal:', maSignal);
                    console.log('MA Analysis:', maAnalysis);
                    
                    let recommendation = this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > lastMA20.ma ? 
                        'Look for continuation above MA20' : 
                        'Consider defensive positioning below MA20';

                    analysisContent += this.generateAnalysisHTML(
                        'Moving Average (20)',
                        maSignal,
                        maAnalysis,
                        {
                            'MA20': lastMA20.ma.toFixed(2),
                            'Current Price': this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close.toFixed(2)
                        },
                        recommendation
                    );
                }
            }

            // MA50 Analysis
            if (this.indicators?.ma50) {
                console.log('MA50 Data:', this.indicators.ma50);
                const ma50Data = this.indicators.ma50;
                if (ma50Data && ma50Data.length > 0) {
                    const lastMA50 = ma50Data[ma50Data.length - 1];
                    const prevMA50 = ma50Data[ma50Data.length - 2];
                    
                    console.log('Last MA50:', lastMA50);
                    console.log('Prev MA50:', prevMA50);

                    let ma50Signal = '';
                    let ma50Analysis = [];
                    
                    if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > lastMA50.ma) {
                        ma50Signal = '🟢 BULLISH';
                        ma50Analysis.push('Price above MA50 - bullish trend');
                        if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > lastMA50.ma * 1.05) {
                            ma50Analysis.push('Price significantly above MA50 - potential overextension');
                        }
                    } else if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close < lastMA50.ma) {
                        ma50Signal = '🔴 BEARISH';
                        ma50Analysis.push('Price below MA50 - bearish trend');
                        if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close < lastMA50.ma * 0.95) {
                            ma50Analysis.push('Price significantly below MA50 - potential oversold');
                        }
                    }
                    
                    // Trend analysis
                    if (lastMA50.ma > prevMA50.ma) {
                        ma50Analysis.push('MA50 trending upward - strengthening bullish momentum');
                    } else if (lastMA50.ma < prevMA50.ma) {
                        ma50Analysis.push('MA50 trending downward - strengthening bearish pressure');
                    }

                    console.log('MA50 Signal:', ma50Signal);
                    console.log('MA50 Analysis:', ma50Analysis);
                    
                    analysisContent += this.generateAnalysisHTML(
                        'Moving Average (50)',
                        ma50Signal,
                        ma50Analysis,
                        {
                            'MA50': lastMA50.ma.toFixed(2)
                        },
                        this.getMARecommendation(ma50Signal, ma50Analysis, 50),
                        this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close
                    );
                }
            }

            // MA200 Analysis
            if (this.indicators?.ma200) {
                console.log('MA200 Data:', this.indicators.ma200);
                const ma200Data = this.indicators.ma200;
                if (ma200Data && ma200Data.length > 0) {
                    const lastMA200 = ma200Data[ma200Data.length - 1];
                    const prevMA200 = ma200Data[ma200Data.length - 2];
                    
                    console.log('Last MA200:', lastMA200);
                    console.log('Prev MA200:', prevMA200);

                    let ma200Signal = '';
                    let ma200Analysis = [];
                    
                    if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > lastMA200.ma) {
                        ma200Signal = '🟢 BULLISH';
                        ma200Analysis.push('Price above MA200 - long-term bullish trend');
                        if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close > lastMA200.ma * 1.1) {
                            ma200Analysis.push('Price significantly above MA200 - strong bull market');
                        }
                    } else if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close < lastMA200.ma) {
                        ma200Signal = '🔴 BEARISH';
                        ma200Analysis.push('Price below MA200 - long-term bearish trend');
                        if (this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close < lastMA200.ma * 0.9) {
                            ma200Analysis.push('Price significantly below MA200 - strong bear market');
                        }
                    }
                    
                    // Trend analysis
                    if (lastMA200.ma > prevMA200.ma) {
                        ma200Analysis.push('MA200 trending upward - long-term bull market structure');
                    } else if (lastMA200.ma < prevMA200.ma) {
                        ma200Analysis.push('MA200 trending downward - long-term bear market structure');
                    }

                    console.log('MA200 Signal:', ma200Signal);
                    console.log('MA200 Analysis:', ma200Analysis);
                    
                    analysisContent += this.generateAnalysisHTML(
                        'Moving Average (200)',
                        ma200Signal,
                        ma200Analysis,
                        {
                            'MA200': lastMA200.ma.toFixed(2)
                        },
                        this.getMARecommendation(ma200Signal, ma200Analysis, 200),
                        this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close
                    );
                }
            }

            // MA Envelope Analysis
            if (this.indicators?.env) {
                const data = this.mainSeries.data.values;
                const lastPrice = data[data.length - 1];
                const envelopeData = this.indicators.env;
                const lastEnvelope = envelopeData[envelopeData.length - 1];
                const prevEnvelope = envelopeData[envelopeData.length - 2];
                
                if (envelopeData && envelopeData.length > 0) {
                    let envSignal = '';
                    let envAnalysis = [];
                    
                    if (lastPrice.Close > lastEnvelope.Upper) {
                        envSignal = '🟢 BULLISH';
                        envAnalysis.push('Price above upper envelope - strong upward momentum');
                    } else if (lastPrice.Close < lastEnvelope.Lower) {
                        envSignal = '🔴 BEARISH';
                        envAnalysis.push('Price below lower envelope - strong downward pressure');
                    } else {
                        envSignal = '🟡 NEUTRAL';
                        if (lastPrice.Close > lastEnvelope.MA) {
                            envAnalysis.push('Price between MA and upper envelope - moderate bullish');
                        } else {
                            envAnalysis.push('Price between MA and lower envelope - moderate bearish');
                        }
                    }
                    
                    // Trend analysis
                    if (lastEnvelope.MA > prevEnvelope.MA) {
                        envAnalysis.push('MA trending upward - bullish bias');
                    } else if (lastEnvelope.MA < prevEnvelope.MA) {
                        envAnalysis.push('MA trending downward - bearish bias');
                    }

                    // Volatility analysis
                    const envelopeWidth = ((lastEnvelope.Upper - lastEnvelope.Lower) / lastEnvelope.MA) * 100;
                    envAnalysis.push(`Envelope width: ${envelopeWidth.toFixed(2)}% - ${envelopeWidth > 5 ? 'high' : 'normal'} volatility`);

                    let recommendation = '';
                    if (envSignal.includes('BULLISH')) {
                        recommendation = 'Watch for potential pullback to lower envelope';
                    } else if (envSignal.includes('BEARISH')) {
                        recommendation = 'Watch for potential bounce from upper envelope';
                    } else {
                        recommendation = 'Trade within envelope boundaries';
                    }

                    console.log('Envelope Signal:', envSignal);
                    console.log('Envelope Analysis:', envAnalysis);
                    
                    analysisContent += this.generateAnalysisHTML(
                        'MA Envelope',
                        envSignal,
                        envAnalysis,
                        {
                            'Upper Band': lastEnvelope.Upper.toFixed(2),
                            'MA(20)': lastEnvelope.MA.toFixed(2),
                            'Lower Band': lastEnvelope.Lower.toFixed(2),
                            'Current Price': lastPrice.Close.toFixed(2)
                        },
                        recommendation
                    );
                }
            }

            // SuperTrend Analysis
            if (this.indicators?.supertrend) {
                const stData = this.indicators.supertrend;
                if (stData && stData.length > 0) {
                    const currentST = stData[stData.length - 1];
                    const prevST = stData[stData.length - 2];
                    const currentPrice = this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close;

                    let signal = '';
                    let analysis = [];

                    // Analyze current trend
                    if (currentST.trend) {
                        signal = '🟢 BULLISH';
                        if (!prevST.trend) {
                            analysis.push('Fresh bullish crossover - potential start of uptrend');
                        } else {
                            analysis.push('Price above SuperTrend - uptrend continues');
                        }

                        // Calculate distance from SuperTrend
                        const distance = ((currentPrice - currentST.supertrend) / currentPrice) * 100;
                        if (distance > 5) {
                            analysis.push('Price significantly above SuperTrend - potential overextension');
                        } else if (distance < 1) {
                            analysis.push('Price close to SuperTrend - watch for potential reversal');
                        }
                    } else {
                        signal = '🔴 BEARISH';
                        if (prevST.trend) {
                            analysis.push('Fresh bearish crossover - potential start of downtrend');
                        } else {
                            analysis.push('Price below SuperTrend - downtrend continues');
                        }

                        // Calculate distance from SuperTrend
                        const distance = ((currentST.supertrend - currentPrice) / currentPrice) * 100;
                        if (distance > 5) {
                            analysis.push('Price significantly below SuperTrend - potential overextension');
                        } else if (distance < 1) {
                            analysis.push('Price close to SuperTrend - watch for potential reversal');
                        }
                    }

                    // Analyze trend strength
                    let trendCount = 0;
                    for (let i = stData.length - 1; i >= Math.max(0, stData.length - 10); i--) {
                        if (stData[i].trend === currentST.trend) trendCount++;
                        else break;
                    }

                    if (trendCount >= 8) {
                        analysis.push('Strong trend in place - trend has maintained direction for extended period');
                    } else if (trendCount <= 3) {
                        analysis.push('Recent trend change - monitor for confirmation');
                    }

                    analysisContent += this.generateAnalysisHTML(
                        'SuperTrend',
                        signal,
                        analysis,
                        {
                            'Current Level': currentST.supertrend.toFixed(2),
                            'Trend Duration': `${trendCount} periods`,
                            'Distance': `${((Math.abs(currentPrice - currentST.supertrend) / currentPrice) * 100).toFixed(2)}%`,
                            'Direction': currentST.trend ? 'Bullish' : 'Bearish'
                        },
                        currentST.trend ? 'Look for continuation above SuperTrend' : 'Watch for break above SuperTrend'
                    );
                }
            }

            // Ichimoku Analysis
            if (this.indicators?.ichimoku) {
                const ichimokuData = this.indicators.ichimoku;
                if (ichimokuData && ichimokuData.length > 0) {
                    const currentData = ichimokuData[ichimokuData.length - 1];
                    const prevData = ichimokuData[ichimokuData.length - 2];
                    const currentPrice = this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close;

                    let signal = '';
                    let analysis = [];

                    // Analyze current position relative to cloud
                    if (currentPrice > currentData.senkouSpanA && currentPrice > currentData.senkouSpanB) {
                        signal = '🟢 BULLISH';
                        analysis.push('Price above Kumo cloud - strong bullish trend');
                    } else if (currentPrice < currentData.senkouSpanA && currentPrice < currentData.senkouSpanB) {
                        signal = '🔴 BEARISH';
                        analysis.push('Price below Kumo cloud - strong bearish trend');
                    } else {
                        signal = '🟡 NEUTRAL';
                        analysis.push('Price inside Kumo cloud - consolidation/uncertainty');
                    }

                    // Analyze Tenkan/Kijun cross
                    if (currentData.tenkanSen > currentData.kijunSen) {
                        if (prevData.tenkanSen <= prevData.kijunSen) {
                            analysis.push('Fresh bullish TK cross - potential uptrend starting');
                        } else {
                            analysis.push('Tenkan-sen above Kijun-sen - bullish trend active');
                        }
                    } else if (currentData.tenkanSen < currentData.kijunSen) {
                        if (prevData.tenkanSen >= prevData.kijunSen) {
                            analysis.push('Fresh bearish TK cross - potential downtrend starting');
                        } else {
                            analysis.push('Tenkan-sen below Kijun-sen - bearish trend active');
                        }
                    }

                    // Analyze cloud structure
                    if (currentData.senkouSpanA > currentData.senkouSpanB) {
                        analysis.push('Future cloud is bullish (green)');
                    } else if (currentData.senkouSpanA < currentData.senkouSpanB) {
                        analysis.push('Future cloud is bearish (red)');
                    }

                    // Analyze Chikou Span
                    const chikouIndex = ichimokuData.length - 27; // 26 periods back
                    if (chikouIndex >= 0) {
                        const chikouData = ichimokuData[chikouIndex];
                        if (currentData.chikouSpan > chikouData.close) {
                            analysis.push('Chikou Span above price - strengthening bullish trend');
                        } else if (currentData.chikouSpan < chikouData.close) {
                            analysis.push('Chikou Span below price - strengthening bearish trend');
                        }
                    }

                    analysisContent += this.generateAnalysisHTML(
                        'Ichimoku Cloud',
                        signal,
                        analysis,
                        {
                            'Tenkan-sen': currentData.tenkanSen.toFixed(2),
                            'Kijun-sen': currentData.kijunSen.toFixed(2),
                            'Cloud Top': Math.max(currentData.senkouSpanA, currentData.senkouSpanB).toFixed(2),
                            'Cloud Bottom': Math.min(currentData.senkouSpanA, currentData.senkouSpanB).toFixed(2)
                        },
                        'Look for price to stay above Tenkan-sen'
                    );
                }
            }

            // ZigZag Analysis
            if (this.indicators?.zigzag) {
                const zigzagData = this.indicators.zigzag;
                if (zigzagData && zigzagData.length >= 2) {
                    const lastTwo = zigzagData.slice(-2);
                    const currentPrice = this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close;

                    let signal = '';
                    let analysis = [];

                    // Determine trend based on last two pivots
                    if (lastTwo[1].Value > lastTwo[0].Value) {
                        signal = '🟢 BULLISH Signal';
                        analysis.push('Last swing forming higher high');
                    } else {
                        signal = '🔴 BEARISH Signal';
                        analysis.push('Last swing forming lower low');
                    }

                    // Price position relative to last pivot
                    const lastPivot = zigzagData[zigzagData.length - 1];
                    const priceChange = ((currentPrice - lastPivot.Value) / lastPivot.Value) * 100;
                    
                    if (Math.abs(priceChange) > 5) {
                        analysis.push(`Price moved ${Math.abs(priceChange).toFixed(2)}% from last pivot - potential new zigzag point forming`);
                    }

                    let recommendation = signal.includes('BULLISH') ? 
                        'Look for pullbacks to previous pivot points for potential entries' : 
                        'Watch for reversals at previous pivot points';

                    analysisContent += this.generateAnalysisHTML(
                        'ZigZag',
                        signal,
                        analysis,
                        {
                            'Last High': Math.max(...lastTwo.map(p => p.Value)).toFixed(2),
                            'Last Low': Math.min(...lastTwo.map(p => p.Value)).toFixed(2),
                            'Current Price': currentPrice.toFixed(2)
                        },
                        recommendation
                    );
                }
            }

            // Hull MA Analysis
            if (this.indicators?.hullma) {
                const hullData = this.indicators.hullma;
                if (hullData && hullData.length >= 2) {
                    const lastTwo = hullData.slice(-2);
                    const currentPrice = this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close;
                    
                    let signal = '';
                    let analysis = [];
                    
                    // Determine trend based on Hull MA slope
                    const hullSlope = lastTwo[1].Value - lastTwo[0].Value;
                    if (hullSlope > 0) {
                        signal = '🟢 BULLISH Trend';
                        analysis.push('Hull MA trending upward - momentum is positive');
                    } else {
                        signal = '🔴 BEARISH Trend';
                        analysis.push('Hull MA trending downward - momentum is negative');
                    }
                    
                    // Price position relative to Hull MA
                    if (currentPrice > lastTwo[1].Value) {
                        analysis.push('Price above Hull MA - bullish control');
                    } else {
                        analysis.push('Price below Hull MA - bearish control');
                    }

                    // Trend strength
                    const slopeStrength = Math.abs(hullSlope) / lastTwo[1].Value * 100;
                    if (slopeStrength > 0.5) {
                        analysis.push(`Strong trend momentum (${slopeStrength.toFixed(2)}% slope)`);
                    } else {
                        analysis.push('Weak trend momentum - potential consolidation');
                    }

                    analysisContent += this.generateAnalysisHTML(
                        'Hull MA',
                        signal,
                        analysis,
                        {
                            'Current Hull MA': lastTwo[1].Value.toFixed(2),
                            'Hull MA Slope': `${(hullSlope > 0 ? '+' : '')}${hullSlope.toFixed(2)}`,
                            'Price vs Hull MA': `${((currentPrice - lastTwo[1].Value) / lastTwo[1].Value * 100).toFixed(2)}%`
                        },
                        'Look for price to maintain above Hull MA line'
                    );
                }
            }

            // Keltner Channels Analysis
            if (this.indicators?.keltner) {
                const keltnerData = this.indicators.keltner;
                if (keltnerData && keltnerData.length >= 1) {
                    const lastData = keltnerData[keltnerData.length - 1];
                    const currentPrice = this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close;
                    
                    let signal = '';
                    let analysis = [];
                    
                    // Determine position relative to channels
                    if (currentPrice > lastData.Upper) {
                        signal = '🟢 STRONG BULLISH';
                        analysis.push('Price above upper Keltner Channel - strong upward momentum');
                    } else if (currentPrice < lastData.Lower) {
                        signal = '🔴 STRONG BEARISH';
                        analysis.push('Price below lower Keltner Channel - strong downward momentum');
                    } else {
                        signal = '⚪ NEUTRAL';
                        if (currentPrice > lastData.Middle) {
                            analysis.push('Price in upper half of channel - bullish bias');
                        } else {
                            analysis.push('Price in lower half of channel - bearish bias');
                        }
                    }

                    // Channel width analysis
                    const channelWidth = ((lastData.Upper - lastData.Lower) / lastData.Middle) * 100;
                    if (channelWidth > 5) {
                        analysis.push('Wide channel - high volatility environment');
                    } else {
                        analysis.push('Narrow channel - low volatility environment');
                    }

                    // Price position relative to middle line
                    const priceDeviation = ((currentPrice - lastData.Middle) / lastData.Middle) * 100;
                    analysis.push(`Price deviation from middle line: ${priceDeviation.toFixed(2)}%`);

                    analysisContent += this.generateAnalysisHTML(
                        'Keltner Channels',
                        signal,
                        analysis,
                        {
                            'Upper Band': lastData.Upper.toFixed(2),
                            'Middle Line': lastData.Middle.toFixed(2),
                            'Lower Band': lastData.Lower.toFixed(2),
                            'Channel Width': `${channelWidth.toFixed(2)}%`
                        },
                        'Look for price to stay within channel bounds'
                    );
                }
            }

            // PSAR Analysis
            if (this.indicators?.psar) {
                const psarData = this.indicators.psar;
                if (psarData && psarData.length >= 2) {
                    const lastTwo = psarData.slice(-2);
                    const currentPrice = this.mainSeries.data.values[this.mainSeries.data.values.length - 1].Close;

                    let signal = '';
                    let analysis = [];

                    // Determine current trend and position
                    const lastPoint = lastTwo[1];
                    if (lastPoint.isLong) {
                        signal = '🟢 BULLISH';
                        analysis.push('PSAR below price - uptrend active');
                        if (lastTwo[0].isLong) {
                            analysis.push('Continued uptrend - momentum maintained');
                        } else {
                            analysis.push('Fresh uptrend - recent bullish reversal');
                        }
                    } else {
                        signal = '🔴 BEARISH';
                        analysis.push('PSAR above price - downtrend active');
                        if (!lastTwo[0].isLong) {
                            analysis.push('Continued downtrend - momentum maintained');
                        } else {
                            analysis.push('Fresh downtrend - recent bearish reversal');
                        }
                    }

                    // Calculate distance from PSAR to price
                    const psarDistance = Math.abs(currentPrice - lastPoint.Value) / currentPrice * 100;
                    if (psarDistance < 1) {
                        analysis.push('Price near PSAR - potential trend reversal zone');
                    } else if (psarDistance > 5) {
                        analysis.push('Price far from PSAR - trend might be overextended');
                    }

                    analysisContent += this.generateAnalysisHTML(
                        'Parabolic SAR',
                        signal,
                        analysis,
                        {
                            'PSAR Level': lastPoint.Value.toFixed(2),
                            'Distance': `${psarDistance.toFixed(2)}%`,
                            'Trend': lastPoint.isLong ? 'Bullish' : 'Bearish'
                        },
                        'Look for reversal points at SAR dots'
                    );
                }
            }

            console.log('Final analysis content:', analysisContent);
            analysisContainer.innerHTML = analysisContent || '<p>Enable indicators to see analysis</p>';
        }

        generateAnalysisHTML(title, signal, analysis, metrics, recommendation = '', currentPrice) {
            let metricsHTML = '';
            if (metrics && Object.keys(metrics).length > 0) {
                metricsHTML = Object.entries(metrics).map(([key, value]) => {
                    return `
                        <div class="metric">
                            <span class="metric-label">${key}:</span>
                            <span class="metric-value">${value}</span>
                        </div>
                    `;
                }).join('');
            }

            let analysisClass = '';
            if (signal === 'bullish') {
                analysisClass = 'bullish';
            } else if (signal === 'bearish') {
                analysisClass = 'bearish';
            }

            const recommendationHTML = recommendation ? `
                <div class="recommendation">
                    <span class="recommendation-label">Look for:</span>
                    <span class="recommendation-text">${recommendation}</span>
                </div>
            ` : '';

            return `
                <div class="analysis-box ${analysisClass}">
                    <div class="analysis-header">
                        <h3>${title}</h3>
                        ${signal ? `<span class="signal ${signal}">${signal.toUpperCase()}</span>` : ''}
                    </div>
                    ${metricsHTML}
                    <ul class="analysis-points">
                        ${analysis.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                    ${recommendationHTML}
                </div>
            `;
        }

        getBBRecommendation(signal, analysis) {
            if (signal.includes('BULLISH')) {
                if (analysis.some(a => a.includes('above upper band'))) {
                    return 'Watch for potential pullback to middle band';
                }
                return 'Look for continuation above middle band';
            } else if (signal.includes('BEARISH')) {
                if (analysis.some(a => a.includes('below lower band'))) {
                    return 'Watch for potential bounce from oversold levels';
                }
                return 'Monitor for further downside below middle band';
            }
            return 'Wait for clearer directional signal';
        }

        getMARecommendation(signal, analysis, period = 20) {
            if (signal.includes('BULLISH')) {
                if (analysis.some(a => a.includes('trending upward'))) {
                    return `Consider long positions with stops below MA${period}`;
                }
                return 'Watch for continuation of upward momentum';
            }
            return `Consider defensive positioning below MA${period}`;
        }

        getSTRecommendation(signal, analysis) {
            if (signal.includes('BULLISH')) {
                if (analysis.some(a => a.includes('Continuing uptrend'))) {
                    return 'Strong buy signal - maintain longs above SuperTrend';
                }
                return 'New uptrend signal - consider long positions with confirmation';
            }
            if (analysis.some(a => a.includes('Continuing downtrend'))) {
                return 'Strong sell signal - maintain shorts below SuperTrend';
            }
            return 'New downtrend signal - consider short positions with confirmation';
        }

        getIchimokuRecommendation(signal, analysis) {
            if (signal.includes('BULLISH')) {
                if (analysis.some(a => a.includes('TK Cross positive'))) {
                    return 'Strong buy signal - maintain longs above Kijun-sen';
                }
                return 'Bullish trend - look for entries on pullbacks to Tenkan-sen';
            } else if (signal.includes('BEARISH')) {
                if (analysis.some(a => a.includes('TK Cross negative'))) {
                    return 'Strong sell signal - maintain shorts below Kijun-sen';
                }
                return 'Bearish trend - look for shorts on rallies to Tenkan-sen';
            }
            return 'Range-bound - wait for break of Kumo';
        }

        getEnvelopeRecommendation(signal, analysis) {
            if (signal.includes('BULLISH')) {
                return 'Watch for potential pullback to lower envelope';
            } else if (signal.includes('BEARISH')) {
                return 'Watch for potential bounce from upper envelope';
            }
            return 'Wait for clearer directional signal';
        }
    }

    // Initialize chart with a small delay to ensure DOM is ready
    setTimeout(async () => {
        try {
            console.log('Initializing BTC chart...');
            btcChart = new BTCChart();
            await btcChart.init();
            btcChart.setupEventListeners();
            
            console.log('Initializing auto-detection chart...');
            autoDetectionChart = new AutoDetectionChart();
            await autoDetectionChart.init();
            
            // Auto-enable BB and MA20 indicators
            console.log('Auto-enabling indicators...');
            await btcChart.addIndicator('bb');
            await btcChart.addIndicator('ma20');
            
            // Update button states
            document.querySelector('[data-indicator="bb"]')?.classList.add('active');
            document.querySelector('[data-indicator="ma20"]')?.classList.add('active');
            
            // Force analysis update
            btcChart.updateOverallAnalysis();
        } catch (error) {
            console.error('Failed to initialize charts:', error);
        }
    }, 1000);
}

// Restoring chart with compact layout
function initializeChart() {
    try {
        console.log('Creating chart...');
        
        // Ensure chartdiv exists
        const chartDiv = document.getElementById('chartdiv');
        if (!chartDiv) {
            throw new Error('Chart div not found');
        }

        // Set chart height to be more compact
        chartDiv.style.height = '400px';

        // Create root element
        const root = am5.Root.new("chartdiv");

        // Set themes
        root.setThemes([am5themes_Dark.new(root)]);

        // Create chart
        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: true,
                wheelX: "panX",
                wheelY: "zoomX",
                layout: root.verticalLayout,
                height: am5.percent(60)
            })
        );
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}
