/**
 * Bitaxe Renting - NWC (Nostr Wallet Connect) Integration
 * Handles invoice generation, payment verification, and wallet operations
 */

class NWCManager {
    constructor() {
        this.connectionString = null;
        this.connected = false;
        this.demoMode = true; // Default to demo mode
        this.loadConfig();
    }

    loadConfig() {
        const stored = localStorage.getItem('bitaxe-nwc-config');
        if (stored) {
            this.connectionString = stored;
        }
    }

    setConnectionString(connectionString) {
        if (!this._validateNWCString(connectionString)) {
            throw new Error('Format NWC invalide');
        }
        this.connectionString = connectionString;
        localStorage.setItem('bitaxe-nwc-config', connectionString);
        this.connected = false;
        return this;
    }

    _validateNWCString(str) {
        return str && str.startsWith('nostr+walletconnect://');
    }

    async connect() {
        if (this.demoMode) {
            this.connected = true;
            return { success: true, message: 'Connexion démo établie' };
        }

        if (!this.connectionString) {
            throw new Error('Aucune connection string configurée');
        }

        try {
            // In production, this would establish actual NWC connection
            // For now, simulate connection
            this.connected = true;
            return { success: true, message: 'Connecté au portefeuille' };
        } catch (err) {
            this.connected = false;
            throw new Error('Erreur de connexion: ' + err.message);
        }
    }

    async disconnect() {
        this.connected = false;
        return { success: true };
    }

    async getBalance() {
        if (!this.connected && !this.demoMode) {
            throw new Error('Portefeuille non connecté');
        }

        if (this.demoMode) {
            // Return simulated balance
            return {
                balance: 5000000, // 5M sats
                currency: 'sats'
            };
        }

        // Production: call NWC balance endpoint
        try {
            // Would call actual NWC balance method
            return {
                balance: 5000000,
                currency: 'sats'
            };
        } catch (err) {
            throw new Error('Erreur de récupération du solde: ' + err.message);
        }
    }

    async createInvoice(amount, memo = '') {
        if (!this.connected && !this.demoMode) {
            throw new Error('Portefeuille non connecté');
        }

        const invoice = {
            amount: Math.floor(amount),
            memo: memo,
            expiry: 3600, // 1 hour
            timestamp: Date.now()
        };

        if (this.demoMode) {
            // Generate demo invoice
            return this._generateDemoInvoice(invoice);
        }

        // Production: create invoice via NWC
        try {
            // Would call actual NWC create invoice method
            return this._generateDemoInvoice(invoice);
        } catch (err) {
            throw new Error('Erreur création invoice: ' + err.message);
        }
    }

    _generateDemoInvoice(invoice) {
        const hash = 'lnbc' + invoice.amount + 'n' + 
                    Math.random().toString(36).substr(2, 50).toUpperCase();
        
        return {
            hash: hash,
            amount: invoice.amount,
            memo: invoice.memo,
            expires_at: invoice.timestamp + (invoice.expiry * 1000),
            created_at: invoice.timestamp,
            paymentHash: 'pay_' + Date.now(),
            lnurl: 'lightning:' + hash,
            qrData: hash
        };
    }

    async verifyPayment(invoiceHash, timeout = 30000) {
        if (this.demoMode) {
            // Simulate payment verification
            return this._simulatePaymentVerification(invoiceHash, timeout);
        }

        // Production: verify payment via NWC
        try {
            const startTime = Date.now();
            while (Date.now() - startTime < timeout) {
                // Check payment status
                // This would poll NWC for payment status
                await this._sleep(1000);
            }
            return { verified: false };
        } catch (err) {
            throw new Error('Erreur vérification paiement: ' + err.message);
        }
    }

    _simulatePaymentVerification(invoiceHash, timeout) {
        return new Promise((resolve) => {
            const verificationTime = Math.random() * timeout;
            setTimeout(() => {
                resolve({
                    verified: true,
                    timestamp: Date.now(),
                    paymentHash: invoiceHash,
                    status: 'paid'
                });
            }, Math.min(verificationTime, timeout));
        });
    }

    async sendPayment(invoice) {
        if (!this.connected && !this.demoMode) {
            throw new Error('Portefeuille non connecté');
        }

        if (this.demoMode) {
            // Simulate sending payment
            return this._simulateSendPayment(invoice);
        }

        // Production: send payment via NWC
        try {
            // Would call actual NWC pay invoice method
            return this._simulateSendPayment(invoice);
        } catch (err) {
            throw new Error('Erreur envoi paiement: ' + err.message);
        }
    }

    _simulateSendPayment(invoice) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    preimage: 'preimage_' + Math.random().toString(36).substr(2),
                    timestamp: Date.now()
                });
            }, 2000); // 2 second simulation
        });
    }

    async getTransactionHistory(limit = 100) {
        const stored = localStorage.getItem('bitaxe-payments-history');
        const payments = stored ? JSON.parse(stored) : [];
        
        return payments.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }

    async recordPayment(payment) {
        const history = await this.getTransactionHistory(1000);
        history.push({
            ...payment,
            timestamp: Date.now(),
            id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        });
        localStorage.setItem('bitaxe-payments-history', JSON.stringify(history));
        return history[history.length - 1];
    }

    isConnected() {
        return this.connected;
    }

    setDemoMode(enabled) {
        this.demoMode = enabled;
        if (enabled) {
            this.connected = true;
        }
    }

    getDemoMode() {
        return this.demoMode;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper to generate LNURL for dynamic invoices
    generateLNURL(baseUrl, customData = {}) {
        const params = new URLSearchParams({
            ...customData,
            timestamp: Date.now()
        });
        return `${baseUrl}?${params.toString()}`;
    }

    // Parse NWC connection string to extract details
    parseConnectionString(nwcString) {
        try {
            const url = new URL(nwcString);
            return {
                protocol: url.protocol,
                pubkey: url.hostname,
                relay: url.pathname.split('/')[1],
                secret: url.searchParams.get('secret')
            };
        } catch (err) {
            throw new Error('Format de connection string invalide');
        }
    }

    // Get wallet info from NWC
    async getWalletInfo() {
        if (this.demoMode) {
            return {
                name: 'Demo Wallet',
                currency: 'btc',
                balance: 5000000,
                supportedMethods: ['pay_invoice', 'get_balance', 'make_invoice'],
                lightningAddress: 'demo@bitaxe.local'
            };
        }

        try {
            // Production: fetch wallet info from NWC
            return {
                name: 'NWC Wallet',
                currency: 'btc',
                balance: await this.getBalance(),
                supportedMethods: ['pay_invoice', 'get_balance', 'make_invoice']
            };
        } catch (err) {
            throw new Error('Erreur récupération infos wallet: ' + err.message);
        }
    }

    // Calculate fees for a payment
    calculateFee(amount, feePercentage = 0.01) {
        return Math.ceil(amount * feePercentage);
    }

    // Format invoice for display
    formatInvoice(invoice) {
        return {
            amount: invoice.amount,
            memo: invoice.memo || 'Paiement Bitaxe Renting',
            expires: new Date(invoice.expires_at).toLocaleString('fr-FR'),
            qrCode: invoice.qrData,
            paymentHash: invoice.paymentHash
        };
    }
}

// Create global instance
const nwc = new NWCManager();

// Export
window.NWCManager = NWCManager;
window.nwc = nwc;
