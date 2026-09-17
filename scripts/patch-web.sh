#!/bin/bash
set -e
FILE="dist/index.html"

if [ ! -f "$FILE" ]; then
  echo "❌ $FILE introuvable"
  exit 1
fi

sed -i 's/<meta name="viewport" content="[^"]*"/<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/' "$FILE"

echo "🎉 dist/index.html patché avec succès"
