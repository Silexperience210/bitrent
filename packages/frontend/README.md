# ⚡ BitRent - Bitaxe Mining Rental System with NWC

Un système complet de location de mineurs Bitaxe avec paiement en Lightning (NWC) et facturation à la minute.

## 🎯 Caractéristiques

### Dashboard Administrateur (admin.html)
- **Gestion des Mineurs**: Ajouter, modifier, supprimer 10 Bitaxe
- **Locations Actives**: Visualiser et gérer les rentals en cours
- **Historique**: Toutes les locations complétées avec statistiques
- **Tableau de Bord**: Stats en temps réel (mineurs, revenus, utilisation)
- **Paramètres**: Configuration NWC, tarification, historique paiements
- **Graphiques**: Revenu par jour, par mineur, taux utilisation

### Marketplace Client (client.html)
- **Mineurs Disponibles**: Liste attractive avec filtres (hashrate, prix)
- **Processus de Location**: Sélection durée → Génération QR → Paiement
- **Interface de Mineur Loué**: Dashboard temps réel avec timer décompte
- **Prolongation**: Option pour étendre la location
- **Historique**: Tous les rentals passés avec gains estimés

### Système de Paiement NWC
- Configuration NWC Connection String
- Génération d'invoices Lightning
- QR codes interactifs pour les paiements
- Vérification de paiement (polling)
- Historique complet des paiements

### Stockage Persistant
- localStorage pour toutes les données
- Export/Import JSON complet
- Sauvegarde mineurs, locations, paiements

## 🚀 Démarrage Rapide

### Mode Démo (Défaut)
```bash
# Ouvrir en local
open admin.html    # Dashboard administrateur
open client.html   # Marketplace client
```

**Données de démo**: 10 Bitaxe pré-configurées, paiements simulés

### Mode Production (Avec NWC)
1. Aller dans admin.html → Paramètres
2. Entrer votre NWC Connection String
3. Cliquer "Tester Connexion"
4. Basculer depuis "Mode: DÉMO" vers "Mode: RÉEL"

## 📋 Architecture

```
bitaxe-renting/
├── admin.html              # Dashboard administrateur (1500+ lignes)
├── client.html             # Marketplace + interface client (1500+ lignes)
├── libs/
│   ├── helpers.js          # Utilitaires partagés (localStorage, formatting, stats)
│   ├── nwc.js              # Intégration NWC (invoices, payments)
│   └── bitaxe.js           # API Bitaxe + gestion rentals
├── README.md               # Cette documentation
└── index.html              # Page d'accueil (optionnel)
```

## 🎮 Utilisation

### Pour l'Administrateur

#### 1. Gérer les Mineurs
```
Onglet "Mineurs"
├── Voir liste des 10 Bitaxe
├── Nom, IP, Hashrate, Prix/min, Revenu
├── Ajouter un nouveau mineur
├── Modifier prix ou specs
└── Supprimer un mineur
```

#### 2. Voir les Locations Actives
```
Onglet "Locations Actives"
├── Tableau des rentals en cours
├── Client, mineur, durée restante
├── Sats/minute et revenu total
└── Bouton pour arrêter manuellement
```

#### 3. Analyser l'Historique
```
Onglet "Historique"
├── Toutes les locations complétées
├── Graphique revenu par jour (30j)
├── Graphique revenu par mineur
├── Filtrer par mineur
└── Export données
```

#### 4. Consulter Statistiques
```
Onglet "Statistiques"
├── Mineurs actifs/en location
├── Locations actives
├── Revenu aujourd'hui
├── Revenu total
├── Taux utilisation moyen
└── Graphique utilisation par mineur
```

#### 5. Configurer NWC
```
Onglet "Paramètres"
├── Entrer NWC Connection String
├── Tester la connexion
├── Définir prix par défaut
├── Voir historique paiements
├── Export/Import données
└── Réinitialiser (DANGER)
```

### Pour le Client

#### 1. Louer un Mineur
```
Marketplace
├── Filtrer par hashrate ou prix
├── Sélectionner un mineur
├── Choisir durée (5min à 24h)
├── Voir calcul du prix
├── Scannez QR code pour payer
└── Accès immédiat après paiement
```

#### 2. Accéder au Mineur Loué
```
Onglet "Mon Rental"
├── Stats en temps réel
│  ├── Hashrate, Température, Fan
│  └── Timer décompte
├── Coût total de la session
├── Bouton "Prolonger" (nouvelle location)
└── Bouton "Arrêter" (fin location)
```

#### 3. Consulter Historique
```
Onglet "Historique"
├── Tous les rentals passés
├── Durée, montant payé
├── Gains estimés générés
└── Export données
```

## 💰 Tarification et Calcul

### Formule Basique
```
Coût = Sats/minute × Durée en minutes
```

### Exemple
```
Mineur: Bitaxe 30GH/s
Prix: 50 Sats/minute
Durée: 60 minutes

Coût total = 50 × 60 = 3,000 Sats
```

### Revenus Estimés
```
Hashrate: 30 GH/s
Taux: ~5,000 Sats/GH/jour

Revenu 1h = 30 × 5000 / 24 ≈ 6,250 Sats
```

## 🔧 API Helpers

### LocalStorageManager
```javascript
// Mineurs
LocalStorage.getMiners()
LocalStorage.saveMiner(miner)
LocalStorage.deleteMiner(minerId)

// Locations
LocalStorage.getLocations()
LocalStorage.getActiveLocations()
LocalStorage.getCompletedLocations()

// Paiements
LocalStorage.getPayments()
LocalStorage.addPayment(payment)

// NWC
LocalStorage.setNWCConfig(connectionString)
LocalStorage.getNWCConfig()
```

### NWCManager
```javascript
// Connexion
await nwc.setConnectionString(connectionString)
await nwc.connect()
await nwc.disconnect()

// Invoices
const invoice = await nwc.createInvoice(amount, memo)
const verified = await nwc.verifyPayment(invoiceHash)

// Info Wallet
const balance = await nwc.getBalance()
const info = await nwc.getWalletInfo()
```

### BitaxeAPI
```javascript
// Stats mineurs
const info = await api.getMinerInfo(ip, port)
const hashrate = await api.getHashrate(ip, port)
const temp = await api.getTemperature(ip, port)

// Monitoring
api.createRealtimeStream(ip, port, onData, onError)
await api.checkMultiple(miners)

// Revenus
const earnings = api.calculateEstimatedEarnings(hashrate)
const revenue = api.estimateRentalRevenue(hashrate, satosPerMinute, minutes)
```

### StatisticsHelper
```javascript
// Revenus
Stats.calculateTotalRevenue(mineurs)
Stats.calculateDailyRevenue(locations, date)
Stats.getRevenueByDay(locations, 30)
Stats.getRevenueByMiner(locations, mineurs)

// Utilisation
Stats.calculateMinerUtilization(locations, minerId)
Stats.getUtilizationByMiner(locations, mineurs)

// Top mineurs
Stats.getTopMiners(locations, mineurs, 5)
```

## 📊 Structure des Données

### Mineur
```json
{
  "id": "bitaxe-1",
  "name": "Bitaxe 30GH/s #1",
  "ip": "192.168.1.166",
  "port": 8080,
  "hashrate": 30,
  "satsPerMinute": 50,
  "status": "libre|loue",
  "totalRevenue": 125000,
  "createdAt": 1710000000000,
  "lastOnlineCheck": 1710000000000
}
```

### Location
```json
{
  "id": "loc-123",
  "minerId": "bitaxe-1",
  "clientPubkey": "npub1xxxxxx...",
  "startTime": 1710000000000,
  "endTime": 1710005000000,
  "minutesRented": 100,
  "satsPaid": 5000,
  "invoiceHash": "lnbc5000n1p...",
  "status": "active|completed",
  "createdAt": 1710000000000
}
```

### Paiement
```json
{
  "id": "pay_xxx",
  "amount": 5000,
  "currency": "sats",
  "invoiceHash": "lnbc5000n1p...",
  "clientPubkey": "npub1xxx",
  "minerId": "bitaxe-1",
  "timestamp": 1710000000000,
  "status": "paid"
}
```

## 🎨 Design

### Couleurs
- **Primary**: #00d4ff (Cyan/Électrique)
- **Secondary**: #7c3aed (Violet)
- **Success**: #10b981 (Vert)
- **Warning**: #f97316 (Orange)
- **Error**: #ef4444 (Rouge)
- **Background**: #0f1419 (Noir/Bleu très foncé)
- **Cards**: #1a1f2e (Bleu très foncé)

### Dark Mode
- ✅ Dark mode activé par défaut
- ✅ Responsive mobile-first
- ✅ Animation fluides
- ✅ Contraste élevé

## 🔒 Sécurité

### Mode Démo
- ✅ Données stockées en localStorage
- ✅ Paiements simulés
- ✅ Pas de vraies transactions
- ✅ Parfait pour tests/démo

### Mode Production (NWC)
- ✅ NWC Connection String sécurisé
- ✅ Vérification paiement Lightning
- ✅ Authentification Nostr (optionnel)
- ✅ Chiffrement localStorage

## 📱 Responsive

- ✅ Desktop (1200px+)
- ✅ Tablet (768px - 1200px)
- ✅ Mobile (< 768px)
- ✅ Optimisé pour écrans 4"

## 🐛 Troubleshooting

### "Connexion NWC échouée"
1. Vérifier format NWC Connection String
2. Format: `nostr+walletconnect://pubkey@relay/path?secret=xxx`
3. Tester connexion wallet Lightning

### "Mineurs offline"
1. Vérifier IP et port (défaut 8080)
2. Mode démo: Les mineurs sont toujours online
3. Production: Vérifier firewall/réseau

### "Paiement non vérifié"
1. Mode démo: Vérification automatique en 2s
2. Production: Vérifier statut invoice NWC
3. Check timeout paiement (30s défaut)

## 🚀 Améliorations Futures

- [ ] Multi-location (louer plusieurs mineurs)
- [ ] Système de codes de réduction
- [ ] Rating des mineurs
- [ ] Notifications Nostr DM
- [ ] Authentification Nostr complète
- [ ] Tarification dynamique
- [ ] Bulk import mineurs (CSV)
- [ ] API publique pour partenaires
- [ ] Charts avancés avec export PDF
- [ ] Intégration pools mining

## 📞 Support

- Documentation complète en français
- Mode démo pour expérimenter
- localStorage pour persistence locale
- Export/Import données pour backup

## 📄 Licence

MIT - Libre d'utilisation et modification

---

**Créé pour le renting de Bitaxe**
⚡ Paiement Lightning | 🔐 NWC Integration | 📊 Dashboard Pro
