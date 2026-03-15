/**
 * Bitaxe Renting - Helpers Library
 * Shared utilities for localStorage, formatting, and common operations
 */

class LocalStorageManager {
    static KEYS = {
        MINEURS: 'bitaxe-demo-mineurs',
        LOCATIONS: 'bitaxe-demo-locations',
        PAYMENTS: 'bitaxe-payments-history',
        NWC_CONFIG: 'bitaxe-nwc-config',
        DEFAULT_PRICE: 'bitaxe-default-price',
        CLIENT_PUBKEY: 'bitaxe-client-pubkey'
    };

    static saveMiners(miners) {
        localStorage.setItem(this.KEYS.MINEURS, JSON.stringify(miners));
    }

    static getMiners() {
        const data = localStorage.getItem(this.KEYS.MINEURS);
        return data ? JSON.parse(data) : [];
    }

    static saveMiner(miner) {
        const miners = this.getMiners();
        const index = miners.findIndex(m => m.id === miner.id);
        if (index >= 0) {
            miners[index] = miner;
        } else {
            miners.push(miner);
        }
        this.saveMiners(miners);
    }

    static getMiner(id) {
        return this.getMiners().find(m => m.id === id);
    }

    static deleteMiner(id) {
        const miners = this.getMiners().filter(m => m.id !== id);
        this.saveMiners(miners);
    }

    static saveLocations(locations) {
        localStorage.setItem(this.KEYS.LOCATIONS, JSON.stringify(locations));
    }

    static getLocations() {
        const data = localStorage.getItem(this.KEYS.LOCATIONS);
        return data ? JSON.parse(data) : [];
    }

    static saveLocation(location) {
        const locations = this.getLocations();
        const index = locations.findIndex(l => l.id === location.id);
        if (index >= 0) {
            locations[index] = location;
        } else {
            locations.push(location);
        }
        this.saveLocations(locations);
    }

    static getLocation(id) {
        return this.getLocations().find(l => l.id === id);
    }

    static getActiveLocations() {
        return this.getLocations().filter(l => l.status === 'active');
    }

    static getCompletedLocations() {
        return this.getLocations().filter(l => l.status === 'completed');
    }

    static savePayments(payments) {
        localStorage.setItem(this.KEYS.PAYMENTS, JSON.stringify(payments));
    }

    static getPayments() {
        const data = localStorage.getItem(this.KEYS.PAYMENTS);
        return data ? JSON.parse(data) : [];
    }

    static addPayment(payment) {
        const payments = this.getPayments();
        payments.push({
            ...payment,
            timestamp: Date.now()
        });
        this.savePayments(payments);
    }

    static setNWCConfig(config) {
        localStorage.setItem(this.KEYS.NWC_CONFIG, config);
    }

    static getNWCConfig() {
        return localStorage.getItem(this.KEYS.NWC_CONFIG);
    }

    static setDefaultPrice(price) {
        localStorage.setItem(this.KEYS.DEFAULT_PRICE, price);
    }

    static getDefaultPrice() {
        return parseFloat(localStorage.getItem(this.KEYS.DEFAULT_PRICE)) || 50;
    }

    static setClientPubkey(pubkey) {
        localStorage.setItem(this.KEYS.CLIENT_PUBKEY, pubkey);
    }

    static getClientPubkey() {
        return localStorage.getItem(this.KEYS.CLIENT_PUBKEY);
    }

    static clearAll() {
        Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
    }

    static exportData() {
        return {
            mineurs: this.getMiners(),
            locations: this.getLocations(),
            payments: this.getPayments(),
            nwc: this.getNWCConfig(),
            defaultPrice: this.getDefaultPrice(),
            exportDate: new Date().toISOString()
        };
    }

    static importData(data) {
        if (data.mineurs) this.saveMiners(data.mineurs);
        if (data.locations) this.saveLocations(data.locations);
        if (data.payments) this.savePayments(data.payments);
        if (data.nwc) this.setNWCConfig(data.nwc);
        if (data.defaultPrice) this.setDefaultPrice(data.defaultPrice);
    }
}

class FormatHelper {
    static formatSats(amount) {
        return amount.toLocaleString('en-US');
    }

    static formatSatsShort(amount) {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toString();
    }

    static formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString('fr-FR');
    }

    static formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('fr-FR');
    }

    static formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('fr-FR');
    }

    static formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }

    static formatDurationShort(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h`;
        }
        if (minutes > 0) {
            return `${minutes}m`;
        }
        return `${totalSeconds}s`;
    }

    static formatMinutes(minutes) {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${minutes}m`;
    }

    static formatHashrate(gh) {
        return `${gh} GH/s`;
    }

    static formatTemperature(celsius) {
        return `${celsius.toFixed(1)}°C`;
    }

    static formatPercentage(value) {
        return (value * 100).toFixed(1) + '%';
    }
}

class ValidationHelper {
    static isValidIP(ip) {
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipPattern.test(ip)) return false;
        
        const parts = ip.split('.');
        return parts.every(part => {
            const num = parseInt(part);
            return num >= 0 && num <= 255;
        });
    }

    static isValidPubkey(pubkey) {
        return pubkey && pubkey.startsWith('npub1') && pubkey.length >= 50;
    }

    static isValidNWCString(nwcString) {
        return nwcString && nwcString.startsWith('nostr+walletconnect://');
    }

    static isValidHashrate(hashrate) {
        return hashrate > 0 && hashrate <= 10000;
    }

    static isValidPrice(price) {
        return price > 0 && price <= 1000000;
    }

    static isValidPort(port) {
        const p = parseInt(port);
        return p > 0 && p <= 65535;
    }

    static isValidMinerId(id) {
        return id && id.length > 0;
    }
}

class StatisticsHelper {
    static calculateTotalRevenue(mineurs) {
        return mineurs.reduce((sum, m) => sum + (m.totalRevenue || 0), 0);
    }

    static calculateAverageRevenue(mineurs) {
        if (mineurs.length === 0) return 0;
        return this.calculateTotalRevenue(mineurs) / mineurs.length;
    }

    static calculateMinerUtilization(locations, minerId) {
        const minerLocations = locations.filter(l => l.minerId === minerId);
        const totalMinutes = minerLocations.reduce((sum, l) => sum + l.minutesRented, 0);
        return totalMinutes / 1440; // 1440 = 24 hours * 60 minutes
    }

    static calculateAverageUtilization(locations, mineurs) {
        if (mineurs.length === 0) return 0;
        const utilizations = mineurs.map(m => 
            this.calculateMinerUtilization(locations, m.id)
        );
        return utilizations.reduce((sum, u) => sum + u, 0) / mineurs.length;
    }

    static calculateDailyRevenue(locations, date = new Date()) {
        const dateStr = date.toLocaleDateString('fr-FR');
        return locations
            .filter(l => l.status === 'completed' && new Date(l.startTime).toLocaleDateString('fr-FR') === dateStr)
            .reduce((sum, l) => sum + (l.satsPaid || 0), 0);
    }

    static calculateMinerRevenue(locations, minerId) {
        return locations
            .filter(l => l.minerId === minerId && l.status === 'completed')
            .reduce((sum, l) => sum + (l.satsPaid || 0), 0);
    }

    static getRevenueByDay(locations, days = 30) {
        const data = {};
        const now = new Date();
        
        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('fr-FR');
            data[dateStr] = this.calculateDailyRevenue(locations, date);
        }
        
        return data;
    }

    static getRevenueByMiner(locations, mineurs) {
        const data = {};
        mineurs.forEach(m => {
            data[m.name] = this.calculateMinerRevenue(locations, m.id);
        });
        return data;
    }

    static getUtilizationByMiner(locations, mineurs) {
        const data = {};
        mineurs.forEach(m => {
            data[m.name] = this.calculateMinerUtilization(locations, m.id);
        });
        return data;
    }

    static getTopMiners(locations, mineurs, limit = 5) {
        return mineurs
            .map(m => ({
                ...m,
                revenue: this.calculateMinerRevenue(locations, m.id)
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);
    }

    static calculateRentalStats(rental) {
        return {
            duration: rental.minutesRented,
            cost: rental.satsPaid,
            costPerMinute: Math.round(rental.satsPaid / rental.minutesRented),
            estimatedEarnings: Math.floor(Math.random() * 10000)
        };
    }
}

class DateHelper {
    static isToday(timestamp) {
        const date = new Date(timestamp);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    static isThisMonth(timestamp) {
        const date = new Date(timestamp);
        const today = new Date();
        return date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
    }

    static isThisYear(timestamp) {
        return new Date(timestamp).getFullYear() === new Date().getFullYear();
    }

    static getDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.getTime();
    }

    static getHoursAgo(hours) {
        const date = new Date();
        date.setHours(date.getHours() - hours);
        return date.getTime();
    }

    static getMinutesAgo(minutes) {
        const date = new Date();
        date.setMinutes(date.getMinutes() - minutes);
        return date.getTime();
    }
}

class NotificationHelper {
    static showSuccess(message, duration = 3000) {
        this._showNotification(message, 'success', duration);
    }

    static showError(message, duration = 3000) {
        this._showNotification(message, 'error', duration);
    }

    static showInfo(message, duration = 3000) {
        this._showNotification(message, 'info', duration);
    }

    static _showNotification(message, type, duration) {
        const el = document.createElement('div');
        el.className = `notification notification-${type}`;
        el.textContent = message;
        el.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 6px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(el);
        
        setTimeout(() => {
            el.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => el.remove(), 300);
        }, duration);
    }
}

// Add styles for notifications
if (!document.querySelector('style[data-notifications]')) {
    const style = document.createElement('style');
    style.setAttribute('data-notifications', '');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Export for use
window.BitaxeHelpers = {
    LocalStorage: LocalStorageManager,
    Format: FormatHelper,
    Validation: ValidationHelper,
    Statistics: StatisticsHelper,
    Date: DateHelper,
    Notification: NotificationHelper
};
