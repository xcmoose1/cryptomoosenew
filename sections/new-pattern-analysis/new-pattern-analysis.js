import { binanceHandler } from '/js/config/binance-config.js';

export default class PatternAnalysis {
    constructor() {
        console.log('Initializing pattern analysis...');
        this.init();
    }

    async init() {
        try {
            // Create the HTML structure first
            const container = document.getElementById('section-content');
            if (!container) {
                console.error('Could not find section-content container');
                return;
            }

            // Insert the HTML structure
            container.innerHTML = `
                <div class="pattern-analysis-container">
                    <div class="pattern-screener">
                        <h3>Pattern Screener</h3>
                        <div class="screener-filters">
                            <select id="pattern-type">
                                <option value="all">All Patterns</option>
                                <option value="chart">Chart Patterns</option>
                                <option value="candlestick">Candlestick Patterns</option>
                                <option value="harmonic">Harmonic Patterns</option>
                            </select>
                            <select id="timeframe">
                                <option value="4h">4H</option>
                                <option value="8h">8H</option>
                                <option value="1d">1D</option>
                            </select>
                            <select id="completion">
                                <option value="all">All Stages</option>
                                <option value="forming">Forming</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <div id="pattern-list"></div>
                    </div>

                    <div class="chart-section">
                        <div id="chartdiv" style="width: 100%; height: 500px;"></div>
                        <div class="card">
                            <div id="pattern-info"></div>
                            <div id="success-rate"></div>
                        </div>
                        <div class="card">
                            <h3>Similar Patterns</h3>
                            <div id="similar-patterns"></div>
                        </div>
                        <div class="card">
                            <h3>Pattern Statistics</h3>
                            <div id="pattern-stats"></div>
                        </div>
                        <div class="card">
                            <h3>Market Context</h3>
                            <div id="market-context"></div>
                        </div>
                    </div>
                </div>
            `;

            await this.initializeChart();
            this.setupEventListeners();
            await this.loadPatterns();
            console.log('Pattern Analysis initialized successfully');
        } catch (error) {
            console.error('Error in Pattern Analysis initialization:', error);
        }
    }

    async initializeChart() {
        try {
            console.log('Initializing chart...');
            
            // Create root
            this.root = am5.Root.new("chartdiv");
            console.log('Root created');
            
            // Set themes
            this.root.setThemes([
                am5themes_Dark.new(this.root),
                am5themes_Animated.new(this.root)
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
                    pinchZoomX: true
                })
            );
            console.log('Chart created');

            // Create axes
            const xAxis = this.chart.xAxes.push(
                am5xy.DateAxis.new(this.root, {
                    baseInterval: { timeUnit: "minute", count: 1 },
                    renderer: am5xy.AxisRendererX.new(this.root, {
                        minGridDistance: 50,
                        pan: "zoom"
                    })
                })
            );
            console.log('X axis created');

            const yAxis = this.chart.yAxes.push(
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
                    name: "BTC/USDT",
                    xAxis: xAxis,
                    yAxis: yAxis,
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
                xAxis: xAxis,
                yAxis: yAxis
            }));
            console.log('Cursor added');

            // Add scrollbar
            this.chart.set("scrollbarX", am5.Scrollbar.new(this.root, {
                orientation: "horizontal"
            }));
            console.log('Scrollbar added');

            // Load initial data
            await this.loadChartData();
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

    async loadChartData() {
        try {
            console.log('Loading chart data...');
            const klines = await binanceHandler.getKlines('BTCUSDT', '4h');
            
            const data = klines.map(k => ({
                Date: k[0],
                Open: parseFloat(k[1]),
                High: parseFloat(k[2]),
                Low: parseFloat(k[3]),
                Close: parseFloat(k[4])
            }));

            console.log('Chart data loaded:', data.length, 'candles');
            this.mainSeries.data.setAll(data);
        } catch (error) {
            console.error('Error loading chart data:', error);
            throw error;
        }
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Pattern type filter
        document.getElementById('pattern-type').addEventListener('change', () => {
            this.filterPatterns();
        });

        // Timeframe filter
        document.getElementById('timeframe').addEventListener('change', () => {
            this.filterPatterns();
        });

        // Completion filter
        document.getElementById('completion').addEventListener('change', () => {
            this.filterPatterns();
        });
    }

    async loadPatterns() {
        try {
            // Mock pattern data for now
            this.patternData = [
                {
                    id: 1,
                    symbol: "BTC/USDT",
                    type: "chart",
                    pattern: "Double Bottom",
                    timeframe: "4h",
                    status: "forming",
                    confidence: 85,
                    priceTarget: 48000
                },
                {
                    id: 2,
                    symbol: "BTC/USDT",
                    type: "candlestick",
                    pattern: "Bullish Engulfing",
                    timeframe: "1d",
                    status: "completed",
                    confidence: 92,
                    priceTarget: 52000
                }
            ];
            
            this.setupPatternList();
            console.log('Patterns loaded successfully');
        } catch (error) {
            console.error('Error loading patterns:', error);
            throw error;
        }
    }

    setupPatternList() {
        const patternList = document.getElementById('pattern-list');
        if (!patternList) return;

        patternList.innerHTML = '';

        this.patternData.forEach(pattern => {
            const patternElement = document.createElement('div');
            patternElement.className = 'pattern-item';
            patternElement.innerHTML = `
                <div class="symbol">${pattern.symbol}</div>
                <div class="details">
                    <div>${pattern.pattern} (${pattern.timeframe})</div>
                    <div>Confidence: ${pattern.confidence}%</div>
                    <div>Target: $${pattern.priceTarget}</div>
                </div>
            `;

            patternElement.addEventListener('click', () => {
                this.selectPattern(pattern);
            });

            patternList.appendChild(patternElement);
        });
    }

    filterPatterns() {
        // Implementation for filtering patterns
        console.log('Filtering patterns...');
    }

    selectPattern(pattern) {
        this.currentPattern = pattern;
        
        // Update pattern info
        const patternInfo = document.getElementById('pattern-info');
        if (patternInfo) {
            patternInfo.innerHTML = `
                <h3>${pattern.pattern}</h3>
                <p>Symbol: ${pattern.symbol}</p>
                <p>Timeframe: ${pattern.timeframe}</p>
                <p>Status: ${pattern.status}</p>
                <p>Confidence: ${pattern.confidence}%</p>
                <p>Price Target: $${pattern.priceTarget}</p>
            `;
        }

        // Update success rate
        const successRate = document.getElementById('success-rate');
        if (successRate) {
            successRate.innerHTML = `
                <h3>Success Rate</h3>
                <p>Historical: 78%</p>
                <p>Current Market: 85%</p>
            `;
        }

        // Update similar patterns
        const similarPatterns = document.getElementById('similar-patterns');
        if (similarPatterns) {
            similarPatterns.innerHTML = `
                <div>BTC/USDT - ${pattern.pattern} (2024-01-15)</div>
                <div>BTC/USDT - ${pattern.pattern} (2023-12-20)</div>
            `;
        }

        // Update pattern stats
        const patternStats = document.getElementById('pattern-stats');
        if (patternStats) {
            patternStats.innerHTML = `
                <div>Average Return: 12.5%</div>
                <div>Time to Target: 5.2 days</div>
                <div>Risk/Reward: 2.8</div>
            `;
        }
    }
}
