export const SECTOR_CONFIG = {
    BASE_URL: 'https://api.coingecko.com/api/v3',
    ENDPOINTS: {
        COINS_MARKETS: '/coins/markets',
        CATEGORIES: '/coins/categories',
        CATEGORY: '/coins/markets'
    },
    VS_CURRENCY: 'usd',
    UPDATE_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours
    CACHE_DURATION: 6 * 60 * 60 * 1000,  // 6 hours cache
    RETRIES: 3,
    RETRY_DELAY: 1000,
    // Map our sectors to CoinGecko categories
    SECTOR_MAPPING: {
        gaming: {
            id: 'gaming',
            name: 'Gaming',
            description: 'Gaming and metaverse projects',
            includes: ['metaverse'],
            symbols: ['sand', 'mana', 'gala', 'enj', 'ilv', 'axs']
        },
        l1: {
            id: 'smart-contract-platform',
            name: 'Layer 1',
            description: 'Base blockchain platforms',
            includes: ['layer-1'],
            symbols: ['eth', 'bnb', 'sol', 'ada', 'avax', 'dot', 'near', 'ftm', 'atom']
        },
        l2: {
            id: 'scaling',
            name: 'Layer 2',
            description: 'Scaling solutions',
            includes: ['layer-2', 'optimistic-rollup', 'zk-rollup'],
            symbols: ['matic', 'arb', 'op', 'imx', 'metis', 'omg', 'zks']
        },
        defi: {
            id: 'decentralized-finance-defi',
            name: 'DeFi',
            description: 'Decentralized finance protocols',
            includes: ['yield-farming', 'yield-aggregator', 'decentralized-exchange'],
            symbols: ['uni', 'link', 'aave', 'cake', 'crv', 'sushi', 'comp', 'mkr']
        },
        launchpads: {
            id: 'launchpad',
            name: 'Launchpads',
            description: 'Token launch platforms',
            symbols: ['bscpad', 'gafi', 'dao', 'seed', 'sfund', 'paid']
        },
        ai: {
            id: 'artificial-intelligence',
            name: 'AI',
            description: 'Artificial intelligence and machine learning',
            includes: ['ai-and-big-data'],
            symbols: ['ocean', 'fet', 'rndr', 'agix', 'alt', 'grt']
        },
        depin: {
            id: 'infrastructure',
            name: 'DePIN',
            description: 'Decentralized Physical Infrastructure',
            includes: ['iot', 'wireless', 'storage'],
            symbols: ['fil', 'ar', 'storj', 'iotx', 'xnet', 'mobx', 'rndr']
        },
        privacy: {
            id: 'privacy-coins',
            name: 'Privacy',
            description: 'Privacy-focused cryptocurrencies',
            includes: ['anonymity'],
            symbols: ['xmr', 'zec', 'scrt', 'rose', 'dash', 'xvg']
        },
        memes: {
            id: 'meme',
            name: 'Memes',
            description: 'Meme-based tokens',
            includes: ['dog-themed'],
            symbols: ['doge', 'shib', 'pepe', 'floki', 'bonk', 'wojak']
        }
    }
};
