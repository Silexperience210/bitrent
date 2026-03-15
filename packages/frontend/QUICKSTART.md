# ⚡ Démarrage Rapide - 5 Minutes

## 🚀 Pour les Impatients

### Installation: 0 minutes
Juste ouvrir dans un navigateur. C'est tout.

```bash
# Ouvrir dans le navigateur
file:///path/to/bitaxe-renting/index.html
```

**Pas d'installation, pas de dépendances, pas de serveur requis.**

---

## 👨‍💼 Admin: 2 Minutes

### Première Visite Admin

```
1. Cliquer sur "Admin Dashboard"
2. Onglet "Mineurs" → Voir 10 Bitaxe pré-configurés ✓
3. Onglet "Statistiques" → Voir stats en temps réel ✓
4. Onglet "Paramètres" → Entrer NWC (optionnel)

C'est prêt à fonctionner!
```

**Vous verrez:**
- ✅ 10 mineurs Bitaxe (30GH/s à 100GH/s)
- ✅ Prix de 50 à 150 Sats/minute
- ✅ Données sauvegardées localement
- ✅ Dark mode sympa

### C'est quoi que tu peux faire?

| Action | Lieu |
|--------|------|
| Ajouter/modifier/supprimer mineurs | Onglet "Mineurs" |
| Voir locations actuelles | Onglet "Locations Actives" |
| Analyser revenus | Onglet "Historique" |
| Voir graphiques | Onglet "Statistiques" |
| Configurer NWC | Onglet "Paramètres" |

---

## 🛒 Client: 2 Minutes

### Première Visite Client

```
1. Cliquer sur "Marketplace Client"
2. Voir mineurs disponibles avec prix ✓
3. Cliquer sur un mineur → "Louer Maintenant"
4. Sélectionner durée (5min à 24h)
5. Scanner QR code (mode démo: auto-approuvé)
6. Accès immédiat au mineur! ✓
```

**Processus complet = 30 secondes**

### C'est quoi que tu peux faire?

| Action | Lieu |
|--------|------|
| Voir mineurs libres | Marketplace |
| Filtrer par hashrate/prix | Marketplace |
| Louer un mineur | Cliquer "Louer Maintenant" |
| Monitorer en temps réel | Onglet "Mon Rental" |
| Prolonger location | Onglet "Mon Rental" |
| Voir historique | Onglet "Historique" |

---

## 💳 Paiement: 1 Minute

### Mode Démo (Défaut)
```
✅ Automatique - Pas de paiement réel
✅ Simule paiement après 2 secondes
✅ Parfait pour tester
```

### Mode Production (Avec NWC)
```
1. Aller admin.html → Paramètres
2. Entrer votre NWC Connection String
3. Cliquer "Tester Connexion"
4. Mode bascule: DÉMO → RÉEL

Maintenant les paiements Lightning sont vrais!
```

**NWC Connection String**: `nostr+walletconnect://pubkey@relay/path?secret=token`

---

## 📊 Données

### Où sont stockées?
```
localStorage (navigateur)
│
├── bitaxe-demo-mineurs      (10 Bitaxe)
├── bitaxe-demo-locations    (rentals)
├── bitaxe-payments-history  (paiements)
├── bitaxe-nwc-config        (NWC string)
└── bitaxe-default-price     (prix défaut)
```

### Backup
```javascript
// Admin Dashboard → Paramètres → Exporter Données
// Télécharge un fichier JSON avec TOUT

// Pour importer:
// Admin Dashboard → Paramètres → Importer Données
```

---

## ⚙️ Configuration

### Ajouter un Mineur
```
Admin → Mineurs → "+ Ajouter un Mineur"

Remplir:
- Nom: "Bitaxe 100GH/s #1"
- IP: 192.168.1.180
- Port: 8080 (défaut)
- Hashrate: 100
- Prix: 150 (Sats/min)

→ Enregistrer
```

### Configurer NWC
```
Admin → Paramètres → Configuration NWC

Entrer:
nostr+walletconnect://pubkey@relay/secret

→ Tester Connexion
```

### Changer Tarification
```
Admin → Paramètres → Tarification

Prix par défaut: 50 Sats/minute

→ Enregistrer
```

---

## 🎯 Cas d'Utilisation Rapides

### Cas 1: "Je veux juste tester"
```
1. Ouvrir index.html → Admin Dashboard
2. C'est déjà prêt avec 10 mineurs de test
3. Pas de configuration nécessaire
```

### Cas 2: "Je veux louer un mineur"
```
1. Ouvrir index.html → Marketplace Client
2. Voir 5 mineurs disponibles (25-100 GH/s)
3. Cliquer "Louer Maintenant"
4. Sélectionner 60 minutes
5. Payer 3,000 Sats (en Lightning)
6. Mining pendant 1 heure
```

### Cas 3: "Je veux louer mes mineurs"
```
1. Admin → Mineurs → Ajouter vos 10 Bitaxe
2. Paramètres → Entrer NWC Connection String
3. Mode passe à RÉEL
4. Clients loueront vos mineurs et paiement = Lightning
```

### Cas 4: "Je veux analytics"
```
1. Admin → Historique → Voir revenu 30 jours
2. Admin → Statistiques → Dashboard complet
3. Graphiques:
   - Revenu par jour
   - Revenu par mineur
   - Taux utilisation
```

---

## 🔧 Troubleshooting

### "Page blanche"
- Vérifier chemin du fichier
- Actualiser le navigateur (F5)
- Essayer autre navigateur

### "Les mineurs sont offline"
- **Mode démo**: Ignore, simulé
- **Mode réel**: Vérifier IP/port des mineurs
- Vérifier firewall/réseau

### "Données disparues"
- localStorage peut se vider
- **Solution**: Export régulièrement (Paramètres → Exporter)
- Ou restaurer depuis backup

### "Paiement pas reçu"
- Mode démo: Approuvé automatique après 2s
- Mode réel: Vérifier invoice Lightning
- Timeout par défaut = 30 secondes

---

## 📱 Mobile?

**Oui, c'est responsive!**

```
✅ Admin: Ok sur tablet, compact sur phone
✅ Client: Mobile-first, tactile-friendly
✅ Paiement: QR code parfait pour scaner
```

---

## 🎓 Apprendre Plus

### Pour les Admins
👉 [GUIDE.md](GUIDE.md) - Cas d'usage détaillés

### Pour les Developers
👉 [API.md](API.md) - Référence complète (fichier à créer)

### Pour la Documentation Complète
👉 [README.md](README.md) - Architecture, features, API

---

## ✨ Points Clés

| Point | Détail |
|-------|--------|
| **Installation** | 0 min - Juste ouvrir HTML |
| **Setup Admin** | 2 min - Prêt avec données démo |
| **Setup Client** | 1 min - Louer immédiatement |
| **Paiement** | Mode démo auto + NWC optionnel |
| **Données** | localStorage + Export/Import |
| **Support** | Dark mode + Responsive + Offline |

---

## 🚀 Premier Démarrage

```
1. Ouvrir index.html dans navigateur
2. Cliquer "Admin Dashboard"
3. Onglet "Mineurs" → Voir les 10 Bitaxe ✓
4. Onglet "Statistiques" → Voir stats ✓
5. Revenir index.html → "Marketplace Client"
6. Cliquer sur un mineur → "Louer Maintenant" ✓
7. Sélectionner 30 minutes
8. Cliquer "Générer Invoice" ✓
9. QR code s'affiche → Approuvé automatique (démo)
10. Onglet "Mon Rental" → Mining en cours! ✓
```

**Durée totale: ~2 minutes de jeu complet**

---

## 💡 Tips

- Mode démo = Parfait pour démo/présentation
- NWC = Pour production/paiements réels
- Données = Sauvegardées auto en localStorage
- Export = Avant tout changement majeur
- Dark mode = Déjà activé par défaut

---

## 🎉 C'est Prêt!

```bash
Ouvrir dans navigateur:
file:///path/to/bitaxe-renting/index.html

Puis:
✅ Admin → admin.html
✅ Client → client.html
✅ Docs → README.md ou GUIDE.md
```

**Enjoy! ⚡**
