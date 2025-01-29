export default class TraditionalMarkets {
    constructor() {
        this.currentMarket = 'stocks';
        this.timeframe = '1d';
        this.chartType = 'line';
        this.charts = {};
        this.marketAPI = 'YOUR_MARKET_API_KEY'; // Replace with actual key
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.initializeCharts();
        await this.loadData();
    }

    setupEventListeners() {
        // Market selection
        document.getElementById('market-selector').addEventListener('change', (e) => {
            this.currentMarket = e.target.value;
            this.loadData();
        });

        // Timeframe selection
        document.getElementById('timeframe-selector').addEventListener('change', (e) => {
            this.timeframe = e.target.value;
            this.loadData();
        });

        // Chart type toggle
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setChartType(btn.dataset.type);
            });
        });

        // Event importance filter
        document.getElementById('importance-filter').addEventListener('change', (e) => {
            this.filterEvents(e.target.value);
        });
    }

    async initializeCharts() {
        await Promise.all([
            this.initializeMainChart(),
            this.initializeCorrelationMatrix(),
            this.initializeSectorTreemap(),
            this.initializeSentimentGauge()
        ]);
    }

    async initializeMainChart() {
        const root = am5.Root.new("main-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        // Add cursor
        chart.set("cursor", am5xy.XYCursor.new(root, {
            behavior: "none"
        }));

        // Create axes
        const xAxis = chart.xAxes.push(
            am5xy.DateAxis.new(root, {
                baseInterval: { timeUnit: "minute", count: 1 },
                renderer: am5xy.AxisRendererX.new(root, {})
            })
        );

        const yAxis = chart.yAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, {})
            })
        );

        // Add series
        const series = chart.series.push(
            am5xy.LineSeries.new(root, {
                name: "Market",
                xAxis: xAxis,
                yAxis: yAxis,
                valueYField: "value",
                valueXField: "date",
                tooltip: am5.Tooltip.new(root, {
                    labelText: "{valueY}"
                })
            })
        );

        this.charts.main = chart;
    }

    async initializeCorrelationMatrix() {
        const root = am5.Root.new("correlation-matrix");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: false,
                panY: false,
                wheelX: "none",
                wheelY: "none"
            })
        );

        this.charts.correlation = chart;
    }

    async initializeSectorTreemap() {
        const root = am5.Root.new("sector-treemap");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5hierarchy.Treemap.new(root, {
                singleBranchOnly: false,
                downDepth: 1,
                initialDepth: 2,
                valueField: "value",
                categoryField: "name",
                childDataField: "children"
            })
        );

        this.charts.sector = chart;
    }

    async initializeSentimentGauge() {
        const root = am5.Root.new("sentiment-gauge");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5radar.RadarChart.new(root, {
                panX: false,
                panY: false,
                startAngle: 180,
                endAngle: 360
            })
        );

        this.charts.sentiment = chart;
    }

    async loadData() {
        try {
            await Promise.all([
                this.loadMarketIndices(),
                this.loadMarketData(),
                this.loadForexData(),
                this.loadCommoditiesData(),
                this.loadBondData(),
                this.loadCorrelationData(),
                this.loadSectorData(),
                this.loadEconomicEvents(),
                this.loadTechnicalIndicators(),
                this.loadSentimentData(),
                this.loadRiskMetrics()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadMarketIndices() {
        try {
            // Simulate API call for market indices
            const indices = {
                'sp500': { value: 4500 + Math.random() * 100, change: (Math.random() * 2 - 1).toFixed(2) },
                'nasdaq': { value: 14000 + Math.random() * 300, change: (Math.random() * 2 - 1).toFixed(2) },
                'dowjones': { value: 35000 + Math.random() * 500, change: (Math.random() * 2 - 1).toFixed(2) },
                'ftse': { value: 7500 + Math.random() * 100, change: (Math.random() * 2 - 1).toFixed(2) }
            };

            this.updateIndices(indices);
        } catch (error) {
            console.error('Error loading market indices:', error);
        }
    }

    async loadMarketData() {
        try {
            // Generate sample market data
            const data = [];
            const baseValue = 100;
            const now = new Date();

            for (let i = 0; i < 100; i++) {
                data.push({
                    date: new Date(now.getTime() - (100 - i) * 60000),
                    value: baseValue + Math.random() * 20 - 10
                });
            }

            this.updateMainChart(data);
        } catch (error) {
            console.error('Error loading market data:', error);
        }
    }

    setChartType(type) {
        this.chartType = type;
        document.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        this.updateMainChart();
    }

    updateIndices(data) {
        Object.entries(data).forEach(([id, data]) => {
            const card = document.getElementById(id);
            if (card) {
                const valueEl = card.querySelector('.index-value');
                const changeEl = card.querySelector('.index-change');

                if (valueEl) valueEl.textContent = this.formatNumber(data.value);
                if (changeEl) {
                    changeEl.textContent = `${data.change}%`;
                    changeEl.className = `index-change ${parseFloat(data.change) >= 0 ? 'positive' : 'negative'}`;
                }
            }
        });
    }

    updateMainChart(data) {
        if (this.charts.main) {
            this.charts.main.series.getIndex(0).data.setAll(data);
        }
    }

    filterEvents(importance) {
        const events = document.querySelectorAll('.event-item');
        events.forEach(event => {
            const eventImportance = event.dataset.importance;
            event.style.display = importance === 'all' || eventImportance === importance ? 'grid' : 'none';
        });
    }

    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    // Cleanup when section is unloaded
    dispose() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.dispose();
            }
        });
    }
}
