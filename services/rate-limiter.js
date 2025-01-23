// Rate limiter for API calls
export class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow; // in milliseconds
        this.requests = [];
    }

    async tryRequest() {
        const now = Date.now();
        
        // Remove old requests outside the time window
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        
        // Check if we're under the limit
        if (this.requests.length < this.maxRequests) {
            this.requests.push(now);
            return true;
        }
        
        return false;
    }

    getTimeUntilNextSlot() {
        const now = Date.now();
        if (this.requests.length === 0) return 0;
        
        // Sort requests by time and get the oldest one
        this.requests.sort((a, b) => a - b);
        const oldestRequest = this.requests[0];
        
        // Calculate when the oldest request will expire
        const timeUntilExpiry = (oldestRequest + this.timeWindow) - now;
        return Math.max(0, timeUntilExpiry);
    }

    getCurrentUsage() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.timeWindow);
        return {
            current: this.requests.length,
            limit: this.maxRequests,
            remainingRequests: this.maxRequests - this.requests.length
        };
    }
}
