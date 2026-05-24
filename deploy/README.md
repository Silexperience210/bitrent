# BitRent — Linux deployment (Umbrel / Debian)

Deploys the tunnel manager daemon (`start-miners.cjs`) as a systemd service so it runs 24/7 on an Umbrel (or any Debian box) instead of a laptop.

The frontend + API stay on Vercel — this deploy only moves the **daemon**.

## One-time setup on the Umbrel host

```bash
# 1. Install Node 20 + cloudflared
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

curl -L -o /tmp/cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i /tmp/cloudflared.deb

# 2. Clone the repo
sudo -u umbrel git clone https://github.com/Silexperience210/bitrent.git /home/umbrel/bitrent
cd /home/umbrel/bitrent

# 3. Create .env.local (copy from your laptop — same keys)
sudo -u umbrel cp .env.example .env.local
sudo -u umbrel chmod 600 .env.local
sudo -u umbrel nano .env.local
# Required: SUPABASE_URL, SUPABASE_SERVICE_KEY
# Optional: BRAIINS_IP (default 192.168.1.83)

# 4. Install systemd unit
sudo cp deploy/bitrent-miners.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bitrent-miners

# 5. Watch logs
journalctl -fu bitrent-miners
```

## Update workflow

```bash
cd /home/umbrel/bitrent
sudo -u umbrel git pull
sudo systemctl restart bitrent-miners
journalctl -fu bitrent-miners
```

## Stop the Windows laptop daemon (only after Umbrel is verified stable)

```powershell
# In PowerShell on Windows
wmic process where "name='node.exe' and commandline like '%start-miners%'" delete
```
