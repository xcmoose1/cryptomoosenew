import { binanceHandler } from '../../js/config/binance-config.js';

// Note: These are now loaded from the main HTML file
const am5 = window.am5;
const am5xy = window.am5xy;
const am5themes_Animated = window.am5themes_Animated;
const am5themes_Dark = window.am5themes_Dark;

export function initializeVolumeProfile() {
    console.log('[VolumeProfile] Initializing volume profile...');

    // First, create the HTML structure
    const container = document.getElementById('section-content');
    if (!container) {
        console.error('[VolumeProfile] Could not find section-content container');
        return;
    }

    // Insert the HTML structure
    container.innerHTML = `
        <div class="volume-profile-container">
            <div class="chart-controls">
                <div class="main-controls">
                    <div class="coin-selector">
                        <select id="coin-select">
                            <option value="BTCUSDT" selected>BTC/USDT</option>
                            <option value="ETHUSDT">ETH/USDT</option>
                            <option value="SOLUSDT">SOL/USDT</option>
                            <option value="XRPUSDT">XRP/USDT</option>
                            <option value="ADAUSDT">ADA/USDT</option>
                            <option value="BNBUSDT">BNB/USDT</option>
                            <option value="DOGEUSDT">DOGE/USDT</option>
                            <option value="SHIBUSDT">SHIB/USDT</option>
                            <option value="TRXUSDT">TRX/USDT</option>
                            <option value="TONUSDT">TON/USDT</option>
                        </select>
                    </div>
                    <div class="timeframes">
                        <select id="vp-timeframe">
                            <option value="1h">1H</option>
                            <option value="4h" selected>4H</option>
                            <option value="1d">1D</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="charts-grid">
                <div class="chart-container main-chart">
                    <div class="chart-header">
                        <h2>Price & Volume</h2>
                        <span class="chart-description">Price action with volume analysis</span>
                    </div>
                    <div id="price-volume-chart"></div>
                </div>
                
                <div class="side-charts">
                    <div class="chart-container delta-chart">
                        <div class="chart-header">
                            <h2>Delta Analysis</h2>
                            <span class="chart-description">Buy/Sell volume difference over time</span>
                        </div>
                        <div id="delta-chart"></div>
                    </div>
                    
                    <div class="chart-container vbp-chart">
                        <div class="chart-header">
                            <h2>Volume Profile</h2>
                            <span class="chart-description">Volume distribution by price level</span>
                        </div>
                        <div id="vbp-chart"></div>
                    </div>
                    
                    <div class="chart-container vwap-chart">
                        <div class="chart-header">
                            <h2>VWAP Analysis</h2>
                            <span class="chart-description">Price deviation from VWAP</span>
                        </div>
                        <div id="vwap-deviation-chart"></div>
                    </div>
                </div>
            </div>

            <div class="chart-controls">
                <div class="profile-settings">
                    <label>
                        <input type="checkbox" id="show-poc" checked>
                        Show POC
                    </label>
                    <label>
                        <input type="checkbox" id="show-vwap" checked>
                        Show VWAP
                    </label>
                    <label>
                        <input type="checkbox" id="show-value-areas" checked>
                        Show Value Areas
                    </label>
                </div>
            </div>

            <div class="stats-panel">
                <div class="volume-stats">
                    <h3>Volume Statistics</h3>
                    <div id="volume-stats"></div>
                </div>
                <div class="delta-stats">
                    <h3>Delta Analysis</h3>
                    <div id="delta-stats"></div>
                </div>
                <div class="vwap-stats">
                    <h3>VWAP Analysis</h3>
                    <div id="vwap-stats"></div>
                </div>
            </div>
        </div>
    `;

    // Add license
    am5.addLicense("AM5S-5602-4210-7362-8604");

    // Initialize VolumeProfile class
    const volumeProfile = new VolumeProfile();
    volumeProfile.init();
}

class VolumeProfile {
    constructor() {
        console.log('[VolumeProfile] Constructor called');
        this.timeframe = '4h';
        this.symbol = 'BTCUSDT';
        
        // Chart roots
        this.priceVolumeRoot = null;
        this.deltaRoot = null;
        this.vbpRoot = null;
        this.vwapRoot = null;
        
        // Charts
        this.priceVolumeChart = null;
        this.deltaChart = null;
        this.vbpChart = null;
        this.vwapChart = null;
        
        // Series
        this.candlestickSeries = null;
        this.volumeSeries = null;
        this.deltaSeries = null;
        this.vbpSeries = null;
        this.vwapSeries = null;
        
        // Data
        this.data = null;
        
        // Initialize after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            console.log('[VolumeProfile] Starting initialization sequence');
            await this.loadData();
            await this.initializeCharts();
            this.setupEventListeners();
            console.log('[VolumeProfile] Initialization complete');
        } catch (error) {
            console.error('[VolumeProfile] Error during initialization:', error);
            throw error;
        }
    }

    async loadData() {
        try {
            console.log(`[VolumeProfile] Loading data for ${this.symbol} on ${this.timeframe} timeframe`);
            const klines = await binanceHandler.getKlines(this.symbol, this.timeframe);
            console.log(`[VolumeProfile] Received ${klines.length} klines from Binance`);
            
            this.data = klines.map(k => ({
                timestamp: k[0],
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
                closeTime: k[6],
                quoteVolume: parseFloat(k[7]),
                trades: parseInt(k[8]),
                takerBuyBaseVolume: parseFloat(k[9]),
                takerBuyQuoteVolume: parseFloat(k[10])
            }));
            
            console.log('[VolumeProfile] Data processed:', {
                firstCandle: this.data[0],
                lastCandle: this.data[this.data.length - 1],
                totalCandles: this.data.length
            });
        } catch (error) {
            console.error('[VolumeProfile] Error loading data:', error);
            throw error;
        }
    }

    async initializeCharts() {
        try {
            console.log('[VolumeProfile] Initializing charts');
            
            // Initialize each chart separately
            await this.initializePriceVolumeChart();
            console.log('[VolumeProfile] Price & Volume chart initialized');
            
            await this.initializeDeltaChart();
            console.log('[VolumeProfile] Delta chart initialized');
            
            await this.initializeVBPChart();
            console.log('[VolumeProfile] VBP chart initialized');
            
            await this.initializeVWAPChart();
            console.log('[VolumeProfile] VWAP chart initialized');

            console.log('[VolumeProfile] All charts initialized successfully');
        } catch (error) {
            console.error('[VolumeProfile] Error initializing charts:', error);
            throw error;
        }
    }

    async initializePriceVolumeChart() {
        // Dispose of existing root if any
        if (this.priceVolumeRoot) {
            this.priceVolumeRoot.dispose();
        }

        // Create root
        this.priceVolumeRoot = am5.Root.new("price-volume-chart");
        
        // Set themes
        this.priceVolumeRoot.setThemes([
            am5themes_Dark.new(this.priceVolumeRoot),
            am5themes_Animated.new(this.priceVolumeRoot)
        ]);
        
        // Create chart
        this.priceVolumeChart = this.priceVolumeRoot.container.children.push(
            am5xy.XYChart.new(this.priceVolumeRoot, {
                panX: true,
                panY: true,
                wheelX: "panX",
                wheelY: "zoomX",
                layout: this.priceVolumeRoot.verticalLayout,
                pinchZoomX: true
            })
        );

        // Create Y axis
        const yAxis = this.priceVolumeChart.yAxes.push(
            am5xy.ValueAxis.new(this.priceVolumeRoot, {
                renderer: am5xy.AxisRendererY.new(this.priceVolumeRoot, {})
            })
        );

        // Create X axis
        const xAxis = this.priceVolumeChart.xAxes.push(
            am5xy.DateAxis.new(this.priceVolumeRoot, {
                baseInterval: { timeUnit: "minute", count: 1 },
                renderer: am5xy.AxisRendererX.new(this.priceVolumeRoot, {})
            })
        );

        // Create series
        this.candlestickSeries = this.priceVolumeChart.series.push(
            am5xy.CandlestickSeries.new(this.priceVolumeRoot, {
                name: this.symbol,
                xAxis: xAxis,
                yAxis: yAxis,
                openValueYField: "open",
                highValueYField: "high",
                lowValueYField: "low",
                valueYField: "close",
                valueXField: "timestamp"
            })
        );

        // Set data
        this.candlestickSeries.data.setAll(this.data);
    }

    async initializeDeltaChart() {
        // Dispose of existing root if any
        if (this.deltaRoot) {
            this.deltaRoot.dispose();
        }

        // Create root
        this.deltaRoot = am5.Root.new("delta-chart");
        
        // Set themes
        this.deltaRoot.setThemes([
            am5themes_Dark.new(this.deltaRoot),
            am5themes_Animated.new(this.deltaRoot)
        ]);
        
        // Create chart
        this.deltaChart = this.deltaRoot.container.children.push(
            am5xy.XYChart.new(this.deltaRoot, {
                panX: true,
                panY: true,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        // Create axes
        const xAxis = this.deltaChart.xAxes.push(
            am5xy.DateAxis.new(this.deltaRoot, {
                baseInterval: { timeUnit: "minute", count: 1 },
                renderer: am5xy.AxisRendererX.new(this.deltaRoot, {})
            })
        );

        const yAxis = this.deltaChart.yAxes.push(
            am5xy.ValueAxis.new(this.deltaRoot, {
                renderer: am5xy.AxisRendererY.new(this.deltaRoot, {})
            })
        );

        // Create series
        this.deltaSeries = this.deltaChart.series.push(
            am5xy.LineSeries.new(this.deltaRoot, {
                name: "Delta",
                xAxis: xAxis,
                yAxis: yAxis,
                valueYField: "delta",
                valueXField: "timestamp",
                tooltip: am5.Tooltip.new(this.deltaRoot, {
                    labelText: "{valueY}"
                })
            })
        );

        // Calculate and set delta data
        const deltaData = this.data.map(d => ({
            timestamp: d.timestamp,
            delta: d.takerBuyBaseVolume - (d.volume - d.takerBuyBaseVolume)
        }));

        this.deltaSeries.data.setAll(deltaData);
    }

    async initializeVBPChart() {
        // Dispose of existing root if any
        if (this.vbpRoot) {
            this.vbpRoot.dispose();
        }

        // Create root
        this.vbpRoot = am5.Root.new("vbp-chart");
        
        // Set themes
        this.vbpRoot.setThemes([
            am5themes_Dark.new(this.vbpRoot),
            am5themes_Animated.new(this.vbpRoot)
        ]);
        
        // Create chart
        this.vbpChart = this.vbpRoot.container.children.push(
            am5xy.XYChart.new(this.vbpRoot, {
                panY: true,
                wheelY: "zoomX",
                layout: this.vbpRoot.horizontalLayout
            })
        );

        // Create axes
        const yAxis = this.vbpChart.yAxes.push(
            am5xy.ValueAxis.new(this.vbpRoot, {
                renderer: am5xy.AxisRendererY.new(this.vbpRoot, {})
            })
        );

        const xAxis = this.vbpChart.xAxes.push(
            am5xy.ValueAxis.new(this.vbpRoot, {
                renderer: am5xy.AxisRendererX.new(this.vbpRoot, {})
            })
        );

        // Create series
        this.vbpSeries = this.vbpChart.series.push(
            am5xy.ColumnSeries.new(this.vbpRoot, {
                name: "VBP",
                xAxis: xAxis,
                yAxis: yAxis,
                valueYField: "price",
                valueXField: "volume",
                tooltip: am5.Tooltip.new(this.vbpRoot, {
                    labelText: "Price: {valueY}\nVolume: {valueX}"
                })
            })
        );

        // Calculate VBP data
        const priceMap = new Map();
        this.data.forEach(d => {
            const price = Math.round(d.close);
            const volume = d.volume;
            priceMap.set(price, (priceMap.get(price) || 0) + volume);
        });

        const vbpData = Array.from(priceMap.entries()).map(([price, volume]) => ({
            price,
            volume
        }));

        this.vbpSeries.data.setAll(vbpData);
    }

    async initializeVWAPChart() {
        // Dispose of existing root if any
        if (this.vwapRoot) {
            this.vwapRoot.dispose();
        }

        // Create root
        this.vwapRoot = am5.Root.new("vwap-deviation-chart");
        
        // Set themes
        this.vwapRoot.setThemes([
            am5themes_Dark.new(this.vwapRoot),
            am5themes_Animated.new(this.vwapRoot)
        ]);
        
        // Create chart
        this.vwapChart = this.vwapRoot.container.children.push(
            am5xy.XYChart.new(this.vwapRoot, {
                panX: true,
                panY: true,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        // Create axes
        const xAxis = this.vwapChart.xAxes.push(
            am5xy.DateAxis.new(this.vwapRoot, {
                baseInterval: { timeUnit: "minute", count: 1 },
                renderer: am5xy.AxisRendererX.new(this.vwapRoot, {})
            })
        );

        const yAxis = this.vwapChart.yAxes.push(
            am5xy.ValueAxis.new(this.vwapRoot, {
                renderer: am5xy.AxisRendererY.new(this.vwapRoot, {})
            })
        );

        // Create series
        this.vwapSeries = this.vwapChart.series.push(
            am5xy.LineSeries.new(this.vwapRoot, {
                name: "VWAP",
                xAxis: xAxis,
                yAxis: yAxis,
                valueYField: "vwap",
                valueXField: "timestamp",
                tooltip: am5.Tooltip.new(this.vwapRoot, {
                    labelText: "{valueY}"
                })
            })
        );

        // Calculate VWAP data
        let cumulativeTPV = 0;
        let cumulativeVolume = 0;
        const vwapData = this.data.map(d => {
            const typicalPrice = (d.high + d.low + d.close) / 3;
            const tpv = typicalPrice * d.volume;
            cumulativeTPV += tpv;
            cumulativeVolume += d.volume;
            return {
                timestamp: d.timestamp,
                vwap: cumulativeTPV / cumulativeVolume
            };
        });

        this.vwapSeries.data.setAll(vwapData);
    }

    setupEventListeners() {
        // Coin selector
        const coinSelect = document.getElementById('coin-select');
        coinSelect?.addEventListener('change', async () => {
            this.symbol = coinSelect.value;
            console.log('[VolumeProfile] Symbol changed to:', this.symbol);
            await this.loadData();
            await this.initializeCharts();
        });

        // Timeframe selector
        const timeframeSelect = document.getElementById('vp-timeframe');
        timeframeSelect?.addEventListener('change', async () => {
            this.timeframe = timeframeSelect.value;
            console.log('[VolumeProfile] Timeframe changed to:', this.timeframe);
            await this.loadData();
            await this.initializeCharts();
        });

        // Settings checkboxes
        document.getElementById('show-poc')?.addEventListener('change', e => {
            console.log('[VolumeProfile] POC visibility changed:', e.target.checked);
            // TODO: Implement POC visibility
        });

        document.getElementById('show-vwap')?.addEventListener('change', e => {
            console.log('[VolumeProfile] VWAP visibility changed:', e.target.checked);
            this.vwapSeries.set('visible', e.target.checked);
        });

        document.getElementById('show-value-areas')?.addEventListener('change', e => {
            console.log('[VolumeProfile] Value areas visibility changed:', e.target.checked);
            // TODO: Implement value areas visibility
        });
    }

    dispose() {
        try {
            console.log('[VolumeProfile] Starting disposal...');
            if (this.priceVolumeRoot) {
                console.log('[VolumeProfile] Disposing price volume root...');
                this.priceVolumeRoot.dispose();
            }
            if (this.deltaRoot) {
                console.log('[VolumeProfile] Disposing delta root...');
                this.deltaRoot.dispose();
            }
            if (this.vbpRoot) {
                console.log('[VolumeProfile] Disposing vbp root...');
                this.vbpRoot.dispose();
            }
            if (this.vwapRoot) {
                console.log('[VolumeProfile] Disposing vwap root...');
                this.vwapRoot.dispose();
            }
            console.log('[VolumeProfile] Disposal complete');
        } catch (error) {
            console.error('[VolumeProfile] Error during disposal:', error);
            console.error('[VolumeProfile] Error stack:', error.stack);
        }
    }
}
