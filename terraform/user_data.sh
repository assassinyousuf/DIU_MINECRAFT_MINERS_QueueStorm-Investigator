#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/queuestorm-init.log) 2>&1

echo "=== QueueStorm Investigator Bootstrap ==="

# ── System packages ───────────────────────────────────────────────────────────
dnf update -y
dnf install -y nodejs npm git nginx

# ── PM2 ──────────────────────────────────────────────────────────────────────
npm install -g pm2

# ── App directory ─────────────────────────────────────────────────────────────
mkdir -p /opt/queuestorm
cd /opt/queuestorm

# App code will be uploaded by deploy.sh after provisioning.
# Write a placeholder so nginx/PM2 can start immediately.
mkdir -p backend/dist backend/public
cat > backend/dist/index.js << 'PLACEHOLDER'
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', message: 'Deploying…' }));
}).listen(3000, '0.0.0.0', () => console.log('Placeholder on :3000'));
PLACEHOLDER

# ── Environment file ──────────────────────────────────────────────────────────
cat > /opt/queuestorm/backend/.env << EOF
PORT=3000
NODE_ENV=production
ANTHROPIC_API_KEY=${anthropic_api_key}
EOF

# ── PM2 startup ───────────────────────────────────────────────────────────────
cd /opt/queuestorm/backend
pm2 start dist/index.js --name queuestorm
pm2 startup systemd -u ec2-user --hp /home/ec2-user | bash || true
pm2 save

# ── Nginx ─────────────────────────────────────────────────────────────────────
cat > /etc/nginx/conf.d/queuestorm.conf << 'NGINX'
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 2m;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_read_timeout 35s;
    }
}
NGINX

# Remove the default nginx config
rm -f /etc/nginx/conf.d/default.conf

systemctl enable --now nginx
echo "=== Bootstrap complete ==="
