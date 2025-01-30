// @ts-check

// Configuration for Historical Patterns Section
export const HISTORICAL_PATTERNS_CONFIG = {
    // Pattern types
    PATTERNS: {
        CYCLICAL: 'cyclical',
        SEASONAL: 'seasonal',
        VOLATILITY: 'volatility',
        CORRELATION: 'correlation'
    },

    // Timeframes
    TIMEFRAMES: {
        '1y': { label: '1Y', days: 365 },
        '2y': { label: '2Y', days: 730 },
        '4y': { label: '4Y', days: 1460 },
        'all': { label: 'All', days: 0 }
    },

    // Chart configuration
    CHART: {
        DEFAULT_HEIGHT: 400,
        COLORS: {
            BACKGROUND: 'transparent',
            TEXT: '#d1d4dc',
            GRID: 'rgba(42, 46, 57, 0.5)',
            UP: '#26a69a',
            DOWN: '#ef5350',
            PATTERN: 'rgba(0, 255, 157, 0.5)'
        }
    },

    // Update intervals
    UPDATE_INTERVAL: 5 * 60 * 1000, // 5 minutes

    // Analysis thresholds
    THRESHOLDS: {
        MIN_DATA_POINTS: 100,
        MIN_PATTERN_STRENGTH: 40,
        MIN_CONFIDENCE: 60,
        MIN_ACCURACY: 50
    }
};
