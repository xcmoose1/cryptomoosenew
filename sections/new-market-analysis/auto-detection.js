import { binanceHandler } from '/js/config/binance-config.js';

export class AutoDetectionChart {
    constructor() {
        console.log('AutoDetectionChart constructor called');
        this.currentTimeframe = '1h';
        this.crypto = 'BTC';
        this.root = null;
        this.chart = null;
        this.mainSeries = null;
        this.xAxis = null;
        this.yAxis = null;
        this.activeLevels = {
            pivotPoints: false,
            srZones: false,
            fibRetracement: false,
            fibExtension: false,
            priceChannels: false,
            trendLines: false,
            highLowMarkers: false,
            rangeStats: false
        };
        this.levelSeries = {
            pivotPoints: [],
            srZones: [],
            fibRetracement: [],
            fibExtension: [],
            priceChannels: [],
            trendLines: [],
            highLowMarkers: [],
            rangeStats: []
        };
    }

    async init() {
        try {
            console.log('Initializing auto-detection chart...');
            
            const chartDiv = document.getElementById('autodetection-chartdiv');
            if (!chartDiv) {
                throw new Error('Auto-detection chart container not found');
            }
            console.log('Chart container found:', chartDiv);
            
            // Create root
            this.root = am5.Root.new("autodetection-chartdiv");
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

            // Create axes
            this.xAxis = this.chart.xAxes.push(
                am5xy.DateAxis.new(this.root, {
                    baseInterval: { timeUnit: "minute", count: 1 },
                    renderer: am5xy.AxisRendererX.new(this.root, {}),
                    tooltip: am5.Tooltip.new(this.root, {}),
                    groupData: true,
                    groupCount: 500
                })
            );

            this.yAxis = this.chart.yAxes.push(
                am5xy.ValueAxis.new(this.root, {
                    renderer: am5xy.AxisRendererY.new(this.root, {})
                })
            );

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
                        labelText: "Open: {openValueY}\nHigh: {highValueY}\nLow: {lowValueY}\nClose: {valueY}"
                    })
                })
            );

            // Enable cursor
            this.chart.set("cursor", am5xy.XYCursor.new(this.root, {
                xAxis: this.xAxis,
                yAxis: this.yAxis,
                behavior: "none"
            }));

            // Load initial data
            await this.loadData();
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('Auto-detection chart initialized successfully');
        } catch (error) {
            console.error('Error initializing auto-detection chart:', error);
        }
    }

    async initialize() {
        // Create root element
        this.root = am5.Root.new("chartdiv");
        
        // Set themes
        this.root.setThemes([am5themes_Dark.new(this.root)]);
        
        // Create chart
        this.chart = this.root.container.children.push(
            am5xy.XYChart.new(this.root, {
                panX: true,
                panY: true,
                wheelX: "panX",
                wheelY: "zoomX",
                pinchZoomX: true,
                layout: this.root.verticalLayout
            })
        );
        
        // Create axes
        this.xAxis = this.chart.xAxes.push(
            am5xy.DateAxis.new(this.root, {
                baseInterval: { timeUnit: "minute", count: 1 },
                renderer: am5xy.AxisRendererX.new(this.root, {}),
                tooltip: am5.Tooltip.new(this.root, {})
            })
        );
        
        this.yAxis = this.chart.yAxes.push(
            am5xy.ValueAxis.new(this.root, {
                renderer: am5xy.AxisRendererY.new(this.root, {})
            })
        );
        
        // Add series
        this.mainSeries = this.chart.series.push(
            am5xy.CandlestickSeries.new(this.root, {
                name: "BTC/USDT",
                xAxis: this.xAxis,
                yAxis: this.yAxis,
                valueYField: "Close",
                openValueYField: "Open",
                lowValueYField: "Low",
                highValueYField: "High",
                valueXField: "Date",
                tooltip: am5.Tooltip.new(this.root, {
                    pointerOrientation: "horizontal",
                    labelText: "Open: {openValueY}\nHigh: {highValueY}\nLow: {lowValueY}\nClose: {valueY}"
                })
            })
        );
        
        // Add cursor
        this.chart.set("cursor", am5xy.XYCursor.new(this.root, {
            xAxis: this.xAxis,
            yAxis: this.yAxis,
            behavior: "none"
        }));
        
        // Add scrollbar
        this.chart.set("scrollbarX", am5.Scrollbar.new(this.root, {
            orientation: "horizontal"
        }));
        
        // Load initial data
        await this.loadData();
        
        // Set up event listeners for controls
        this.setupEventListeners();
    }

    async loadData() {
        try {
            console.log('Loading data...');
            this.mainSeries.data.clear();
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const klines = await binanceHandler.getKlines(`${this.crypto}USDT`, this.currentTimeframe);
            const data = klines.map(k => ({
                Date: k[0],
                Open: parseFloat(k[1]),
                High: parseFloat(k[2]),
                Low: parseFloat(k[3]),
                Close: parseFloat(k[4]),
                Volume: parseFloat(k[5])
            }));

            this.mainSeries.data.setAll(data);
            
            // Update active levels
            if (this.activeLevels.pivotPoints) {
                this.updatePivotPoints(data);
            }
            if (this.activeLevels.srZones) {
                this.updateSRZones(data);
            }
            if (this.activeLevels.fibRetracement) {
                this.updateFibRetracement(data);
            }
            if (this.activeLevels.fibExtension) {
                this.updateFibExtension(data);
            }
            if (this.activeLevels.priceChannels) {
                this.updatePriceChannels(data);
            }
            if (this.activeLevels.trendLines) {
                this.updateTrendLines(data);
            }
            if (this.activeLevels.highLowMarkers) {
                this.updateHighLowMarkers(data);
            }
            if (this.activeLevels.rangeStats) {
                this.updateRangeStats(data);
            }
            
            // Update technical summary
            this.updateTechnicalSummary(data);
            
            console.log('Data loaded successfully');
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    updatePivotPoints(data) {
        // Clear existing pivot point lines
        this.levelSeries.pivotPoints.forEach(series => series.dispose());
        this.levelSeries.pivotPoints = [];

        if (!data || data.length < 2) return;

        const prevCandle = data[data.length - 2];
        
        // Calculate Standard Pivot Points
        const pivot = (prevCandle.High + prevCandle.Low + prevCandle.Close) / 3;
        const r1 = (2 * pivot) - prevCandle.Low;
        const r2 = pivot + (prevCandle.High - prevCandle.Low);
        const r3 = r1 + (prevCandle.High - prevCandle.Low);
        const s1 = (2 * pivot) - prevCandle.High;
        const s2 = pivot - (prevCandle.High - prevCandle.Low);
        const s3 = s1 - (prevCandle.High - prevCandle.Low);

        // Draw pivot points
        const levels = [
            { value: r3, name: "R3", color: "#FF4444" },
            { value: r2, name: "R2", color: "#FF6666" },
            { value: r1, name: "R1", color: "#FF8888" },
            { value: pivot, name: "PP", color: "#FFD700" },
            { value: s1, name: "S1", color: "#88FF88" },
            { value: s2, name: "S2", color: "#66FF66" },
            { value: s3, name: "S3", color: "#44FF44" }
        ];

        levels.forEach(level => {
            this.drawHorizontalLine(level.value, level.name, level.color);
        });
    }

    updateSRZones(data) {
        // Clear existing SR zones
        this.levelSeries.srZones.forEach(series => series.dispose());
        this.levelSeries.srZones = [];

        if (!data || data.length < 30) return; // Need enough data for analysis

        // Find potential S/R zones using fractals and volume
        const zones = this.findSRZones(data);
        
        // Draw zones
        zones.forEach((zone, index) => {
            this.drawSRZone(zone.price, zone.strength, zone.type);
        });
    }

    updateFibRetracement(data) {
        // Clear existing lines
        this.levelSeries.fibRetracement.forEach(series => series.dispose());
        this.levelSeries.fibRetracement = [];

        // Find swing high and low points
        const high = Math.max(...data.map(d => d.High));
        const low = Math.min(...data.map(d => d.Low));
        
        // Calculate Fibonacci levels
        const levels = this.calculateFibLevels(data);
        
        // Create lines for each level
        Object.entries(levels).forEach(([ratio, price]) => {
            const series = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    stroke: am5.color("#7B1FA2"),
                    strokeWidth: 1,
                    strokeDasharray: [2, 2]
                })
            );

            // Add the line
            const startDate = this.mainSeries.data.getIndex(0).Date;
            const endDate = this.mainSeries.data.getIndex(this.mainSeries.data.length - 1).Date;
            
            series.data.setAll([
                { date: startDate, value: price },
                { date: endDate, value: price }
            ]);

            // Add label
            const label = series.strokes.template.states.create("hover", {});
            series.strokes.template.setAll({
                tooltipText: `Fib ${ratio}: ${price.toFixed(2)}`
            });

            this.levelSeries.fibRetracement.push(series);
        });
    }

    updateFibExtension(data) {
        // Clear existing lines
        this.levelSeries.fibExtension.forEach(series => series.dispose());
        this.levelSeries.fibExtension = [];

        // Calculate Fibonacci extension levels
        const levels = this.calculateFibExtensionLevels(data);
        
        // Create lines for each level
        Object.entries(levels).forEach(([ratio, price]) => {
            const series = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    stroke: am5.color("#00897B"),
                    strokeWidth: 1,
                    strokeDasharray: [2, 2]
                })
            );

            // Add the line
            const startDate = this.mainSeries.data.getIndex(0).Date;
            const endDate = this.mainSeries.data.getIndex(this.mainSeries.data.length - 1).Date;
            
            series.data.setAll([
                { date: startDate, value: price },
                { date: endDate, value: price }
            ]);

            // Add label
            const label = series.strokes.template.states.create("hover", {});
            series.strokes.template.setAll({
                tooltipText: `Fib Ext ${ratio}: ${price.toFixed(2)}`
            });

            this.levelSeries.fibExtension.push(series);
        });
    }

    updatePriceChannels(data) {
        // Clear existing channels
        this.levelSeries.priceChannels.forEach(series => series.dispose());
        this.levelSeries.priceChannels = [];

        if (!data || data.length < 20) return;

        // Calculate different types of channels
        this.calculateDonchianChannel(data);
        this.calculateKeltnerChannel(data);
        this.calculateRegression(data);
    }

    calculateDonchianChannel(data, period = 20) {
        const channelData = [];
        for (let i = period - 1; i < data.length; i++) {
            const segment = data.slice(i - period + 1, i + 1);
            const upper = Math.max(...segment.map(d => d.High));
            const lower = Math.min(...segment.map(d => d.Low));
            const middle = (upper + lower) / 2;
            
            channelData.push({
                date: data[i].Date,
                upper,
                lower,
                middle
            });
        }

        // Draw Donchian Channel
        this.drawChannel(
            channelData,
            "Donchian",
            "#2196F3",
            0.2
        );
    }

    calculateKeltnerChannel(data, period = 20, multiplier = 2) {
        const channelData = [];
        
        // Calculate EMA and ATR
        const ema = this.calculateEMA(data.map(d => d.Close), period);
        const atr = this.calculateATR(data, period);
        
        for (let i = period - 1; i < data.length; i++) {
            if (i < period - 1) continue;
            
            const middle = ema[i - (period - 1)];
            const upper = middle + (multiplier * atr[i - (period - 1)]);
            const lower = middle - (multiplier * atr[i - (period - 1)]);
            
            channelData.push({
                date: data[i].Date,
                upper,
                lower,
                middle
            });
        }

        // Draw Keltner Channel
        this.drawChannel(
            channelData,
            "Keltner",
            "#9C27B0",
            0.2
        );
    }

    calculateRegression(data, period = 20) {
        const channelData = [];
        const stdDevMultiplier = 2;
        
        for (let i = period - 1; i < data.length; i++) {
            const segment = data.slice(i - period + 1, i + 1);
            const prices = segment.map(d => d.Close);
            const xValues = Array.from({length: period}, (_, i) => i);
            
            // Calculate linear regression
            const {slope, intercept, stdDev} = this.calculateLinearRegression(xValues, prices);
            
            // Calculate channel values at current point
            const x = period - 1;
            const middle = slope * x + intercept;
            const upper = middle + (stdDev * stdDevMultiplier);
            const lower = middle - (stdDev * stdDevMultiplier);
            
            channelData.push({
                date: data[i].Date,
                upper,
                lower,
                middle
            });
        }

        // Draw Regression Channel
        this.drawChannel(
            channelData,
            "Regression",
            "#4CAF50",
            0.2
        );
    }

    calculateEMA(prices, period) {
        const multiplier = 2 / (period + 1);
        const ema = [prices[0]];
        
        for (let i = 1; i < prices.length; i++) {
            ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
        }
        
        return ema;
    }

    calculateATR(data, period) {
        const trueRanges = [];
        const atr = [];
        
        // Calculate True Ranges
        for (let i = 1; i < data.length; i++) {
            const high = data[i].High;
            const low = data[i].Low;
            const prevClose = data[i - 1].Close;
            
            const tr1 = high - low;
            const tr2 = Math.abs(high - prevClose);
            const tr3 = Math.abs(low - prevClose);
            
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        // Calculate ATR
        let sum = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
        atr.push(sum / period);
        
        for (let i = period; i < trueRanges.length; i++) {
            atr.push(((atr[atr.length - 1] * (period - 1)) + trueRanges[i]) / period);
        }
        
        return atr;
    }

    calculateLinearRegression(x, y) {
        const n = x.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumXX += x[i] * x[i];
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calculate Standard Deviation
        let sumSquaredErrors = 0;
        for (let i = 0; i < n; i++) {
            const yHat = slope * x[i] + intercept;
            sumSquaredErrors += Math.pow(y[i] - yHat, 2);
        }
        const stdDev = Math.sqrt(sumSquaredErrors / n);
        
        return { slope, intercept, stdDev };
    }

    drawChannel(data, name, color, opacity = 0.1) {
        // Draw upper band
        const upperSeries = this.chart.series.push(
            am5xy.LineSeries.new(this.root, {
                name: `${name} Upper`,
                xAxis: this.xAxis,
                yAxis: this.yAxis,
                valueYField: "upper",
                valueXField: "date",
                stroke: am5.color(color),
                strokeWidth: 1
            })
        );
        
        // Draw lower band
        const lowerSeries = this.chart.series.push(
            am5xy.LineSeries.new(this.root, {
                name: `${name} Lower`,
                xAxis: this.xAxis,
                yAxis: this.yAxis,
                valueYField: "lower",
                valueXField: "date",
                stroke: am5.color(color),
                strokeWidth: 1
            })
        );
        
        // Draw middle line
        const middleSeries = this.chart.series.push(
            am5xy.LineSeries.new(this.root, {
                name: `${name} Middle`,
                xAxis: this.xAxis,
                yAxis: this.yAxis,
                valueYField: "middle",
                valueXField: "date",
                stroke: am5.color(color),
                strokeWidth: 1,
                strokeDasharray: [2, 2]
            })
        );
        
        // Create and add fill between upper and lower bands
        const fillSeries = this.chart.series.push(
            am5xy.LineSeries.new(this.root, {
                xAxis: this.xAxis,
                yAxis: this.yAxis,
                valueYField: "upper",
                openValueYField: "lower",
                valueXField: "date",
                fill: am5.color(color),
                fillOpacity: opacity
            })
        );

        // Add tooltips
        [upperSeries, lowerSeries, middleSeries].forEach(series => {
            series.setAll({
                tooltip: am5.Tooltip.new(this.root, {
                    labelText: `${series.get("name")}: {valueY}`
                })
            });
        });

        // Set data
        [upperSeries, lowerSeries, middleSeries, fillSeries].forEach(series => {
            series.data.setAll(data);
        });

        // Store series for later removal
        this.levelSeries.priceChannels.push(
            upperSeries,
            lowerSeries,
            middleSeries,
            fillSeries
        );
    }

    drawHorizontalLine(value, name, color) {
        const series = this.chart.series.push(
            am5xy.LineSeries.new(this.root, {
                name: name,
                xAxis: this.xAxis,
                yAxis: this.yAxis,
                valueYField: "value",
                valueXField: "date",
                stroke: am5.color(color),
                strokeWidth: 1,
                strokeDasharray: [2, 2]
            })
        );

        const startDate = this.mainSeries.data.getIndex(0).Date;
        const endDate = this.mainSeries.data.getIndex(this.mainSeries.data.length - 1).Date;
        
        series.data.setAll([
            { date: startDate, value },
            { date: endDate, value }
        ]);

        // Add tooltip
        series.setAll({
            tooltip: am5.Tooltip.new(this.root, {
                labelText: "{name}: {valueY}"
            })
        });

        // Store the series for later removal
        this.levelSeries.pivotPoints.push(series);
    }

    drawSRZone(price, strength, type) {
        // Create zone series
        const series = this.chart.series.push(
            am5xy.LineSeries.new(this.root, {
                name: `${type.toUpperCase()} Zone`,
                xAxis: this.xAxis,
                yAxis: this.yAxis,
                valueYField: "value",
                valueXField: "date",
                stroke: am5.color(type === 'support' ? "#00C853" : "#FF4444"),
                strokeWidth: 2,
                strokeOpacity: Math.min(0.3 + strength * 0.7, 1)
            })
        );

        const startDate = this.mainSeries.data.getIndex(0).Date;
        const endDate = this.mainSeries.data.getIndex(this.mainSeries.data.length - 1).Date;
        
        series.data.setAll([
            { date: startDate, value: price },
            { date: endDate, value: price }
        ]);

        // Add tooltip
        series.setAll({
            tooltip: am5.Tooltip.new(this.root, {
                labelText: `${type.toUpperCase()}: {valueY}\nStrength: ${(strength * 100).toFixed(1)}%`
            })
        });

        // Store the series for later removal
        this.levelSeries.srZones.push(series);
    }

    updateTrendLines(data) {
        // Clear existing trend lines
        this.levelSeries.trendLines.forEach(series => series.dispose());
        this.levelSeries.trendLines = [];

        if (!data || data.length < 20) return;

        // Find major swing points
        const swings = this.findSwingPoints(data, 10);
        
        // Draw different types of trend lines
        this.drawMajorTrendLines(data, swings);
        this.drawTrendChannels(data, swings);
        this.drawBreakoutLines(data);
    }

    findSwingPoints(data, sensitivity = 10) {
        const highs = [];
        const lows = [];
        
        for (let i = sensitivity; i < data.length - sensitivity; i++) {
            // Check for swing high
            let isHigh = true;
            for (let j = i - sensitivity; j <= i + sensitivity; j++) {
                if (j === i) continue;
                if (data[j].High > data[i].High) {
                    isHigh = false;
                    break;
                }
            }
            
            // Check for swing low
            let isLow = true;
            for (let j = i - sensitivity; j <= i + sensitivity; j++) {
                if (j === i) continue;
                if (data[j].Low < data[i].Low) {
                    isLow = false;
                    break;
                }
            }
            
            // Calculate zone strength based on volume and touches
            if (isHigh || isLow) {
                const volumeStrength = data[i].Volume / Math.max(...data.map(d => d.Volume));
                const touches = this.countPriceTouches(data, isHigh ? data[i].High : data[i].Low);
                const strength = (volumeStrength * 0.7 + touches * 0.3);
                
                if (isHigh) {
                    highs.push({
                        index: i,
                        price: data[i].High,
                        date: data[i].Date,
                        strength: strength
                    });
                } else {
                    lows.push({
                        index: i,
                        price: data[i].Low,
                        date: data[i].Date,
                        strength: strength
                    });
                }
            }
        }
        
        // Merge nearby zones and sort by strength
        return { highs, lows };
    }

    drawMajorTrendLines(data, swings) {
        // Draw major trend lines connecting swing highs and lows
        this.connectSwingPoints(swings.highs, "#FF4444", "Resistance Trend");  // Red for resistance
        this.connectSwingPoints(swings.lows, "#00C853", "Support Trend");      // Green for support
    }

    drawTrendChannels(data, swings) {
        // Find parallel trend channels
        const channels = this.findParallelChannels(data, swings);
        
        channels.forEach((channel, index) => {
            // Draw upper trend line
            this.drawTrendLine(
                channel.upper.start,
                channel.upper.end,
                `Channel ${index + 1} Upper`,
                "#2196F3"
            );
            
            // Draw lower trend line
            this.drawTrendLine(
                channel.lower.start,
                channel.lower.end,
                `Channel ${index + 1} Lower`,
                "#2196F3"
            );
        });
    }

    drawBreakoutLines(data) {
        // Find potential breakout levels using volume and price action
        const breakouts = this.findBreakoutLevels(data);
        
        breakouts.forEach((level, index) => {
            this.drawTrendLine(
                { date: level.startDate, price: level.price },
                { date: level.endDate, price: level.price },
                `Breakout ${index + 1}`,
                "#9C27B0"
            );
        });
    }

    findParallelChannels(data, swings) {
        const channels = [];
        const minParallelDistance = 50; // Minimum price distance for parallel lines
        
        // Find pairs of trend lines with similar slopes
        for (let i = 0; i < swings.highs.length - 1; i++) {
            for (let j = 0; j < swings.lows.length - 1; j++) {
                const upperSlope = this.calculateSlope(
                    swings.highs[i],
                    swings.highs[i + 1]
                );
                
                const lowerSlope = this.calculateSlope(
                    swings.lows[j],
                    swings.lows[j + 1]
                );
                
                // If slopes are similar (within 10% difference)
                if (Math.abs(upperSlope - lowerSlope) / upperSlope < 0.1) {
                    const distance = Math.abs(
                        swings.highs[i].price - swings.lows[j].price
                    );
                    
                    if (distance > minParallelDistance) {
                        channels.push({
                            upper: {
                                start: {
                                    date: swings.highs[i].date,
                                    price: swings.highs[i].price
                                },
                                end: {
                                    date: swings.highs[i + 1].date,
                                    price: swings.highs[i + 1].price
                                }
                            },
                            lower: {
                                start: {
                                    date: swings.lows[j].date,
                                    price: swings.lows[j].price
                                },
                                end: {
                                    date: swings.lows[j + 1].date,
                                    price: swings.lows[j + 1].price
                                }
                            }
                        });
                    }
                }
            }
        }
        
        return channels;
    }

    findBreakoutLevels(data) {
        const breakouts = [];
        const volumeThreshold = 1.5; // Volume must be 50% above average
        const period = 20;
        
        for (let i = period; i < data.length - 1; i++) {
            // Calculate average volume for the period
            const avgVolume = data
                .slice(i - period, i)
                .reduce((sum, d) => sum + d.Volume, 0) / period;
            
            // Check for volume breakout
            if (data[i].Volume > avgVolume * volumeThreshold) {
                // Check for price breakout (gap up or down)
                const priceChange = Math.abs(
                    data[i].Close - data[i - 1].Close
                );
                const avgPrice = data[i - 1].Close;
                
                if (priceChange / avgPrice > 0.02) { // 2% price movement
                    breakouts.push({
                        price: data[i].Close,
                        startDate: data[Math.max(0, i - 10)].Date,
                        endDate: data[Math.min(data.length - 1, i + 10)].Date
                    });
                }
            }
        }
        
        return breakouts;
    }

    calculateSlope(point1, point2) {
        const timeDiff = new Date(point2.date) - new Date(point1.date);
        const priceDiff = point2.price - point1.price;
        return priceDiff / timeDiff;
    }

    connectSwingPoints(points, color, name) {
        if (points.length < 2) return;
        
        // Connect consecutive swing points
        for (let i = 0; i < points.length - 1; i++) {
            this.drawTrendLine(
                {
                    date: points[i].date,
                    price: points[i].price
                },
                {
                    date: points[i + 1].date,
                    price: points[i + 1].price
                },
                `${name} ${i + 1}`,
                color
            );
        }
    }

    drawTrendLine(start, end, name, color) {
        const series = this.chart.series.push(
            am5xy.LineSeries.new(this.root, {
                name: name,
                xAxis: this.xAxis,
                yAxis: this.yAxis,
                stroke: am5.color(color),
                strokeWidth: 2
            })
        );

        // Add data points
        series.data.setAll([
            {
                date: start.date,
                value: start.price
            },
            {
                date: end.date,
                value: end.price
            }
        ]);

        // Add tooltip
        series.setAll({
            tooltip: am5.Tooltip.new(this.root, {
                labelText: `${name}: {valueY}`
            })
        });

        // Store for later removal
        this.levelSeries.trendLines.push(series);
    }

    async updateHighLowMarkers(data) {
        if (!data || data.length < 2) return;
        
        // Clear existing markers
        this.levelSeries.highLowMarkers.forEach(series => {
            if (series && series.dispose) {
                series.dispose();
            }
        });
        this.levelSeries.highLowMarkers = [];

        const significantPoints = this.findSignificantPoints(data);
        
        // Function to create a marker line
        const createMarkerLine = (price, isHigh, touches) => {
            const series = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: isHigh ? "High" : "Low",
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    stroke: isHigh ? am5.color("#FF4081") : am5.color("#00E676"),
                    strokeWidth: 1,
                    strokeDasharray: [2, 2]
                })
            );

            // Add data points for the line
            const startDate = data[0].Date;
            const endDate = data[data.length - 1].Date;
            
            series.data.setAll([
                { date: startDate, value: price },
                { date: endDate, value: price }
            ]);

            // Add tooltip
            series.strokes.template.set("tooltipText", 
                `${isHigh ? "High" : "Low"}: ${price.toFixed(2)} (${touches} touches)`);

            return series;
        };

        // Add high markers
        significantPoints.highs.forEach(point => {
            const series = createMarkerLine(point.price, true, point.touches);
            this.levelSeries.highLowMarkers.push(series);
        });

        // Add low markers
        significantPoints.lows.forEach(point => {
            const series = createMarkerLine(point.price, false, point.touches);
            this.levelSeries.highLowMarkers.push(series);
        });
    }

    findSignificantPoints(data) {
        const period = 20;
        const threshold = 0.003; // 0.3% threshold
        const minTouches = 2;
        
        const points = {
            highs: [],
            lows: []
        };
        
        // Find local highs and lows
        for (let i = period; i < data.length - period; i++) {
            let isHigh = true;
            let isLow = true;
            
            // Check surrounding bars
            for (let j = i - period; j <= i + period; j++) {
                if (j !== i) {
                    if (data[j].High >= data[i].High) isHigh = false;
                    if (data[j].Low <= data[i].Low) isLow = false;
                }
            }
            
            // Count touches for potential high
            if (isHigh) {
                const price = data[i].High;
                const touches = this.countTouches(data, price, threshold);
                if (touches >= minTouches) {
                    points.highs.push({ price, touches });
                }
            }
            
            // Count touches for potential low
            if (isLow) {
                const price = data[i].Low;
                const touches = this.countTouches(data, price, threshold);
                if (touches >= minTouches) {
                    points.lows.push({ price, touches });
                }
            }
        }
        
        // Sort by number of touches and keep top 5
        points.highs = points.highs
            .sort((a, b) => b.touches - a.touches)
            .slice(0, 5);
            
        points.lows = points.lows
            .sort((a, b) => b.touches - a.touches)
            .slice(0, 5);
        
        return points;
    }

    countTouches(data, price, threshold) {
        let touches = 0;
        let lastTouchIndex = -period; // Avoid counting multiple touches too close together
        
        data.forEach((candle, i) => {
            if (i - lastTouchIndex >= period) {
                if (Math.abs(candle.High - price) / price <= threshold ||
                    Math.abs(candle.Low - price) / price <= threshold) {
                    touches++;
                    lastTouchIndex = i;
                }
            }
        });
        
        return touches;
    }

    analyzeHighLowMarkers(data) {
        const currentPrice = data[data.length - 1].Close;
        const significantPoints = this.findSignificantPoints(data);
        
        let signal = 'Neutral';
        const analysis = [];
        
        // Format high levels
        analysis.push('Significant Highs:');
        significantPoints.highs.forEach(high => {
            analysis.push(`${high.price.toFixed(2)} (${high.touches} touches)`);
        });
        
        // Format low levels
        analysis.push('Significant Lows:');
        significantPoints.lows.forEach(low => {
            analysis.push(`${low.price.toFixed(2)} (${low.touches} touches)`);
        });
        
        // Determine signal
        const nearestHigh = Math.min(...significantPoints.highs.map(h => h.price));
        const nearestLow = Math.max(...significantPoints.lows.map(l => l.price));
        
        if (currentPrice > nearestHigh) {
            signal = 'Bullish';
            analysis.unshift('Price trading above significant high');
        } else if (currentPrice < nearestLow) {
            signal = 'Bearish';
            analysis.unshift('Price trading below significant low');
        } else {
            analysis.unshift('Price trading between significant levels');
        }
        
        return {
            signal,
            analysis,
            recommendation: signal === 'Bullish' ? 
                'Maintain bullish bias while price holds above high' :
                signal === 'Bearish' ?
                'Watch for potential support at marked lows' :
                'Monitor price reaction at nearest high/low levels'
        };
    }

    updateRangeStats(data) {
        // Clear existing stats
        this.levelSeries.rangeStats.forEach(series => {
            if (series && series.dispose) {
                series.dispose();
            }
        });
        this.levelSeries.rangeStats = [];

        if (!data || data.length < 20) return;

        // Calculate various statistics
        const stats = this.calculateRangeStatistics(data);
        
        // Draw range zones
        this.drawRangeZones(stats);
        
        // Add statistical markers
        this.addStatisticalMarkers(stats);
        
        // Add annotations
        this.addRangeAnnotations(stats);
    }

    calculateRangeStatistics(data) {
        const ranges = [];
        const dailyRanges = [];
        const prices = [];
        
        // Calculate daily ranges and collect all prices
        for (let i = 0; i < data.length; i++) {
            const range = data[i].High - data[i].Low;
            dailyRanges.push(range);
            ranges.push({
                date: data[i].Date,
                range,
                high: data[i].High,
                low: data[i].Low
            });
            prices.push(data[i].High, data[i].Low, data[i].Close);
        }

        // Sort prices for percentile calculations
        const sortedPrices = [...prices].sort((a, b) => a - b);
        
        // Calculate statistics
        const stats = {
            currentPrice: data[data.length - 1].Close,
            averageRange: dailyRanges.reduce((a, b) => a + b, 0) / dailyRanges.length,
            maxRange: Math.max(...dailyRanges),
            minRange: Math.min(...dailyRanges),
            standardDev: this.calculateStandardDeviation(prices),
            percentiles: {
                p95: sortedPrices[Math.floor(sortedPrices.length * 0.95)],
                p75: sortedPrices[Math.floor(sortedPrices.length * 0.75)],
                p50: sortedPrices[Math.floor(sortedPrices.length * 0.50)],
                p25: sortedPrices[Math.floor(sortedPrices.length * 0.25)],
                p5: sortedPrices[Math.floor(sortedPrices.length * 0.05)]
            },
            ranges: ranges
        };

        // Find most active price ranges
        stats.activeRanges = this.findActiveRanges(data);
        
        return stats;
    }

    calculateStandardDeviation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }

    findActiveRanges(data) {
        const rangeSize = (data[data.length - 1].Close - data[0].Close) * 0.01; // 1% of total range
        const ranges = new Map();
        
        // Count price occurrences in each range
        data.forEach(candle => {
            const rangeStart = Math.floor(candle.Low / rangeSize) * rangeSize;
            const rangeEnd = rangeStart + rangeSize;
            
            const key = `${rangeStart}-${rangeEnd}`;
            ranges.set(key, (ranges.get(key) || 0) + 1);
        });

        // Convert to array and sort by activity
        return Array.from(ranges.entries())
            .map(([range, count]) => ({
                range: range.split('-').map(Number),
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3); // Top 3 most active ranges
    }

    drawRangeZones(stats) {
        // Draw percentile zones
        const percentileColors = {
            p95: "#FF4444",  // Red
            p75: "#FFA726",  // Orange
            p50: "#FFEB3B",  // Yellow
            p25: "#66BB6A",  // Light Green
            p5: "#26A69A"    // Teal
        };

        Object.entries(stats.percentiles).forEach(([percentile, value], index) => {
            const series = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: `${percentile.toUpperCase()} Percentile`,
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    stroke: am5.color(percentileColors[percentile]),
                    strokeWidth: 1,
                    strokeDasharray: [2, 2]
                })
            );

            const startDate = this.mainSeries.data.getIndex(0).Date;
            const endDate = this.mainSeries.data.getIndex(this.mainSeries.data.length - 1).Date;
            
            series.data.setAll([
                { date: startDate, value },
                { date: endDate, value }
            ]);

            // Add label
            series.bullets.push(() => {
                return am5.Bullet.new(this.root, {
                    sprite: am5.Label.new(this.root, {
                        text: `${percentile.toUpperCase()}: ${value.toFixed(2)}`,
                        fill: am5.color(percentileColors[percentile]),
                        centerY: am5.p50,
                        centerX: am5.p100,
                        paddingLeft: 15
                    })
                });
            });

            this.levelSeries.rangeStats.push(series);
        });
    }

    addStatisticalMarkers(stats) {
        // Create markers for key statistics
        const markers = [
            {
                value: stats.currentPrice + stats.standardDev,
                label: "+1σ",
                color: "#FF4444"
            },
            {
                value: stats.currentPrice - stats.standardDev,
                label: "-1σ",
                color: "#00C853"
            },
            {
                value: stats.currentPrice + (stats.averageRange / 2),
                label: "Avg Range High",
                color: "#2196F3"
            },
            {
                value: stats.currentPrice - (stats.averageRange / 2),
                label: "Avg Range Low",
                color: "#2196F3"
            }
        ];

        markers.forEach(marker => {
            const series = this.chart.series.push(
                am5xy.LineSeries.new(this.root, {
                    name: marker.label,
                    xAxis: this.xAxis,
                    yAxis: this.yAxis,
                    stroke: am5.color(marker.color),
                    strokeWidth: 1,
                    strokeDasharray: [4, 4]
                })
            );

            const startDate = this.mainSeries.data.getIndex(0).Date;
            const endDate = this.mainSeries.data.getIndex(this.mainSeries.data.length - 1).Date;
            
            series.data.setAll([
                { date: startDate, value: marker.value },
                { date: endDate, value: marker.value }
            ]);

            // Add tooltip
            series.setAll({
                tooltip: am5.Tooltip.new(this.root, {
                    labelText: `${marker.label}: {valueY}`
                })
            });

            this.levelSeries.rangeStats.push(series);
        });
    }

    addRangeAnnotations(stats) {
        // Add text annotations for active ranges
        const container = this.chart.plotContainer.children.push(
            am5.Container.new(this.root, {
                width: am5.percent(30),
                height: am5.percent(100),
                layer: 30,
                layout: this.root.verticalLayout,
                paddingRight: 10,
                paddingTop: 10
            })
        );

        // Add statistics text
        const statsText = container.children.push(
            am5.Label.new(this.root, {
                text: [
                    "Range Statistics:",
                    `Avg Daily Range: ${stats.averageRange.toFixed(2)}`,
                    `Std Deviation: ${stats.standardDev.toFixed(2)}`,
                    "",
                    "Most Active Ranges:",
                    ...stats.activeRanges.map((r, i) => 
                        `${i + 1}. ${r.range[0].toFixed(2)} - ${r.range[1].toFixed(2)} (${r.count} touches)`
                    )
                ].join("\n"),
                fontSize: 12,
                fill: am5.color("#ffffff"),
                textAlign: "right"
            })
        );

        this.levelSeries.rangeStats.push({
            dispose: () => container.dispose()
        });
    }

    updateTechnicalSummary(data) {
        const summaryContent = document.querySelector('#auto-detection-summary .summary-content');
        summaryContent.innerHTML = ''; // Clear existing content
        
        if (this.activeLevels.pivotPoints) {
            const pivotAnalysis = this.analyzePivotPoints(data);
            this.addSummaryCard('Pivot Points', pivotAnalysis);
        }
        
        if (this.activeLevels.srZones) {
            const srAnalysis = this.analyzeSRZones(data);
            this.addSummaryCard('Support/Resistance', srAnalysis);
        }
        
        if (this.activeLevels.fibRetracement) {
            const fibRetracementAnalysis = this.analyzeFibRetracement(data);
            this.addSummaryCard('Fibonacci Retracement', fibRetracementAnalysis);
        }
        
        if (this.activeLevels.fibExtension) {
            const fibExtensionAnalysis = this.analyzeFibExtension(data);
            this.addSummaryCard('Fibonacci Extension', fibExtensionAnalysis);
        }
        
        if (this.activeLevels.priceChannels) {
            const channelAnalysis = this.analyzePriceChannels(data);
            this.addSummaryCard('Price Channels', channelAnalysis);
        }
        
        if (this.activeLevels.trendLines) {
            const trendAnalysis = this.analyzeTrendLines(data);
            this.addSummaryCard('Trend Lines', trendAnalysis);
        }
        
        if (this.activeLevels.highLowMarkers) {
            const hlAnalysis = this.analyzeHighLowMarkers(data);
            this.addSummaryCard('High/Low Analysis', hlAnalysis);
        }
        
        if (this.activeLevels.rangeStats) {
            const rangeAnalysis = this.analyzeRangeStats(data);
            this.addSummaryCard('Range Statistics', rangeAnalysis);
        }
    }

    addSummaryCard(title, analysis) {
        const summaryContent = document.querySelector('#auto-detection-summary .summary-content');
        
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.style.cssText = `
            background: rgba(25, 27, 31, 0.95);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border: 1px solid rgba(255,255,255,0.1);
        `;

        // Create signal badge
        const signalBadge = `
            <span style="
                background: ${analysis.signal === 'Bullish' ? '#1B5E20' : 
                           analysis.signal === 'Bearish' ? '#B71C1C' : '#795548'};
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
                color: white;
                text-transform: uppercase;
            ">${analysis.signal}</span>
        `;
        
        // Format levels section
        const levels = analysis.analysis.filter(point => point.includes(':'));
        const analysisPoints = analysis.analysis.filter(point => !point.includes(':'));
        
        const levelsHtml = levels.map(level => {
            const [label, value] = level.split(':').map(s => s.trim());
            return `
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                ">
                    <span style="color: #9E9E9E; font-size: 14px;">${label}:</span>
                    <span style="color: #E0E0E0; font-weight: bold; font-size: 14px;">${value}</span>
                </div>
            `;
        }).join('');

        // Format analysis points
        const analysisPointsHtml = analysisPoints.map(point => `
            <div style="
                color: #B0BEC5;
                font-size: 13px;
                padding: 4px 0;
                display: flex;
                align-items: center;
            ">
                <span style="
                    display: inline-block;
                    width: 6px;
                    height: 6px;
                    background: #4CAF50;
                    border-radius: 50%;
                    margin-right: 8px;
                "></span>
                ${point}
            </div>
        `).join('');

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; color: #ffffff; font-size: 16px;">${title}</h4>
                ${signalBadge}
            </div>
            <div style="margin-bottom: 15px;">
                ${levelsHtml}
            </div>
            <div style="margin-bottom: 15px;">
                ${analysisPointsHtml}
            </div>
            ${analysis.recommendation ? `
                <div style="
                    margin-top: 15px;
                    padding: 10px;
                    background: rgba(76, 175, 80, 0.1);
                    border-left: 4px solid #4CAF50;
                    border-radius: 4px;
                    color: #4CAF50;
                    font-size: 13px;
                ">
                    ${analysis.recommendation}
                </div>
            ` : ''}
        `;
        
        summaryContent.appendChild(card);
    }

    analyzePivotPoints(data) {
        const currentPrice = data[data.length - 1].Close;
        const pivots = this.calculatePivotPoints(data[data.length - 2]);
        
        let signal = 'Neutral';
        const analysis = [];
        
        if (currentPrice > pivots.R1) {
            signal = 'Bullish';
            analysis.push('Price above R1 resistance');
        } else if (currentPrice < pivots.S1) {
            signal = 'Bearish';
            analysis.push('Price below S1 support');
        }
        
        analysis.push(`Pivot Point: ${pivots.PP.toFixed(2)}`);
        analysis.push(`Next resistance: R1 at ${pivots.R1.toFixed(2)}`);
        analysis.push(`Next support: S1 at ${pivots.S1.toFixed(2)}`);
        
        return {
            signal,
            analysis,
            recommendation: signal === 'Bullish' ? 
                'Look for continuation above R1' :
                signal === 'Bearish' ?
                'Watch for bounce at S1' :
                'Monitor price action around PP'
        };
    }

    analyzeSRZones(data) {
        const currentPrice = data[data.length - 1].Close;
        const zones = this.findSRZones(data);
        
        let signal = 'Neutral';
        const analysis = [];
        
        const nearestSupport = zones.support.find(z => z < currentPrice);
        const nearestResistance = zones.resistance.find(z => z > currentPrice);
        
        if (nearestResistance && (currentPrice / nearestResistance > 0.98)) {
            signal = 'Bearish';
            analysis.push('Price near strong resistance');
        } else if (nearestSupport && (nearestSupport / currentPrice > 0.98)) {
            signal = 'Bullish';
            analysis.push('Price near strong support');
        }
        
        analysis.push(`Nearest resistance: ${nearestResistance?.toFixed(2) || 'None'}`);
        analysis.push(`Nearest support: ${nearestSupport?.toFixed(2) || 'None'}`);
        
        return {
            signal,
            analysis,
            recommendation: signal === 'Bullish' ? 
                'Look for bounce off support' :
                signal === 'Bearish' ?
                'Watch for rejection at resistance' :
                'Wait for price to approach S/R levels'
        };
    }

    analyzeFibRetracement(data) {
        const levels = this.calculateFibLevels(data);
        const currentPrice = data[data.length - 1].Close;
        
        let nearestLevel = null;
        let nearestDistance = Infinity;
        let signal = 'Neutral';
        
        // Find nearest Fib level
        Object.entries(levels).forEach(([ratio, price]) => {
            const distance = Math.abs(currentPrice - price);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestLevel = { ratio, price };
            }
        });

        // Determine signal based on price position
        if (currentPrice > levels['0.618']) {
            signal = 'Bullish';
        } else if (currentPrice < levels['0.382']) {
            signal = 'Bearish';
        }

        return {
            signal,
            analysis: [
                `Current Price: ${currentPrice.toFixed(2)}`,
                `Nearest Fib Level: ${nearestLevel.ratio} at ${nearestLevel.price.toFixed(2)}`,
                `0% Level: ${levels['0'].toFixed(2)}`,
                `23.6% Level: ${levels['0.236'].toFixed(2)}`,
                `38.2% Level: ${levels['0.382'].toFixed(2)}`,
                `50% Level: ${levels['0.5'].toFixed(2)}`,
                `61.8% Level: ${levels['0.618'].toFixed(2)}`,
                `78.6% Level: ${levels['0.786'].toFixed(2)}`,
                `100% Level: ${levels['1'].toFixed(2)}`
            ],
            recommendation: signal === 'Bullish' ? 
                'Consider long positions with support at nearest Fib level' :
                signal === 'Bearish' ?
                'Consider short positions with resistance at nearest Fib level' :
                'Wait for clearer price action near key Fib levels'
        };
    }

    analyzeFibExtension(data) {
        const levels = this.calculateFibExtensionLevels(data);
        const currentPrice = data[data.length - 1].Close;
        
        let nearestLevel = null;
        let nearestDistance = Infinity;
        let signal = 'Neutral';
        
        // Find nearest Fib extension level
        Object.entries(levels).forEach(([ratio, price]) => {
            const distance = Math.abs(currentPrice - price);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestLevel = { ratio, price };
            }
        });

        // Determine signal based on price position
        if (currentPrice > levels['1.0']) {
            signal = 'Bullish';
        } else if (currentPrice < levels['0.618']) {
            signal = 'Bearish';
        }

        return {
            signal,
            analysis: [
                `Current Price: ${currentPrice.toFixed(2)}`,
                `Nearest Extension Level: ${nearestLevel.ratio} at ${nearestLevel.price.toFixed(2)}`,
                `0% Level: ${levels['0'].toFixed(2)}`,
                `61.8% Level: ${levels['0.618'].toFixed(2)}`,
                `100% Level: ${levels['1.0'].toFixed(2)}`,
                `127.2% Level: ${levels['1.272'].toFixed(2)}`,
                `141.4% Level: ${levels['1.414'].toFixed(2)}`,
                `161.8% Level: ${levels['1.618'].toFixed(2)}`,
                `200% Level: ${levels['2.0'].toFixed(2)}`
            ],
            recommendation: signal === 'Bullish' ? 
                'Price showing strength, watch extension levels for potential targets' :
                signal === 'Bearish' ?
                'Price showing weakness, monitor lower extension levels' :
                'Price consolidating between extension levels'
        };
    }

    analyzePriceChannels(data) {
        const currentPrice = data[data.length - 1].Close;
        const channels = this.calculatePriceChannels(data);
        
        let signal = 'Neutral';
        const analysis = [];
        
        if (currentPrice > channels.upper) {
            signal = 'Bullish';
            analysis.push('Price above upper channel');
        } else if (currentPrice < channels.lower) {
            signal = 'Bearish';
            analysis.push('Price below lower channel');
        }
        
        analysis.push(`Upper channel: ${channels.upper.toFixed(2)}`);
        analysis.push(`Lower channel: ${channels.lower.toFixed(2)}`);
        
        return {
            signal,
            analysis,
            recommendation: signal === 'Bullish' ? 'Look for continuation of upward trend' :
                           signal === 'Bearish' ? 'Watch for potential trend reversal' :
                           'Trade within channel boundaries'
        };
    }

    analyzeTrendLines(data) {
        const currentPrice = data[data.length - 1].Close;
        const trends = this.calculateTrendLines(data);
        
        let signal = 'Neutral';
        const analysis = [];
        
        if (trends.uptrend && currentPrice > trends.uptrend) {
            signal = 'Bullish';
            analysis.push('Price above uptrend line');
        } else if (trends.downtrend && currentPrice < trends.downtrend) {
            signal = 'Bearish';
            analysis.push('Price below downtrend line');
        }
        
        if (trends.uptrend) analysis.push(`Uptrend support: ${trends.uptrend.toFixed(2)}`);
        if (trends.downtrend) analysis.push(`Downtrend resistance: ${trends.downtrend.toFixed(2)}`);
        
        return {
            signal,
            analysis,
            recommendation: signal === 'Bullish' ? 'Maintain long positions above uptrend' :
                           signal === 'Bearish' ? 'Consider shorts below downtrend' :
                           'Wait for trend confirmation'
        };
    }

    analyzeHighLowMarkers(data) {
        const currentPrice = data[data.length - 1].Close;
        const markers = this.findSignificantPoints(data);
        
        let nearestHigh = Math.min(...markers.highs.map(h => h.price));
        const nearestLow = Math.max(...markers.lows.map(l => l.price));
        
        if (currentPrice > nearestHigh) {
            signal = 'Bullish';
            analysis.push('Price above recent significant high');
        } else if (currentPrice < nearestLow) {
            signal = 'Bearish';
            analysis.push('Price below recent significant low');
        }
        
        analysis.push(`Nearest high: ${nearestHigh.toFixed(2)}`);
        analysis.push(`Nearest low: ${nearestLow.toFixed(2)}`);
        
        return {
            signal,
            analysis,
            recommendation: signal === 'Bullish' ? 'Look for continuation of breakout' :
                           signal === 'Bearish' ? 'Watch for potential support at lows' :
                           'Monitor price reaction at key levels'
        };
    }

    analyzeRangeStats(data) {
        const stats = this.calculateRangeStatistics(data);
        const currentPrice = data[data.length - 1].Close;
        
        let signal = 'Neutral';
        const analysis = [];
        
        if (currentPrice > stats.percentiles.p75) {
            signal = 'Bullish';
            analysis.push('Price in upper quartile of range');
        } else if (currentPrice < stats.percentiles.p25) {
            signal = 'Bearish';
            analysis.push('Price in lower quartile of range');
        }
        
        analysis.push(`Average daily range: ${stats.averageRange.toFixed(2)}`);
        analysis.push(`Standard deviation: ${stats.standardDev.toFixed(2)}`);
        
        return {
            signal,
            analysis,
            recommendation: signal === 'Bullish' ? 'Watch for continuation above upper quartile' :
                           signal === 'Bearish' ? 'Look for reversal from lower quartile' :
                           'Trade mean reversion within range'
        };
    }

    countPriceTouches(data, price, threshold = 0.003) {
        let touches = 0;
        for (const candle of data) {
            if (Math.abs(candle.High - price) / price < threshold || 
                Math.abs(candle.Low - price) / price < threshold) {
                touches++;
            }
        }
        return touches;
    }

    calculateFibLevels(data) {
        const high = Math.max(...data.map(d => d.High));
        const low = Math.min(...data.map(d => d.Low));
        const diff = high - low;

        return {
            '0': high,
            '0.236': high - (diff * 0.236),
            '0.382': high - (diff * 0.382),
            '0.5': high - (diff * 0.5),
            '0.618': high - (diff * 0.618),
            '0.786': high - (diff * 0.786),
            '1': low
        };
    }

    calculateFibExtensionLevels(data) {
        const high = Math.max(...data.map(d => d.High));
        const low = Math.min(...data.map(d => d.Low));
        const diff = high - low;

        return {
            '0': low,
            '0.618': low + (diff * 0.618),
            '1.0': high,
            '1.272': low + (diff * 1.272),
            '1.414': low + (diff * 1.414),
            '1.618': low + (diff * 1.618),
            '2.0': low + (diff * 2.0)
        };
    }

    calculatePivotPoints(previousCandle) {
        const PP = (previousCandle.High + previousCandle.Low + previousCandle.Close) / 3;
        const R1 = (2 * PP) - previousCandle.Low;
        const S1 = (2 * PP) - previousCandle.High;
        const R2 = PP + (previousCandle.High - previousCandle.Low);
        const S2 = PP - (previousCandle.High - previousCandle.Low);
        const R3 = R1 + (previousCandle.High - previousCandle.Low);
        const S3 = S1 - (previousCandle.High - previousCandle.Low);

        return { PP, R1, S1, R2, S2, R3, S3 };
    }

    findSRZones(data) {
        const zones = {
            support: [],
            resistance: []
        };
        const period = 10;
        
        for (let i = period; i < data.length - period; i++) {
            const currentHigh = data[i].High;
            const currentLow = data[i].Low;
            
            // Check for swing high
            let isSwingHigh = true;
            for (let j = i - period; j <= i + period; j++) {
                if (j !== i && data[j].High >= currentHigh) {
                    isSwingHigh = false;
                    break;
                }
            }
            
            // Check for swing low
            let isSwingLow = true;
            for (let j = i - period; j <= i + period; j++) {
                if (j !== i && data[j].Low <= currentLow) {
                    isSwingLow = false;
                    break;
                }
            }
            
            if (isSwingHigh) {
                zones.resistance.push(currentHigh);
            }
            if (isSwingLow) {
                zones.support.push(currentLow);
            }
        }
        
        // Sort and remove duplicates
        zones.resistance = [...new Set(zones.resistance)].sort((a, b) => a - b);
        zones.support = [...new Set(zones.support)].sort((a, b) => a - b);
        
        return zones;
    }

    calculatePriceChannels(data) {
        const period = 20;
        const upperChannel = Math.max(...data.slice(-period).map(d => d.High));
        const lowerChannel = Math.min(...data.slice(-period).map(d => d.Low));
        const middleChannel = (upperChannel + lowerChannel) / 2;
        
        return {
            upper: upperChannel,
            middle: middleChannel,
            lower: lowerChannel
        };
    }

    calculateTrendLines(data) {
        const period = 20;
        const recentData = data.slice(-period);
        
        // Calculate uptrend line
        let lowestLow = Infinity;
        let lowestLowIndex = -1;
        
        for (let i = 0; i < recentData.length; i++) {
            if (recentData[i].Low < lowestLow) {
                lowestLow = recentData[i].Low;
                lowestLowIndex = i;
            }
        }
        
        // Calculate downtrend line
        let highestHigh = -Infinity;
        let highestHighIndex = -1;
        
        for (let i = 0; i < recentData.length; i++) {
            if (recentData[i].High > highestHigh) {
                highestHigh = recentData[i].High;
                highestHighIndex = i;
            }
        }
        
        return {
            uptrend: lowestLow,
            downtrend: highestHigh
        };
    }

    setupEventListeners() {
        // Timeframe buttons
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTimeframe = btn.getAttribute('data-timeframe');
                await this.loadData();
            });
        });

        // Update technical summary when toggling indicators
        const updateIndicatorAndSummary = async (btn, levelType) => {
            this.activeLevels[levelType] = !this.activeLevels[levelType];
            
            if (this.activeLevels[levelType]) {
                btn.classList.add('active');
                const updateMethod = {
                    pivotPoints: this.updatePivotPoints.bind(this),
                    srZones: this.updateSRZones.bind(this),
                    fibRetracement: this.updateFibRetracement.bind(this),
                    fibExtension: this.updateFibExtension.bind(this),
                    priceChannels: this.updatePriceChannels.bind(this),
                    trendLines: this.updateTrendLines.bind(this),
                    highLowMarkers: this.updateHighLowMarkers.bind(this),
                    rangeStats: this.updateRangeStats.bind(this)
                }[levelType];

                if (updateMethod) {
                    await updateMethod(this.mainSeries.data.values);
                }
            } else {
                btn.classList.remove('active');
                if (this.levelSeries[levelType]) {
                    this.levelSeries[levelType].forEach(series => {
                        if (series && series.dispose) {
                            series.dispose();
                        }
                    });
                    this.levelSeries[levelType] = [];
                }
            }
            
            // Update technical summary
            await this.updateTechnicalSummary(this.mainSeries.data.values);
        };

        // Add event listeners for each button
        const buttons = {
            'pivotPoints': '[data-level="pivotPoints"]',
            'srZones': '[data-level="srZones"]',
            'fibRetracement': '[data-level="fibRetracement"]',
            'fibExtension': '[data-level="fibExtension"]',
            'priceChannels': '[data-level="priceChannels"]',
            'trendLines': '[data-level="trendLines"]',
            'highLowMarkers': '[data-level="highLowMarkers"]',
            'rangeStats': '[data-level="rangeStats"]'
        };

        Object.entries(buttons).forEach(([levelType, selector]) => {
            const button = document.querySelector(selector);
            if (button) {
                button.addEventListener('click', async (e) => {
                    await updateIndicatorAndSummary(e.currentTarget, levelType);
                });
            }
        });
    }

    dispose() {
        if (this.root) {
            this.root.dispose();
        }
    }
}
