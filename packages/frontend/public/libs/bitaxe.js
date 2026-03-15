/**
 * Bitaxe Renting - Bitaxe API Integration
 * Handles communication with Bitaxe miners for real-time stats
 */

class BitaxeAPI {
    constructor(baseUrl = 'http://localhost', port = 8080) {
        this.baseUrl = baseUrl;
        this.port = port;
        this.timeout = 5000; // 5 seconds
        this.cache = new Map();
        this.cacheExpiry = 5000; // 5 seconds cache
    }

    /**
     * Get Bitaxe status from a specific miner
     */
    async getStatus(ip, port = 8080) {
        const url = `http://${ip}:${port}/api/system/info`;
        return this._fetchWithCache(url, 'status-' + ip);
    }

    /**
     * Get Bitaxe hashrate
     */
    async getHashrate(ip, port = 8080) {
        const url = `http://${ip}:${port}/api/system/metrics`;
        try {
            const data = await this._fetchWithCache(url, 'hashrate-' + ip);
            return {
                current: data.hashrate || 0,
                average: data.average_hashrate || 0,
                unit: 'GH/s'
            };
        } catch (err) {
            return {
                current: 0,
                average: 0,
                unit: 'GH/s',
                error: err.message
            };
        }
    }

    /**
     * Get Bitaxe temperature
     */
    async getTemperature(ip, port = 8080) {
        const url = `http://${ip}:${port}/api/system/metrics`;
        try {
            const data = await this._fetchWithCache(url, 'temp-' + ip);
            return {
                current: data.temperature || 25,
                target: 65,
                unit: 'Celsius',
                fan: Math.random() * 100 // Simulated fan speed
            };
        } catch (err) {
            // Return simulated data on error
            return {
                current: 25 + Math.random() * 20,
                target: 65,
                unit: 'Celsius',
                fan: 30 + Math.random() * 40,
                simulated: true
            };
        }
    }

    /**
     * Get complete Bitaxe info
     */
    async getMinerInfo(ip, port = 8080) {
        try {
            const [status, hashrate, temp] = await Promise.all([
                this.getStatus(ip, port),
                this.getHashrate(ip, port),
                this.getTemperature(ip, port)
            ]);

            return {
                ip: ip,
                port: port,
                online: true,
                status: status,
                hashrate: hashrate.current,
                averageHashrate: hashrate.average,
                temperature: temp.current,
                targetTemp: temp.target,
                fan: temp.fan,
                unit: 'GH/s',
                lastUpdate: Date.now()
            };
        } catch (err) {
            // Return offline status
            return {
                ip: ip,
                port: port,
                online: false,
                error: err.message,
                lastUpdate: Date.now()
            };
        }
    }

    /**
     * Get mining stats
     */
    async getMiningStats(ip, port = 8080) {
        const url = `http://${ip}:${port}/api/miner/stats`;
        try {
            const data = await this._fetchWithCache(url, 'stats-' + ip);
            return {
                difficulty: data.difficulty || 1,
                shares: data.shares || 0,
                rejects: data.rejects || 0,
                uptime: data.uptime || 0,
                power: data.power_consumption || 0
            };
        } catch (err) {
            return {
                difficulty: 1,
                shares: 0,
                rejects: 0,
                uptime: 0,
                power: 0,
                error: err.message
            };
        }
    }

    /**
     * Get logs from Bitaxe
     */
    async getLogs(ip, port = 8080, lines = 100) {
        const url = `http://${ip}:${port}/api/logs?lines=${lines}`;
        try {
            const data = await this._fetchWithTimeout(url);
            return data.logs || [];
        } catch (err) {
            return [];
        }
    }

    /**
     * Check if Bitaxe is online
     */
    async isOnline(ip, port = 8080) {
        try {
            const url = `http://${ip}:${port}/api/system/info`;
            await this._fetchWithTimeout(url);
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Batch check multiple Bitaxe status
     */
    async checkMultiple(miners) {
        const promises = miners.map(m => 
            this.getMinerInfo(m.ip, m.port || 8080)
                .catch(err => ({
                    ip: m.ip,
                    online: false,
                    error: err.message
                }))
        );
        return Promise.all(promises);
    }

    /**
     * Stream real-time data from Bitaxe
     */
    createRealtimeStream(ip, port = 8080, onData, onError) {
        const interval = setInterval(async () => {
            try {
                const info = await this.getMinerInfo(ip, port);
                onData(info);
            } catch (err) {
                onError(err);
            }
        }, 5000); // Update every 5 seconds

        return () => clearInterval(interval);
    }

    /**
     * Calculate estimated earnings
     */
    calculateEstimatedEarnings(hashrate, satoshisPerGHDay = 5000) {
        return {
            perHour: Math.floor(hashrate * satoshisPerGHDay / 24),
            perDay: Math.floor(hashrate * satoshisPerGHDay),
            perMonth: Math.floor(hashrate * satoshisPerGHDay * 30),
            perYear: Math.floor(hashrate * satoshisPerGHDay * 365)
        };
    }

    /**
     * Estimate rental revenue
     */
    estimateRentalRevenue(hashrate, satosPerMinute, durationMinutes) {
        return {
            durationMinutes: durationMinutes,
            costSats: satosPerMinute * durationMinutes,
            estimatedMinerEarnings: Math.floor(hashrate * durationMinutes * 0.1),
            adminFee: Math.floor(satosPerMinute * durationMinutes * 0.05) // 5% fee
        };
    }

    /**
     * Internal: Fetch with timeout
     */
    _fetchWithTimeout(url, timeout = this.timeout) {
        return Promise.race([
            fetch(url, { mode: 'no-cors' }).then(r => r.json()),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), timeout)
            )
        ]);
    }

    /**
     * Internal: Fetch with cache
     */
    async _fetchWithCache(url, cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        const data = await this._fetchWithTimeout(url);
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Set cache expiry time
     */
    setCacheExpiry(ms) {
        this.cacheExpiry = ms;
    }

    /**
     * Generate mock data for demo
     */
    static generateMockMinerData(name, hashrate) {
        return {
            name: name,
            hashrate: hashrate,
            temperature: Math.round(35 + Math.random() * 20),
            fan: Math.round(20 + Math.random() * 60),
            online: true,
            power: Math.round(hashrate * 3.5),
            uptime: Math.floor(Math.random() * 2592000), // Up to 30 days
            shares: Math.floor(Math.random() * 10000),
            rejects: Math.floor(Math.random() * 100)
        };
    }
}

/**
 * Bitaxe Miner Management
 */
class BitaxeMinerManager {
    constructor() {
        this.api = new BitaxeAPI();
        this.miners = [];
        this.stats = new Map();
    }

    /**
     * Add miner
     */
    addMiner(minerId, name, ip, port = 8080, hashrate = 30, satsPerMinute = 50) {
        const miner = {
            id: minerId,
            name: name,
            ip: ip,
            port: port,
            hashrate: hashrate,
            satsPerMinute: satsPerMinute,
            status: 'libre',
            totalRevenue: 0,
            createdAt: Date.now(),
            lastOnlineCheck: null
        };

        this.miners.push(miner);
        return miner;
    }

    /**
     * Get miner
     */
    getMiner(minerId) {
        return this.miners.find(m => m.id === minerId);
    }

    /**
     * Update miner stats
     */
    async updateStats(minerId) {
        const miner = this.getMiner(minerId);
        if (!miner) return null;

        try {
            const info = await this.api.getMinerInfo(miner.ip, miner.port);
            this.stats.set(minerId, {
                ...info,
                timestamp: Date.now()
            });
            return info;
        } catch (err) {
            return { error: err.message };
        }
    }

    /**
     * Get miner stats
     */
    getStats(minerId) {
        return this.stats.get(minerId) || {};
    }

    /**
     * Update all miners stats
     */
    async updateAllStats() {
        const promises = this.miners.map(m => this.updateStats(m.id));
        return Promise.all(promises);
    }

    /**
     * Get miner health
     */
    getMinerHealth(minerId) {
        const stats = this.getStats(minerId);
        if (!stats) return 'unknown';

        if (!stats.online) return 'offline';
        
        const temp = stats.temperature || 0;
        if (temp > 70) return 'critical';
        if (temp > 60) return 'warning';
        return 'healthy';
    }

    /**
     * Start monitoring all miners
     */
    startMonitoring(interval = 10000) {
        this.monitoringInterval = setInterval(() => {
            this.updateAllStats().catch(err => 
                console.error('Monitoring error:', err)
            );
        }, interval);

        // Initial update
        this.updateAllStats();
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }

    /**
     * Get all miners
     */
    getAllMiners() {
        return this.miners;
    }

    /**
     * Remove miner
     */
    removeMiner(minerId) {
        this.miners = this.miners.filter(m => m.id !== minerId);
        this.stats.delete(minerId);
    }
}

/**
 * Rental Manager for handling mining rentals
 */
class BitaxeRentalManager {
    constructor(nwcManager) {
        this.nwc = nwcManager;
        this.rentals = [];
    }

    /**
     * Create new rental
     */
    async createRental(minerId, clientPubkey, durationMinutes, satosPerMinute) {
        const rentalId = 'rental-' + Date.now();
        const now = Date.now();
        const satsPaid = satosPerMinute * durationMinutes;

        // Generate invoice
        const invoice = await this.nwc.createInvoice(
            satsPaid,
            `Bitaxe Rental - ${durationMinutes}min`
        );

        const rental = {
            id: rentalId,
            minerId: minerId,
            clientPubkey: clientPubkey,
            startTime: now,
            endTime: now + (durationMinutes * 60 * 1000),
            minutesRented: durationMinutes,
            satsPaid: satsPaid,
            invoiceHash: invoice.hash,
            status: 'pending', // pending -> active -> completed
            createdAt: now
        };

        this.rentals.push(rental);
        return {
            rental: rental,
            invoice: invoice
        };
    }

    /**
     * Verify and activate rental
     */
    async activateRental(rentalId) {
        const rental = this.rentals.find(r => r.id === rentalId);
        if (!rental) throw new Error('Rental not found');

        // Verify payment
        const verified = await this.nwc.verifyPayment(rental.invoiceHash);
        
        if (verified.verified) {
            rental.status = 'active';
            rental.paymentVerifiedAt = Date.now();
            return rental;
        } else {
            throw new Error('Payment not verified');
        }
    }

    /**
     * End rental
     */
    endRental(rentalId) {
        const rental = this.rentals.find(r => r.id === rentalId);
        if (!rental) throw new Error('Rental not found');

        rental.status = 'completed';
        rental.completedAt = Date.now();
        
        return rental;
    }

    /**
     * Get active rentals
     */
    getActiveRentals() {
        return this.rentals.filter(r => r.status === 'active');
    }

    /**
     * Get rental history
     */
    getRentalHistory(minerId = null) {
        let rentals = this.rentals.filter(r => r.status === 'completed');
        if (minerId) {
            rentals = rentals.filter(r => r.minerId === minerId);
        }
        return rentals.sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Get total revenue
     */
    getTotalRevenue(minerId = null) {
        let rentals = this.rentals.filter(r => r.status === 'completed');
        if (minerId) {
            rentals = rentals.filter(r => r.minerId === minerId);
        }
        return rentals.reduce((sum, r) => sum + r.satsPaid, 0);
    }

    /**
     * Extend rental
     */
    extendRental(rentalId, additionalMinutes, satosPerMinute) {
        const rental = this.rentals.find(r => r.id === rentalId);
        if (!rental) throw new Error('Rental not found');

        const additionalCost = satosPerMinute * additionalMinutes;
        rental.endTime += (additionalMinutes * 60 * 1000);
        rental.minutesRented += additionalMinutes;
        rental.satsPaid += additionalCost;

        return rental;
    }
}

// Create global instances
window.BitaxeAPI = BitaxeAPI;
window.BitaxeMinerManager = BitaxeMinerManager;
window.BitaxeRentalManager = BitaxeRentalManager;
