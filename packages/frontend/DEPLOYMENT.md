# 🚀 Guide de Déploiement

## Table des Matières
1. [Déploiement Local](#déploiement-local)
2. [Déploiement Web](#déploiement-web)
3. [Docker](#docker)
4. [Configuration Production](#configuration-production)
5. [Maintenance](#maintenance)
6. [Troubleshooting](#troubleshooting)

---

## Déploiement Local

### Option 1: Fichier Local (Simplest)

```bash
# 1. Cloner ou télécharger les fichiers
git clone https://github.com/yourusername/bitaxe-renting.git
cd bitaxe-renting

# 2. Ouvrir dans navigateur
# Windows:
start index.html

# macOS:
open index.html

# Linux:
xdg-open index.html
```

**Avantages:**
- ✅ Zéro configuration
- ✅ Fonctionne offline
- ✅ Données locales (localStorage)
- ✅ Parfait pour démo/test

**Limitations:**
- Pas d'accès aux APIs Bitaxe distantes
- localStorage limité à ~5-10MB

---

### Option 2: Local Server (Recommandé)

```bash
# Python 3
python3 -m http.server 8000
# Ouvrir: http://localhost:8000

# Node.js
npx http-server
# Ouvrir: http://localhost:8080

# PHP
php -S localhost:8000
# Ouvrir: http://localhost:8000
```

**Avantages:**
- ✅ Meilleur que file:// pour les tests
- ✅ Peut servir les APIs Bitaxe (proxy)
- ✅ Partager localement (réseau LAN)

---

## Déploiement Web

### Option 1: GitHub Pages (Gratuit)

```bash
# 1. Créer repo GitHub
# Nom: yourusername.github.io

# 2. Pusher les fichiers
git clone https://github.com/yourusername/yourusername.github.io.git
cd yourusername.github.io
cp -r bitaxe-renting/* .

git add .
git commit -m "Add Bitaxe Renting System"
git push

# 3. Accéder
# https://yourusername.github.io
```

**Avantages:**
- ✅ Gratuit et illimité
- ✅ HTTPS automatique
- ✅ CDN global

**Limitations:**
- localStorage limité
- Pas d'accès à des APIs privées

---

### Option 2: Netlify (Simple & Gratuit)

```bash
# 1. Installer Netlify CLI
npm install -g netlify-cli

# 2. Deploy
netlify deploy --prod --dir=.

# 3. Accéder
# https://yoursite.netlify.app
```

**Avantages:**
- ✅ Deploy ultra-simple
- ✅ Preview branches
- ✅ Bonne performance

---

### Option 3: Vercel (Simple & Gratuit)

```bash
# 1. Installer Vercel CLI
npm install -g vercel

# 2. Deploy
vercel --prod

# 3. Accéder
# https://yoursite.vercel.app
```

---

### Option 4: VPS Classique (Contrôle Total)

#### Avec Nginx

```bash
# 1. SSH dans serveur
ssh root@your-vps.com

# 2. Installer Nginx
apt-get update
apt-get install -y nginx

# 3. Télécharger fichiers
cd /var/www
git clone https://github.com/yourusername/bitaxe-renting.git
cd bitaxe-renting

# 4. Configurer Nginx
cat > /etc/nginx/sites-available/bitaxe <<EOF
server {
    listen 80;
    server_name yourdomain.com;
    
    root /var/www/bitaxe-renting;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ =404;
    }
    
    # HTTPS redirect
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    root /var/www/bitaxe-renting;
    index index.html;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

# 5. Activer site
ln -s /etc/nginx/sites-available/bitaxe /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 6. SSL avec Let's Encrypt
apt-get install -y certbot python3-certbot-nginx
certbot certonly --standalone -d yourdomain.com
```

**Coût**: ~$3-5/mois (VPS basique)

---

### Option 5: Docker (Production)

```dockerfile
# Dockerfile
FROM nginx:alpine

COPY . /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443
```

```bash
# Build
docker build -t bitaxe-renting .

# Run
docker run -p 80:80 -p 443:443 bitaxe-renting
```

---

## Docker

### Docker Compose (Complet)

```yaml
version: '3.8'

services:
  bitaxe-renting:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    environment:
      - TZ=UTC
    restart: always

  # (Optionnel) Proxy pour Bitaxe APIs
  bitaxe-proxy:
    image: nginx:alpine
    ports:
      - "8080:8080"
    volumes:
      - ./proxy.conf:/etc/nginx/conf.d/default.conf:ro
    restart: always
```

```bash
# Deploy
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## Configuration Production

### 1️⃣ NWC Configuration

**Important**: N'exposer JAMAIS votre NWC Connection String publiquement!

**Options:**

#### Option A: Stockage Sécurisé
```javascript
// Dans admin.html → Paramètres
// Entrer uniquement en HTTPS
// Stocké en localStorage du navigateur (pas sur serveur)
```

#### Option B: Environment Variable
```bash
# .env
NWC_CONNECTION_STRING=nostr+walletconnect://...

# Dans le code (serveur Node)
const nwcString = process.env.NWC_CONNECTION_STRING;
```

#### Option C: Chiffrement
```javascript
// Chiffrer avant localStorage
const encrypted = encrypt(nwcString, masterPassword);
localStorage.setItem('bitaxe-nwc-config', encrypted);

// Déchiffrer à la lecture
const decrypted = decrypt(localStorage.getItem('bitaxe-nwc-config'), masterPassword);
```

### 2️⃣ HTTPS Obligatoire

```bash
# Rediriger HTTP → HTTPS (Nginx)
server {
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

### 3️⃣ CORS & Security Headers

```nginx
# nginx.conf
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer" always;
```

### 4️⃣ Backup Automatique

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/bitaxe"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p $BACKUP_DIR

# Exporter localStorage depuis tous les clients
# et sauvegarder en JSON

tar -czf $BACKUP_DIR/bitaxe-$DATE.tar.gz \
    /var/www/bitaxe-renting

# Garder les 30 derniers jours
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

```bash
# Ajouter cron
0 2 * * * /opt/bitaxe/backup.sh
```

### 5️⃣ Monitoring

```bash
# Vérifier que le site est up
curl https://yourdomain.com
echo $? # 0 = OK

# Monitoring avec uptime
# https://www.uptime.com
# https://statuspage.io
```

---

## Maintenance

### Mise à Jour

```bash
cd /var/www/bitaxe-renting

# Récupérer les mises à jour
git pull origin main

# Vérifier les changements
git log -1

# Recharger le site
# (Nginx rechargera automatiquement les fichiers)
```

### Backup Données Client

**Les clients peuvent exporter leurs données:**

```javascript
// Admin Dashboard → Paramètres → Exporter Données
// Ou Client Dashboard → (future feature)

// Format:
{
  "mineurs": [...],
  "locations": [...],
  "payments": [...],
  "nwc": "...",
  "exportDate": "2024-03-15T13:30:00Z"
}
```

### Logs

```bash
# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Voir les erreurs JavaScript (navigateur)
# F12 → Console
```

---

## Troubleshooting

### ❌ "Fichiers chargés lentement"

**Solution:**
```nginx
# Gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### ❌ "localStorage ne persiste pas"

**Cause**: Navigateur en mode privé/incognito

**Solution:**
- Informer l'utilisateur
- Proposer export JSON comme backup

### ❌ "NWC ne fonctionne pas"

**Vérifier:**
1. Mode démo vs production
2. Connection String format correct
3. HTTPS activé (obligatoire pour paiements)
4. Console du navigateur (F12) pour erreurs

### ❌ "Paiements bloqués"

**Vérifier:**
1. CORS activé
2. Firewall autorise les requêtes NWC
3. Lightning wallet configuré correctement

### ❌ "Données perdues"

**Récupération:**
1. Vérifier localStorage (F12 → Storage)
2. Chercher backups anciens
3. Importer depuis JSON

---

## Checklist Déploiement Production

```
□ Domain name registré
□ HTTPS/SSL configuré
□ NWC Connection String sécurisée
□ Backup automatique en place
□ Monitoring activé
□ CORS headers configurés
□ Gzip compression activé
□ robots.txt présent (optionnel)
□ Tester en mode production
□ Documenter configuration
□ Notifier les utilisateurs
```

---

## Résumé Options Déploiement

| Option | Coût | Setup | Performance | Sécurité |
|--------|------|-------|-------------|----------|
| Local File | Free | 0 min | Good | Low |
| Local Server | Free | 2 min | Good | Medium |
| GitHub Pages | Free | 5 min | Good | Medium |
| Netlify | Free | 2 min | Excellent | High |
| Vercel | Free | 2 min | Excellent | High |
| VPS | $3-10/mo | 30 min | Excellent | High |
| Docker | $5-20/mo | 20 min | Excellent | High |

**Recommandation:**
- **Démo/Test**: Fichier local
- **Production Basique**: Netlify/Vercel
- **Production Pro**: VPS + Docker

---

Pour questions sur le déploiement:
- 📖 [README.md](README.md)
- 🎯 [QUICKSTART.md](QUICKSTART.md)
- 📚 [GUIDE.md](GUIDE.md)
