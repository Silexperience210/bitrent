# 📚 Guide d'Utilisation Complet

## Table des Matières
1. [Démarrage Rapide](#démarrage-rapide)
2. [Cas d'Usage Admin](#cas-dusage-admin)
3. [Cas d'Usage Client](#cas-dusage-client)
4. [Exemples de Code](#exemples-de-code)
5. [Intégration NWC](#intégration-nwc)
6. [API Bitaxe](#api-bitaxe)
7. [Problèmes Courants](#problèmes-courants)

## Démarrage Rapide

### 1️⃣ Première Visite

Ouvrir dans un navigateur:
```
file:///path/to/bitaxe-renting/index.html
```

Vous verrez:
- Page d'accueil avec aperçu
- Liens vers Admin et Client
- Bouton pour accéder à la documentation

### 2️⃣ Mode Démo

**Complètement fonctionnel sans configuration:**
- ✅ 10 mineurs pré-configurés
- ✅ Données stockées en localStorage
- ✅ Paiements simulés automatiquement
- ✅ Pas d'internet requis

### 3️⃣ Basculer vers NWC

Quand vous avez une NWC Connection String:

```
1. Aller admin.html → Paramètres
2. Entrer votre connection string: nostr+walletconnect://...
3. Cliquer "Tester Connexion"
4. Mode basculera automatiquement de DÉMO → RÉEL
```

---

## Cas d'Usage Admin

### Scénario 1: Ajouter un Nouveau Mineur

**Situation**: Vous avez un nouveau Bitaxe 100GH/s à 192.168.1.180

**Étapes:**

```
1. Onglet "Mineurs"
2. Cliquer "+ Ajouter un Mineur"
3. Remplir le formulaire:
   - Nom: "Bitaxe 100GH/s Premium"
   - IP: 192.168.1.180
   - Port: 8080
   - Hashrate: 100
   - Prix: 150 Sats/min
4. Cliquer "Enregistrer"
```

**Résultat**: Le mineur apparaît immédiatement dans la liste, statut "Libre"

### Scénario 2: Réduire le Prix d'un Mineur

**Situation**: Mineur "Bitaxe-3" (100GH/s) trop cher, passez de 150 → 120 Sats/min

**Étapes:**

```
1. Onglet "Mineurs"
2. Cliquer "Modifier" sur Bitaxe-3
3. Changer prix de 150 → 120
4. Cliquer "Enregistrer"
```

**Résultat**: Nouveau prix s'affiche immédiatement, clients verront prix réduit

### Scénario 3: Analyser Revenu par Mineur

**Situation**: Vérifier quel mineur génère le plus de revenu

**Étapes:**

```
1. Onglet "Historique"
2. Voir graphique "Revenu par Mineur"
3. Ou filtrer par mineur spécifique
```

**Résultat**: Voir les revenus cumulés par mineur (graphique + tableau)

### Scénario 4: Gérer une Location Problématique

**Situation**: Client "npub1xxx" a loué Bitaxe-5 il y a 3h mais veut l'arrêter tôt

**Étapes:**

```
1. Onglet "Locations Actives"
2. Trouver la location du client
3. Cliquer "Arrêter"
4. Location marquée "Complétée"
5. Mineur redevient "Libre"
```

**Résultat**: Location terminée, revenu enregistré

### Scénario 5: Configurer NWC pour Vrais Paiements

**Situation**: Passer du mode démo aux vrais paiements Lightning

**Étapes:**

```
1. Onglet "Paramètres"
2. Dans "Configuration NWC":
   - Entrer: nostr+walletconnect://pubkey@relay/path?secret=xxx
3. Cliquer "Tester Connexion"
4. Voir message: "✓ Configuration NWC enregistrée"
5. En haut, mode change de "DÉMO" → "RÉEL"
```

**Résultat**: Les vrais paiements Lightning sont maintenant actifs

---

## Cas d'Usage Client

### Scénario 1: Louer un Mineur pour la Première Fois

**Situation**: Vous voulez miner 60 minutes sur un Bitaxe 30GH/s

**Étapes:**

```
Marketplace
1. Voir liste des mineurs libres
2. Cliquer sur "Bitaxe 30GH/s #1"
   (ou cliquer "Louer Maintenant")
3. Sélectionner durée: 60 min
4. Voir calcul: 50 Sats/min × 60 = 3,000 Sats
5. Cliquer "Générer Invoice"
6. QR code s'affiche
7. Scannez avec portefeuille Lightning
8. Payez l'invoice
```

**Résultat**: 
- ✅ Paiement confirmé
- ✅ Mineur loué pour 60 minutes
- ✅ Accès immédiat à "Mon Rental"

### Scénario 2: Monitorer le Mineur en Temps Réel

**Situation**: Vous regardez vos stats pendant qu'il mine

**Étapes:**

```
Onglet "Mon Rental"
1. Voir le mineur que vous louez
2. Timer compte à rebours: "01:23:45" (1h23min45s)
3. Stats en temps réel:
   - Hashrate: 30 GH/s
   - Température: 42°C
   - Fan: 65%
4. Coût total: 3,000 Sats
```

**Résultat**: Monitoring continu jusqu'à fin de location

### Scénario 3: Prolonger une Location

**Situation**: Votre location se termine dans 5 minutes, vous voulez 30 min supplémentaires

**Étapes:**

```
Onglet "Mon Rental"
1. Cliquer "➕ Prolonger la Location"
2. Va retour à Marketplace
3. Votre mineur apparaît INDISPONIBLE (statut "Loué")
4. Sélectionner 30 minutes supplémentaires
5. Coût: 50 × 30 = 1,500 Sats
6. Générer invoice et payer
```

**Résultat**: Location prolongée, timer remis à 30 min

### Scénario 4: Terminer une Location

**Situation**: Vous avez fini vos calculs, veut arrêter

**Étapes:**

```
Onglet "Mon Rental"
1. Cliquer "Arrêter la Location"
2. Location marquée "Complétée"
3. Mineur redevient "Libre"
4. Aller à "Historique" pour voir détails
```

**Résultat**: 
- ✅ Location terminée
- ✅ Revenu calculé (montant payé)
- ✅ Présent dans historique

### Scénario 5: Consulter Gains Passés

**Situation**: Vérifier vos locations précédentes et gains

**Étapes:**

```
Onglet "Historique"
1. Voir tableau de toutes les locations
   - Mineur loué
   - Dates début/fin
   - Durée
   - Montant payé
   - Gains estimés
2. Voir dernières locations en premier
```

**Résultat**: Aperçu complet de vos rentals

---

## Exemples de Code

### Exemple 1: Accéder aux Mineurs

```javascript
// Récupérer tous les mineurs
const miners = LocalStorage.getMiners();
console.log(miners); // Array de mineurs

// Récupérer un mineur spécifique
const miner = LocalStorage.getMiner('bitaxe-1');
console.log(miner.hashrate); // 30

// Obtenir les mineurs libres
const available = miners.filter(m => m.status === 'libre');
console.log(available.length); // Nombre de mineurs libres
```

### Exemple 2: Créer une Location

```javascript
// Créer une nouvelle location
const rental = {
    id: 'rental-' + Date.now(),
    minerId: 'bitaxe-1',
    clientPubkey: 'npub1xxx',
    startTime: Date.now(),
    endTime: Date.now() + (60 * 60 * 1000), // +60 minutes
    minutesRented: 60,
    satsPaid: 50 * 60, // 3,000 Sats
    invoiceHash: 'lnbc3000n...',
    status: 'active'
};

// Enregistrer
LocalStorage.saveLocation(rental);

// Mettre à jour statut du mineur
const miner = LocalStorage.getMiner('bitaxe-1');
miner.status = 'loue';
LocalStorage.saveMiner(miner);
```

### Exemple 3: Calculer les Statistiques

```javascript
// Revenu total
const stats = Statistics.calculateTotalRevenue(miners);
console.log(stats); // 2,500,000 Sats

// Revenu aujourd'hui
const today = new Date();
const dailyRevenue = Statistics.calculateDailyRevenue(locations, today);
console.log(dailyRevenue); // 125,000 Sats

// Revenu par mineur
const minerRevenues = Statistics.getRevenueByMiner(locations, miners);
console.log(minerRevenues);
// {
//   "Bitaxe 30GH/s #1": 250000,
//   "Bitaxe 100GH/s": 500000,
//   ...
// }

// Taux utilisation
const utilization = Statistics.getUtilizationByMiner(locations, miners);
console.log(utilization);
// {
//   "Bitaxe 1": 0.45, // 45% utilisé
//   "Bitaxe 2": 0.12, // 12% utilisé
// }
```

### Exemple 4: Récupérer Stats Bitaxe

```javascript
const api = new BitaxeAPI();

// Infos complètes d'un mineur
const info = await api.getMinerInfo('192.168.1.166', 8080);
console.log(info);
// {
//   ip: '192.168.1.166',
//   online: true,
//   hashrate: 30,
//   temperature: 45.2,
//   fan: 65,
//   ...
// }

// Hashrate uniquement
const hashrate = await api.getHashrate('192.168.1.166', 8080);
console.log(hashrate); // { current: 30, average: 29.8, unit: 'GH/s' }

// Température
const temp = await api.getTemperature('192.168.1.166', 8080);
console.log(temp); // { current: 45.2, target: 65, fan: 65 }

// Revenus estimés
const earnings = api.calculateEstimatedEarnings(30); // 30 GH/s
console.log(earnings);
// {
//   perHour: 6250,
//   perDay: 150000,
//   perMonth: 4500000,
//   perYear: 54000000
// }
```

### Exemple 5: Gestion NWC

```javascript
// Initialiser NWC en mode démo
nwc.setDemoMode(true);

// Créer une invoice
const invoice = await nwc.createInvoice(3000, 'Bitaxe Rental 60min');
console.log(invoice);
// {
//   hash: 'lnbc3000n1p...',
//   amount: 3000,
//   memo: 'Bitaxe Rental 60min',
//   expires_at: 1710003600000,
//   lnurl: 'lightning:lnbc3000n1p...',
//   qrData: 'lnbc3000n1p...'
// }

// Afficher QR code
new QRCode(document.getElementById('qr-container'), invoice.lnurl);

// Vérifier paiement (mode démo: automatique)
const verified = await nwc.verifyPayment(invoice.hash);
console.log(verified.verified); // true

// Enregistrer le paiement
await nwc.recordPayment({
    amount: 3000,
    invoiceHash: invoice.hash,
    clientPubkey: 'npub1xxx',
    minerId: 'bitaxe-1'
});
```

### Exemple 6: Export/Import Données

```javascript
// Exporter toutes les données
const allData = LocalStorage.exportData();
console.log(allData);
// {
//   mineurs: [...],
//   locations: [...],
//   payments: [...],
//   nwc: 'nostr+walletconnect://...',
//   defaultPrice: 50,
//   exportDate: '2024-03-15T13:30:00.000Z'
// }

// Sauvegarder en JSON
const jsonString = JSON.stringify(allData, null, 2);
// Télécharger le fichier...

// Importer les données
const importedData = JSON.parse(jsonString);
LocalStorage.importData(importedData);
```

---

## Intégration NWC

### Configuration NWC

1. **Créer une NWC Connection String**

   Depuis votre portefeuille Nostr (ex: Alby):
   ```
   nostr+walletconnect://pubkey@relay/path?secret=token
   ```

2. **Tester la Connexion**

   ```javascript
   nwc.setConnectionString('nostr+walletconnect://...');
   const result = await nwc.connect();
   console.log(result); // { success: true, message: 'Connecté au portefeuille' }
   ```

3. **Vérifier Balance**

   ```javascript
   const balance = await nwc.getBalance();
   console.log(balance); // { balance: 5000000, currency: 'sats' }
   ```

### Paiement Complet

```javascript
// 1. Créer invoice
const invoice = await nwc.createInvoice(3000, 'Location Bitaxe');

// 2. Afficher QR code
new QRCode(qrContainer, invoice.lnurl);

// 3. Attendre paiement
const verified = await nwc.verifyPayment(invoice.hash, 30000); // timeout 30s

// 4. Si payé, activer location
if (verified.verified) {
    // Créer location dans système
    const rental = {...};
    LocalStorage.saveLocation(rental);
}
```

---

## API Bitaxe

### Endpoints Utilisés

```javascript
// GET /api/system/info
// → Infos générales du mineur
const response = await fetch('http://192.168.1.166:8080/api/system/info');

// GET /api/system/metrics
// → Hashrate, température, consommation
const response = await fetch('http://192.168.1.166:8080/api/system/metrics');

// GET /api/miner/stats
// → Stats mining (difficultés, shares, rejects)
const response = await fetch('http://192.168.1.166:8080/api/miner/stats');

// GET /api/logs?lines=100
// → Derniers logs (100 lignes)
const response = await fetch('http://192.168.1.166:8080/api/logs?lines=100');
```

### Exemple Complet

```javascript
// Monitorer un mineur en continu
const api = new BitaxeAPI();
const stopStream = api.createRealtimeStream(
    '192.168.1.166',
    8080,
    (info) => {
        console.log(`Hashrate: ${info.hashrate} GH/s`);
        console.log(`Temp: ${info.temperature}°C`);
        console.log(`Online: ${info.online}`);
    },
    (error) => {
        console.error('Erreur:', error.message);
    }
);

// Arrêter le stream après 5 minutes
setTimeout(stopStream, 5 * 60 * 1000);
```

---

## Problèmes Courants

### ❌ "Mineurs offline"

**Cause**: API API Bitaxe inaccessible

**Solutions**:
1. Vérifier IP correcte: `ping 192.168.1.166`
2. Vérifier port (défaut 8080): `http://192.168.1.166:8080`
3. Mode démo: Ignorer, simulé automatiquement

### ❌ "NWC Connection échouée"

**Cause**: Connection string invalide

**Vérifier**:
```javascript
// Format correct?
const str = 'nostr+walletconnect://pubkey@relay/path?secret=token';
console.log(str.startsWith('nostr+walletconnect://')); // true

// Parser la string
const parsed = nwc.parseConnectionString(str);
console.log(parsed);
```

### ❌ "Paiement non vérifié après 30s"

**Cause**: Invoice pas payée à temps

**Solutions**:
1. Vérifier que l'invoice s'affiche correctement
2. Scannez bien le QR code avec le portefeuille Lightning
3. Attendez confirmation du paiement
4. Mode démo: Vérification auto en 2 secondes

### ❌ "Données perdues après refresh"

**Cause**: localStorage désactivé ou plein

**Solutions**:
```javascript
// Vérifier localStorage
console.log(localStorage.length); // Nombre d'items

// Exporter avant de perdre
const backup = LocalStorage.exportData();
// Sauvegarder le JSON quelque part

// Importer après problème
LocalStorage.importData(backup);
```

### ❌ "Mineur reste "Loué" après expiration"

**Cause**: Pas de mise à jour automatique (mode démo)

**Solution**:
```javascript
// Arrêter manuellement via Admin
// Onglet "Locations Actives" → Bouton "Arrêter"

// Ou via code
const rental = LocalStorage.getLocation(rentalId);
rental.status = 'completed';
LocalStorage.saveLocation(rental);

const miner = LocalStorage.getMiner(rental.minerId);
miner.status = 'libre';
LocalStorage.saveMiner(miner);
```

---

## Tips & Tricks

### 💡 Accélerer Tests en Mode Démo

```javascript
// Créer une rental très courte (5 minutes)
selectDuration(5); // 5 minutes

// Alors que vous testez, modifier le timer
const rental = LocalStorage.getActiveLocations()[0];
rental.endTime = Date.now() + 10000; // 10 secondes au lieu de 5 min
LocalStorage.saveLocation(rental);
```

### 💡 Générer Données de Test

```javascript
// Créer plusieurs locations de test
const miners = LocalStorage.getMiners();
miners.forEach(miner => {
    const rental = {
        id: 'test-' + miner.id,
        minerId: miner.id,
        clientPubkey: 'npub1test',
        startTime: Date.now() - Math.random() * 86400000, // Random dernier 24h
        endTime: Date.now(),
        minutesRented: Math.floor(Math.random() * 240),
        satsPaid: Math.floor(Math.random() * 10000),
        status: 'completed'
    };
    LocalStorage.saveLocation(rental);
});
```

### 💡 Backup Régulier

```javascript
// Backup quotidien automatique
function createDailyBackup() {
    const backup = LocalStorage.exportData();
    const date = new Date().toISOString().split('T')[0];
    const key = 'backup-' + date;
    localStorage.setItem(key, JSON.stringify(backup));
}

// Exécuter chaque jour
setInterval(createDailyBackup, 24 * 60 * 60 * 1000);
```

---

## Questions?

Consultez:
- 📖 **README.md** - Vue d'ensemble et architecture
- 🎯 **admin.html** - Code complète du dashboard admin
- 🛒 **client.html** - Code complète du marketplace client
- 📚 **libs/helpers.js** - Helpers et utilitaires
- 🔐 **libs/nwc.js** - Intégration NWC complète
- ⚡ **libs/bitaxe.js** - Gestion mineurs et rentals

Bon renting! 🚀
