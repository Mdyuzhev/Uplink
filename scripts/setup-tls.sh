#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════
# Настройка TLS через Let's Encrypt (certbot)
# Запускать ПОСЛЕ clean-start.sh
# Требует: host nginx на сервере (не Docker nginx)
# ═══════════════════════════════════════════════════════

DOMAIN="${1:-uplink.wh-lab.ru}"
EMAIL="${2:-admin@wh-lab.ru}"

echo "=== Настройка TLS для $DOMAIN ==="

# ── 1. Установить certbot если нет ──
if ! command -v certbot &> /dev/null; then
    echo "-> Установка certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# ── 2. Установить host nginx если нет ──
if ! command -v nginx &> /dev/null; then
    echo "-> Установка nginx..."
    sudo apt install -y nginx
fi

# ── 3. Конфиг host nginx ──
echo "-> Настройка host nginx..."
cat << NGINX_CONF | sudo tee /etc/nginx/sites-available/uplink
server {
    listen 80;
    server_name $DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Всё остальное — redirect на HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # Сертификаты будут добавлены certbot-ом
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Проксирование на Docker nginx (uplink-web контейнер)
    location / {
        proxy_pass http://127.0.0.1:5174;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 50m;

        # WebSocket support (для bot-ws и Synapse sync)
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }
}
NGINX_CONF

# Включить сайт
sudo ln -sf /etc/nginx/sites-available/uplink /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# ── 4. Получить сертификат ──
echo "-> Получение сертификата Let's Encrypt..."
sudo certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive

# ── 5. Проверить автообновление ──
echo "-> Проверка автообновления..."
sudo certbot renew --dry-run

echo ""
echo "=== TLS настроен ==="
echo "  HTTPS: https://$DOMAIN"
echo "  Сертификат обновляется автоматически (certbot timer)"
echo ""
echo "Следующий шаг: проверить федерацию"
echo "  https://federationtester.matrix.org/#$DOMAIN"
