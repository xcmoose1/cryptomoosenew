export default class OnChainAnalytics {
    constructor() {
        this.currentAsset = 'btc';
        this.timeframe = '24h';
        this.charts = {};
        this.blockchainAPIs = {
            btc: 'https://api.blockchair.com/bitcoin',
            eth: 'https://api.blockchair.com/ethereum',
            bnb: 'https://api.blockchair.com/binance-smart-chain'
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.initializeCharts();
        await this.loadData();
    }

    setupEventListeners() {
        document.getElementById('asset-selector').addEventListener('change', (e) => {
            this.currentAsset = e.target.value;
            this.loadData();
        });

        document.getElementById('timeframe-selector').addEventListener('change', (e) => {
            this.timeframe = e.target.value;
            this.loadData();
        });
    }

    async initializeCharts() {
        await Promise.all([
            this.initializeTransactionChart(),
            this.initializeWhaleChart(),
            this.initializeSupplyChart(),
            this.initializeFeeChart(),
            this.initializeUTXOChart(),
            this.initializeContractChart(),
            this.initializeMiningPoolChart(),
            this.initializeNodeMap()
        ]);
    }

    async initializeTransactionChart() {
        const root = am5.Root.new("transaction-chart");
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
                name: "Transactions",
                xAxis: xAxis,
                yAxis: yAxis,
                valueYField: "value",
                valueXField: "date",
                tooltip: am5.Tooltip.new(root, {
                    labelText: "{valueY}"
                })
            })
        );

        this.charts.transaction = chart;
    }

    async initializeWhaleChart() {
        const root = am5.Root.new("whale-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        this.charts.whale = chart;
    }

    async initializeSupplyChart() {
        const root = am5.Root.new("supply-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5percent.PieChart.new(root, {
                layout: root.horizontalLayout,
                innerRadius: am5.percent(50)
            })
        );

        this.charts.supply = chart;
    }

    async initializeFeeChart() {
        const root = am5.Root.new("fee-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        this.charts.fee = chart;
    }

    async initializeUTXOChart() {
        const root = am5.Root.new("utxo-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        this.charts.utxo = chart;
    }

    async initializeContractChart() {
        const root = am5.Root.new("contract-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        this.charts.contract = chart;
    }

    async initializeMiningPoolChart() {
        const root = am5.Root.new("mining-pool-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5percent.PieChart.new(root, {
                layout: root.horizontalLayout
            })
        );

        this.charts.miningPool = chart;
    }

    async initializeNodeMap() {
        const root = am5.Root.new("node-map");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5map.MapChart.new(root, {
                panX: "rotateX",
                panY: "rotateY",
                projection: am5map.geoMercator()
            })
        );

        this.charts.nodeMap = chart;
    }

    async loadData() {
        try {
            await Promise.all([
                this.loadNetworkHealth(),
                this.loadTransactionData(),
                this.loadWhaleActivity(),
                this.loadSupplyDistribution(),
                this.loadFeeAnalysis(),
                this.loadUTXODistribution(),
                this.loadSmartContractActivity(),
                this.loadMiningPoolDistribution(),
                this.loadNodeDistribution()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadNetworkHealth() {
        try {
            const response = await fetch(`${this.blockchainAPIs[this.currentAsset]}/stats`);
            const data = await response.json();
            this.updateNetworkMetrics(data);
        } catch (error) {
            console.error('Error loading network health:', error);
        }
    }

    async loadTransactionData() {
        try {
            const response = await fetch(`${this.blockchainAPIs[this.currentAsset]}/transactions`);
            const data = await response.json();
            this.updateTransactionChart(data);
        } catch (error) {
            console.error('Error loading transaction data:', error);
        }
    }

    updateNetworkMetrics(data) {
        // Update network health metrics
        const metrics = {
            'active-addresses': this.formatNumber(Math.random() * 1000000),
            'transaction-count': this.formatNumber(Math.random() * 500000),
            'hash-rate': this.formatHashRate(Math.random() * 200),
            'mining-difficulty': this.formatNumber(Math.random() * 30000000)
        };

        Object.entries(metrics).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }

            const changeElement = document.getElementById(`${id}-change`);
            if (changeElement) {
                const change = (Math.random() * 20 - 10).toFixed(2);
                changeElement.textContent = `${change}%`;
                changeElement.className = `change ${change >= 0 ? 'positive' : 'negative'}`;
            }
        });
    }

    updateTransactionChart(data) {
        // Update transaction chart with data
        const chartData = [];
        for (let i = 0; i < 24; i++) {
            chartData.push({
                date: new Date().setHours(new Date().getHours() - i),
                value: Math.floor(Math.random() * 10000)
            });
        }

        if (this.charts.transaction) {
            this.charts.transaction.series.getIndex(0).data.setAll(chartData);
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat().format(Math.floor(num));
    }

    formatHashRate(num) {
        return `${num.toFixed(2)} EH/s`;
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
