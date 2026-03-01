#!/bin/sh
set -e

# Seed an empty volume with the pre-initialized database from the image
if [ ! -f /app/data/ragcoon.db ] && [ -f /app/data-default/ragcoon.db ]; then
  mkdir -p /app/data
  cp /app/data-default/ragcoon.db /app/data/ragcoon.db
fi

exec node server.js
