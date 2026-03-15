# 📖 Référence API Complète

## Table des Matières
1. [LocalStorageManager](#localstoragemanager)
2. [NWCManager](#nwcmanager)
3. [BitaxeAPI](#bitaxeapi)
4. [BitaxeMinerManager](#bitaxeminermanager)
5. [BitaxeRentalManager](#bitaxerentalmanager)
6. [Helper Classes](#helper-classes)

---

## LocalStorageManager

Gestion centralisée du localStorage pour toutes les données.

### Mineurs

#### `getMiners()`
Récupère tous les mineurs.
```javascript
const miners = LocalStorage.getMiners();
// Returns: Array<Miner>
```

#### `saveMiner(miner)`
Ajoute ou met à jour un mineur.
```javascript
const miner = {
    id: 'bitaxe-1',
    name: 'Bitaxe 30GH/s #1',
    ip: '192.168.1.166',
    port: 8080,
    hashrate: 30,
    satsPerMinute: 50,
    status: 'libre',
    totalRevenue: 125000
};
LocalStorage.saveMiner(miner);
```

#### `getMiner(id)`
Récupère un mineur par ID.
```javascript
const miner = LocalStorage.getMiner('bitaxe-1');
console.log(miner.hashrate); // 30
```

#### `deleteMiner(id)`
Supprime un mineur.
```javascript
LocalStorage.deleteMiner('bitaxe-1');
```

#### `saveMiners(minersArray)`
Remplace tous les mineurs.
```javascript
const miners = [...];
LocalStorage.saveMiners(miners);
```

### Locations

#### `getLocations()`
Récupère toutes les locations.
```javascript
const locations = LocalStorage.getLocations();
// Returns: Array<Location>
```

#### `getActiveLocations()`
Récupère uniquement les locations actives.
```javascript
const active = LocalStorage.getActiveLocations();
// Returns: Array<Location> avec status: 'active'
```

#### `getCompletedLocations()`
Récupère les locations complétées.
```javascript
const completed = LocalStorage.getCompletedLocations();
// Returns: Array<Location> avec status: 'completed'
```

#### `saveLocation(location)`
Ajoute ou met à jour une location.
```javascript
const location = {
    id: 'rental-123',
    minerId: 'bitaxe-1',
    clientPubkey: 'npub1xxx',
    startTime: 1710000000000,
    endTime: 1710003600000,
    minutesRented: 60,
    satsPaid: 3000,
    invoiceHash: 'lnbc3000n...',
    status: 'active'
};
LocalStorage.saveLocation(location);
```

#### `getLocation(id)`
Récupère une location par ID.
```javascript
const location = LocalStorage.getLocation('rental-123');
```

### Paiements

#### `getPayments()`
Récupère tout l'historique des paiements.
```javascript
const payments = LocalStorage.getPayments();
// Returns: Array<Payment>
```

#### `addPayment(payment)`
Ajoute un paiement à l'historique.
```javascript
LocalStorage.addPayment({
    amount: 3000,
    currency: 'sats',
    invoiceHash: 'lnbc3000n...',
    clientPubkey: 'npub1xxx',
    minerId: 'bitaxe-1',
    status: 'paid'
});
// Ajoute automatiquement: timestamp, id
```

### Configuration NWC

#### `setNWCConfig(connectionString)`
Enregistre la configuration NWC.
```javascript
LocalStorage.setNWCConfig('nostr+walletconnect://pubkey@relay/path?secret=xxx');
```

#### `getNWCConfig()`
Récupère la configuration NWC.
```javascript
const config = LocalStorage.getNWCConfig();
console.log(config);
```

### Tarification

#### `setDefaultPrice(price)`
Définit le prix par défaut (Sats/minute).
```javascript
LocalStorage.setDefaultPrice(50);
```

#### `getDefaultPrice()`
Récupère le prix par défaut.
```javascript
const price = LocalStorage.getDefaultPrice();
console.log(price); // 50
```

### Export/Import

#### `exportData()`
Exporte toutes les données en un objet.
```javascript
const backup = LocalStorage.exportData();
// Returns: {
//   mineurs: [...],
//   locations: [...],
//   payments: [...],
//   nwc: 'nostr+walletconnect://...',
//   defaultPrice: 50,
//   exportDate: '2024-03-15T13:30:00.000Z'
// }

// Sauvegarder en JSON
const json = JSON.stringify(backup);
```

#### `importData(data)`
Importe des données sauvegardées.
```javascript
const backup = JSON.parse(jsonString);
LocalStorage.importData(backup);
```

#### `clearAll()`
Réinitialise tout (DANGER).
```javascript
LocalStorage.clearAll(); // Supprime tout
```

---

## NWCManager

Gestion des paiements Lightning via NWC.

### Initialisation

```javascript
const nwc = new NWCManager();
nwc.setDemoMode(true); // Mode démo
nwc.setDemoMode(false); // Mode production
```

### Configuration

#### `setConnectionString(connectionString)`
Configure la connection NWC.
```javascript
nwc.setConnectionString('nostr+walletconnect://pubkey@relay/path?secret=xxx');
```

#### `connect()`
Établit la connexion au wallet.
```javascript
const result = await nwc.connect();
// Returns: { success: true, message: 'Connecté au portefeuille' }
```

#### `disconnect()`
Ferme la connexion.
```javascript
await nwc.disconnect();
```

### Invoices

#### `createInvoice(amount, memo)`
Crée une invoice Lightning.
```javascript
const invoice = await nwc.createInvoice(3000, 'Bitaxe Rental 60min');
// Returns: {
//   hash: 'lnbc3000n1p...',
//   amount: 3000,
//   memo: 'Bitaxe Rental 60min',
//   expires_at: 1710003600000,
//   created_at: 1710000000000,
//   qrData: 'lnbc3000n1p...',
//   lnurl: 'lightning:lnbc3000n1p...'
// }
```

#### `verifyPayment(invoiceHash, timeout)`
Vérifie si une invoice a été payée.
```javascript
const verified = await nwc.verifyPayment('lnbc3000n...', 30000);
// Returns: { verified: true, timestamp: 1710000000000, status: 'paid' }
// ou { verified: false } si timeout
```

### Transactions

#### `getBalance()`
Récupère le solde du wallet.
```javascript
const balance = await nwc.getBalance();
// Returns: { balance: 5000000, currency: 'sats' }
```

#### `getTransactionHistory(limit)`
Récupère l'historique des transactions.
```javascript
const history = await nwc.getTransactionHistory(100);
// Returns: Array<Transaction> (trier par date décroissante)
```

#### `recordPayment(payment)`
Enregistre un paiement.
```javascript
const recorded = await nwc.recordPayment({
    amount: 3000,
    invoiceHash: 'lnbc3000n...',
    clientPubkey: 'npub1xxx',
    minerId: 'bitaxe-1'
});
// Returns: { ...payment, id: 'pay_xxx', timestamp: 1710000000000 }
```

### Utilitaires

#### `isConnected()`
Vérifier si connecté.
```javascript
if (nwc.isConnected()) {
    console.log('Wallet connecté');
}
```

#### `setDemoMode(enabled)`
Basculer mode démo/production.
```javascript
nwc.setDemoMode(true);
```

#### `getDemoMode()`
Vérifier le mode actuel.
```javascript
if (nwc.getDemoMode()) {
    console.log('Mode démo actif');
}
```

#### `getWalletInfo()`
Récupère les infos du wallet.
```javascript
const info = await nwc.getWalletInfo();
// Returns: {
//   name: 'Alby Wallet',
//   currency: 'btc',
//   balance: 5000000,
//   supportedMethods: [...],
//   lightningAddress: 'user@getalby.com'
// }
```

---

## BitaxeAPI

Intégration avec les mineurs Bitaxe.

### Initialisation

```javascript
const api = new BitaxeAPI('http://localhost', 8080);
api.setCacheExpiry(5000); // Cache 5 secondes
```

### Récupération Stats

#### `getStatus(ip, port)`
Récupère l'état du mineur.
```javascript
const status = await api.getStatus('192.168.1.166', 8080);
```

#### `getHashrate(ip, port)`
Récupère le hashrate.
```javascript
const hashrate = await api.getHashrate('192.168.1.166', 8080);
// Returns: {
//   current: 30,
//   average: 29.8,
//   unit: 'GH/s'
// }
```

#### `getTemperature(ip, port)`
Récupère la température.
```javascript
const temp = await api.getTemperature('192.168.1.166', 8080);
// Returns: {
//   current: 45.2,
//   target: 65,
//   unit: 'Celsius',
//   fan: 65
// }
```

#### `getMinerInfo(ip, port)`
Récupère toutes les infos d'un mineur.
```javascript
const info = await api.getMinerInfo('192.168.1.166', 8080);
// Returns: {
//   ip: '192.168.1.166',
//   port: 8080,
//   online: true,
//   hashrate: 30,
//   temperature: 45.2,
//   fan: 65,
//   ...
// }
```

#### `getMiningStats(ip, port)`
Récupère les stats mining.
```javascript
const stats = await api.getMiningStats('192.168.1.166', 8080);
// Returns: {
//   difficulty: 1,
//   shares: 1000,
//   rejects: 50,
//   uptime: 86400,
//   power: 150
// }
```

#### `getLogs(ip, port, lines)`
Récupère les logs du mineur.
```javascript
const logs = await api.getLogs('192.168.1.166', 8080, 100);
// Returns: Array<string> (100 dernières lignes)
```

### Monitoring

#### `isOnline(ip, port)`
Vérifie si le mineur est online.
```javascript
const online = await api.isOnline('192.168.1.166', 8080);
// Returns: boolean
```

#### `checkMultiple(miners)`
Vérifie le statut de plusieurs mineurs.
```javascript
const results = await api.checkMultiple([
    { ip: '192.168.1.166', port: 8080 },
    { ip: '192.168.1.167', port: 8080 }
]);
// Returns: Array<MinerInfo>
```

#### `createRealtimeStream(ip, port, onData, onError)`
Stream les stats en temps réel.
```javascript
const stop = api.createRealtimeStream(
    '192.168.1.166',
    8080,
    (info) => {
        console.log(`Hashrate: ${info.hashrate} GH/s`);
    },
    (error) => {
        console.error(error);
    }
);

// Arrêter le stream
stop();
```

### Calculs

#### `calculateEstimatedEarnings(hashrate, satoshisPerGHDay)`
Estime les revenus.
```javascript
const earnings = api.calculateEstimatedEarnings(30, 5000);
// Returns: {
//   perHour: 6250,
//   perDay: 150000,
//   perMonth: 4500000,
//   perYear: 54000000
// }
```

#### `estimateRentalRevenue(hashrate, satosPerMinute, durationMinutes)`
Estime les revenus de rental.
```javascript
const revenue = api.estimateRentalRevenue(30, 50, 60);
// Returns: {
//   durationMinutes: 60,
//   costSats: 3000,
//   estimatedMinerEarnings: 180,
//   adminFee: 150
// }
```

### Cache

#### `clearCache()`
Vide le cache.
```javascript
api.clearCache();
```

#### `setCacheExpiry(ms)`
Définit la durée du cache.
```javascript
api.setCacheExpiry(10000); // 10 secondes
```

---

## BitaxeMinerManager

Gestion centralisée des mineurs.

### Initialisation

```javascript
const manager = new BitaxeMinerManager();
```

### Gestion Mineurs

#### `addMiner(id, name, ip, port, hashrate, satsPerMinute)`
Ajoute un mineur.
```javascript
manager.addMiner('bitaxe-1', 'Bitaxe 30GH/s', '192.168.1.166', 8080, 30, 50);
// Returns: Miner object
```

#### `getMiner(id)`
Récupère un mineur.
```javascript
const miner = manager.getMiner('bitaxe-1');
```

#### `getAllMiners()`
Récupère tous les mineurs.
```javascript
const all = manager.getAllMiners();
// Returns: Array<Miner>
```

#### `removeMiner(id)`
Supprime un mineur.
```javascript
manager.removeMiner('bitaxe-1');
```

### Stats

#### `updateStats(id)`
Met à jour les stats d'un mineur.
```javascript
const stats = await manager.updateStats('bitaxe-1');
```

#### `getStats(id)`
Récupère les stats d'un mineur.
```javascript
const stats = manager.getStats('bitaxe-1');
// Returns: { hashrate: 30, temperature: 45, ... }
```

#### `updateAllStats()`
Met à jour stats de tous les mineurs.
```javascript
await manager.updateAllStats();
```

#### `getMinerHealth(id)`
Récupère l'état de santé d'un mineur.
```javascript
const health = manager.getMinerHealth('bitaxe-1');
// Returns: 'healthy' | 'warning' | 'critical' | 'offline'
```

### Monitoring

#### `startMonitoring(interval)`
Démarre le monitoring automatique.
```javascript
manager.startMonitoring(10000); // Update toutes les 10s
```

#### `stopMonitoring()`
Arrête le monitoring.
```javascript
manager.stopMonitoring();
```

---

## BitaxeRentalManager

Gestion des locations.

### Initialisation

```javascript
const rentalMgr = new BitaxeRentalManager(nwc);
```

### Rentals

#### `createRental(minerId, clientPubkey, durationMinutes, satosPerMinute)`
Crée une nouvelle location.
```javascript
const { rental, invoice } = await rentalMgr.createRental(
    'bitaxe-1',
    'npub1xxx',
    60,
    50
);
// Returns: {
//   rental: { id, minerId, clientPubkey, status: 'pending', ... },
//   invoice: { hash, amount, lnurl, qrData, ... }
// }
```

#### `activateRental(rentalId)`
Active une location après paiement.
```javascript
const rental = await rentalMgr.activateRental('rental-123');
// Returns: Rental avec status: 'active'
```

#### `endRental(rentalId)`
Termine une location.
```javascript
const rental = rentalMgr.endRental('rental-123');
// Returns: Rental avec status: 'completed'
```

#### `extendRental(rentalId, additionalMinutes, satosPerMinute)`
Prolonge une location.
```javascript
const rental = rentalMgr.extendRental('rental-123', 30, 50);
// Returns: Rental mise à jour avec nouvelle durée
```

### Historique

#### `getActiveRentals()`
Récupère les locations actives.
```javascript
const active = rentalMgr.getActiveRentals();
// Returns: Array<Rental> avec status: 'active'
```

#### `getRentalHistory(minerId)`
Récupère l'historique.
```javascript
const history = rentalMgr.getRentalHistory('bitaxe-1');
// Returns: Array<Rental> complétées, triées par date
```

#### `getTotalRevenue(minerId)`
Calcule le revenu total.
```javascript
const total = rentalMgr.getTotalRevenue('bitaxe-1');
// Returns: number (Sats)
```

---

## Helper Classes

### FormatHelper

```javascript
// Sats
FormatHelper.formatSats(1000000); // "1,000,000"
FormatHelper.formatSatsShort(1000000); // "1M"

// Dates
FormatHelper.formatDateTime(timestamp); // "15/03/2024, 13:30:00"
FormatHelper.formatDate(timestamp); // "15/03/2024"
FormatHelper.formatTime(timestamp); // "13:30:00"

// Durées
FormatHelper.formatDuration(3661000); // "1h 1m 1s"
FormatHelper.formatDurationShort(3661000); // "1h"
FormatHelper.formatMinutes(90); // "1h 30m"

// Autres
FormatHelper.formatHashrate(30); // "30 GH/s"
FormatHelper.formatTemperature(45.2); // "45.2°C"
FormatHelper.formatPercentage(0.45); // "45.0%"
```

### ValidationHelper

```javascript
// Validation
ValidationHelper.isValidIP('192.168.1.166'); // true
ValidationHelper.isValidPubkey('npub1xxx'); // true
ValidationHelper.isValidNWCString('nostr+walletconnect://...'); // true
ValidationHelper.isValidHashrate(30); // true
ValidationHelper.isValidPrice(50); // true
ValidationHelper.isValidPort(8080); // true
```

### StatisticsHelper

```javascript
// Revenus
Statistics.calculateTotalRevenue(miners); // Total
Statistics.calculateDailyRevenue(locations, date); // Jour spécifique
Statistics.getRevenueByDay(locations, 30); // Derniers 30j
Statistics.getRevenueByMiner(locations, miners); // Par mineur

// Utilisation
Statistics.calculateMinerUtilization(locations, minerId); // 0-1
Statistics.getUtilizationByMiner(locations, miners); // Par mineur

// Top mineurs
Statistics.getTopMiners(locations, miners, 5); // Top 5
```

### DateHelper

```javascript
// Comparaisons
DateHelper.isToday(timestamp); // boolean
DateHelper.isThisMonth(timestamp); // boolean
DateHelper.isThisYear(timestamp); // boolean

// Calculs
DateHelper.getDaysAgo(7); // Timestamp 7 jours avant
DateHelper.getHoursAgo(2); // Timestamp 2 heures avant
DateHelper.getMinutesAgo(30); // Timestamp 30 minutes avant
```

### NotificationHelper

```javascript
NotificationHelper.showSuccess('Succès!');
NotificationHelper.showError('Erreur!');
NotificationHelper.showInfo('Info!');
// Les notifications s'affichent 3 secondes par défaut
```

---

## Types & Interfaces

### Miner
```typescript
interface Miner {
    id: string;
    name: string;
    ip: string;
    port: number;
    hashrate: number; // GH/s
    satsPerMinute: number;
    status: 'libre' | 'loue';
    totalRevenue: number; // Sats
    createdAt: number; // timestamp
    lastOnlineCheck?: number; // timestamp
}
```

### Location
```typescript
interface Location {
    id: string;
    minerId: string;
    clientPubkey: string;
    startTime: number; // timestamp
    endTime: number; // timestamp
    minutesRented: number;
    satsPaid: number;
    invoiceHash: string;
    status: 'pending' | 'active' | 'completed';
    createdAt: number;
}
```

### Invoice
```typescript
interface Invoice {
    hash: string;
    amount: number; // Sats
    memo: string;
    expires_at: number; // timestamp
    created_at: number; // timestamp
    paymentHash: string;
    lnurl: string;
    qrData: string;
}
```

### Payment
```typescript
interface Payment {
    id: string;
    amount: number; // Sats
    currency: string; // 'sats'
    invoiceHash: string;
    clientPubkey: string;
    minerId: string;
    timestamp: number;
    status: 'pending' | 'paid' | 'failed';
}
```

---

## Exemples Complets

### Exemple 1: Créer une Location Complète

```javascript
const nwc = new NWCManager();
const api = new BitaxeAPI();

// 1. Récupérer mineur disponible
const miner = LocalStorage.getMiners().find(m => m.status === 'libre');

// 2. Créer invoice
const invoice = await nwc.createInvoice(
    miner.satsPerMinute * 60,
    `Location ${miner.name} 60min`
);

// 3. Afficher QR code
new QRCode(document.getElementById('qr'), invoice.lnurl);

// 4. Attendre paiement
const verified = await nwc.verifyPayment(invoice.hash);

if (verified.verified) {
    // 5. Créer location
    const rental = {
        id: 'rental-' + Date.now(),
        minerId: miner.id,
        clientPubkey: 'npub1xxx',
        startTime: Date.now(),
        endTime: Date.now() + (60 * 60 * 1000),
        minutesRented: 60,
        satsPaid: invoice.amount,
        invoiceHash: invoice.hash,
        status: 'active'
    };
    
    // 6. Sauvegarder
    LocalStorage.saveLocation(rental);
    miner.status = 'loue';
    LocalStorage.saveMiner(miner);
    
    // 7. Enregistrer paiement
    await nwc.recordPayment({
        amount: invoice.amount,
        invoiceHash: invoice.hash,
        clientPubkey: 'npub1xxx',
        minerId: miner.id
    });
}
```

### Exemple 2: Dashboard Analytics

```javascript
const miners = LocalStorage.getMiners();
const locations = LocalStorage.getLocations();

// Revenue
const totalRevenue = Statistics.calculateTotalRevenue(miners);
const todayRevenue = Statistics.calculateDailyRevenue(locations);
const revenueByMiner = Statistics.getRevenueByMiner(locations, miners);
const revenueByDay = Statistics.getRevenueByDay(locations, 30);

// Utilization
const avgUtilization = Statistics.calculateAverageUtilization(locations, miners);
const utilizationByMiner = Statistics.getUtilizationByMiner(locations, miners);

// Top miners
const topMiners = Statistics.getTopMiners(locations, miners, 5);

console.log({
    totalRevenue,
    todayRevenue,
    revenueByMiner,
    revenueByDay,
    avgUtilization,
    utilizationByMiner,
    topMiners
});
```

---

Voir [README.md](README.md) pour plus de détails!
