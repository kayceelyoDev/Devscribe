#!/bin/sh
set -eu
npx prisma db push --skip-generate
exec node server.js
