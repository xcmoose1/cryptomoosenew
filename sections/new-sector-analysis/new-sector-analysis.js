import { HTX_CONFIG } from '../../js/config/htx-config.js';

export default class SectorAnalysis {
    constructor() {
        this.timeframe = '4h';
        this.currentView = 'performance';
        this.charts = {};
        this.sectors = [
            { id: 'defi', name: 'DeFi' },
            { id: 'l1', name: 'Layer 1' },
            { id: 'l2', name: 'Layer 2' },
            { id: 'gaming', name: 'Gaming' },
            { id: 'ai', name: 'AI' },
            { id: 'privacy', name: 'Privacy' },
            { id: 'infrastructure', name: 'Infrastructure' },
            { id: 'meme', name: 'Meme' }
        ];
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.initializeCharts();
        await this.loadData();
    }

    setupEventListeners() {
        // Timeframe selection
        document.getElementById('sector-timeframe').addEventListener('change', (e) => {
            this.timeframe = e.target.value;
            this.loadData();
        });

        // View options
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setView(btn.dataset.view);
            });
        });

        // Time filters for performance rankings
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.updatePerformanceList(btn.dataset.time);
            });
        });
    }

    async initializeCharts() {
        await this.initializeSectorChart();
        await this.initializeFlowChart();
        await this.initializeDominanceChart();
        await this.initializeRotationChart();
        await this.initializeTrendChart();
        await this.initializeCorrelationChart();
    }

    async initializeSectorChart() {
        const root = am5.Root.new("sector-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: false,
                panY: false,
                wheelX: "none",
                wheelY: "none",
                layout: root.verticalLayout
            })
        );

        // Create axes
        const yAxis = chart.yAxes.push(
            am5xy.CategoryAxis.new(root, {
                categoryField: "sector",
                renderer: am5xy.AxisRendererY.new(root, {})
            })
        );

        const xAxis = chart.xAxes.push(
            am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererX.new(root, {})
            })
        );

        // Add series
        const series = chart.series.push(
            am5xy.ColumnSeries.new(root, {
                name: "Sectors",
                xAxis: xAxis,
                yAxis: yAxis,
                valueXField: "value",
                categoryYField: "sector",
                tooltip: am5.Tooltip.new(root, {
                    labelText: "{categoryY}: {valueX}%"
                })
            })
        );

        this.charts.sector = chart;
    }

    async initializeFlowChart() {
        const root = am5.Root.new("flow-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5flow.Sankey.new(root, {
                sourceIdField: "from",
                targetIdField: "to",
                valueField: "value",
                paddingRight: 30
            })
        );

        this.charts.flow = chart;
    }

    async initializeDominanceChart() {
        const root = am5.Root.new("dominance-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5percent.PieChart.new(root, {
                layout: root.horizontalLayout,
                innerRadius: am5.percent(50)
            })
        );

        const series = chart.series.push(
            am5percent.PieSeries.new(root, {
                valueField: "value",
                categoryField: "sector",
                alignLabels: false
            })
        );

        this.charts.dominance = chart;
    }

    async initializeRotationChart() {
        const root = am5.Root.new("rotation-analysis");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        this.charts.rotation = chart;
    }

    async initializeTrendChart() {
        const root = am5.Root.new("trend-analysis");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        this.charts.trend = chart;
    }

    async initializeCorrelationChart() {
        const root = am5.Root.new("correlation-analysis");
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

    async loadData() {
        try {
            await Promise.all([
                this.loadSectorData(),
                this.loadFlowData(),
                this.loadDominanceData()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadSectorData() {
        try {
            // Load data for each sector
            const data = await Promise.all(
                this.sectors.map(sector => this.loadSectorPerformance(sector.id))
            );
            
            this.updateSectorChart(data);
            this.updatePerformanceList('4h');
        } catch (error) {
            console.error('Error loading sector data:', error);
        }
    }

    async loadSectorPerformance(sectorId) {
        // Simulate API call - replace with actual data source
        return {
            sector: sectorId,
            value: Math.random() * 20 - 10, // Random performance between -10% and +10%
            volume: Math.random() * 1000000
        };
    }

    async loadFlowData() {
        // Simulate flow data - replace with actual data source
        const data = [];
        this.updateFlowChart(data);
    }

    async loadDominanceData() {
        // Simulate dominance data - replace with actual data source
        const data = this.sectors.map(sector => ({
            sector: sector.name,
            value: Math.random() * 100
        }));
        this.updateDominanceChart(data);
    }

    setView(view) {
        // Update UI
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        this.currentView = view;
        this.updateMainVisualization();
    }

    updateMainVisualization() {
        switch (this.currentView) {
            case 'performance':
                this.charts.sector.show();
                break;
            case 'dominance':
                this.charts.dominance.show();
                break;
            case 'flow':
                this.charts.flow.show();
                break;
        }
    }

    updateSectorChart(data) {
        if (this.charts.sector) {
            this.charts.sector.series.getIndex(0).data.setAll(data);
        }
    }

    updateFlowChart(data) {
        if (this.charts.flow) {
            this.charts.flow.data.setAll(data);
        }
    }

    updateDominanceChart(data) {
        if (this.charts.dominance) {
            this.charts.dominance.series.getIndex(0).data.setAll(data);
        }
    }

    updatePerformanceList(timeframe) {
        // Update UI
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.time === timeframe);
        });

        // Update list
        const list = document.getElementById('performance-list');
        list.innerHTML = this.sectors.map(sector => `
            <div class="sector-item">
                <div class="sector-name">
                    <i class="fas fa-chart-pie"></i>
                    <span>${sector.name}</span>
                </div>
                <span class="sector-change ${Math.random() > 0.5 ? 'positive' : 'negative'}">
                    ${(Math.random() * 20 - 10).toFixed(2)}%
                </span>
            </div>
        `).join('');
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
