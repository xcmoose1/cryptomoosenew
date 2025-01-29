export default class MarketIntelligence {
    constructor() {
        this.charts = {};
        this.currentMonth = new Date();
        this.selectedSocialTab = 'twitter';
        this.newsAPI = 'YOUR_NEWS_API_KEY'; // Replace with actual key
        this.socialAPI = 'YOUR_SOCIAL_API_KEY'; // Replace with actual key
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.initializeCharts();
        await this.loadData();
        this.initializeCalendar();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('intelligence-search').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Filters
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filterContent(e.target.value);
        });

        document.getElementById('timeframe-filter').addEventListener('change', (e) => {
            this.updateTimeframe(e.target.value);
        });

        // Social tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchSocialTab(btn.dataset.tab);
            });
        });

        // Calendar navigation
        document.getElementById('prev-month').addEventListener('click', () => {
            this.navigateMonth(-1);
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.navigateMonth(1);
        });

        // Report filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterReports(btn.dataset.filter);
            });
        });
    }

    async initializeCharts() {
        await Promise.all([
            this.initializeSentimentGauge(),
            this.initializeNewsImpactChart(),
            this.initializeSocialVolumeChart(),
            this.initializeInsightsChart(),
            this.initializePredictionChart(),
            this.initializeRiskGauge()
        ]);
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

        const axisRenderer = am5radar.AxisRendererCircular.new(root, {
            innerRadius: -10,
            strokeOpacity: 1,
            strokeWidth: 15,
            strokeGradient: am5.LinearGradient.new(root, {
                rotation: 0,
                stops: [
                    { color: am5.color(0xff0000) },
                    { color: am5.color(0xffff00) },
                    { color: am5.color(0x00ff00) }
                ]
            })
        });

        const xAxis = chart.xAxes.push(
            am5xy.ValueAxis.new(root, {
                maxDeviation: 0,
                min: 0,
                max: 100,
                strictMinMax: true,
                renderer: axisRenderer
            })
        );

        const axisDataItem = xAxis.makeDataItem({});
        const clockHand = am5radar.ClockHand.new(root, {
            pinRadius: am5.percent(20),
            radius: am5.percent(100),
            bottomWidth: 40
        });

        axisDataItem.set("value", 0);
        axisDataItem.set("clockHand", clockHand);
        xAxis.createAxisRange(axisDataItem);

        this.charts.sentimentGauge = chart;
    }

    async initializeNewsImpactChart() {
        const root = am5.Root.new("news-impact-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        this.charts.newsImpact = chart;
    }

    async initializeSocialVolumeChart() {
        const root = am5.Root.new("social-volume-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        this.charts.socialVolume = chart;
    }

    async initializeInsightsChart() {
        const root = am5.Root.new("insights-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        this.charts.insights = chart;
    }

    async initializePredictionChart() {
        const root = am5.Root.new("prediction-chart");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5xy.XYChart.new(root, {
                panX: true,
                panY: false,
                wheelX: "panX",
                wheelY: "zoomX"
            })
        );

        this.charts.prediction = chart;
    }

    async initializeRiskGauge() {
        const root = am5.Root.new("risk-gauge");
        root.setThemes([am5themes_Dark.new(root)]);

        const chart = root.container.children.push(
            am5radar.RadarChart.new(root, {
                panX: false,
                panY: false,
                startAngle: 180,
                endAngle: 360
            })
        );

        this.charts.risk = chart;
    }

    async loadData() {
        try {
            await Promise.all([
                this.loadSentimentData(),
                this.loadNewsData(),
                this.loadSocialData(),
                this.loadEventData(),
                this.loadResearchData(),
                this.loadAIAnalysis()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadSentimentData() {
        try {
            // Simulate API call
            const sentimentScore = Math.random() * 100;
            this.updateSentimentGauge(sentimentScore);
            this.updateSentimentMetrics();
        } catch (error) {
            console.error('Error loading sentiment data:', error);
        }
    }

    async loadNewsData() {
        try {
            // Simulate news API call
            const newsItems = [
                { title: 'Sample News 1', source: 'Source 1', impact: 0.8 },
                { title: 'Sample News 2', source: 'Source 2', impact: -0.3 }
            ];
            this.updateNewsFeed(newsItems);
        } catch (error) {
            console.error('Error loading news data:', error);
        }
    }

    updateSentimentGauge(value) {
        if (this.charts.sentimentGauge) {
            const hand = this.charts.sentimentGauge.xAxes.getIndex(0).dataItems[0].get("clockHand");
            hand.animate({
                key: "value",
                to: value,
                duration: 1000,
                easing: am5.ease.out(am5.ease.cubic)
            });
        }
    }

    updateSentimentMetrics() {
        const metrics = {
            'news-sentiment': (Math.random() * 100).toFixed(2) + '%',
            'social-sentiment': (Math.random() * 100).toFixed(2) + '%',
            'market-mood': ['Bullish', 'Neutral', 'Bearish'][Math.floor(Math.random() * 3)]
        };

        Object.entries(metrics).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateNewsFeed(news) {
        const feed = document.getElementById('news-feed');
        feed.innerHTML = news.map(item => `
            <div class="news-item">
                <div class="news-content">
                    <div class="news-title">${item.title}</div>
                    <div class="source">${item.source}</div>
                </div>
                <div class="impact-score ${item.impact >= 0 ? 'positive' : 'negative'}">
                    ${Math.abs(item.impact).toFixed(2)}
                </div>
            </div>
        `).join('');
    }

    switchSocialTab(tab) {
        this.selectedSocialTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        this.loadSocialData();
    }

    initializeCalendar() {
        this.updateCalendarUI();
        this.loadUpcomingEvents();
    }

    updateCalendarUI() {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
        
        document.getElementById('current-month').textContent = 
            `${monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;

        // Update calendar grid
        this.generateCalendarDays();
    }

    generateCalendarDays() {
        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';

        const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const lastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);

        for (let i = 0; i < firstDay.getDay(); i++) {
            grid.appendChild(this.createCalendarDay(''));
        }

        for (let day = 1; day <= lastDay.getDate(); day++) {
            grid.appendChild(this.createCalendarDay(day));
        }
    }

    createCalendarDay(day) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.textContent = day;

        // Simulate events
        if (Math.random() > 0.8) {
            div.classList.add('has-event');
        }

        return div;
    }

    navigateMonth(delta) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
        this.updateCalendarUI();
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
