#!/bin/bash
set -euo pipefail

echo "==> [DevScribe] Pulling latest code from origin main..."
git pull origin main

echo "==> [DevScribe] Building and launching unified Docker Compose stack..."
docker compose up -d --build --remove-orphans

echo "==> [DevScribe] Cleaning up dangling docker images..."
docker image prune -f

echo "==> [DevScribe] Stack is live and healthy!"
echo "  • Workspace App:      http://<server-ip>:3000"
echo "  • MinIO S3 Console:   http://<server-ip>:9001 (devscribe / devscribe-secret)"
echo "  • PostgreSQL for pgAdmin: <server-ip>:5433 (devscribe / devscribe)"
echo "  • Redis Cache:        <server-ip>:6379"
