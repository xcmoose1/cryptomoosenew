import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Cache management with rate limiting
const cache = {
    ido: { data: null, timestamp: null },
    staking: { data: null, timestamp: null },
    nft: { data: null, timestamp: null },
    governance: { data: null, timestamp: null },
    idoCalendar: { data: null, timestamp: null, requestCount: 0, lastRequestTime: null }
};

// Constants for rate limiting
const RATE_LIMIT = {
    REQUESTS_PER_MINUTE: 100,
    DAILY_CREDITS: 400,
    MONTHLY_CREDITS: 10000
};

// Cache duration increased to reduce API calls
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Rate limiting function
function canMakeRequest(key) {
    const now = Date.now();
    const cacheEntry = cache[key];

    // Initialize request tracking if not exists
    if (!cacheEntry.requestCount || !cacheEntry.lastRequestTime) {
        cacheEntry.requestCount = 0;
        cacheEntry.lastRequestTime = now;
    }

    // Reset counter if a minute has passed
    if (now - cacheEntry.lastRequestTime >= 60000) {
        cacheEntry.requestCount = 0;
        cacheEntry.lastRequestTime = now;
    }

    // Check if we're within rate limits
    if (cacheEntry.requestCount >= RATE_LIMIT.REQUESTS_PER_MINUTE) {
        return false;
    }

    cacheEntry.requestCount++;
    return true;
}

async function fetchWithCache(key, fetchFunction) {
    const now = Date.now();
    
    // Return cached data if valid
    if (cache[key].data && cache[key].timestamp && (now - cache[key].timestamp < CACHE_DURATION)) {
        return cache[key].data;
    }

    // Check rate limits before making request
    if (!canMakeRequest(key)) {
        console.warn(`Rate limit exceeded for ${key}. Using cached data if available.`);
        return cache[key].data || [];
    }

    try {
        const data = await fetchFunction();
        cache[key] = {
            data,
            timestamp: now,
            requestCount: (cache[key].requestCount || 0) + 1,
            lastRequestTime: now
        };
        return data;
    } catch (error) {
        console.error(`Error fetching ${key} data:`, error);
        // Return cached data if available, empty array if not
        return cache[key].data || [];
    }
}

// Staking and Yield Data using DefiLlama's free API
async function fetchStakingData() {
    try {
        const response = await fetch('https://api.llama.fi/protocols');
        const data = await response.json();
        
        // Filter and sort by TVL
        return data
            .filter(protocol => protocol.category === 'Staking' || protocol.category === 'Yield')
            .sort((a, b) => b.tvl - a.tvl)
            .slice(0, 10)
            .map(protocol => ({
                name: protocol.name,
                tvl: protocol.tvl,
                category: protocol.category,
                chain: protocol.chain
            }));
    } catch (error) {
        console.error('Error fetching staking data:', error);
        return [];
    }
}

// Governance Data using Snapshot's public GraphQL API
async function fetchGovernanceData() {
    try {
        const response = await fetch('https://hub.snapshot.org/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
                    query {
                        proposals(
                            first: 10,
                            skip: 0,
                            where: {
                                state: "active"
                            }
                            orderBy: "created",
                            orderDirection: desc
                        ) {
                            id
                            title
                            body
                            choices
                            start
                            end
                            state
                            space {
                                id
                                name
                            }
                        }
                    }
                `
            }),
        });

        const data = await response.json();
        return data.data.proposals;
    } catch (error) {
        console.error('Error fetching governance data:', error);
        return [];
    }
}

// IDO/ICO Calendar Data
export async function fetchIDOCalendar() {
    try {
        // Implement your preferred data source here
        return [];
    } catch (error) {
        console.error('Error fetching IDO calendar:', error);
        return [];
    }
}

// Combined data fetch
export async function getAllOpportunities() {
    try {
        // Implement your preferred data source here
        return [];
    } catch (error) {
        console.error('Error fetching opportunities:', error);
        return [];
    }
}

export { 
    fetchStakingData, 
    fetchGovernanceData,
    fetchIDOCalendar,
    getAllOpportunities 
};
